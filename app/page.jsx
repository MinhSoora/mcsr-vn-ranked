'use client';
import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Clock, Award, Target, Search, TrendingUp, Eye, X, Zap, Flame, Star, ChevronDown, ChevronUp, Loader, Check, XCircle, Percent, Users, Swords, Heart, BarChart3, Calendar, Globe, Crown, Skull, Timer, Hash, Activity, AlertCircle, Flag, MapPin } from 'lucide-react';

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
      // Lấy thông tin từ leaderboard để xác định season hiện tại
      const data = await this.fetchWithRetry(`${API_BASE}/leaderboard?count=1`);
      // Season có thể lấy từ user đầu tiên hoặc từ metadata
      return data.data?.season || 2;
    } catch (err) {
      console.error('Error getting season:', err);
      return 2; // fallback
    }
  },

  async getLeaderboard(country = 'VN', type = 2, count = 100) {
    const data = await this.fetchWithRetry(
      `${API_BASE}/leaderboard?type=${type}&country=${country}&count=${count}`
    );
    return data.data || { users: [] };
  },

  async getUserDetails(uuid) {
    const data = await this.fetchWithRetry(`${API_BASE}/users/${uuid}`);
    return data.data;
  },

  async getUserStats(uuid, season = null) {
    const url = season 
      ? `${API_BASE}/users/${uuid}/statistics?season=${season}`
      : `${API_BASE}/users/${uuid}/statistics`;
    const data = await this.fetchWithRetry(url);
    return data.data;
  },

  async getUserMatches(uuid, type = 2, count = 15) {
    const data = await this.fetchWithRetry(
      `${API_BASE}/users/${uuid}/matches?type=${type}&count=${count}`
    );
    return data.data?.data || [];
  },

  async getMatchDetails(matchId) {
    const data = await this.fetchWithRetry(`${API_BASE}/matches/${matchId}`);
    return data.data;
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

  formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  getTimelineIcon(type) {
    const icons = {
      'enter_nether': <Flame className="w-4 h-4 text-red-500" />,
      'enter_bastion': <Target className="w-4 h-4 text-orange-500" />,
      'enter_fortress': <Trophy className="w-4 h-4 text-gray-400" />,
      'first_portal': <Zap className="w-4 h-4 text-purple-500" />,
      'second_portal': <Zap className="w-4 h-4 text-purple-400" />,
      'enter_stronghold': <Star className="w-4 h-4 text-yellow-500" />,
      'enter_end': <Award className="w-4 h-4 text-green-500" />,
      'finish': <Trophy className="w-4 h-4 text-yellow-400" />,
      'kill': <Swords className="w-4 h-4 text-red-600" />,
      'death': <Skull className="w-4 h-4 text-gray-600" />
    };
    return icons[type] || <Clock className="w-4 h-4 text-blue-500" />;
  },

  getTimelineLabel(type) {
    const labels = {
      'enter_nether': 'Vào Nether',
      'enter_bastion': 'Vào Bastion',
      'enter_fortress': 'Vào Fortress',
      'first_portal': 'Portal 1',
      'second_portal': 'Portal 2',
      'enter_stronghold': 'Vào Stronghold',
      'enter_end': 'Vào End',
      'finish': 'Hoàn thành',
      'kill': 'Hạ gục',
      'death': 'Bị hạ gục'
    };
    return labels[type] || type;
  }
};

// ==================== STATS CALCULATOR ====================
const calculateStats = (player, detailedStats = null) => {
  const stats = detailedStats || player.statistics || {};
  const wins = stats.win || stats.wins || 0;
  const loses = stats.lose || stats.losses || 0;
  const total = wins + loses;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

  return {
    wins,
    loses,
    total,
    winRate,
    elo: Math.round(player.eloRate || 0),
    highestElo: Math.round(player.highestEloRate || player.eloRate || 0),
    rank: player.eloRank || 0,
    kills: stats.kills || 0,
    deaths: stats.deaths || 0,
    assists: stats.assists || 0,
    matches: total,
    averageTime: stats.average_time || 0,
    fastestWin: stats.fastest_win || 0,
    longestWin: stats.longest_win || 0,
    playtime: stats.playtime || 0
  };
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

// ==================== MATCH CARD COMPONENT ====================
const MatchCard = ({ match, playerUuid, onMatchClick }) => {
  const isWinner = match.result?.uuid === playerUuid || match.winner === playerUuid;
  const change = match.changes?.find(c => c.uuid === playerUuid);

  return (
    <div
      className={`bg-gradient-to-r ${
        isWinner
          ? 'from-green-900/60 to-green-800/60 border-green-500'
          : 'from-red-900/60 to-red-800/60 border-red-500'
      } rounded-xl p-4 border-2 backdrop-blur-sm hover:scale-105 transition cursor-pointer shadow-lg`}
      onClick={(e) => {
        e.stopPropagation();
        onMatchClick(match.id || match.matchId);
      }}
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {isWinner ? (
              <div className="flex items-center gap-2 bg-green-700 px-3 py-1 rounded-lg">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-white">THẮNG</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-700 px-3 py-1 rounded-lg">
                <X className="w-4 h-4 text-red-300" />
                <span className="text-sm font-bold text-white">THUA</span>
              </div>
            )}
            {change && (
              <span
                className={`text-sm font-bold px-3 py-1 rounded-lg ${
                  (change.change || 0) >= 0
                    ? 'bg-green-700 text-green-300'
                    : 'bg-red-700 text-red-300'
                }`}
              >
                {(change.change || 0) >= 0 ? '+' : ''}
                {change.change || 0} ELO
              </span>
            )}
            <span className="text-xs text-gray-400">
              Season {match.season || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Calendar className="w-3 h-3" />
            {utils.formatDate(match.date || match.timestamp)}
            {match.type && (
              <>
                <span className="mx-1">•</span>
                <span className="text-yellow-400">
                  {match.type === 2 ? 'Ranked' : 'Casual'}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-400">Thời gian</p>
            <p className="text-lg font-bold text-yellow-400">
              {utils.formatTime(match.result?.time || match.time)}
            </p>
          </div>
          <div className="bg-blue-700 p-2 rounded-lg">
            <Eye className="w-5 h-5 text-blue-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== PLAYER STATS VIEW ====================
const PlayerStatsView = ({ player, stats, statsView, matches, onMatchClick }) => {
  switch (statsView) {
    case 'overview':
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Check className="w-5 h-5 text-green-400" />}
            label="Thắng"
            value={stats.wins}
            color="green"
          />
          <StatCard
            icon={<XCircle className="w-5 h-5 text-red-400" />}
            label="Thua"
            value={stats.loses}
            color="red"
          />
          <StatCard
            icon={<Percent className="w-5 h-5 text-yellow-400" />}
            label="Win Rate"
            value={`${stats.winRate}%`}
            color="yellow"
          />
          <StatCard
            icon={<Target className="w-5 h-5 text-purple-400" />}
            label="K/D"
            value={
              stats.deaths > 0
                ? (stats.kills / stats.deaths).toFixed(2)
                : stats.kills.toFixed(0)
            }
            color="purple"
          />
        </div>
      );

    case 'detailed':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              icon={<Swords className="w-5 h-5 text-red-500" />}
              label="Kills"
              value={stats.kills}
              color="red"
            />
            <StatCard
              icon={<Skull className="w-5 h-5 text-gray-400" />}
              label="Deaths"
              value={stats.deaths}
              color="gray"
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-blue-400" />}
              label="Assists"
              value={stats.assists}
              color="blue"
            />
            <StatCard
              icon={<Timer className="w-5 h-5 text-green-500" />}
              label="TB Trung bình"
              value={utils.formatTime(stats.averageTime)}
              color="green"
            />
            <StatCard
              icon={<Zap className="w-5 h-5 text-yellow-500" />}
              label="Nhanh nhất"
              value={utils.formatTime(stats.fastestWin)}
              color="yellow"
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-orange-500" />}
              label="Lâu nhất"
              value={utils.formatTime(stats.longestWin)}
              color="orange"
            />
          </div>
        </div>
      );

    case 'matches':
      return matches && matches.length > 0 ? (
        <div className="space-y-3">
          {matches.slice(0, 10).map((match, idx) => (
            <MatchCard
              key={idx}
              match={match}
              playerUuid={player.uuid}
              onMatchClick={onMatchClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Loader className="w-10 h-10 text-green-400 mx-auto mb-3 animate-spin" />
          <p className="text-gray-400 font-bold">Đang tải trận đấu...</p>
        </div>
      );

    default:
      return null;
  }
};

// ==================== MATCH DETAILS MODAL ====================
const MatchDetailsModal = ({ match, onClose }) => {
  if (!match) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-4 border-green-600 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-green-700 to-emerald-700 border-b-4 border-green-900 p-6 flex justify-between items-center">
          <h2
            className="text-4xl font-black text-yellow-400 flex items-center gap-3"
            style={{ textShadow: '3px 3px 0 #000' }}
          >
            <Trophy className="w-10 h-10" />
            THÔNG TIN TRẬN ĐẤU
          </h2>
          <button
            onClick={onClose}
            className="p-3 bg-red-600 hover:bg-red-700 rounded-xl transition transform hover:scale-110 shadow-lg"
          >
            <X className="w-7 h-7 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Match Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-700/50 to-green-900/50 rounded-xl p-5 border-2 border-green-500">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-green-400" />
                <p className="text-sm text-green-300 font-bold">NGÀY GIỜ</p>
              </div>
              <p className="text-xl font-black text-white">
                {utils.formatDate(match.date)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-700/50 to-yellow-900/50 rounded-xl p-5 border-2 border-yellow-500">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-5 h-5 text-yellow-400" />
                <p className="text-sm text-yellow-300 font-bold">THỜI GIAN</p>
              </div>
              <p className="text-2xl font-black text-yellow-400">
                {utils.formatTime(match.result?.time || match.time)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-700/50 to-purple-900/50 rounded-xl p-5 border-2 border-purple-500">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-5 h-5 text-purple-400" />
                <p className="text-sm text-purple-300 font-bold">MÙA</p>
              </div>
              <p className="text-xl font-black text-white">
                Season {match.season || 'N/A'}
              </p>
            </div>
          </div>

          {/* Players */}
          <div>
            <h3 className="text-2xl font-black text-green-400 mb-4 flex items-center gap-2">
              <Users className="w-7 h-7" />
              NGƯỜI CHƠI
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {match.players?.map((p, idx) => {
                const isWinner = match.result?.uuid === p.uuid;
                const change = match.changes?.find((c) => c.uuid === p.uuid);
                return (
                  <div
                    key={idx}
                    className={`bg-gradient-to-r ${
                      isWinner
                        ? 'from-yellow-900/50 to-yellow-700/50 border-yellow-500'
                        : 'from-gray-800/50 to-gray-700/50 border-gray-600'
                    } rounded-xl p-4 border-2 backdrop-blur-sm transform transition hover:scale-105`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {isWinner && (
                          <Crown className="w-6 h-6 text-yellow-400 animate-pulse" />
                        )}
                        <img
                          src={utils.getPlayerAvatar(p.uuid, 40)}
                          alt={p.nickname}
                          className="w-10 h-10 rounded-lg border-2 border-green-500"
                          onError={(e) => {
                            e.target.src = utils.getPlayerAvatar('8667ba71b85a4004af54457a9734eed7', 40);
                          }}
                        />
                        <div>
                          <p className="text-lg font-black text-white">
                            {p.nickname || p.username || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400 font-bold">
                            {p.uuid?.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      {change && (
                        <div className="text-right">
                          <p
                            className={`text-xl font-black ${
                              (change.change || 0) >= 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          >
                            {(change.change || 0) >= 0 ? '+' : ''}
                            {change.change || 0}
                          </p>
                          <p className="text-sm font-bold text-yellow-400">
                            {change.eloRate || 0} ELO
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timelines */}
          {match.timelines && match.timelines.length > 0 && (
            <div>
              <h3 className="text-2xl font-black text-blue-400 mb-4 flex items-center gap-2">
                <Activity className="w-7 h-7" />
                TIMELINE
              </h3>
              <div className="space-y-4">
                {match.players?.map((player) => {
                  const playerTimelines = match.timelines.filter(
                    (t) => t.uuid === player.uuid
                  );
                  if (playerTimelines.length === 0) return null;

                  return (
                    <div
                      key={player.uuid}
                      className="bg-gradient-to-br from-blue-900/50 to-blue-700/50 rounded-xl p-5 border-2 border-blue-500"
                    >
                      <p className="text-xl font-black text-white mb-4 flex items-center gap-2">
                        <img
                          src={utils.getPlayerAvatar(player.uuid, 30)}
                          alt={player.nickname}
                          className="w-8 h-8 rounded-lg"
                        />
                        {player.nickname || player.username}
                      </p>
                      <div className="space-y-2">
                        {playerTimelines
                          .sort((a, b) => a.time - b.time)
                          .map((timeline, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-blue-700/50"
                            >
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                                {utils.getTimelineIcon(timeline.type)}
                              </div>
                              <span className="flex-1 text-base font-bold text-gray-200">
                                {utils.getTimelineLabel(timeline.type)}
                              </span>
                              <span className="text-lg font-black text-blue-400">
                                {utils.formatTime(timeline.time)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentSeason, setCurrentSeason] = useState(2);
  const [statsView, setStatsView] = useState('overview');
  const [playerData, setPlayerData] = useState({});

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPlayers(players);
    } else {
      const filtered = players.filter(
        (player) =>
          (player.nickname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (player.username || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPlayers(filtered);
    }
  }, [searchQuery, players]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError(null);

      // Lấy season hiện tại
      const season = await apiService.getSeasonInfo();
      setCurrentSeason(season);

      // Lấy leaderboard Việt Nam
      const result = await apiService.getLeaderboard('VN', 2, 100);
      const vnPlayers = (result.users || [])
        .sort((a, b) => (b.eloRate || 0) - (a.eloRate || 0))
        .map((player, index) => ({
          ...player,
          globalRank: index + 1
        }));

      setPlayers(vnPlayers);
      setFilteredPlayers(vnPlayers);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePlayerClick = async (player) => {
    if (selectedPlayer?.uuid === player.uuid) {
      setSelectedPlayer(null);
      setStatsView('overview');
      return;
    }

    setSelectedPlayer({ ...player, loading: true });
    setStatsView('overview');

    try {
      const [details, stats, matches] = await Promise.all([
        apiService.getUserDetails(player.uuid),
        apiService.getUserStats(player.uuid, currentSeason),
        apiService.getUserMatches(player.uuid, 2, 15)
      ]);

      setPlayerData((prev) => ({
        ...prev,
        [player.uuid]: { details, stats, matches }
      }));

      setSelectedPlayer({
        ...player,
        loading: false,
        details,
        stats,
        matches
      });
    } catch (err) {
      console.error('Error fetching player data:', err);
      setSelectedPlayer(null);
    }
  };

  const handleMatchClick = async (matchId) => {
    try {
      const matchDetails = await apiService.getMatchDetails(matchId);
      setSelectedMatch(matchDetails);
    } catch (err) {
      console.error('Error fetching match details:', err);
    }
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
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center p-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-4 border-red-500 shadow-2xl">
            <AlertCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
            <h2 className="text-4xl font-black text-white mb-4" style={{ textShadow: '2px 2px 0 #000' }}>
              LỖI TẢI DỮ LIỆU
            </h2>
            <p className="text-xl text-gray-300 mb-6 max-w-lg">{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl text-white font-black text-lg hover:scale-105 transition transform shadow-lg"
            >
              THỬ LẠI
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                {players.length} NGƯỜI CHƠI
              </span>
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-green-800/60 to-green-900/60 rounded-xl p-4 border-2 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300 font-bold">TOP 1 ELO</p>
                  <p className="text-2xl font-black text-yellow-400">
                    {players[0]?.eloRate?.toFixed(0) || 0}
                  </p>
                </div>
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-800/60 to-blue-900/60 rounded-xl p-4 border-2 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300 font-bold">TRUNG BÌNH</p>
                  <p className="text-2xl font-black text-blue-400">
                    {players.length > 0
                      ? Math.round(players.reduce((sum, p) => sum + (p.eloRate || 0), 0) / players.length)
                      : 0}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-800/60 to-purple-900/60 rounded-xl p-4 border-2 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300 font-bold">TOP 100</p>
                  <p className="text-2xl font-black text-purple-400">
                    {Math.min(players.length, 100)}
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
              <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white font-bold hover:scale-105 transition transform flex items-center gap-2">
                <Filter className="w-5 h-5" />
                LỌC
              </button>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Leaderboard Section */}
          <div className={`${selectedPlayer ? 'lg:w-2/3' : 'w-full'}`}>
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-2xl border-4 border-green-600 shadow-2xl overflow-hidden">
              {/* Leaderboard Header */}
              <div className="bg-gradient-to-r from-green-700 to-emerald-700 p-4 border-b-4 border-green-900">
                <div className="flex justify-between items-center">
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
                    {filteredPlayers.map((player, index) => {
                      const stats = calculateStats(player);
                      const isSelected = selectedPlayer?.uuid === player.uuid;
                      return (
                        <div
                          key={player.uuid}
                          className={`bg-gradient-to-r ${
                            isSelected
                              ? 'from-yellow-900/60 to-yellow-800/60 border-2 border-yellow-500'
                              : 'from-gray-800/60 to-gray-700/60 hover:from-gray-700/60 hover:to-gray-600/60'
                          } rounded-xl p-4 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] border-2 border-transparent backdrop-blur-sm`}
                          onClick={() => handlePlayerClick(player)}
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
                                    {stats.wins > 0 && (
                                      <span className="text-xs font-bold bg-green-700 px-2 py-1 rounded-lg">
                                        {stats.wins}W - {stats.loses}L ({stats.winRate}%)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right: Stats */}
                            <div className="hidden md:flex items-center gap-6">
                              <div className="text-center">
                                <p className="text-xs text-gray-400 font-bold">K/D</p>
                                <p className="text-xl font-black text-red-400">
                                  {stats.deaths > 0
                                    ? (stats.kills / stats.deaths).toFixed(2)
                                    : stats.kills.toFixed(0)}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-400 font-bold">MATCHES</p>
                                <p className="text-xl font-black text-blue-400">{stats.matches}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-400 font-bold">WINRATE</p>
                                <p className="text-xl font-black text-yellow-400">{stats.winRate}%</p>
                              </div>
                              <div className="bg-green-700 p-2 rounded-lg">
                                {isSelected ? (
                                  <ChevronUp className="w-6 h-6 text-white" />
                                ) : (
                                  <ChevronDown className="w-6 h-6 text-white" />
                                )}
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
          </div>

          {/* Player Details Panel */}
          {selectedPlayer && (
            <div className="lg:w-1/3">
              <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-2xl border-4 border-blue-600 shadow-2xl overflow-hidden sticky top-8">
                {/* Player Header */}
                <div className="bg-gradient-to-r from-blue-700 to-cyan-700 p-6 border-b-4 border-blue-900">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <img
                        src={utils.getPlayerAvatar(selectedPlayer.uuid, 80)}
                        alt={selectedPlayer.nickname}
                        className="w-20 h-20 rounded-xl border-4 border-yellow-400"
                        onError={(e) => {
                          e.target.src = utils.getPlayerAvatar('8667ba71b85a4004af54457a9734eed7', 80);
                        }}
                      />
                      <div>
                        <h3 className="text-2xl font-black text-white">
                          {selectedPlayer.nickname || selectedPlayer.username}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-3xl font-black text-yellow-400">
                            {selectedPlayer.eloRate?.toFixed(0) || 0}
                          </span>
                          <span className="text-sm font-bold text-gray-300">ELO</span>
                          <span className="mx-2">•</span>
                          <span className="text-lg font-black text-white">
                            #{selectedPlayer.globalRank}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPlayer(null)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>
                </div>

                {/* Stats View Tabs */}
                <div className="border-b border-gray-700">
                  <div className="flex">
                    {[
                      { id: 'overview', label: 'Tổng quan', icon: <BarChart3 className="w-5 h-5" /> },
                      { id: 'detailed', label: 'Chi tiết', icon: <Target className="w-5 h-5" /> },
                      { id: 'matches', label: 'Trận đấu', icon: <Swords className="w-5 h-5" /> }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setStatsView(tab.id)}
                        className={`flex-1 py-4 flex flex-col items-center gap-2 font-bold transition ${
                          statsView === tab.id
                            ? 'bg-gradient-to-t from-blue-900/50 to-transparent text-blue-400'
                            : 'text-gray-400 hover:text-gray-300'
                        }`}
                      >
                        {tab.icon}
                        <span className="text-sm">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats Content */}
                <div className="p-6">
                  {selectedPlayer.loading ? (
                    <div className="text-center py-12">
                      <Loader className="w-10 h-10 text-blue-400 mx-auto mb-4 animate-spin" />
                      <p className="text-gray-400 font-bold">Đang tải thống kê...</p>
                    </div>
                  ) : (
                    <PlayerStatsView
                      player={selectedPlayer}
                      stats={calculateStats(selectedPlayer, selectedPlayer.stats)}
                      statsView={statsView}
                      matches={selectedPlayer.matches}
                      onMatchClick={handleMatchClick}
                    />
                  )}
                </div>

                {/* Additional Info */}
                {selectedPlayer.details && (
                  <div className="p-6 border-t border-gray-700">
                    <h4 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-400" />
                      THÔNG TIN KHÁC
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-bold">Ngày tham gia:</span>
                        <span className="text-white font-bold">
                          {new Date(selectedPlayer.details.created * 1000).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-bold">Điểm cao nhất:</span>
                        <span className="text-yellow-400 font-bold">
                          {selectedPlayer.details.highestEloRate?.toFixed(0) || 0} ELO
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-bold">Hạng cao nhất:</span>
                        <span className="text-green-400 font-bold">
                          #{selectedPlayer.details.highestEloRank || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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

      {/* Match Details Modal */}
      {selectedMatch && (
        <MatchDetailsModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {/* Floating Elements */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4">
        <button
          onClick={fetchLeaderboard}
          className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full shadow-2xl hover:scale-110 transition transform"
          title="Làm mới dữ liệu"
        >
          <Zap className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-2xl hover:scale-110 transition transform"
          title="Lên đầu trang"
        >
          <ChevronUp className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}

// Add missing Filter and Info components
const Filter = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const Info = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
