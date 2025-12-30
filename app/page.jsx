'use client';
import Head from 'next/head';
import React, { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Search, Zap, Loader, AlertCircle, 
  Globe, Crown, BarChart3, TrendingUp, Flag, 
  Clock, Award, Target, X, ExternalLink, User, Users, Timer, Percent, Calendar, Sword
} from 'lucide-react';


// ==================== API SERVICE ====================
const API_BASE = 'https://mcsrranked.com/api';

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

  async getLeaderboard(country = 'VN', type = 2, count = 100) {
    const data = await this.fetchWithRetry(
      `${API_BASE}/leaderboard?type=${type}&country=${country}&count=${count}`
    );
    return data.data?.users || [];
  },

  async getUserDetails(username) {
    try {
      const data = await this.fetchWithRetry(`${API_BASE}/users/${username}`);
      return data.data;
    } catch (err) {
      console.error(`Error fetching user ${username}:`, err);
      return null;
    }
  },

  async getCurrentSeason() {
    try {
      const data = await this.fetchWithRetry(`${API_BASE}/leaderboard?count=1`);
      const season = data.data?.season;
      if (season && typeof season === 'object') {
        return {
          number: season.number || 2,
          startsAt: season.startsAt,
          endsAt: season.endsAt
        };
      }
      return { number: 2, startsAt: null, endsAt: null };
    } catch (err) {
      console.error('Error getting season:', err);
      return { number: 2, startsAt: null, endsAt: null };
    }
  }
};

// ==================== UTILITY FUNCTIONS ====================
const formatTime = (ms) => {
  if (!ms && ms !== 0) return '--:--';
  if (ms >= 3600000) {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }
  
  const totalSeconds = ms / 1000;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor(ms % 1000);
  
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  } else {
    return `${secs}.${milliseconds.toString().padStart(3, '0')}s`;
  }
};

const getPlayerHead = (uuid) => {
  if (!uuid) return 'https://crafatar.com/avatars/8667ba71b85a4004af54457a9734eed7?size=40&overlay';
  return `https://crafatar.com/avatars/${uuid}?size=40&overlay`;
};

const calculateDaysLeft = (endTimestamp) => {
  if (!endTimestamp) return null;
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = endTimestamp - now;
  if (secondsLeft < 0) return 0;
  return Math.ceil(secondsLeft / 86400); // Convert to days
};

const calculateStats = (userData) => {
  if (!userData) return null;
  
  const stats = userData.statistics || {};
  const elo = userData.eloRate || 0;
  const highestElo = userData.highestEloRate || elo;
  
  // Calculate win rate
  const wins = stats.win || stats.wins || 0;
  const loses = stats.lose || stats.losses || 0;
  const totalGames = wins + loses;
  const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
  
  // Calculate forfeit rate
  const forfeits = stats.forfeits || 0;
  const forfeitRate = totalGames > 0 ? ((forfeits / totalGames) * 100).toFixed(1) : 0;
  
  return {
    elo: Math.round(elo),
    highestElo: Math.round(highestElo),
    wins,
    loses,
    totalGames,
    winRate,
    forfeitRate,
    bestTime: stats.fastest_win || 0,
    avgTime: stats.average_time || 0,
    kills: stats.kills || 0,
    deaths: stats.deaths || 0,
    kd: stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills || '0.00',
    rank: userData.eloRank || 'N/A'
  };
};

// ==================== SEASON INFO COMPONENT ====================
const SeasonInfo = ({ season, daysLeft }) => {
  return (
    <div className="bg-gradient-to-r from-green-900/80 to-emerald-800/80 rounded-lg p-4 border-2 border-yellow-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-yellow-400" />
          <div>
            <p className="text-sm text-green-300 font-bold minecraft-font">MÙA HIỆN TẠI</p>
            <p className="text-2xl font-bold text-white minecraft-font">SEASON {season}</p>
          </div>
        </div>
        
        {daysLeft !== null && (
          <div className="text-right">
            <p className="text-sm text-yellow-300 font-bold minecraft-font">CÒN LẠI</p>
            <div className="flex items-center gap-2">
              <div className="bg-red-600 px-3 py-1 rounded-lg">
                <p className="text-xl font-bold text-white minecraft-font">{daysLeft}</p>
              </div>
              <p className="text-white font-bold">NGÀY</p>
            </div>
          </div>
        )}
      </div>
      
      {daysLeft !== null && daysLeft <= 7 && (
        <div className="mt-3 bg-yellow-900/50 border border-yellow-600 rounded p-2">
          <p className="text-yellow-300 text-sm text-center minecraft-font">
            ⚠️ MÙA SẮP KẾT THÚC! ⚠️
          </p>
        </div>
      )}
    </div>
  );
};

// ==================== PLAYER DETAIL MODAL ====================
const PlayerDetailModal = ({ player, stats, onClose }) => {
  if (!player) return null;
  
  const playerStats = stats || calculateStats(player);
  const playerUrl = `https://mcsrranked.com/stats/${player.username || player.nickname || player.uuid}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-4 border-green-500 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-green-700 to-emerald-700 p-4 border-b-4 border-green-900 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img
              src={getPlayerHead(player.uuid)}
              alt={player.nickname}
              className="w-12 h-12 rounded-lg border-2 border-yellow-400"
            />
            <div>
              <h2 className="text-2xl font-bold text-white minecraft-font">
                {player.nickname || player.username}
              </h2>
              <p className="text-green-300">
                #{player.globalRank} • {playerStats?.elo || 0} ELO
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href={playerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold flex items-center gap-2 transition minecraft-font text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              TRANG CHÍNH THỨC
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold flex items-center gap-2 transition minecraft-font text-sm"
            >
              <X className="w-4 h-4" />
              ĐÓNG
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Iframe */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-6 h-6 text-green-400" />
              <h3 className="text-xl font-bold text-white minecraft-font">THÔNG TIN CHI TIẾT</h3>
            </div>
            <div className="bg-black rounded-lg overflow-hidden border-2 border-gray-700">
              <iframe
                src={playerUrl}
                className="w-full h-[500px]"
                title={`MCSR Profile - ${player.nickname || player.username}`}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/70 rounded-lg p-4 border-2 border-green-500">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-400 minecraft-font">ELO</span>
              </div>
              <p className="text-3xl font-bold text-yellow-400 minecraft-font">{playerStats?.elo || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Cao nhất: {playerStats?.highestElo || 0}</p>
            </div>

            <div className="bg-gray-800/70 rounded-lg p-4 border-2 border-blue-500">
              <div className="flex items-center gap-2 mb-3">
                <Percent className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400 minecraft-font">WIN RATE</span>
              </div>
              <p className="text-3xl font-bold text-green-400 minecraft-font">{playerStats?.winRate || 0}%</p>
              <p className="text-xs text-gray-500 mt-1">{playerStats?.wins || 0}W {playerStats?.loses || 0}L</p>
            </div>

            <div className="bg-gray-800/70 rounded-lg p-4 border-2 border-purple-500">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-400 minecraft-font">BEST TIME</span>
              </div>
              <p className="text-2xl font-bold text-blue-400 minecraft-font">{formatTime(playerStats?.bestTime || 0)}</p>
            </div>

            <div className="bg-gray-800/70 rounded-lg p-4 border-2 border-red-500">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-gray-400 minecraft-font">FORFEIT RATE</span>
              </div>
              <p className="text-3xl font-bold text-red-400 minecraft-font">{playerStats?.forfeitRate || 0}%</p>
            </div>

            <div className="bg-gray-800/70 rounded-lg p-4 border-2 border-yellow-500">
              <div className="flex items-center gap-2 mb-3">
                <Timer className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-400 minecraft-font">AVG TIME</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400 minecraft-font">{formatTime(playerStats?.avgTime || 0)}</p>
            </div>

            <div className="bg-gray-800/70 rounded-lg p-4 border-2 border-orange-500">
              <div className="flex items-center gap-2 mb-3">
                <Sword className="w-5 h-5 text-orange-400" />
                <span className="text-sm text-gray-400 minecraft-font">K/D RATIO</span>
              </div>
              <p className="text-3xl font-bold text-orange-400 minecraft-font">{playerStats?.kd || '0.00'}</p>
              <p className="text-xs text-gray-500 mt-1">{playerStats?.kills || 0}K {playerStats?.deaths || 0}D</p>
            </div>

            <div className="bg-gray-800/70 rounded-lg p-4 border-2 border-cyan-500">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-gray-400 minecraft-font">TOTAL MATCHES</span>
              </div>
              <p className="text-3xl font-bold text-cyan-400 minecraft-font">{playerStats?.totalGames || 0}</p>
            </div>

            <div className="bg-gray-800/70 rounded-lg p-4 border-2 border-pink-500">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-pink-400" />
                <span className="text-sm text-gray-400 minecraft-font">GLOBAL RANK</span>
              </div>
              <p className="text-3xl font-bold text-pink-400 minecraft-font">#{playerStats?.rank || 'N/A'}</p>
            </div>
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
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [seasonInfo, setSeasonInfo] = useState({ number: 2, daysLeft: null });
  const [sortConfig, setSortConfig] = useState({ key: 'globalRank', direction: 'asc' });

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError(null);
      setLoadingProgress({ loaded: 0, total: 0 });

      // Lấy thông tin mùa hiện tại
      const seasonData = await apiService.getCurrentSeason();
      const daysLeft = seasonData.endsAt ? calculateDaysLeft(seasonData.endsAt) : null;
      setSeasonInfo({ number: seasonData.number, daysLeft });

      // Lấy danh sách người chơi
      const users = await apiService.getLeaderboard('VN', 2, 100);
      setLoadingProgress({ loaded: 0, total: users.length });

      // Tải chi tiết từng người chơi
      const playersWithDetails = [];
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (user && user.username) {
          try {
            const details = await apiService.getUserDetails(user.username);
            if (details) {
              playersWithDetails.push({
                ...user,
                ...details,
                globalRank: i + 1
              });
            }
          } catch (err) {
            console.error(`Error loading ${user.username}:`, err);
          }
        }
        setLoadingProgress({ loaded: i + 1, total: users.length });
      }

      const sortedPlayers = [...playersWithDetails].sort((a, b) => {
        const eloA = a.eloRate || 0;
        const eloB = b.eloRate || 0;
        return eloB - eloA;
      }).map((player, index) => ({
        ...player,
        globalRank: index + 1
      }));

      setPlayers(sortedPlayers);
      setFilteredPlayers(sortedPlayers);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError({
        title: 'KHÔNG THỂ TẢI DỮ LIỆU',
        message: 'Vui lòng kiểm tra kết nối internet và thử lại sau.',
        details: err.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Tìm kiếm
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPlayers(players);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = players.filter(player => {
      const nickname = (player.nickname || '').toLowerCase();
      const username = (player.username || '').toLowerCase();
      return nickname.includes(query) || username.includes(query);
    });
    
    setFilteredPlayers(filtered);
  }, [searchQuery, players]);

  // Sắp xếp
  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    
    const sorted = [...filteredPlayers].sort((a, b) => {
      let aValue, bValue;
      
      switch (key) {
        case 'name':
          aValue = (a.nickname || a.username || '').toLowerCase();
          bValue = (b.nickname || b.username || '').toLowerCase();
          break;
        case 'elo':
          aValue = a.eloRate || 0;
          bValue = b.eloRate || 0;
          break;
        case 'winRate':
          const statsA = calculateStats(a);
          const statsB = calculateStats(b);
          aValue = parseFloat(statsA?.winRate || 0);
          bValue = parseFloat(statsB?.winRate || 0);
          break;
        case 'bestTime':
          const bestA = a.statistics?.fastest_win || 999999999;
          const bestB = b.statistics?.fastest_win || 999999999;
          aValue = bestA;
          bValue = bestB;
          break;
        case 'forfeitRate':
          const statsA2 = calculateStats(a);
          const statsB2 = calculateStats(b);
          aValue = parseFloat(statsA2?.forfeitRate || 0);
          bValue = parseFloat(statsB2?.forfeitRate || 0);
          break;
        default:
          aValue = a.globalRank || 9999;
          bValue = b.globalRank || 9999;
      }
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredPlayers(sorted);
  };

  if (loading) {
    const progress = loadingProgress.total > 0 
      ? Math.round((loadingProgress.loaded / loadingProgress.total) * 100)
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
        {/* Header Banner */}
        <div 
          className="w-full h-48 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://i.imgur.com/3JQZ8hq.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
          <div className="text-center p-8 bg-gray-900/80 rounded-xl border-2 border-green-500 max-w-md">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-green-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            
            <p className="text-2xl font-bold text-white mb-4 minecraft-font">ĐANG TẢI DỮ LIỆU</p>
            
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Đã tải: {loadingProgress.loaded}/{loadingProgress.total}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <p className="text-green-400 text-sm">
              Đang tải thông tin {loadingProgress.loaded} người chơi Việt Nam...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900">
        {/* Header Banner */}
        <div 
          className="w-full h-48 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://i.imgur.com/3JQZ8hq.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] p-4">
          <div className="text-center p-8 bg-gray-900/90 rounded-xl border-2 border-red-500 max-w-md w-full">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4 minecraft-font">
              {error.title}
            </h2>
            <p className="text-gray-300 mb-6">{error.message}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={fetchLeaderboard}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold transition minecraft-font"
              >
                THỬ LẠI
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition minecraft-font"
              >
                TẢI LẠI TRANG
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalPlayers = players.length;
  const avgElo = totalPlayers > 0 
    ? Math.round(players.reduce((sum, p) => sum + (p.eloRate || 0), 0) / totalPlayers)
    : 0;
  const topElo = players[0]?.eloRate ? Math.round(players[0].eloRate).toString() : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 text-white">
      {/* Header Banner */}
      <div 
        className="w-full h-64 bg-cover bg-center relative"
        style={{
          backgroundImage: 'url(https://i.imgur.com/3JQZ8hq.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-8">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-yellow-400 mb-2 minecraft-font">
                MCSR VIỆT NAM
              </h1>
              <p className="text-green-300 text-lg minecraft-font">
                BẢNG XẾP HẠNG CHÍNH THỨC
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-3xl font-bold text-white mb-2 minecraft-font">
                {totalPlayers} NGƯỜI CHƠI
              </p>
              <div className="flex items-center gap-2 justify-end">
                <Globe className="w-5 h-5 text-green-400" />
                <span className="text-green-300">VIỆT NAM TOP 100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 -mt-8 relative z-20">
        {/* Season Info */}
        <div className="mb-8">
          <SeasonInfo 
            season={seasonInfo.number} 
            daysLeft={seasonInfo.daysLeft} 
          />
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Search Box */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-green-400" />
              <input
                type="text"
                placeholder="TÌM KIẾM THEO TÊN NGƯỜI CHƠI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-900/80 border-2 border-green-500 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 minecraft-font text-sm"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/60 rounded-lg p-4 border border-green-600">
              <p className="text-sm text-green-300 minecraft-font">TOP 1 ELO</p>
              <p className="text-2xl font-bold text-yellow-400 minecraft-font">{topElo}</p>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-4 border border-blue-600">
              <p className="text-sm text-blue-300 minecraft-font">AVG ELO</p>
              <p className="text-2xl font-bold text-blue-400 minecraft-font">{avgElo}</p>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-gray-900/60 rounded-xl border-2 border-green-600 overflow-hidden mb-8">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-green-700 to-emerald-700 p-4 border-b-2 border-green-900">
            <div className="grid grid-cols-12 gap-4 text-sm font-bold">
              <div className="col-span-1 text-center">
                <button 
                  onClick={() => handleSort('globalRank')}
                  className="hover:text-yellow-300 transition flex items-center justify-center gap-1"
                >
                  RANK
                  {sortConfig.key === 'globalRank' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
              <div className="col-span-4">
                <button 
                  onClick={() => handleSort('name')}
                  className="hover:text-yellow-300 transition flex items-center gap-1"
                >
                  NGƯỜI CHƠI
                  {sortConfig.key === 'name' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
              <div className="col-span-1 text-center">
                <button 
                  onClick={() => handleSort('elo')}
                  className="hover:text-yellow-300 transition flex items-center justify-center gap-1"
                >
                  ELO
                  {sortConfig.key === 'elo' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
              <div className="col-span-1 text-center">
                <button 
                  onClick={() => handleSort('winRate')}
                  className="hover:text-yellow-300 transition flex items-center justify-center gap-1"
                >
                  WIN%
                  {sortConfig.key === 'winRate' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
              <div className="col-span-1 text-center hidden md:block">
                <button 
                  onClick={() => handleSort('bestTime')}
                  className="hover:text-yellow-300 transition flex items-center justify-center gap-1"
                >
                  BEST
                  {sortConfig.key === 'bestTime' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
              <div className="col-span-1 text-center hidden md:block">
                <button 
                  onClick={() => handleSort('forfeitRate')}
                  className="hover:text-yellow-300 transition flex items-center justify-center gap-1"
                >
                  FORFEIT%
                  {sortConfig.key === 'forfeitRate' && (
                    <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </div>
              <div className="col-span-2 text-center hidden lg:block">
                <span>THỐNG KÊ</span>
              </div>
              <div className="col-span-1 text-center">
                <span>CHI TIẾT</span>
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="max-h-[500px] overflow-y-auto">
            {filteredPlayers.map((player) => {
              const stats = calculateStats(player);
              
              return (
                <div 
                  key={player.uuid || player.username}
                  className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="grid grid-cols-12 gap-4 p-4 items-center">
                    {/* Rank */}
                    <div className="col-span-1 text-center">
                      <div className="flex justify-center">
                        {player.globalRank <= 3 ? (
                          getRankIcon(player.globalRank)
                        ) : (
                          <span className="text-xl font-bold text-white minecraft-font">
                            #{player.globalRank}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Player Info */}
                    <div className="col-span-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getPlayerHead(player.uuid)}
                          alt={player.nickname}
                          className="w-10 h-10 rounded-lg border border-green-500"
                        />
                        <div>
                          <p className="font-bold text-white truncate minecraft-font">
                            {player.nickname || player.username}
                          </p>
                          <p className="text-xs text-gray-400">
                            {player.username && player.username !== player.nickname ? `@${player.username}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ELO */}
                    <div className="col-span-1 text-center">
                      <p className="text-xl font-bold text-green-400 minecraft-font">
                        {stats?.elo || 0}
                      </p>
                    </div>

                    {/* Win Rate */}
                    <div className="col-span-1 text-center">
                      <p className={`text-lg font-bold ${
                        parseFloat(stats?.winRate || 0) >= 50 ? 'text-green-400' : 'text-yellow-400'
                      } minecraft-font`}>
                        {stats?.winRate || 0}%
                      </p>
                    </div>

                    {/* Best Time (Desktop only) */}
                    <div className="col-span-1 text-center hidden md:block">
                      <p className="text-sm font-bold text-blue-400 minecraft-font">
                        {formatTime(stats?.bestTime || 0)}
                      </p>
                    </div>

                    {/* Forfeit Rate (Desktop only) */}
                    <div className="col-span-1 text-center hidden md:block">
                      <p className={`text-sm font-bold ${
                        parseFloat(stats?.forfeitRate || 0) > 10 ? 'text-red-400' : 'text-gray-400'
                      } minecraft-font`}>
                        {stats?.forfeitRate || 0}%
                      </p>
                    </div>

                    {/* Stats (Desktop only) */}
                    <div className="col-span-2 text-center hidden lg:block">
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-400">K/D</p>
                          <p className="text-sm font-bold text-orange-400 minecraft-font">
                            {stats?.kd || '0.00'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">AVG</p>
                          <p className="text-sm font-bold text-yellow-400 minecraft-font">
                            {formatTime(stats?.avgTime || 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Detail Button */}
                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => setSelectedPlayer(player)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2 mx-auto"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-sm font-bold hidden sm:inline">XEM</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* No Results */}
          {filteredPlayers.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-xl text-gray-400 minecraft-font">KHÔNG TÌM THẤY NGƯỜI CHƠI</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mb-8">
          <p className="minecraft-font">DỮ LIỆU ĐƯỢC CẬP NHẬT TỪ MCSR RANKED API</p>
          <p className="text-xs mt-2 text-gray-600">
            Mùa {seasonInfo.number} • Còn {seasonInfo.daysLeft || '?'} ngày • {totalPlayers} người chơi Việt Nam
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={fetchLeaderboard}
              disabled={refreshing}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg text-white font-bold transition disabled:opacity-50 flex items-center gap-2 minecraft-font text-sm"
            >
              {refreshing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  ĐANG LÀM MỚI...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  LÀM MỚI DỮ LIỆU
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          stats={calculateStats(selectedPlayer)}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
