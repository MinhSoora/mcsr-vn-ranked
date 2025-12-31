'use client';
import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Search, Loader, Zap, Crown, BarChart3, TrendingUp, Flag, Globe, AlertCircle, ChevronDown, ChevronUp, X, Clock, Target, Skull, Award } from 'lucide-react';

// ==================== API SERVICE ====================
const API_BASE = 'https://api.mcsrranked.com';

const apiService = {
  async fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message || 'API Error');
        return data;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  },

  async getLeaderboard(type = 2, country = '', count = 100) {
    const params = new URLSearchParams();
    params.append('type', type.toString());
    if (country) params.append('country', country.toUpperCase());
    params.append('count', count.toString());
    
    const url = `${API_BASE}/leaderboard?${params}`;
    const response = await this.fetchWithRetry(url);
    
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error('Invalid response format');
  },

  async getUserProfile(identifier) {
    const url = `${API_BASE}/users/${identifier}`;
    const response = await this.fetchWithRetry(url);
    
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    throw new Error('User not found');
  },

  async getUserMatches(identifier, type = 2, count = 50) {
    const url = `${API_BASE}/users/${identifier}/matches?type=${type}&count=${count}`;
    const response = await this.fetchWithRetry(url);
    
    if (response.status === 'success' && response.data) {
      return response.data;
    }
    return { matches: [] };
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
      'kr': '🇰🇷', 'cn': '🇨🇳', 'pl': '🇵🇱', 'se': '🇸🇪',
      'dk': '🇩🇰', 'nl': '🇳🇱', 'br': '🇧🇷', 'mx': '🇲🇽'
    };
    return flags[code?.toLowerCase()] || '🌐';
  },

  getPlayerAvatar(uuid, size = 80) {
    if (!uuid) return `https://mc-heads.net/avatar/8667ba71b85a4004af54457a9734eed7/${size}`;
    return `https://mc-heads.net/avatar/${uuid}/${size}`;
  },

  getRankIcon(rank) {
    if (rank === 1) return <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-2xl animate-pulse" />;
    if (rank === 2) return <Medal className="w-10 h-10 text-gray-300 drop-shadow-xl" />;
    if (rank === 3) return <Medal className="w-10 h-10 text-orange-400 drop-shadow-xl" />;
    return <span className="text-2xl font-black text-white drop-shadow-lg">#{rank}</span>;
  }
};

// ==================== PLAYER STATS CALCULATOR ====================
const calculatePlayerStats = (matches, playerUuid) => {
  let wins = 0;
  let loses = 0;
  let forfeits = 0;
  let totalTime = 0;
  let completionCount = 0;
  let bestTime = null;

  matches.forEach(match => {
    if (match.forfeited) {
      forfeits++;
    }

    // Check if player won
    if (match.result && match.result.uuid === playerUuid) {
      wins++;
    } else if (match.result && match.result.uuid && match.result.uuid !== playerUuid) {
      loses++;
    }

    // Get player's completion time
    if (match.completions && match.completions.length > 0) {
      const playerCompletion = match.completions.find(c => c.uuid === playerUuid);
      if (playerCompletion && playerCompletion.time) {
        totalTime += playerCompletion.time;
        completionCount++;
        
        if (bestTime === null || playerCompletion.time < bestTime) {
          bestTime = playerCompletion.time;
        }
      }
    }
  });

  const avgTime = completionCount > 0 ? totalTime / completionCount : 0;
  const totalMatches = wins + loses;
  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;
  const forfeitRate = matches.length > 0 ? ((forfeits / matches.length) * 100).toFixed(1) : 0;

  return {
    wins,
    loses,
    totalMatches,
    winRate,
    forfeits,
    forfeitRate,
    bestTime,
    avgTime
  };
};

// ==================== SORTING ====================
const sortPlayers = (players, sortBy, sortDirection) => {
  const sorted = [...players];
  
  const getValue = (player, key) => {
    switch (key) {
      case 'rank': return player.rank || 999999;
      case 'elo': return player.eloRate || 0;
      case 'wins': return player.stats?.wins || 0;
      case 'loses': return player.stats?.loses || 0;
      case 'winrate': return parseFloat(player.stats?.winRate || 0);
      case 'forfeit': return parseFloat(player.stats?.forfeitRate || 0);
      case 'bestTime': return player.stats?.bestTime || 999999999;
      case 'avgTime': return player.stats?.avgTime || 999999999;
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
      className={`flex items-center gap-1 px-3 py-2 rounded-lg transition font-bold text-sm ${
        isActive ? 'bg-green-700 text-white' : 'text-gray-400 hover:bg-gray-800'
      }`}
    >
      <span>{label}</span>
      {isActive && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
    </button>
  );
};

// ==================== PLAYER MODAL ====================
const PlayerModal = ({ player, onClose }) => {
  if (!player) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl border-4 border-green-500 max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-green-700 to-emerald-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={utils.getPlayerAvatar(player.uuid, 80)}
              alt={player.nickname}
              className="w-16 h-16 rounded-xl border-2 border-yellow-400"
            />
            <div>
              <h2 className="text-2xl font-black text-white">{player.nickname}</h2>
              <p className="text-green-300 font-bold">
                {utils.getCountryFlag(player.country)} #{player.rank} • {player.eloRate} ELO
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
        
        <div className="h-[600px]">
          <iframe
            src={`https://mcsrranked.com/stats/${player.nickname}`}
            className="w-full h-full"
            title={`Stats for ${player.nickname}`}
          />
        </div>
      </div>
    </div>
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
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

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

      const leaderboardData = await apiService.getLeaderboard(2, 'VN', 100);
      const users = leaderboardData.users || [];

      if (users.length === 0) {
        setError({
          title: 'Không có dữ liệu',
          message: 'Không tìm thấy người chơi Việt Nam',
          type: 'warning'
        });
        setPlayers([]);
        setFilteredPlayers([]);
        return;
      }

      const processedPlayers = users.map((user, index) => ({
        uuid: user.uuid,
        nickname: user.nickname,
        eloRate: user.eloRate,
        eloRank: user.eloRank,
        country: user.country || 'vn',
        rank: index + 1,
        stats: null
      }));

      setPlayers(processedPlayers);
      setFilteredPlayers(sortPlayers(processedPlayers, sortBy, sortDirection));

    } catch (err) {
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

  const loadDetailedStats = async () => {
    if (loadingStats) return;
    
    setLoadingStats(true);
    setError(null);

    try {
      const updatedPlayers = [...players];
      
      for (let i = 0; i < Math.min(players.length, 50); i++) {
        const player = players[i];
        
        try {
          const matches = await apiService.getUserMatches(player.uuid, 2, 50);
          const matchList = matches.matches || [];
          
          if (matchList.length > 0) {
            const stats = calculatePlayerStats(matchList, player.uuid);
            updatedPlayers[i] = { ...player, stats };
          }
          
          await new Promise(r => setTimeout(r, 150));
        } catch (err) {
          console.error(`Failed to load stats for ${player.nickname}:`, err.message);
        }
      }
      
      setPlayers(updatedPlayers);
      const sorted = sortPlayers(updatedPlayers, sortBy, sortDirection);
      setFilteredPlayers(sorted);

    } catch (err) {
      setError({
        title: 'Lỗi tải thống kê',
        message: 'Không thể tải thống kê chi tiết',
        details: err.message,
        type: 'warning'
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection(key === 'rank' ? 'asc' : 'desc');
    }
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
  const hasStats = players.some(p => p.stats !== null);

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

        {/* Search and Controls */}
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
          <div className="flex gap-4 mt-4">
            <button
              onClick={fetchLeaderboard}
              disabled={refreshing}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-bold hover:scale-105 transition disabled:opacity-50 flex items-center justify-center gap-2"
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
            <button
              onClick={loadDetailedStats}
              disabled={loadingStats || hasStats}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-bold hover:scale-105 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingStats ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  ĐANG TẢI STATS...
                </>
              ) : hasStats ? (
                <>
                  <Award className="w-5 h-5" />
                  ĐÃ TẢI STATS
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5" />
                  TẢI THỐNG KÊ
                </>
              )}
            </button>
          </div>
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
            
            <div className="flex flex-wrap gap-2">
              <SortHeader label="Hạng" sortKey="rank" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="ELO" sortKey="elo" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              {hasStats && (
                <>
                  <SortHeader label="Thắng" sortKey="wins" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
                  <SortHeader label="Thua" sortKey="loses" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
                  <SortHeader label="Win%" sortKey="winrate" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
                  <SortHeader label="Forfeit%" sortKey="forfeit" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
                  <SortHeader label="Best Time" sortKey="bestTime" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
                  <SortHeader label="Avg Time" sortKey="avgTime" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
                </>
              )}
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
                  const stats = player.stats;
                  
                  return (
                    <div
                      key={player.uuid}
                      className="bg-gradient-to-r from-gray-800/60 to-gray-700/60 hover:from-gray-700/60 hover:to-gray-600/60 rounded-xl p-4 transition border-2 border-transparent hover:border-green-500/30 cursor-pointer"
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <div className="flex items-center justify-between">
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
                              <p className="text-xl font-black text-white hover:text-green-400 transition">
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
                              </div>
                            </div>
                          </div>
                        </div>

                        {stats && (
                          <div className="hidden lg:grid grid-cols-4 gap-4">
                            <div className="text-center">
                              <p className="text-xs text-gray-400 font-bold">W/L</p>
                              <p className="text-lg font-black text-green-400">
                                {stats.wins}/{stats.loses}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-400 font-bold">WIN%</p>
                              <p className="text-lg font-black text-yellow-400">{stats.winRate}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-400 font-bold">FORFEIT%</p>
                              <p className="text-lg font-black text-red-400">{stats.forfeitRate}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-400 font-bold">BEST</p>
                              <p className="text-lg font-black text-purple-400">
                                {stats.bestTime ? utils.formatTime(stats.bestTime) : 'N/A'}
                              </p>
                            </div>
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
            {' • Avatar từ '}
            <a href="https://mc-heads.net" target="_blank" rel="noopener noreferrer" className="text-green-400 font-bold hover:underline">
              mc-heads.net
            </a>
          </p>
          <p className="text-gray-600 text-xs mt-2">
            © 2024 MCSR Vietnam Leaderboard • Click vào tên để xem stats chi tiết
          </p>
        </div>
      </div>

      {/* Player Modal */}
      {selectedPlayer && (
        <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}

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
