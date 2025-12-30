'use client';
import React, { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Search, Zap, Loader, AlertCircle, 
  Globe, Crown, BarChart3, TrendingUp, Flag 
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
      // Trả về số season đơn giản
      return data.data?.season || 2;
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
  }
};

// ==================== UTILITY FUNCTIONS ====================
const getPlayerAvatar = (uuid, size = 80) => {
  return `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`;
};

const getRankIcon = (rank) => {
  if (rank === 1) return <Trophy className="w-8 h-8 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-8 h-8 text-gray-300" />;
  if (rank === 3) return <Medal className="w-8 h-8 text-orange-400" />;
  return <span className="text-xl font-black text-white">#{rank}</span>;
};

const calculateWinRate = (player) => {
  if (!player || !player.statistics) return '0.0';
  const wins = player.statistics.win || player.statistics.wins || 0;
  const loses = player.statistics.lose || player.statistics.losses || 0;
  const total = wins + loses;
  return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
};

const calculateKD = (player) => {
  if (!player || !player.statistics) return '0.00';
  const kills = player.statistics.kills || 0;
  const deaths = player.statistics.deaths || 0;
  return deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? kills.toString() : '0.00';
};

// ==================== SORTING FUNCTIONS ====================
const sortPlayers = (players, sortBy, sortDirection) => {
  if (!Array.isArray(players)) return [];
  
  const sorted = [...players];
  
  const sortFunctions = {
    elo: (a, b) => {
      const eloA = a.eloRate || 0;
      const eloB = b.eloRate || 0;
      return sortDirection === 'asc' ? eloA - eloB : eloB - eloA;
    },
    rank: (a, b) => {
      const rankA = a.globalRank || 9999;
      const rankB = b.globalRank || 9999;
      return sortDirection === 'asc' ? rankA - rankB : rankB - rankA;
    },
    wins: (a, b) => {
      const statsA = a.statistics || {};
      const statsB = b.statistics || {};
      const winsA = statsA.win || statsA.wins || 0;
      const winsB = statsB.win || statsB.wins || 0;
      return sortDirection === 'asc' ? winsA - winsB : winsB - winsA;
    },
    winrate: (a, b) => {
      const rateA = parseFloat(calculateWinRate(a)) || 0;
      const rateB = parseFloat(calculateWinRate(b)) || 0;
      return sortDirection === 'asc' ? rateA - rateB : rateB - rateA;
    },
    kd: (a, b) => {
      const kdA = parseFloat(calculateKD(a)) || 0;
      const kdB = parseFloat(calculateKD(b)) || 0;
      return sortDirection === 'asc' ? kdA - kdB : kdB - kdA;
    },
    matches: (a, b) => {
      const statsA = a.statistics || {};
      const statsB = b.statistics || {};
      const winsA = statsA.win || statsA.wins || 0;
      const losesA = statsA.lose || statsA.losses || 0;
      const winsB = statsB.win || statsB.wins || 0;
      const losesB = statsB.lose || statsB.losses || 0;
      const totalA = winsA + losesA;
      const totalB = winsB + losesB;
      return sortDirection === 'asc' ? totalA - totalB : totalB - totalA;
    }
  };

  if (sortFunctions[sortBy]) {
    sorted.sort(sortFunctions[sortBy]);
  } else {
    // Default sort by rank
    sorted.sort((a, b) => {
      const rankA = a.globalRank || 9999;
      const rankB = b.globalRank || 9999;
      return rankA - rankB;
    });
  }
  
  // Update ranks after sorting
  return sorted.map((player, index) => ({
    ...player,
    globalRank: index + 1
  }));
};

// ==================== SORT HEADER COMPONENT ====================
const SortHeader = ({ label, sortKey, currentSort, sortDirection, onClick }) => {
  const isActive = currentSort === sortKey;
  
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
        isActive 
          ? 'bg-green-800 text-green-400' 
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
const PlayerRow = ({ player }) => {
  const wins = player.statistics?.win || player.statistics?.wins || 0;
  const loses = player.statistics?.lose || player.statistics?.losses || 0;
  const total = wins + loses;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
  const kd = calculateKD(player);
  const elo = player.eloRate ? Math.round(player.eloRate).toString() : '0';
  
  return (
    <div className="bg-gray-800/60 hover:bg-gray-700/60 rounded-lg p-3 transition-colors border border-gray-700">
      <div className="flex items-center justify-between">
        {/* Left: Rank and Player Info */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 text-center">
            {getRankIcon(player.globalRank)}
          </div>

          <div className="flex items-center gap-2">
            <img
              src={getPlayerAvatar(player.uuid, 40)}
              alt="Player"
              className="w-10 h-10 rounded-lg border border-green-500"
              onError={(e) => {
                e.target.src = 'https://crafatar.com/avatars/8667ba71b85a4004af54457a9734eed7?size=40&overlay';
              }}
            />
            <div className="min-w-0">
              <p className="font-bold text-white truncate">
                {player.nickname || player.username || 'Unknown'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-green-400">{elo} ELO</span>
                <span className="text-xs text-gray-400">#{player.globalRank}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-400">W</p>
            <p className="text-sm font-bold text-green-400">{wins}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">L</p>
            <p className="text-sm font-bold text-red-400">{loses}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">%</p>
            <p className="text-sm font-bold text-yellow-400">{winRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">K/D</p>
            <p className="text-sm font-bold text-purple-400">{kd}</p>
          </div>
        </div>

        {/* Mobile Stats */}
        <div className="md:hidden">
          <div className="text-right">
            <p className="text-xs text-gray-400">W/L</p>
            <p className="text-sm font-bold">
              <span className="text-green-400">{wins}</span>
              <span className="text-gray-400">/</span>
              <span className="text-red-400">{loses}</span>
            </p>
            <p className="text-xs text-yellow-400">{winRate}%</p>
          </div>
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

      // Chỉ lấy season number
      const seasonNumber = await apiService.getSeasonInfo();
      setCurrentSeason(seasonNumber.toString());

      const users = await apiService.getLeaderboard('VN', 2, 100);
      
      // Đảm bảo users là array
      const playerArray = Array.isArray(users) ? users : [];
      
      const vnPlayers = playerArray
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
              ĐANG TẢI...
            </p>
            <p className="text-green-400 text-sm mt-2">
              Đang lấy dữ liệu từ MCSR Ranked
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
        <div className="text-center mb-6">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <h1 className="text-2xl md:text-3xl font-bold">
                MCSR VIỆT NAM
              </h1>
              <Trophy className="w-8 h-8 text-yellow-400" />
            </div>
            <p className="text-green-300 font-medium flex items-center gap-1 justify-center">
              <Globe className="w-4 h-4" />
              Season {currentSeason} • {totalPlayers} Players
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-green-300">TOP 1 ELO</p>
              <p className="text-lg font-bold text-yellow-400">{topElo}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-blue-300">TRUNG BÌNH</p>
              <p className="text-lg font-bold text-blue-400">{avgElo}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-purple-300">TOP 100</p>
              <p className="text-lg font-bold text-purple-400">{Math.min(totalPlayers, 100)}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-orange-300">SEASON</p>
              <p className="text-lg font-bold text-orange-400">{currentSeason}</p>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="max-w-lg mx-auto mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-400" />
              <input
                type="text"
                placeholder="Tìm kiếm người chơi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800/70 border border-green-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <button
              onClick={fetchLeaderboard}
              disabled={refreshing}
              className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {refreshing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Đang tải...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Làm mới
                </>
              )}
            </button>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="bg-gray-900/50 rounded-lg border border-green-600">
          {/* Leaderboard Header */}
          <div className="bg-green-800/50 p-3 border-b border-green-700">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Bảng xếp hạng Việt Nam
              </h2>
              <span className="text-sm bg-green-700 px-2 py-1 rounded">
                {filteredPlayers.length} players
              </span>
            </div>

            {/* Sort Controls */}
            <div className="flex flex-wrap gap-1">
              <SortHeader
                label="Hạng"
                sortKey="rank"
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
                label="Thắng"
                sortKey="wins"
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
                label="K/D"
                sortKey="kd"
                currentSort={sortBy}
                sortDirection={sortDirection}
                onClick={handleSort}
              />
              <SortHeader
                label="Trận"
                sortKey="matches"
                currentSort={sortBy}
                sortDirection={sortDirection}
                onClick={handleSort}
              />
            </div>
          </div>

          {/* Leaderboard Content */}
          <div className="p-3 max-h-[60vh] overflow-y-auto">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">Không tìm thấy người chơi</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPlayers.map((player) => (
                  <PlayerRow key={player.uuid || Math.random()} player={player} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Dữ liệu từ MCSR Ranked API</p>
          <p className="text-xs mt-1">© 2024 Minecraft Speedrunning Vietnam</p>
        </div>
      </div>
    </div>
  );
                     }
