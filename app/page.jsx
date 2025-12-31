'use client';
import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Search, Loader, Zap, Crown, BarChart3, TrendingUp, Flag, Globe, AlertCircle, ChevronDown, ChevronUp, X, Clock, Target, Skull, Award, Percent, Timer } from 'lucide-react';

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

  async getUserMatches(identifier, type = 2, count = 100) {
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

  getPlayerAvatar(uuid, size = 80) {
    if (!uuid) return `https://mc-heads.net/avatar/8667ba71b85a4004af54457a9734eed7/${size}`;
    return `https://mc-heads.net/avatar/${uuid}/${size}`;
  },

  getRankIcon(rank) {
    if (rank === 1) return <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-2xl animate-pulse" />;
    if (rank === 2) return <Medal className="w-10 h-10 text-gray-300 drop-shadow-xl" />;
    if (rank === 3) return <Medal className="w-10 h-10 text-orange-400 drop-shadow-xl" />;
    return <span className="text-2xl font-black text-white drop-shadow-lg">#{rank}</span>;
  },

  getEloColor(elo) {
    if (elo >= 2000) return 'text-red-400 font-black';
    if (elo >= 1800) return 'text-purple-400 font-black';
    if (elo >= 1600) return 'text-blue-400 font-black';
    if (elo >= 1400) return 'text-emerald-400 font-black';
    if (elo >= 1200) return 'text-yellow-400 font-black';
    return 'text-gray-400 font-bold';
  },

  getEloBg(elo) {
    if (elo >= 2000) return 'from-red-800/60 to-red-900/60 border-red-500';
    if (elo >= 1800) return 'from-purple-800/60 to-purple-900/60 border-purple-500';
    if (elo >= 1600) return 'from-blue-800/60 to-blue-900/60 border-blue-500';
    if (elo >= 1400) return 'from-green-800/60 to-green-900/60 border-green-500';
    if (elo >= 1200) return 'from-yellow-800/60 to-yellow-900/60 border-yellow-500';
    return 'from-gray-800/60 to-gray-900/60 border-gray-500';
  },

  getRankName(elo) {
    if (elo >= 2000) return 'Champion';
    if (elo >= 1800) return 'Diamond';
    if (elo >= 1600) return 'Platinum';
    if (elo >= 1400) return 'Gold';
    if (elo >= 1200) return 'Silver';
    return 'Bronze';
  }
};

// ==================== STATS CALCULATOR ====================
const calculatePlayerStats = (matches, playerUuid) => {
  let wins = 0;
  let loses = 0;
  let forfeits = 0;
  let totalTime = 0;
  let completionCount = 0;
  let bestTime = null;
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  const sortedMatches = [...matches].sort((a, b) => b.date - a.date);

  sortedMatches.forEach((match, index) => {
    if (match.forfeited) {
      forfeits++;
    }

    const isWin = match.result && match.result.uuid === playerUuid;
    const isLose = match.result && match.result.uuid && match.result.uuid !== playerUuid;

    if (isWin) {
      wins++;
      tempStreak++;
      if (index === 0) currentStreak = tempStreak;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else if (isLose) {
      loses++;
      tempStreak = 0;
    }

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
    avgTime,
    currentStreak,
    bestStreak
  };
};

// ==================== SORT HEADER ====================
const SortHeader = ({ label, sortKey, currentSort, sortDirection, onClick }) => {
  const isActive = currentSort === sortKey;
  
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={`flex items-center gap-1 px-3 py-2 rounded-lg transition font-bold text-xs ${
        isActive ? 'bg-green-700 text-white' : 'text-gray-400 hover:bg-gray-800'
      }`}
    >
      <span>{label}</span>
      {isActive && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
    </button>
  );
};

// ==================== COUNTDOWN TIMER ====================
const CountdownTimer = ({ endDate }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now() / 1000;
      const diff = endDate - now;

      if (diff <= 0) {
        setTimeLeft('Season Ended');
        return;
      }

      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = Math.floor(diff % 60);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <span className="font-mono font-black text-xl text-yellow-400">
      {timeLeft}
    </span>
  );
};

// ==================== PLAYER MODAL ====================
const PlayerModal = ({ player, onClose }) => {
  if (!player) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fadeIn" 
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-2xl border-4 border-green-500 max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-scaleIn" 
        onClick={e => e.stopPropagation()}
      >
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
                🇻🇳 #{player.rank} • <span className={utils.getEloColor(player.eloRate)}>{player.eloRate} ELO</span> • {utils.getRankName(player.eloRate)}
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

// ==================== WELCOME POPUP ====================
const WelcomePopup = ({ onClose, currentSeason }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-gray-900 to-green-900 rounded-2xl border-4 border-green-500 max-w-2xl w-full p-8 shadow-2xl animate-bounceIn"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6 animate-pulse" />
          <h1 className="text-5xl font-black text-white mb-4">
            CHÀO MỪNG ĐẾN VỚI
          </h1>
          <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-green-400 to-yellow-400 mb-6">
            MCSR VIETNAM LEADERBOARD
          </h2>
          <p className="text-xl text-green-300 font-bold mb-8">
            🇻🇳 Bảng xếp hạng chính thức Season {currentSeason}
          </p>
          <button
            onClick={onClose}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white text-xl font-black hover:scale-110 transition shadow-lg"
          >
            BẮT ĐẦU XEM
          </button>
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
  const [sortBy, setSortBy] = useState('rank');
  const [sortDirection, setSortDirection] = useState('asc');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(8);
  const [seasonEndDate, setSeasonEndDate] = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);

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

  const sortPlayers = (playersList, sortBy, sortDirection) => {
    const sorted = [...playersList];
    
    const getValue = (player, key) => {
      switch (key) {
        case 'rank': return player.rank || 999999;
        case 'elo': return player.eloRate || 0;
        case 'wins': return player.stats?.wins || 0;
        case 'winrate': return parseFloat(player.stats?.winRate || 0);
        case 'forfeit': return parseFloat(player.stats?.forfeitRate || 0);
        case 'bestTime': return player.stats?.bestTime || 999999999;
        case 'avgTime': return player.stats?.avgTime || 999999999;
        case 'streak': return player.stats?.bestStreak || 0;
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

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);

      const leaderboardData = await apiService.getLeaderboard(2, 'VN', 100);
      const users = leaderboardData.users || [];
      
      if (users.length > 0) {
        try {
          const firstPlayerMatches = await apiService.getUserMatches(users[0].uuid, 2, 1);
          if (firstPlayerMatches.matches && firstPlayerMatches.matches.length > 0) {
            setCurrentSeason(firstPlayerMatches.matches[0].season || 8);
          }
        } catch (err) {
          console.error('Failed to get season:', err);
        }
      }

      const estimatedEndDate = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60);
      setSeasonEndDate(estimatedEndDate);

      if (users.length === 0) {
        setError({
          title: 'Không có dữ liệu',
          message: 'Không tìm thấy người chơi Việt Nam',
          type: 'warning'
        });
        setPlayers([]);
        setFilteredPlayers([]);
        setLoading(false);
        return;
      }

      setLoadingProgress(10);

      const processedPlayers = [];
      const totalPlayers = users.length;

      for (let i = 0; i < totalPlayers; i++) {
        const user = users[i];
        const player = {
          uuid: user.uuid,
          nickname: user.nickname,
          eloRate: user.eloRate,
          eloRank: user.eloRank,
          country: user.country || 'vn',
          rank: i + 1,
          stats: null
        };

        try {
          const matches = await apiService.getUserMatches(user.uuid, 2, 100);
          const matchList = matches.matches || [];
          
          if (matchList.length > 0) {
            const stats = calculatePlayerStats(matchList, user.uuid);
            player.stats = stats;
          }
        } catch (err) {
          console.error(`Failed to load stats for ${user.nickname}:`, err.message);
        }

        processedPlayers.push(player);
        setLoadingProgress(Math.floor(10 + ((i + 1) / totalPlayers) * 90));
        
        await new Promise(r => setTimeout(r, 30));
      }

      setPlayers(processedPlayers);
      setFilteredPlayers(sortPlayers(processedPlayers, sortBy, sortDirection));
      setLoadingProgress(100);

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
      setTimeout(() => setLoading(false), 500);
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
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 border-8 border-green-500/30 rounded-2xl"></div>
            <div className="absolute inset-0 border-8 border-green-400 border-t-transparent rounded-2xl animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-black text-white">{loadingProgress}%</span>
            </div>
          </div>
          <p className="text-white text-4xl font-black tracking-wider animate-pulse mb-4">
            ĐANG TẢI DỮ LIỆU
          </p>
          <div className="max-w-md mx-auto bg-gray-800/50 rounded-full h-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-green-400 text-lg font-bold mt-4">
            {loadingProgress < 20 ? 'Đang tải danh sách...' : 'Đang tính toán thống kê...'}
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
      {showWelcome && (
        <WelcomePopup 
          onClose={() => setShowWelcome(false)} 
          currentSeason={currentSeason}
        />
      )}

      {selectedPlayer && (
        <PlayerModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Banner with MCSR Logo */}
        <div className="mb-8 relative overflow-hidden rounded-2xl border-4 border-green-500 shadow-2xl">
          <div className="bg-gradient-to-r from-green-700 via-emerald-700 to-green-700 p-8 text-center">
            <img 
              src="https://mcsrranked.com/img/icon_x256.png" 
              alt="MCSR Ranked" 
              className="w-24 h-24 mx-auto mb-4 drop-shadow-2xl"
            />
            <div className="flex items-center justify-center gap-4 mb-4">
              <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-2xl animate-pulse" />
              <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-2xl">
                MCSR VIETNAM
              </h1>
              <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-2xl animate-pulse" />
            </div>
            <p className="text-2xl font-black text-yellow-400 mb-4">
              🇻🇳 SEASON {currentSeason} LEADERBOARD 🇻🇳
            </p>
            {seasonEndDate && (
              <div className="flex items-center justify-center gap-3 bg-black/30 rounded-xl p-4 max-w-md mx-auto">
                <Timer className="w-6 h-6 text-yellow-400" />
                <div className="text-left">
                  <p className="text-sm text-green-300 font-bold">Season ends in:</p>
                  <CountdownTimer endDate={seasonEndDate} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className={`bg-gradient-to-br ${utils.getEloBg(topElo)} rounded-xl p-4 border-2`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300 font-bold">TOP 1 ELO</p>
                <p className={`text-2xl ${utils.getEloColor(topElo)}`}>{topElo}</p>
                <p className="text-xs text-gray-400 font-bold">{utils.getRankName(topElo)}</p>
              </div>
              <Crown className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-800/60 to-blue-900/60 rounded-xl p-4 border-2 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-300 font-bold">TRUNG BÌNH</p>
                <p className="text-2xl font-black text-blue-400">{avgElo}</p>
                <p className="text-xs text-gray-400 font-bold">{utils.getRankName(avgElo)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-800/60 to-purple-900/60 rounded-xl p-4 border-2 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-300 font-bold">NGƯỜI CHƠI</p>
                <p className="text-2xl font-black text-purple-400">{totalPlayers}</p>
                <p className="text-xs text-gray-400 font-bold">Việt Nam</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-800/60 to-orange-900/60 rounded-xl p-4 border-2 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-300 font-bold">SEASON</p>
                <p className="text-2xl font-black text-orange-400">{currentSeason}</p>
                <p className="text-xs text-gray-400 font-bold">Hiện tại</p>
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
            className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-bold hover:scale-105 transition flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5" />
            LÀM MỚI DỮ LIỆU
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
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-2xl border-4 border-green-600 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-700 to-emerald-700 p-4 border-b-4 border-green-900">
            <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-4">
              <Trophy className="w-7 h-7 text-yellow-400" />
              BẢNG XẾP HẠNG VIỆT NAM
            </h2>
            
            <div className="flex flex-wrap gap-2">
              <SortHeader label="Hạng" sortKey="rank" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="ELO" sortKey="elo" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="Thắng" sortKey="wins" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="Win%" sortKey="winrate" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="Forfeit%" sortKey="forfeit" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="Best" sortKey="bestTime" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="Avg" sortKey="avgTime" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
              <SortHeader label="Streak" sortKey="streak" currentSort={sortBy} sortDirection={sortDirection} onClick={handleSort} />
            </div>
          </div>

          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-xl font-bold">Không tìm thấy người chơi</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.uuid}
                    onClick={() => setSelectedPlayer(player)}
                    className={`bg-gradient-to-br ${utils.getEloBg(player.eloRate)} rounded-xl p-4 border-2 cursor-pointer hover:scale-[1.02] transition-all duration-200 hover:shadow-2xl`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank Icon */}
                      <div className="flex-shrink-0 w-16 flex items-center justify-center">
                        {utils.getRankIcon(player.rank)}
                      </div>

                      {/* Avatar */}
                      <img
                        src={utils.getPlayerAvatar(player.uuid, 64)}
                        alt={player.nickname}
                        className="w-16 h-16 rounded-lg border-2 border-white/30 shadow-lg flex-shrink-0"
                      />

                      {/* Player Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-black text-white truncate">
                            {player.nickname}
                          </h3>
                          <span className="text-2xl">🇻🇳</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`text-lg ${utils.getEloColor(player.eloRate)}`}>
                            {player.eloRate} ELO
                          </span>
                          <span className="text-sm text-gray-400 font-bold">
                            {utils.getRankName(player.eloRate)}
                          </span>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      {player.stats && (
                        <div className="hidden md:grid grid-cols-4 gap-4 flex-shrink-0">
                          {/* Win Rate */}
                          <div className="text-center bg-black/30 rounded-lg p-2 min-w-[80px]">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Percent className="w-4 h-4 text-green-400" />
                              <p className="text-xs text-gray-400 font-bold">Win%</p>
                            </div>
                            <p className="text-lg font-black text-green-400">
                              {player.stats.winRate}%
                            </p>
                          </div>

                          {/* Best Streak */}
                          <div className="text-center bg-black/30 rounded-lg p-2 min-w-[80px]">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Zap className="w-4 h-4 text-yellow-400" />
                              <p className="text-xs text-gray-400 font-bold">Streak</p>
                            </div>
                            <p className="text-lg font-black text-yellow-400">
                              {player.stats.bestStreak}
                            </p>
                          </div>

                          {/* Best Time */}
                          <div className="text-center bg-black/30 rounded-lg p-2 min-w-[90px]">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Trophy className="w-4 h-4 text-yellow-400" />
                              <p className="text-xs text-gray-400 font-bold">PB</p>
                            </div>
                            <p className="text-sm font-black text-yellow-400">
                              {utils.formatTime(player.stats.bestTime)}
                            </p>
                          </div>

                          {/* Forfeit Rate */}
                          <div className="text-center bg-black/30 rounded-lg p-2 min-w-[80px]">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Skull className="w-4 h-4 text-red-400" />
                              <p className="text-xs text-gray-400 font-bold">FF%</p>
                            </div>
                            <p className="text-lg font-black text-red-400">
                              {player.stats.forfeitRate}%
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Mobile Stats */}
                      {player.stats && (
                        <div className="md:hidden flex gap-2 flex-shrink-0">
                          <div className="text-center bg-black/30 rounded-lg p-2">
                            <p className="text-xs text-gray-400 font-bold">Win%</p>
                            <p className="text-sm font-black text-green-400">
                              {player.stats.winRate}%
                            </p>
                          </div>
                          <div className="text-center bg-black/30 rounded-lg p-2">
                            <p className="text-xs text-gray-400 font-bold">PB</p>
                            <p className="text-xs font-black text-yellow-400">
                              {utils.formatTime(player.stats.bestTime)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded Stats Row (Mobile) */}
                    {player.stats && (
                      <div className="md:hidden mt-3 pt-3 border-t border-white/10">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center bg-black/30 rounded-lg p-2">
                            <p className="text-xs text-gray-400 font-bold">Streak</p>
                            <p className="text-sm font-black text-yellow-400">
                              {player.stats.bestStreak}
                            </p>
                          </div>
                          <div className="text-center bg-black/30 rounded-lg p-2">
                            <p className="text-xs text-gray-400 font-bold">Avg</p>
                            <p className="text-xs font-black text-blue-400">
                              {utils.formatTime(player.stats.avgTime)}
                            </p>
                          </div>
                          <div className="text-center bg-black/30 rounded-lg p-2">
                            <p className="text-xs text-gray-400 font-bold">FF%</p>
                            <p className="text-sm font-black text-red-400">
                              {player.stats.forfeitRate}%
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm font-bold">
            Data from MCSR Ranked API • Updated in real-time
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Made with ❤️ for Vietnam Minecraft Speedrunning Community
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        
        .animate-bounceIn {
          animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 12px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #059669);
          border-radius: 10px;
          border: 2px solid rgba(0, 0, 0, 0.3);
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #047857);
        }
      `}</style>
    </div>
  );
      }
