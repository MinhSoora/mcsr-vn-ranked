'use client';
import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Search, Loader, Zap, Crown, BarChart3, TrendingUp, Flag, Globe, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

// ==================== API SERVICE (FIXED) ====================
const API_BASE = 'https://api.mcsrranked.com';

const apiService = {
  async fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[API] Fetching: ${url} (attempt ${i + 1}/${retries})`);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[API] Success:`, data);
        
        // Check for API error response
        if (data.status === 'error') {
          throw new Error(data.message || 'API Error');
        }
        
        return data;
      } catch (err) {
        console.error(`[API] Attempt ${i + 1} failed:`, err.message);
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  },

  // Get leaderboard data
  async getLeaderboard(type = 2, country = '', count = 100) {
    const params = new URLSearchParams();
    params.append('type', type.toString());
    if (country) params.append('country', country.toUpperCase());
    params.append('count', count.toString());
    
    const url = `${API_BASE}/leaderboard?${params}`;
    const response = await this.fetchWithRetry(url);
    
    // API returns { status: 'success', data: { users: [...] } }
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    
    throw new Error('Invalid response format');
  },

  // Get user profile with full stats
  async getUserProfile(uuid) {
    const url = `${API_BASE}/users/${uuid}`;
    const response = await this.fetchWithRetry(url);
    
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    
    throw new Error('User not found');
  }
};

// ==================== UTILITY FUNCTIONS ====================
const utils = {
  getCountryFlag(code) {
    const flags = {
      'vn': '🇻🇳', 'us': '🇺🇸', 'gb': '🇬🇧', 'ca': '🇨🇦',
      'au': '🇦🇺', 'de': '🇩🇪', 'fr': '🇫🇷', 'jp': '🇯🇵',
      'kr': '🇰🇷', 'cn': '🇨🇳', 'pl': '🇵🇱', 'se': '🇸🇪',
      'dk': '🇩🇰', 'nl': '🇳🇱', 'br': '🇧🇷', 'mx': '🇲🇽'
    };
    return flags[code?.toLowerCase()] || '🌐';
  },

  getPlayerAvatar(uuid, size = 80) {
    if (!uuid) return `https://crafatar.com/avatars/8667ba71b85a4004af54457a9734eed7?size=${size}&overlay`;
    return `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`;
  },

  getRankIcon(rank) {
    if (rank === 1) return <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-2xl animate-pulse" />;
    if (rank === 2) return <Medal className="w-10 h-10 text-gray-300 drop-shadow-xl" />;
    if (rank === 3) return <Medal className="w-10 h-10 text-orange-400 drop-shadow-xl" />;
    return <span className="text-2xl font-black text-white drop-shadow-lg">#{rank}</span>;
  }
};

// ==================== SORTING ====================
const sortPlayers = (players, sortBy, sortDirection) => {
  const sorted = [...players];
  
  const getValue = (player, key) => {
    switch (key) {
      case 'rank': return player.rank || 999999;
      case 'elo': return player.eloRate || 0;
      case 'wins': return player.total_wins || 0;
      case 'loses': return player.total_loses || 0;
      case 'winrate': 
        const total = (player.total_wins || 0) + (player.total_loses || 0);
        return total > 0 ? (player.total_wins / total) * 100 : 0;
      default: return 0;
    }
  };

  sorted.sort((a, b) => {
    const valA = getValue(a, sortBy);
    const valB = getValue(b, sortBy);
    return sortDirection === 'asc' ? valA - valB : valB - valA;
  });
  
  return sorted;
};

// ==================== SORT HEADER ====================
const SortHeader = ({ label, sortKey, currentSort, sortDirection, onClick }) => {
  const isActive = currentSort === sortKey;
  
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={`flex items-center gap-1 px-3 py-2 rounded-lg transition font-bold ${
        isActive ? 'bg-green-700 text-white' : 'text-gray-400 hover:bg-gray-800'
      }`}
    >
      <span>{label}</span>
      {isActive && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
    </button>
  );
};

// ==================== MAIN APP ====================
export default function MCSRLeaderboardVN() {
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('rank');
  const [sortDirection, setSortDirection] = useState('asc');
  const [detailedStats, setDetailedStats] = useState({});

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    let filtered = players;
    if (searchQuery.trim()) {
      filtered = players.filter(p => 
        p.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    const sorted = sortPlayers(filtered, sortBy, sortDirection);
    setFilteredPlayers(sorted);
  }, [searchQuery, players, sortBy, sortDirection]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError(null);
      console.log('[FETCH] Starting leaderboard fetch for VN...');

      // Fetch leaderboard for Vietnam (type 2 = Ranked)
      const leaderboardData = await apiService.getLeaderboard(2, 'VN', 100);
      console.log('[FETCH] Leaderboard data:', leaderboardData);
      
      const users = leaderboardData.users || [];
      console.log(`[FETCH] Found ${users.length} Vietnamese players`);

      if (users.length === 0) {
        setError({
          title: 'Không có dữ liệu',
          message: 'Không tìm thấy người chơi Việt Nam trong bảng xếp hạng',
          type: 'warning'
        });
        setPlayers([]);
        setFilteredPlayers([]);
        return;
      }

      // Process players
      const processedPlayers = users.map((user, index) => ({
        uuid: user.uuid,
        nickname: user.nickname,
        eloRate: user.eloRate,
        eloRank: user.eloRank,
        country: user.country || 'vn',
        rank: index + 1,
        // Initialize stats (will be loaded on demand)
        total_wins: 0,
        total_loses: 0,
        statsLoaded: false
      }));

      console.log('[FETCH] Processed players:', processedPlayers.slice(0, 3));
      setPlayers(processedPlayers);
      setFilteredPlayers(sortPlayers(processedPlayers, sortBy, sortDirection));

      // Load stats for top 20 players
      console.log('[FETCH] Loading detailed stats for top players...');
      loadPlayerStats(processedPlayers.slice(0, 20));

    } catch (err) {
      console.error('[FETCH] Error:', err);
      setError({
        title: 'Lỗi kết nối',
        message: 'Không thể tải dữ liệu từ MCSR Ranked API',
        details: err.message,
        type: 'error'
      });
      setPlayers([]);
      setFilteredPlayers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPlayerStats = async (playersList) => {
    const statsMap = {};
    
    for (const player of playersList) {
      try {
        const profile = await apiService.getUserProfile(player.uuid);
        
        // Calculate total wins/loses from records
        let totalWins = 0;
        let totalLoses = 0;
        
        if (profile.records) {
          // Type 2 = Ranked matches
          if (profile.records['2']) {
            totalWins = profile.records['2'].win || 0;
            totalLoses = profile.records['2'].lose || 0;
          }
        }
        
        statsMap[player.uuid] = {
          total_wins: totalWins,
          total_loses: totalLoses,
          statsLoaded: true
        };
        
        console.log(`[STATS] ${player.nickname}: ${totalWins}W ${totalLoses}L`);
      } catch (err) {
        console.error(`[STATS] Failed to load stats for ${player.nickname}:`, err.message);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }
    
    setDetailedStats(statsMap);
    
    // Update players with stats
    setPlayers(prev => prev.map(p => ({
      ...p,
      ...(statsMap[p.uuid] || {})
    })));
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection(key === 'rank' ? 'asc' : 'desc');
    }
  };

  const getPlayerStats = (player) => {
    const wins = player.total_wins || 0;
    const loses = player.total_loses || 0;
    const total = wins + loses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
    
    return { wins, loses, total, winRate };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 border-8 border-green-500/30 rounded-2xl"></div>
            <div className="absolute inset-0 border-8 border-green-400 border-t-transparent rounded-2xl animate-spin"></div>
          </div>
          <p className="text-white text-4xl font-black tracking-wider animate-pulse">
            ĐANG TẢI...
          </p>
          <p className="text-green-400 text-xl font-bold mt-4">
            Đang kết nối đến MCSR Ranked API
          </p>
        </div>
      </div>
    );
  }

  const totalPlayers = players.length;
  const avgElo = totalPlayers > 0 
    ? Math.round(players.reduce((sum, p) => sum + (p.eloRate || 0), 0) / totalPlayers)
    : 0;
  const topElo = totalPlayers > 0 ? (players[0]?.eloRate || 0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-2xl" />
            <h1 className="text-5xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400">
              MCSR VIỆT NAM
            </h1>
            <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-2xl" />
          </div>
          <p className="text-xl text-green-300 font-bold flex items-center justify-center gap-2">
            <Globe className="w-5 h-5" />
            BẢNG XẾP HẠNG RANKED
            <span className="bg-green-700 px-3 py-1 rounded-lg text-white text-sm ml-2">
              {totalPlayers} NGƯỜI CHƠI
            </span>
          </p>
        </div>

        {/* Stats */}
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
                <p className="text-sm text-purple-300 font-bold">NGƯỜI CHƠI</p>
                <p className="text-2xl font-black text-purple-400">{totalPlayers}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-800/60 to-orange-900/60 rounded-xl p-4 border-2 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-300 font-bold">QUỐC GIA</p>
                <p className="text-2xl font-black text-orange-400">🇻🇳</p>
              </div>
              <Flag className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-green-400" />
            <input
              type="text"
              placeholder="Tìm kiếm người chơi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-900/80 border-4 border-green-500 rounded-xl text-white text-lg font-bold placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-green-500/50"
            />
          </div>
          <button
            onClick={fetchLeaderboard}
            disabled={refreshing}
            className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-bold hover:scale-105 transition disabled:opacity-50 flex items-center justify-center gap-2"
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
        </div>

        {/* Error */}
        {error && (
          <div className={`mb-6 p-4 rounded-xl border-2 ${
            error.type === 'error' 
              ? 'bg-red-900/60 border-red-500' 
              : 'bg-yellow-900/60 border-yellow-500'
          }`}>
            <div className="flex items-center gap-3">
              <AlertCircle className={`w-6 h-6 ${error.type === 'error' ? 'text-red-400' : 'text-yellow-400'}`} />
              <div>
                <p className={`font-bold ${error.type === 'error' ? 'text-red-300' : 'text-yellow-300'}`}>
                  {error.title}
                </p>
                <p className="text-sm mt-1 opacity-80">{error.message}</p>
                {error.details && <p className="text-xs mt-1 opacity-60">{error.details}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-2xl border-4 border-green-600 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-700 to-emerald-700 p-4 border-b-4 border-green-900">
            <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-4">
              <Trophy className="w-7 h-7 text-yellow-400" />
              BẢNG XẾP HẠNG
            </h2>
            
            {/* Sort Controls */}
            <div className="flex flex-wrap gap-2">
              <SortHeader label="Hạng" sortKey="rank" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="ELO" sortKey="elo" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="Thắng" sortKey="wins" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="Thua" sortKey="loses" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="Win Rate" sortKey="winrate" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
            </div>
          </div>

          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-2xl font-black text-gray-400">Không tìm thấy người chơi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlayers.map((player) => {
                  const stats = getPlayerStats(player);
                  
                  return (
                    <div
                      key={player.uuid}
                      className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 hover:from-gray-700/60 hover:to-gray-600/60 rounded-xl p-4 transition border-2 border-transparent hover:border-green-500/30"
                    >
                      <div className="flex items-center justify-between">
                        {/* Left */}
                        <div className="flex items-center gap-4">
                          <div className="w-16 text-center flex-shrink-0">
                            {utils.getRankIcon(player.rank)}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <img
                              src={utils.getPlayerAvatar(player.uuid, 60)}
                              alt={player.nickname}
                              className="w-14 h-14 rounded-xl border-2 border-green-500"
                              onError={(e) => e.target.src = utils.getPlayerAvatar(null, 60)}
                            />
                            <div>
                              <p className="text-xl font-black text-white">
                                {player.nickname}
                                <span className="ml-2 text-xl">{utils.getCountryFlag(player.country)}</span>
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm font-bold text-green-400">
                                  {player.eloRate} ELO
                                </span>
                                <span className="text-xs text-gray-400 font-bold">
                                  #{player.rank}
                                </span>
                                {player.statsLoaded && stats.total > 0 && (
                                  <span className="text-xs font-bold bg-green-700 px-2 py-1 rounded-lg">
                                    {stats.wins}W - {stats.loses}L
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right - Stats */}
                        {player.statsLoaded && stats.total > 0 ? (
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
                              <p className="text-xs text-gray-400 font-bold">WIN %</p>
                              <p className="text-xl font-black text-yellow-400">{stats.winRate}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-400 font-bold">TRẬN</p>
                              <p className="text-xl font-black text-blue-400">{stats.total}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="hidden lg:block text-gray-500 text-sm font-bold">
                            {player.statsLoaded ? 'Chưa có trận đấu' : 'Đang tải...'}
                          </div>
                        )}
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
            Dữ liệu từ{' '}
            <a href="https://mcsrranked.com" target="_blank" rel="noopener noreferrer" className="text-green-400 font-bold hover:underline">
              MCSR Ranked API
            </a>
          </p>
          <p className="text-gray-600 text-xs mt-2">
            © 2024 MCSR Vietnam Leaderboard
          </p>
        </div>
      </div>

      {/* Floating Refresh */}
      <button
        onClick={fetchLeaderboard}
        disabled={refreshing}
        className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full shadow-2xl hover:scale-110 transition disabled:opacity-50 z-50"
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
