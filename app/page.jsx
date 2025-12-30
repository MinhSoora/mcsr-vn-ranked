'use client';
import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Clock, Award, Target, Search, TrendingUp, Eye, X, Zap, Flame, Star, ChevronDown, ChevronUp, Loader, Check, XCircle, Percent, Users, Swords, Heart, BarChart3, Calendar, Globe, Crown, Skull, Timer, Hash, Activity, AlertCircle, Flag, MapPin, Filter, ArrowUpDown } from 'lucide-react';

// ==================== API SERVICE ====================
const API_BASE = 'https://api.mcsrranked.com/api';

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
    return data.data || { users: [] };
  }
};

// ==================== UTILITY FUNCTIONS ====================
const utils = {
  formatTime(ms) {
    if (!ms && ms !== 0) return 'N/A';
    const totalSeconds = ms / 1000;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor(ms % 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  },

  getCountryFlag(code) {
    const flags = {
      'vn': '🇻🇳', 'us': '🇺🇸', 'gb': '🇬🇧', 'ca': '🇨🇦',
      'au': '🇦🇺', 'de': '🇩🇪', 'fr': '🇫🇷', 'jp': '🇯🇵',
      'kr': '🇰🇷', 'cn': '🇨🇳'
    };
    return flags[code?.toLowerCase()] || '🌐';
  },

  getPlayerAvatar(uuid, size = 80) {
    return `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`;
  },

  getRankIcon(rank) {
    if (rank === 1) return <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-2xl animate-pulse" />;
    if (rank === 2) return <Medal className="w-10 h-10 text-gray-300 drop-shadow-xl" />;
    if (rank === 3) return <Medal className="w-10 h-10 text-orange-400 drop-shadow-xl" />;
    return <span className="text-2xl font-black text-white drop-shadow-lg">#{rank}</span>;
  },

  calculateWinRate(player) {
    const wins = player.statistics?.win || player.statistics?.wins || 0;
    const loses = player.statistics?.lose || player.statistics?.losses || 0;
    const total = wins + loses;
    return total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
  },

  calculateKD(player) {
    const kills = player.statistics?.kills || 0;
    const deaths = player.statistics?.deaths || 0;
    return deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(0);
  }
};

// ==================== SORTING FUNCTIONS ====================
const sortPlayers = (players, sortBy, sortDirection) => {
  const sorted = [...players];
  
  switch (sortBy) {
    case 'elo':
      sorted.sort((a, b) => {
        const eloA = a.eloRate || 0;
        const eloB = b.eloRate || 0;
        return sortDirection === 'asc' ? eloA - eloB : eloB - eloA;
      });
      break;
    
    case 'rank':
      sorted.sort((a, b) => {
        const rankA = a.globalRank || 9999;
        const rankB = b.globalRank || 9999;
        return sortDirection === 'asc' ? rankA - rankB : rankB - rankA;
      });
      break;
    
    case 'wins':
      sorted.sort((a, b) => {
        const winsA = a.statistics?.win || a.statistics?.wins || 0;
        const winsB = b.statistics?.win || b.statistics?.wins || 0;
        return sortDirection === 'asc' ? winsA - winsB : winsB - winsA;
      });
      break;
    
    case 'winrate':
      sorted.sort((a, b) => {
        const rateA = utils.calculateWinRate(a);
        const rateB = utils.calculateWinRate(b);
        return sortDirection === 'asc' ? rateA - rateB : rateB - rateA;
      });
      break;
    
    case 'kd':
      sorted.sort((a, b) => {
        const kdA = parseFloat(utils.calculateKD(a)) || 0;
        const kdB = parseFloat(utils.calculateKD(b)) || 0;
        return sortDirection === 'asc' ? kdA - kdB : kdB - kdA;
      });
      break;
    
    case 'matches':
      sorted.sort((a, b) => {
        const winsA = a.statistics?.win || a.statistics?.wins || 0;
        const losesA = a.statistics?.lose || a.statistics?.losses || 0;
        const winsB = b.statistics?.win || b.statistics?.wins || 0;
        const losesB = b.statistics?.lose || b.statistics?.losses || 0;
        const totalA = winsA + losesA;
        const totalB = winsB + losesB;
        return sortDirection === 'asc' ? totalA - totalB : totalB - totalA;
      });
      break;
    
    default:
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

// ==================== STAT CARD COMPONENT ====================
const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-xs text-gray-400 font-bold">{label}</span>
    </div>
    <p className={`text-2xl font-black text-${color}-400`}>{value}</p>
  </div>
);

// ==================== SORT HEADER COMPONENT ====================
const SortHeader = ({ label, sortKey, currentSort, sortDirection, onClick }) => {
  const isActive = currentSort === sortKey;
  
  return (
    <button
      onClick={() => onClick(sortKey)}
      className="flex items-center gap-1 hover:bg-gray-800/50 px-3 py-2 rounded-lg transition"
    >
      <span className={`font-bold ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
        {label}
      </span>
      {isActive && (
        <ArrowUpDown className={`w-4 h-4 ${sortDirection === 'asc' ? 'text-green-300' : 'text-green-500'}`} />
      )}
    </button>
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
  const [currentSeason, setCurrentSeason] = useState(2);
  const [sortBy, setSortBy] = useState('rank');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      const sorted = sortPlayers(players, sortBy, sortDirection);
      setFilteredPlayers(sorted);
    } else {
      const filtered = players.filter(
        (player) =>
          (player.nickname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (player.username || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      const sorted = sortPlayers(filtered, sortBy, sortDirection);
      setFilteredPlayers(sorted);
    }
  }, [searchQuery, players, sortBy, sortDirection]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError(null);

      const season = await apiService.getSeasonInfo();
      setCurrentSeason(season);

      const result = await apiService.getLeaderboard('VN', 2, 100);
      const vnPlayers = (result.users || [])
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
        details: err.message
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

  const getPlayerStats = (player) => {
    const wins = player.statistics?.win || player.statistics?.wins || 0;
    const loses = player.statistics?.lose || player.statistics?.losses || 0;
    const total = wins + loses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    const kills = player.statistics?.kills || 0;
    const deaths = player.statistics?.deaths || 0;
    const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(0);

    return { wins, loses, total, winRate, kills, deaths, kd };
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: 'url(https://wallpapercave.com/wp/wp2571595.png)',
            filter: 'blur(8px)',
            transform: 'scale(1.1)'
          }}
        />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 border-8 border-green-500/30 rounded-2xl"></div>
              <div className="absolute inset-0 border-8 border-green-400 border-t-transparent rounded-2xl animate-spin"></div>
            </div>
            <p
              className="text-white text-4xl font-black tracking-wider animate-pulse"
              style={{ textShadow: '4px 4px 0 #000, 0 0 20px #4ade80' }}
            >
              ĐANG TẢI...
            </p>
            <p className="text-green-400 text-xl font-bold mt-4">
              Đang lấy dữ liệu từ MCSR Ranked
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-red-900 to-gray-900">
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="text-center p-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-4 border-red-500 shadow-2xl max-w-lg w-full">
            <AlertCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
            <h2 className="text-4xl font-black text-white mb-4" style={{ textShadow: '2px 2px 0 #000' }}>
              {error.title}
            </h2>
            <p className="text-xl text-gray-300 mb-4">{error.message}</p>
            {error.details && (
              <div className="bg-red-900/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-red-300 text-sm font-mono">{error.details}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={fetchLeaderboard}
                className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-black text-lg hover:scale-105 transition transform shadow-lg flex-1"
              >
                THỬ LẠI
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl text-white font-black text-lg hover:scale-105 transition transform shadow-lg flex-1"
              >
                TẢI LẠI TRANG
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              Nếu lỗi vẫn tiếp diễn, vui lòng liên hệ quản trị viên
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalPlayers = players.length;
  const avgElo = totalPlayers > 0 
    ? Math.round(players.reduce((sum, p) => sum + (p.eloRate || 0), 0) / totalPlayers)
    : 0;
  const topElo = players[0]?.eloRate?.toFixed(0) || 0;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{
          backgroundImage: 'url(https://wallpapercave.com/wp/wp2571595.png)',
          filter: 'blur(4px)',
          transform: 'scale(1.05)'
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="flex items-center justify-center gap-4">
              <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-2xl" />
              <h1
                className="text-5xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400"
                style={{ textShadow: '4px 4px 0 #000, 0 0 30px rgba(74, 222, 128, 0.5)' }}
              >
                MCSR VIỆT NAM
              </h1>
              <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-2xl" />
            </div>
            <p className="text-xl text-green-300 font-bold flex items-center gap-2">
              <Globe className="w-5 h-5" />
              LEADERBOARD SEASON {currentSeason}
              <span className="bg-green-700 px-3 py-1 rounded-lg text-white text-sm ml-2">
                {totalPlayers} NGƯỜI CHƠI
              </span>
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-green-800/60 to-green-900/60 rounded-xl p-4 border-2 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300 font-bold">TOP 1 ELO</p>
                  <p className="text-2xl font-black text-yellow-400">{topElo}</p>
                </div>
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-800/60 to-blue-900/60 rounded-xl p-4 border-2 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300 font-bold">TRUNG BÌNH</p>
                  <p className="text-2xl font-black text-blue-400">{avgElo}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-800/60 to-purple-900/60 rounded-xl p-4 border-2 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300 font-bold">TOP 100</p>
                  <p className="text-2xl font-black text-purple-400">
                    {Math.min(totalPlayers, 100)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-800/60 to-orange-900/60 rounded-xl p-4 border-2 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-300 font-bold">SEASON</p>
                  <p className="text-2xl font-black text-orange-400">{currentSeason}</p>
                </div>
                <Flag className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-green-400" />
              <input
                type="text"
                placeholder="Tìm kiếm người chơi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-900/80 border-4 border-green-500 rounded-xl text-white text-lg font-bold placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-green-500/50 focus:border-green-400 backdrop-blur-sm"
              />
            </div>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={fetchLeaderboard}
                disabled={refreshing}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-bold hover:scale-105 transition transform disabled:opacity-50 flex items-center gap-2"
              >
                {refreshing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    ĐANG TẢI...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    LÀM MỚI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-2xl border-4 border-green-600 shadow-2xl overflow-hidden">
          {/* Leaderboard Header */}
          <div className="bg-gradient-to-r from-green-700 to-emerald-700 p-4 border-b-4 border-green-900">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <Trophy className="w-7 h-7 text-yellow-400" />
                BẢNG XẾP HẠNG VIỆT NAM
              </h2>
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="bg-green-800 px-3 py-1 rounded-lg text-green-300">
                  {filteredPlayers.length} NGƯỜI CHƠI
                </span>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex flex-wrap gap-2 mt-4">
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
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-2xl font-black text-gray-400">
                  Không tìm thấy người chơi
                </p>
                <p className="text-gray-500 mt-2">Thử tìm kiếm với từ khóa khác</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlayers.map((player) => {
                  const stats = getPlayerStats(player);
                  
                  return (
                    <div
                      key={player.uuid}
                      className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 hover:from-gray-700/60 hover:to-gray-600/60 rounded-xl p-4 transition-all duration-300 border-2 border-transparent hover:border-green-500/30 backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between">
                        {/* Left: Rank and Player Info */}
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-16 text-center">
                            {utils.getRankIcon(player.globalRank)}
                          </div>

                          <div className="flex items-center gap-3">
                            <img
                              src={utils.getPlayerAvatar(player.uuid, 60)}
                              alt={player.nickname}
                              className="w-14 h-14 rounded-xl border-2 border-green-500"
                              onError={(e) => {
                                e.target.src = utils.getPlayerAvatar('8667ba71b85a4004af54457a9734eed7', 60);
                              }}
                            />
                            <div>
                              <p className="text-xl font-black text-white">
                                {player.nickname || player.username || 'Unknown'}
                                {player.country === 'VN' && (
                                  <span className="ml-2 text-xl">{utils.getCountryFlag('vn')}</span>
                                )}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm font-bold text-green-400">
                                  {player.eloRate?.toFixed(0) || 0} ELO
                                </span>
                                <span className="text-xs text-gray-400 font-bold">
                                  #{player.globalRank}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Stats */}
                        <div className="hidden lg:flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-xs text-gray-400 font-bold">THẮNG</p>
                            <p className="text-xl font-black text-green-400">{stats.wins}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400 font-bold">THUA</p>
                            <p className="text-xl font-black text-red-400">{stats.loses}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400 font-bold">WIN RATE</p>
                            <p className="text-xl font-black text-yellow-400">{stats.winRate}%</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400 font-bold">K/D</p>
                            <p className="text-xl font-black text-purple-400">{stats.kd}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-400 font-bold">TRẬN</p>
                            <p className="text-xl font-black text-blue-400">{stats.total}</p>
                          </div>
                        </div>

                        {/* Mobile Stats */}
                        <div className="lg:hidden">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-center">
                              <p className="text-xs text-gray-400 font-bold">W</p>
                              <p className="text-lg font-black text-green-400">{stats.wins}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-400 font-bold">L</p>
                              <p className="text-lg font-black text-red-400">{stats.loses}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-400 font-bold">%</p>
                              <p className="text-lg font-black text-yellow-400">{stats.winRate}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-400 font-bold">K/D</p>
                              <p className="text-lg font-black text-purple-400">{stats.kd}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Dữ liệu được cập nhật từ{' '}
            <a
              href="https://mcsrranked.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 font-bold hover:underline"
            >
              MCSR Ranked API
            </a>
          </p>
          <p className="text-gray-600 text-xs mt-2">
            © 2024 Minecraft Speedrunning Vietnam Leaderboard
          </p>
        </div>
      </div>

      {/* Floating Refresh Button */}
      <button
        onClick={fetchLeaderboard}
        disabled={refreshing}
        className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full shadow-2xl hover:scale-110 transition transform disabled:opacity-50"
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
