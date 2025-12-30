'use client';
import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Clock, Award, Target, Search, TrendingUp, Eye, X, Zap, Flame, Star, ChevronDown, ChevronUp, Loader, Check, XCircle, Percent, Users, Swords, Heart, BarChart3, Calendar, Globe, Crown, Skull, Timer, Hash, Activity, AlertCircle, Flag, MapPin, Filter, ArrowUpDown } from 'lucide-react';

// ==================== API SERVICE ====================
const API_BASE = 'https://api.mcsrranked.com';

const apiService = {
  async fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Fetching: ${url} (attempt ${i + 1})`);
        const response = await fetch(url);
        console.log(`Response status: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('Response text:', text.substring(0, 500)); // Log first 500 chars
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError);
          throw new Error('Invalid JSON response from server');
        }
        
        console.log('Parsed data:', data);
        
        if (data.status === 'error') {
          throw new Error(data.data || data.message || 'API Error');
        }
        
        return data;
      } catch (err) {
        console.error(`Attempt ${i + 1} failed:`, err.message);
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  },

  async getSeasonInfo() {
    try {
      console.log('Getting season info...');
      const data = await this.fetchWithRetry(`${API_BASE}/leaderboard?count=1`);
      console.log('Season data:', data);
      
      // Kiểm tra nhiều cấu trúc dữ liệu có thể có
      const season = data.data?.season || data.season || 2;
      console.log('Detected season:', season);
      return season;
    } catch (err) {
      console.error('Error getting season:', err);
      return 2; // fallback
    }
  },

  async getLeaderboard(country = 'VN', type = 2, count = 100) {
    console.log(`Getting leaderboard for ${country}, type ${type}, count ${count}`);
    
    const url = `${API_BASE}/leaderboard?type=${type}&country=${country}&count=${count}`;
    console.log('Full URL:', url);
    
    const data = await this.fetchWithRetry(url);
    console.log('Leaderboard response:', data);
    
    // Kiểm tra nhiều cấu trúc dữ liệu có thể có
    if (data.data && Array.isArray(data.data)) {
      return { users: data.data };
    } else if (data.data && data.data.users) {
      return data.data;
    } else if (Array.isArray(data)) {
      return { users: data };
    } else if (data.users) {
      return data;
    } else {
      console.warn('Unexpected data structure:', data);
      return { users: [] };
    }
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
    const stats = player.statistics || {};
    const wins = stats.win || stats.wins || 0;
    const loses = stats.lose || stats.losses || 0;
    const total = wins + loses;
    return total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
  },

  calculateKD(player) {
    const stats = player.statistics || {};
    const kills = stats.kills || 0;
    const deaths = stats.deaths || 0;
    return deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(0);
  },

  getSafeNickname(player) {
    return player.nickname || player.username || player.name || 'Unknown';
  },

  getSafeElo(player) {
    return player.eloRate || player.elo || player.rating || 0;
  }
};

// ==================== SORTING FUNCTIONS ====================
const sortPlayers = (players, sortBy, sortDirection) => {
  const sorted = [...players];
  
  const getStatValue = (player, stat) => {
    const stats = player.statistics || {};
    switch (stat) {
      case 'elo':
        return utils.getSafeElo(player);
      case 'wins':
        return stats.win || stats.wins || 0;
      case 'winrate':
        return parseFloat(utils.calculateWinRate(player)) || 0;
      case 'kd':
        return parseFloat(utils.calculateKD(player)) || 0;
      case 'matches':
        const wins = stats.win || stats.wins || 0;
        const loses = stats.lose || stats.losses || 0;
        return wins + loses;
      default:
        return player.globalRank || 9999;
    }
  };

  sorted.sort((a, b) => {
    const valueA = getStatValue(a, sortBy);
    const valueB = getStatValue(b, sortBy);
    
    if (sortDirection === 'asc') {
      return valueA - valueB;
    } else {
      return valueB - valueA;
    }
  });
  
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
      className={`flex items-center gap-1 px-3 py-2 rounded-lg transition font-bold ${
        isActive 
          ? 'bg-green-700 text-white' 
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
      }`}
    >
      <span>{label}</span>
      {isActive && (
        sortDirection === 'asc' ? 
          <ChevronUp className="w-4 h-4" /> : 
          <ChevronDown className="w-4 h-4" />
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
          utils.getSafeNickname(player).toLowerCase().includes(searchQuery.toLowerCase())
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
      console.log('Starting to fetch leaderboard...');

      const season = await apiService.getSeasonInfo();
      setCurrentSeason(season);
      console.log('Season set to:', season);

      const result = await apiService.getLeaderboard('VN', 2, 100);
      console.log('Leaderboard result:', result);
      
      const users = result.users || [];
      console.log('Users found:', users.length);
      
      if (users.length === 0) {
        console.warn('No users found in leaderboard');
        // Thử fetch global leaderboard nếu VN không có data
        const globalResult = await apiService.getLeaderboard('', 2, 100);
        const globalUsers = globalResult.users || [];
        console.log('Global users:', globalUsers.length);
        
        // Filter for VN players or show all if still empty
        const vnPlayers = globalUsers.filter(p => p.country === 'VN');
        console.log('VN players from global:', vnPlayers.length);
        
        const finalPlayers = vnPlayers.length > 0 ? vnPlayers : globalUsers;
        
        const sortedPlayers = finalPlayers
          .sort((a, b) => (utils.getSafeElo(b) || 0) - (utils.getSafeElo(a) || 0))
          .map((player, index) => ({
            ...player,
            globalRank: index + 1
          }));
          
        console.log('Final players:', sortedPlayers);
        setPlayers(sortedPlayers);
        const sorted = sortPlayers(sortedPlayers, sortBy, sortDirection);
        setFilteredPlayers(sorted);
      } else {
        const sortedPlayers = users
          .sort((a, b) => (utils.getSafeElo(b) || 0) - (utils.getSafeElo(a) || 0))
          .map((player, index) => ({
            ...player,
            globalRank: index + 1
          }));
          
        console.log('Sorted players:', sortedPlayers);
        setPlayers(sortedPlayers);
        const sorted = sortPlayers(sortedPlayers, sortBy, sortDirection);
        setFilteredPlayers(sorted);
      }
      
      console.log('Fetch completed successfully');
      
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError({
        title: 'Không thể tải dữ liệu',
        message: 'Đã xảy ra lỗi khi kết nối đến máy chủ',
        details: err.message,
        stack: err.stack
      });
      
      // Thử dữ liệu mẫu để test UI
      const mockPlayers = Array.from({ length: 20 }, (_, i) => ({
        uuid: `player-${i}`,
        nickname: `Người chơi ${i + 1}`,
        username: `player${i + 1}`,
        country: 'VN',
        eloRate: 1500 - (i * 50),
        statistics: {
          win: Math.floor(Math.random() * 100),
          lose: Math.floor(Math.random() * 50),
          kills: Math.floor(Math.random() * 200),
          deaths: Math.floor(Math.random() * 100)
        },
        globalRank: i + 1
      }));
      
      setPlayers(mockPlayers);
      const sorted = sortPlayers(mockPlayers, sortBy, sortDirection);
      setFilteredPlayers(sorted);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('Loading state set to false');
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
    const stats = player.statistics || {};
    const wins = stats.win || stats.wins || 0;
    const loses = stats.lose || stats.losses || 0;
    const total = wins + loses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    const kills = stats.kills || 0;
    const deaths = stats.deaths || 0;
    const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills > 0 ? kills.toFixed(0) : '0.00';

    return { wins, loses, total, winRate, kills, deaths, kd };
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
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
              Đang kết nối đến MCSR Ranked API
            </p>
            <p className="text-gray-400 text-sm mt-2">
              (Kiểm tra console để xem chi tiết)
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalPlayers = players.length;
  const avgElo = totalPlayers > 0 
    ? Math.round(players.reduce((sum, p) => sum + (utils.getSafeElo(p) || 0), 0) / totalPlayers)
    : 0;
  const topElo = totalPlayers > 0 ? utils.getSafeElo(players[0]).toFixed(0) : 0;

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
              {error && (
                <span className="bg-yellow-700 px-3 py-1 rounded-lg text-yellow-300 text-sm ml-2">
                  Dữ liệu mẫu
                </span>
              )}
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
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
              <button
                onClick={fetchLeaderboard}
                disabled={refreshing}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-bold hover:scale-105 transition transform disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {refreshing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    ĐANG TẢI...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    LÀM MỚI DỮ LIỆU
                  </>
                )}
              </button>
              <button
                onClick={() => console.log('Current players:', players)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-bold hover:scale-105 transition transform flex items-center justify-center gap-2"
              >
                <span>DEBUG CONSOLE</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Warning */}
        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-900/60 to-orange-900/60 rounded-xl border-2 border-yellow-500">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-yellow-300 font-bold">
                  Đang sử dụng dữ liệu mẫu. API có thể không khả dụng.
                </p>
                <p className="text-yellow-400/80 text-sm mt-1">
                  {error.details}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Section */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-2xl border-4 border-green-600 shadow-2xl overflow-hidden">
          {/* Leaderboard Header */}
          <div className="bg-gradient-to-r from-green-700 to-emerald-700 p-4 border-b-4 border-green-900">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                <Trophy className="w-7 h-7 text-yellow-400" />
                BẢNG XẾP HẠNG VIỆT NAM
                <span className="text-sm bg-green-800 px-2 py-1 rounded-lg">
                  Sắp xếp: {sortBy} ({sortDirection})
                </span>
              </h2>
              <div className="text-sm font-bold">
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
                <button
                  onClick={fetchLeaderboard}
                  className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold"
                >
                  Tải lại dữ liệu
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlayers.map((player) => {
                  const stats = getPlayerStats(player);
                  const elo = utils.getSafeElo(player);
                  
                  return (
                    <div
                      key={player.uuid || player.id || Math.random()}
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
                              src={utils.getPlayerAvatar(player.uuid || '8667ba71b85a4004af54457a9734eed7', 60)}
                              alt={utils.getSafeNickname(player)}
                              className="w-14 h-14 rounded-xl border-2 border-green-500"
                              onError={(e) => {
                                e.target.src = utils.getPlayerAvatar('8667ba71b85a4004af54457a9734eed7', 60);
                              }}
                            />
                            <div>
                              <p className="text-xl font-black text-white">
                                {utils.getSafeNickname(player)}
                                <span className="ml-2 text-xl">
                                  {utils.getCountryFlag(player.country || 'vn')}
                                </span>
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm font-bold text-green-400">
                                  {elo.toFixed(0)} ELO
                                </span>
                                <span className="text-xs text-gray-400 font-bold">
                                  #{player.globalRank}
                                </span>
                                {stats.total > 0 && (
                                  <span className="text-xs font-bold bg-green-700 px-2 py-1 rounded-lg">
                                    {stats.wins}W - {stats.loses}L
                                  </span>
                                )}
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
            {error && ' (Đang sử dụng dữ liệu mẫu)'}
          </p>
          <p className="text-gray-600 text-xs mt-2">
            © 2024 Minecraft Speedrunning Vietnam Leaderboard
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Mở console để xem chi tiết debug
          </p>
        </div>
      </div>

      {/* Floating Refresh Button */}
      <button
        onClick={fetchLeaderboard}
        disabled={refreshing}
        className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full shadow-2xl hover:scale-110 transition transform disabled:opacity-50 z-50"
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
