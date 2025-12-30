'use client';
import React, { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Search, Zap, Loader, AlertCircle, 
  Globe, Crown, BarChart3, TrendingUp, Flag, 
  Clock, Award, Target, X, ExternalLink, User
} from 'lucide-react';

// ==================== API SERVICE ====================
const API_BASE = 'https://api.mcsrranked.com';

const apiService = {
  async fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.data || 'API Error');
        return data;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  },

  async getSeasonInfo() {
    try {
      const data = await this.fetchWithRetry(`${API_BASE}/leaderboard?count=1`);
      return data.data?.season?.number || 2;
    } catch (err) {
      console.error('Error getting season:', err);
      return 2;
    }
  },

  async getLeaderboard(country = 'VN', type = 2, count = 100) {
    const data = await this.fetchWithRetry(
      `${API_BASE}/leaderboard?type=${type}&country=${country}&count=${count}`
    );
    return data.data?.users || [];
  },

  async getUserStats(uuid, season = null) {
    const url = season 
      ? `${API_BASE}/users/${uuid}/statistics?season=${season}`
      : `${API_BASE}/users/${uuid}/statistics`;
    try {
      const data = await this.fetchWithRetry(url);
      return data.data;
    } catch (err) {
      console.error('Error fetching user stats:', err);
      return null;
    }
  }
};

// ==================== UTILITY FUNCTIONS ====================
const formatTime = (ms) => {
  if (!ms && ms !== 0) return 'N/A';
  const totalSeconds = ms / 1000;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor(ms % 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const getPlayerSkin = (uuid) => {
  return `https://crafatar.com/renders/body/${uuid}?overlay&scale=10`;
};

const getPlayerAvatar = (uuid) => {
  return `https://crafatar.com/avatars/${uuid}?overlay`;
};

const getRankIcon = (rank) => {
  if (rank === 1) return <Trophy className="w-8 h-8 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-8 h-8 text-gray-300" />;
  if (rank === 3) return <Medal className="w-8 h-8 text-orange-400" />;
  return <span className="text-xl font-bold text-white">#{rank}</span>;
};

const calculateStats = (player, detailedStats) => {
  const stats = detailedStats || player.statistics || {};
  const wins = stats.win || stats.wins || 0;
  const loses = stats.lose || stats.losses || 0;
  const total = wins + loses;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
  const forfeitRate = total > 0 ? (((stats.forfeits || 0) / total) * 100).toFixed(1) : 0;
  
  return {
    wins,
    loses,
    total,
    winRate,
    forfeitRate,
    elo: Math.round(player.eloRate || 0),
    bestTime: stats.fastest_win || 0,
    avgTime: stats.average_time || 0,
    kills: stats.kills || 0,
    deaths: stats.deaths || 0,
    kd: stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills || 0
  };
};

// ==================== SORTING FUNCTIONS ====================
const sortPlayers = (players, sortBy, sortDirection) => {
  if (!Array.isArray(players)) return [];
  
  const sorted = [...players];
  
  const sortFunctions = {
    rank: (a, b) => {
      const rankA = a.globalRank || 9999;
      const rankB = b.globalRank || 9999;
      return sortDirection === 'asc' ? rankA - rankB : rankB - rankA;
    },
    elo: (a, b) => {
      const eloA = a.eloRate || 0;
      const eloB = b.eloRate || 0;
      return sortDirection === 'asc' ? eloA - eloB : eloB - eloA;
    },
    name: (a, b) => {
      const nameA = (a.nickname || a.username || '').toLowerCase();
      const nameB = (b.nickname || b.username || '').toLowerCase();
      return sortDirection === 'asc' 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    },
    winrate: (a, b) => {
      const statsA = a.statistics || {};
      const statsB = b.statistics || {};
      const winsA = statsA.win || statsA.wins || 0;
      const losesA = statsA.lose || statsA.losses || 0;
      const winsB = statsB.win || statsB.wins || 0;
      const losesB = statsB.lose || statsB.losses || 0;
      const totalA = winsA + losesA;
      const totalB = winsB + losesB;
      const rateA = totalA > 0 ? (winsA / totalA) * 100 : 0;
      const rateB = totalB > 0 ? (winsB / totalB) * 100 : 0;
      return sortDirection === 'asc' ? rateA - rateB : rateB - rateA;
    },
    besttime: (a, b) => {
      const timeA = a.statistics?.fastest_win || 999999999;
      const timeB = b.statistics?.fastest_win || 999999999;
      return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
    },
    avgtime: (a, b) => {
      const timeA = a.statistics?.average_time || 999999999;
      const timeB = b.statistics?.average_time || 999999999;
      return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
    }
  };

  if (sortFunctions[sortBy]) {
    sorted.sort(sortFunctions[sortBy]);
  } else {
    sorted.sort((a, b) => (b.eloRate || 0) - (a.eloRate || 0));
  }
  
  return sorted.map((player, index) => ({
    ...player,
    globalRank: index + 1
  }));
};

// ==================== PLAYER DETAIL MODAL ====================
const PlayerDetailModal = ({ player, stats, onClose }) => {
  if (!player) return null;
  
  const playerStats = calculateStats(player, stats);
  const playerUrl = `https://mcsrranked.com/users/${player.uuid}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-green-600 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-green-700 to-emerald-700 p-4 border-b border-green-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src={getPlayerSkin(player.uuid)}
              alt={player.nickname}
              className="w-16 h-16 rounded-lg border-2 border-yellow-400"
              onError={(e) => {
                e.target.src = getPlayerAvatar(player.uuid);
              }}
            />
            <div>
              <h2 className="text-2xl font-bold text-white">
                {player.nickname || player.username}
              </h2>
              <p className="text-green-300">#{player.globalRank} • {playerStats.elo} ELO</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={playerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              title="Xem trang chính thức"
            >
              <ExternalLink className="w-5 h-5 text-white" />
            </a>
            <button
              onClick={onClose}
              className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Iframe */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-bold text-white">Thông tin chính thức</h3>
            </div>
            <div className="bg-black rounded-lg overflow-hidden border border-gray-700">
              <iframe
                src={playerUrl}
                className="w-full h-96"
                title={`MCSR Profile - ${player.nickname || player.username}`}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Win Rate</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{playerStats.winRate}%</p>
              <p className="text-xs text-gray-500">{playerStats.wins}W - {playerStats.loses}L</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-400">Best Time</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">{formatTime(playerStats.bestTime)}</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-400">Avg Time</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{formatTime(playerStats.avgTime)}</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-gray-400">Forfeit Rate</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{playerStats.forfeitRate}%</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-400">K/D Ratio</span>
              </div>
              <p className="text-2xl font-bold text-purple-400">{playerStats.kd}</p>
              <p className="text-xs text-gray-500">{playerStats.kills}K - {playerStats.deaths}D</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-orange-400" />
                <span className="text-sm text-gray-400">Total Matches</span>
              </div>
              <p className="text-2xl font-bold text-orange-400">{playerStats.total}</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-gray-400">Current ELO</span>
              </div>
              <p className="text-2xl font-bold text-cyan-400">{playerStats.elo}</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-400">Global Rank</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">#{player.globalRank}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== SORT HEADER COMPONENT ====================
const SortHeader = ({ label, sortKey, currentSort, sortDirection, onClick }) => {
  const isActive = currentSort === sortKey;
  
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium ${
        isActive 
          ? 'bg-green-700 text-green-300' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
      }`}
    >
      <span>{label}</span>
      {isActive && (
        <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );
};

// ==================== PLAYER ROW COMPONENT ====================
const PlayerRow = ({ player, onClick }) => {
  const stats = calculateStats(player);
  
  return (
    <div
      onClick={() => onClick(player)}
      className="bg-gray-800/60 hover:bg-gray-700/60 rounded-lg p-4 transition-all duration-200 hover:scale-[1.02] cursor-pointer border border-gray-700 hover:border-green-500 group"
    >
      <div className="flex items-center justify-between">
        {/* Left: Rank and Player Info */}
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 text-center">
            {getRankIcon(player.globalRank)}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={getPlayerSkin(player.uuid)}
                alt={player.nickname}
                className="w-14 h-14 rounded-lg border-2 border-green-500 group-hover:border-yellow-400 transition"
                onError={(e) => {
                  e.target.src = getPlayerAvatar(player.uuid);
                }}
              />
              <div className="absolute -bottom-1 -right-1 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                #{player.globalRank}
              </div>
            </div>
            
            <div className="min-w-0">
              <p className="font-bold text-lg text-white truncate">
                {player.nickname || player.username || 'Unknown'}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded">
                  {stats.elo} ELO
                </span>
                <span className="text-sm text-gray-400">
                  {stats.wins}W {stats.loses}L
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Stats */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-400">Win Rate</p>
            <p className="text-lg font-bold text-green-400">{stats.winRate}%</p>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-400">Best Time</p>
            <p className="text-lg font-bold text-blue-400">{formatTime(stats.bestTime)}</p>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-400">Avg Time</p>
            <p className="text-lg font-bold text-yellow-400">{formatTime(stats.avgTime)}</p>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-400">Forfeit</p>
            <p className="text-lg font-bold text-red-400">{stats.forfeitRate}%</p>
          </div>
        </div>

        {/* Right: Click indicator */}
        <div className="flex items-center">
          <div className="bg-green-700 group-hover:bg-green-600 p-2 rounded-lg transition">
            <ExternalLink className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="lg:hidden grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-700">
        <div className="text-center">
          <p className="text-xs text-gray-400">Win Rate</p>
          <p className="text-sm font-bold text-green-400">{stats.winRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Best</p>
          <p className="text-sm font-bold text-blue-400">{formatTime(stats.bestTime)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Avg</p>
          <p className="text-sm font-bold text-yellow-400">{formatTime(stats.avgTime)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Forfeit</p>
          <p className="text-sm font-bold text-red-400">{stats.forfeitRate}%</p>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
export default function MCSRLeaderboardPro() {
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentSeason, setCurrentSeason] = useState('2');
  const [sortBy, setSortBy] = useState('rank');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerStats, setPlayerStats] = useState({});

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (!Array.isArray(players)) return;
    
    if (searchQuery.trim() === '') {
      const sorted = sortPlayers(players, sortBy, sortDirection);
      setFilteredPlayers(sorted);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = players.filter(player => {
        const nickname = (player.nickname || '').toLowerCase();
        const username = (player.username || '').toLowerCase();
        return nickname.includes(query) || username.includes(query);
      });
      const sorted = sortPlayers(filtered, sortBy, sortDirection);
      setFilteredPlayers(sorted);
    }
  }, [searchQuery, players, sortBy, sortDirection]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError(null);

      const seasonNumber = await apiService.getSeasonInfo();
      setCurrentSeason(seasonNumber.toString());

      const users = await apiService.getLeaderboard('VN', 2, 100);
      
      const playerArray = Array.isArray(users) ? users : [];
      
      // Fetch detailed stats for each player
      const playersWithStats = await Promise.all(
        playerArray.slice(0, 50).map(async (player) => {
          try {
            const stats = await apiService.getUserStats(player.uuid, seasonNumber);
            return {
              ...player,
              statistics: stats || player.statistics
            };
          } catch (err) {
            return player;
          }
        })
      );

      const vnPlayers = playersWithStats
        .filter(player => player && typeof player === 'object')
        .sort((a, b) => (b.eloRate || 0) - (a.eloRate || 0))
        .map((player, index) => ({
          ...player,
          globalRank: index + 1
        }));

      setPlayers(vnPlayers);
      const sorted = sortPlayers(vnPlayers, sortBy, sortDirection);
      setFilteredPlayers(sorted);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError({
        title: 'Không thể tải dữ liệu',
        message: 'Vui lòng kiểm tra kết nối internet và thử lại sau.',
        details: err.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePlayerClick = async (player) => {
    setSelectedPlayer(player);
    
    // Fetch detailed stats if not already loaded
    if (!playerStats[player.uuid]) {
      try {
        const stats = await apiService.getUserStats(player.uuid, currentSeason);
        setPlayerStats(prev => ({
          ...prev,
          [player.uuid]: stats
        }));
      } catch (err) {
        console.error('Error fetching player stats:', err);
      }
    }
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('desc');
    }
  };

  const totalPlayers = players.length;
  const avgElo = totalPlayers > 0 
    ? Math.round(players.reduce((sum, p) => sum + (p.eloRate || 0), 0) / totalPlayers)
    : 0;
  const topElo = players[0]?.eloRate ? Math.round(players[0].eloRate).toString() : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-green-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-2xl font-bold animate-pulse">
              ĐANG TẢI DỮ LIỆU...
            </p>
            <p className="text-green-400 text-sm mt-2">
              Đang tải thông tin người chơi từ MCSR Ranked
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center p-6 bg-gray-900/90 rounded-xl border border-red-500 max-w-md w-full">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              {error.title}
            </h2>
            <p className="text-gray-300 mb-4">{error.message}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={fetchLeaderboard}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold transition"
              >
                THỬ LẠI
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition"
              >
                TẢI LẠI TRANG
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-400" />
              <h1 className="text-3xl md:text-4xl font-bold">
                MCSR VIỆT NAM LEADERBOARD
              </h1>
              <Trophy className="w-10 h-10 text-yellow-400" />
            </div>
            <p className="text-green-300 font-medium flex items-center gap-2 justify-center">
              <Globe className="w-4 h-4" />
              Season {currentSeason} • {totalPlayers} Players
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/70 rounded-xl p-4 border border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300 font-bold">TOP 1 ELO</p>
                  <p className="text-2xl font-bold text-yellow-400">{topElo}</p>
                </div>
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            
            <div className="bg-gray-800/70 rounded-xl p-4 border border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300 font-bold">AVG ELO</p>
                  <p className="text-2xl font-bold text-blue-400">{avgElo}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            
            <div className="bg-gray-800/70 rounded-xl p-4 border border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300 font-bold">TOP 100</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {Math.min(totalPlayers, 100)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            
            <div className="bg-gray-800/70 rounded-xl p-4 border border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-300 font-bold">SEASON</p>
                  <p className="text-2xl font-bold text-orange-400">{currentSeason}</p>
                </div>
                <Flag className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên người chơi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-800/80 border-2 border-green-500 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400"
              />
            </div>
            <button
              onClick={fetchLeaderboard}
              disabled={refreshing}
              className="mt-3 px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl text-white font-bold transition disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {refreshing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Làm mới dữ liệu
                </>
              )}
            </button>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="bg-gray-900/60 rounded-xl border-2 border-green-600 overflow-hidden">
          {/* Leaderboard Header */}
          <div className="bg-gradient-to-r from-green-700 to-emerald-700 p-4 border-b border-green-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Bảng xếp hạng người chơi Việt Nam
              </h2>
              <div className="text-sm font-bold">
                <span className="bg-green-800 px-3 py-1 rounded-lg text-green-300">
                  {filteredPlayers.length} players
                </span>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex flex-wrap gap-1 justify-center">
              <SortHeader
                label="Rank"
                sortKey="rank"
                currentSort={sortBy}
                sortDirection={sortDirection}
                onClick={handleSort}
              />
              <SortHeader
                label="Name"
                sortKey="name"
                currentSort={sortBy}
                sortDirection={sortDirection}
                onClick={handleSort}
              />
              <SortHeader
                label="ELO"
                sortKey="elo"
                currentSort={sortBy}
                sortDirection={sortDirection}
                onClick={handleSort}
              />
              <SortHeader
                label="Win Rate"
                sortKey="winrate"
                currentSort={sortBy}
                sortDirection={sortDirection}
                onClick={handleSort}
              />
              <SortHeader
                label="Best Time"
                sortKey="besttime"
                currentSort={sortBy}
                sortDirection={sortDirection}
                onClick={handleSort}
              />
              <SortHeader
                label="Avg Time"
                sortKey="avgtime"
                currentSort={sortBy}
                sortDirection={sortDirection}
                onClick={handleSort}
              />
            </div>
          </div>

          {/* Leaderboard Content */}
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-xl text-gray-400">Không tìm thấy người chơi</p>
                <p className="text-gray-500 mt-2">Thử tìm kiếm với tên khác</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlayers.map((player) => (
                  <PlayerRow
                    key={player.uuid}
                    player={player}
                    onClick={handlePlayerClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Dữ liệu được cập nhật từ MCSR Ranked API</p>
          <p className="text-xs mt-1">© 2024 Minecraft Speedrunning Vietnam Leaderboard</p>
          <p className="text-xs mt-1 text-gray-600">
            Click vào người chơi để xem thông tin chi tiết và trang chính thức
          </p>
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          stats={playerStats[selectedPlayer.uuid]}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {/* Floating Refresh Button */}
      <button
        onClick={fetchLeaderboard}
        disabled={refreshing}
        className="fixed bottom-6 right-6 p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full shadow-lg hover:scale-110 transition transform disabled:opacity-50"
        title="Làm mới dữ liệu"
      >
        {refreshing ? (
          <Loader className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Zap className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
        }
