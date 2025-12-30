'use client';
import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Clock, Award, Target, Search, TrendingUp, Eye, X, Zap, Flame, Star, ChevronDown, ChevronUp, Loader } from 'lucide-react';

export default function MCSRLeaderboardPro() {
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [playerMatches, setPlayerMatches] = useState({});
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPlayers(players);
    } else {
      const filtered = players.filter(player => 
        (player.nickname || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPlayers(filtered);
    }
  }, [searchQuery, players]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Sử dụng ?country=vn để lấy player Việt Nam
      const response = await fetch('https://api.mcsrranked.com/leaderboard?country=vn');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result || result.status !== 'success' || !result.data) {
        throw new Error('Invalid response format');
      }
      
      const vnPlayers = result.data.users || [];
      
      setPlayers(vnPlayers);
      setFilteredPlayers(vnPlayers);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
      setLoading(false);
    }
  };

  const fetchMatchDetails = async (matchId) => {
    try {
      setMatchLoading(true);
      const response = await fetch(`https://api.mcsrranked.com/matches/${matchId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        setSelectedMatch(result.data);
      }
      setMatchLoading(false);
    } catch (err) {
      console.error('Error fetching match details:', err);
      setMatchLoading(false);
    }
  };

  const fetchPlayerMatches = async (uuid) => {
    if (playerMatches[uuid]) {
      return playerMatches[uuid];
    }

    try {
      const response = await fetch(`https://api.mcsrranked.com/users/${uuid}/matches?type=2&count=10`);
      if (!response.ok) return [];
      
      const result = await response.json();
      const matches = result.status === 'success' && result.data ? result.data.data : [];
      
      setPlayerMatches(prev => ({ ...prev, [uuid]: matches }));
      return matches;
    } catch (err) {
      console.error('Error fetching player matches:', err);
      return [];
    }
  };

  const formatTime = (ms) => {
    if (!ms) return 'N/A';
    const totalSeconds = ms / 1000;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor(ms % 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('vi-VN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimelineIcon = (type) => {
    const icons = {
      'enter_nether': <Flame className="w-4 h-4 text-red-500" />,
      'enter_bastion': <Target className="w-4 h-4 text-orange-500" />,
      'enter_fortress': <Trophy className="w-4 h-4 text-gray-400" />,
      'first_portal': <Zap className="w-4 h-4 text-purple-500" />,
      'second_portal': <Zap className="w-4 h-4 text-purple-400" />,
      'enter_stronghold': <Star className="w-4 h-4 text-yellow-500" />,
      'enter_end': <Award className="w-4 h-4 text-green-500" />,
      'finish': <Trophy className="w-4 h-4 text-yellow-400" />
    };
    return icons[type] || <Clock className="w-4 h-4 text-blue-500" />;
  };

  const getTimelineLabel = (type) => {
    const labels = {
      'enter_nether': 'Vào Nether',
      'enter_bastion': 'Vào Bastion',
      'enter_fortress': 'Vào Fortress',
      'first_portal': 'Portal 1',
      'second_portal': 'Portal 2',
      'enter_stronghold': 'Vào Stronghold',
      'enter_end': 'Vào End',
      'finish': 'Hoàn thành'
    };
    return labels[type] || type;
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-2xl animate-pulse" />;
    if (rank === 2) return <Medal className="w-10 h-10 text-gray-300 drop-shadow-xl" />;
    if (rank === 3) return <Medal className="w-10 h-10 text-orange-400 drop-shadow-xl" />;
    return <span className="text-2xl font-black text-white drop-shadow-lg">#{rank}</span>;
  };

  const calculateStats = (player) => {
    const records = player.statistics?.season?.['2'] || {};
    const wins = records.win || 0;
    const loses = records.lose || 0;
    const total = wins + loses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    
    return {
      wins,
      loses,
      total,
      winRate,
      elo: Math.round(player.eloRate || 0),
      highestElo: Math.round(player.highestEloRate || player.eloRate || 0),
      rank: player.eloRank || 0
    };
  };

  const handlePlayerClick = async (player) => {
    if (selectedPlayer?.uuid === player.uuid) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer({ ...player, recentMatches: [] });
      const matches = await fetchPlayerMatches(player.uuid);
      setSelectedPlayer(prev => prev?.uuid === player.uuid ? { ...player, recentMatches: matches } : prev);
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
            <p className="text-white text-4xl font-black tracking-wider animate-pulse" style={{textShadow: '4px 4px 0 #000, 0 0 20px #4ade80'}}>
              ĐANG TẢI...
            </p>
            <p className="text-green-400 text-xl font-bold mt-4">Đang lấy dữ liệu từ MCSR Ranked</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-red-900 to-gray-900">
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="bg-red-900/90 border-4 border-red-600 rounded-2xl p-8 text-white backdrop-blur-lg shadow-2xl max-w-md w-full">
            <div className="text-center mb-6">
              <X className="w-20 h-20 text-red-400 mx-auto mb-4" />
              <p className="text-3xl font-black mb-2">{error}</p>
            </div>
            <button 
              onClick={fetchLeaderboard}
              className="w-full px-8 py-4 bg-red-600 hover:bg-red-700 rounded-xl transition font-black border-4 border-red-800 text-xl shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              THỬ LẠI
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-gray-900 via-green-900 to-gray-900">
      {/* Animated Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{
          backgroundImage: 'url(https://wallpapercave.com/wp/wp2571595.png)',
          animation: 'float 20s ease-in-out infinite'
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/50 to-black/70" />
      
      {/* Match Details Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-4 border-green-600 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-green-700 to-emerald-700 border-b-4 border-green-900 p-6 flex justify-between items-center">
              <h2 className="text-4xl font-black text-yellow-400 flex items-center gap-3" style={{textShadow: '3px 3px 0 #000'}}>
                <Trophy className="w-10 h-10" />
                THÔNG TIN TRẬN ĐẤU
              </h2>
              <button 
                onClick={() => setSelectedMatch(null)}
                className="p-3 bg-red-600 hover:bg-red-700 rounded-xl transition transform hover:scale-110 shadow-lg"
              >
                <X className="w-7 h-7 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {/* Match Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-700/50 to-green-900/50 rounded-xl p-5 border-2 border-green-500 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-green-400" />
                    <p className="text-sm text-green-300 font-bold">NGÀY GIỜ</p>
                  </div>
                  <p className="text-xl font-black text-white">{formatDate(selectedMatch.date)}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-700/50 to-yellow-900/50 rounded-xl p-5 border-2 border-yellow-500 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <p className="text-sm text-yellow-300 font-bold">THỜI GIAN</p>
                  </div>
                  <p className="text-2xl font-black text-yellow-400">{formatTime(selectedMatch.result?.time)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-700/50 to-purple-900/50 rounded-xl p-5 border-2 border-purple-500 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-purple-400" />
                    <p className="text-sm text-purple-300 font-bold">MÙA</p>
                  </div>
                  <p className="text-xl font-black text-white">Season {selectedMatch.season}</p>
                </div>
              </div>

              {/* Players */}
              <div>
                <h3 className="text-2xl font-black text-green-400 mb-4 flex items-center gap-2">
                  <Award className="w-7 h-7" />
                  NGƯỜI CHƠI
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedMatch.players?.map((p, idx) => {
                    const isWinner = selectedMatch.result?.uuid === p.uuid;
                    const change = selectedMatch.changes?.find(c => c.uuid === p.uuid);
                    
                    return (
                      <div key={idx} className={`bg-gradient-to-r ${isWinner ? 'from-yellow-900/50 to-yellow-700/50 border-yellow-500' : 'from-gray-800/50 to-gray-700/50 border-gray-600'} rounded-xl p-4 border-2 backdrop-blur-sm transform transition hover:scale-105`}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            {isWinner && <Trophy className="w-7 h-7 text-yellow-400 animate-pulse" />}
                            <div>
                              <p className="text-xl font-black text-white">{p.nickname}</p>
                              <p className="text-sm text-gray-400 font-bold">UUID: {p.uuid.slice(0, 8)}...</p>
                            </div>
                          </div>
                          {change && (
                            <div className="text-right">
                              <p className={`text-2xl font-black ${(change.change || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(change.change || 0) >= 0 ? '+' : ''}{change.change || 0}
                              </p>
                              <p className="text-lg font-bold text-yellow-400">{change.eloRate || 0} ELO</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Completions */}
              {selectedMatch.completions && selectedMatch.completions.length > 0 && (
                <div>
                  <h3 className="text-2xl font-black text-purple-400 mb-4 flex items-center gap-2">
                    <Target className="w-7 h-7" />
                    HOÀN THÀNH
                  </h3>
                  <div className="space-y-2">
                    {selectedMatch.completions.map((comp, idx) => {
                      const player = selectedMatch.players?.find(p => p.uuid === comp.uuid);
                      return (
                        <div key={idx} className="bg-gradient-to-r from-purple-900/50 to-purple-700/50 rounded-xl p-4 border-2 border-purple-500 backdrop-blur-sm flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                              <span className="text-xl font-black text-white">#{idx + 1}</span>
                            </div>
                            <span className="text-lg font-bold text-white">{player?.nickname}</span>
                          </div>
                          <span className="text-2xl font-black text-purple-400">{formatTime(comp.time)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timelines */}
              {selectedMatch.timelines && selectedMatch.timelines.length > 0 && (
                <div>
                  <h3 className="text-2xl font-black text-blue-400 mb-4 flex items-center gap-2">
                    <Clock className="w-7 h-7" />
                    TIMELINE
                  </h3>
                  <div className="space-y-4">
                    {selectedMatch.players?.map((player) => {
                      const playerTimelines = selectedMatch.timelines.filter(t => t.uuid === player.uuid);
                      if (playerTimelines.length === 0) return null;
                      
                      return (
                        <div key={player.uuid} className="bg-gradient-to-br from-blue-900/50 to-blue-700/50 rounded-xl p-5 border-2 border-blue-500 backdrop-blur-sm">
                          <p className="text-xl font-black text-white mb-4 flex items-center gap-2">
                            <Award className="w-6 h-6 text-blue-400" />
                            {player.nickname}
                          </p>
                          <div className="space-y-2">
                            {playerTimelines.sort((a, b) => a.time - b.time).map((timeline, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-blue-700/50 animate-slide-in"
                                style={{animationDelay: `${idx * 50}ms`}}
                              >
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                                  {getTimelineIcon(timeline.type)}
                                </div>
                                <span className="flex-1 text-base font-bold text-gray-200">
                                  {getTimelineLabel(timeline.type)}
                                </span>
                                <span className="text-lg font-black text-blue-400">
                                  {formatTime(timeline.time)}
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
      )}

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-1 p-4 pb-32">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10 pt-10">
              <div className="flex items-center justify-center gap-5 mb-6 animate-bounce-slow">
                <Trophy className="w-20 h-20 text-yellow-400 drop-shadow-2xl animate-spin-slow" />
                <h1 
                  className="text-7xl font-black text-white drop-shadow-2xl"
                  style={{
                    textShadow: '8px 8px 0 #000, -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 0 0 30px #4ade80',
                    WebkitTextStroke: '2px #4ade80'
                  }}
                >
                  MCSR RANKED
                </h1>
                <Trophy className="w-20 h-20 text-yellow-400 drop-shadow-2xl animate-spin-slow-reverse" />
              </div>
              <div className="inline-block bg-gradient-to-r from-red-600 to-yellow-600 rounded-full px-8 py-3 mb-6 border-4 border-yellow-400 shadow-2xl">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-4xl">🇻🇳</span>
                  <p 
                    className="text-4xl font-black text-white"
                    style={{textShadow: '3px 3px 0 #000'}}
                  >
                    VIỆT NAM
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="max-w-2xl mx-auto mb-6">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-7 h-7 text-green-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm người chơi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-black/80 border-4 border-green-600 rounded-2xl text-white text-xl font-bold focus:outline-none focus:border-green-400 transition backdrop-blur-lg shadow-2xl placeholder-gray-400"
                    style={{textShadow: '1px 1px 2px #000'}}
                  />
                </div>
              </div>

              <div className="inline-block bg-green-900/80 border-4 border-green-600 rounded-xl px-6 py-3 backdrop-blur-sm">
                <p 
                  className="text-gray-200 text-xl font-bold"
                  style={{textShadow: '2px 2px 0 #000'}}
                >
                  📊 TÌM THẤY <span className="text-yellow-400 text-2xl font-black">{filteredPlayers.length}</span> NGƯỜI CHƠI
                </p>
              </div>
            </div>

            {/* Top 3 Podium */}
            {filteredPlayers.length >= 3 && searchQuery === '' && (
              <div className="grid grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
                {/* 2nd Place */}
                <div className="pt-16 animate-slide-in" style={{animationDelay: '100ms'}}>
                  <div className="bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 rounded-t-2xl p-6 text-center border-4 border-gray-600 shadow-2xl transform hover:scale-105 transition">
                    <Medal className="w-16 h-16 text-gray-100 mx-auto mb-3 drop-shadow-2xl animate-wiggle" />
                    <p className="text-3xl font-black text-white mb-2" style={{textShadow: '3px 3px 0 #000'}}>
                      {filteredPlayers[1].nickname}
                    </p>
                    <p className="text-2xl font-bold text-yellow-300">
                      {calculateStats(filteredPlayers[1]).elo} ELO
                    </p>
                  </div>
                  <div className="bg-gradient-to-b from-gray-500 to-gray-700 h-28 rounded-b-2xl border-4 border-t-0 border-gray-600 flex items-center justify-center backdrop-blur-sm shadow-xl">
                    <span className="text-5xl font-black text-white" style={{textShadow: '4px 4px 0 #000'}}>#2</span>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="animate-slide-in" style={{animationDelay: '0ms'}}>
                  <div className="bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 rounded-t-2xl p-8 text-center border-4 border-yellow-600 shadow-2xl transform hover:scale-110 transition">
                    <Trophy className="w-20 h-20 text-yellow-100 mx-auto mb-4 drop-shadow-2xl animate-bounce" />
                    <p className="text-4xl font-black text-white mb-2" style={{textShadow: '4px 4px 0 #000'}}>
                      {filteredPlayers[0].nickname}
                    </p>
                    <p className="text-3xl font-bold text-yellow-900">
                      {calculateStats(filteredPlayers[0]).elo} ELO
                    </p>
                  </div>
                  <div className="bg-gradient-to-b from-yellow-500 to-yellow-700 h-40 rounded-b-2xl border-4 border-t-0 border-yellow-600 flex items-center justify-center backdrop-blur-sm shadow-2xl">
                    <span className="text-6xl font-black text-white animate-pulse" style={{textShadow: '5px 5px 0 #000'}}>#1</span>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="pt-24 animate-slide-in" style={{animationDelay: '200ms'}}>
                  <div className="bg-gradient-to-b from-orange-300 via-orange-400 to-orange-500 rounded-t-2xl p-6 text-center border-4 border-orange-600 shadow-2xl transform hover:scale-105 transition">
                    <Medal className="w-16 h-16 text-orange-100 mx-auto mb-3 drop-shadow-2xl animate-wiggle" style={{animationDelay: '100ms'}} />
                    <p className="text-3xl font-black text-white mb-2" style={{textShadow: '3px 3px 0 #000'}}>
                      {filteredPlayers[2].nickname}
                    </p>
                    <p className="text-2xl font-bold text-yellow-300">
                      {calculateStats(filteredPlayers[2]).elo} ELO
                    </p>
                  </div>
                  <div className="bg-gradient-to-b from-orange-500 to-orange-700 h-20 rounded-b-2xl border-4 border-t-0 border-orange-600 flex items-center justify-center backdrop-blur-sm shadow-xl">
                    <span className="text-4xl font-black text-white" style={{textShadow: '3px 3px 0 #000'}}>#3</span>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div className="bg-black/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border-4 border-green-700">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-16">
                  <Search className="w-20 h-20 text-gray-500 mx-auto mb-4" />
                  <p className="text-white text-3xl font-black" style={{textShadow: '3px 3px 0 #000'}}>
                    KHÔNG TÌM THẤY NGƯỜI CHƠI
                  </p>
                  <p className="text-gray-400 text-lg font-bold mt-2">Thử tìm kiếm với từ khóa khác</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPlayers.map((player, index) => {
                    const stats = calculateStats(player);
                    const isSelected = selectedPlayer?.uuid === player.uuid;
                    
                    return (
                                              <div
                        key={player.uuid || index}
                        className="bg-gradient-to-r from-green-800/80 to-emerald-800/80 hover:from-green-700/90 hover:to-emerald-700/90 rounded-2xl p-6 transition-all duration-300 border-4 border-green-600/70 hover:border-green-400 hover:scale-[1.02] backdrop-blur-sm shadow-lg hover:shadow-2xl"
                      >
                        <div 
                          className="flex items-center gap-5 cursor-pointer"
                          onClick={() => handlePlayerClick(player)}
                        >
                          {/* Rank Badge */}
                          <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center bg-gradient-to-br from-green-700 to-green-900 rounded-xl border-3 border-green-500 shadow-xl transform hover:rotate-6 transition">
                            {getRankIcon(index + 1)}
                          </div>

                          {/* Player Head Icon */}
                          <div className="flex-shrink-0">
                            <img 
                              src={`https://crafatar.com/avatars/${player.uuid}?size=80&overlay`}
                              alt={player.nickname}
                              className="w-20 h-20 rounded-xl border-4 border-green-500 shadow-lg"
                              onError={(e) => {
                                e.target.src = 'https://crafatar.com/avatars/8667ba71b85a4004af54457a9734eed7?size=80&overlay';
                              }}
                            />
                          </div>

                          {/* Player Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <h3 
                                className="text-3xl font-black text-white"
                                style={{textShadow: '3px 3px 0 #000'}}
                              >
                                {player.nickname || 'Unknown'}
                              </h3>
                              <span 
                                className="px-5 py-2 bg-gradient-to-r from-green-600 to-green-700 rounded-xl text-xl text-white font-black border-3 border-green-800 shadow-xl"
                              >
                                {stats.elo} ELO
                              </span>
                              {stats.highestElo > stats.elo && (
                                <span className="px-3 py-1 bg-purple-700 rounded-lg text-sm text-white font-bold border-2 border-purple-500">
                                  Peak: {stats.highestElo}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-5 text-base text-gray-200 font-bold flex-wrap">
                              <span className="flex items-center gap-2 bg-green-900/50 px-3 py-1 rounded-lg">
                                <Award className="w-5 h-5 text-green-400" />
                                {stats.wins}W
                              </span>
                              <span className="flex items-center gap-2 bg-red-900/50 px-3 py-1 rounded-lg">
                                <Target className="w-5 h-5 text-red-400" />
                                {stats.loses}L
                              </span>
                              <span className="bg-yellow-900/50 px-3 py-1 rounded-lg text-yellow-400">
                                WR: {stats.winRate}%
                              </span>
                              <span className="flex items-center gap-2 bg-blue-900/50 px-3 py-1 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                                {stats.total} Trận
                              </span>
                            </div>
                          </div>

                          {/* Expand Icon */}
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <ChevronUp className="w-8 h-8 text-green-400 animate-bounce" />
                            ) : (
                              <ChevronDown className="w-8 h-8 text-green-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Details - Recent Matches */}
                        {isSelected && (
                          <div className="mt-6 pt-6 border-t-4 border-green-700/50 animate-slide-down">
                            <h4 
                              className="text-2xl font-black text-yellow-400 mb-5 flex items-center gap-2"
                              style={{textShadow: '2px 2px 0 #000'}}
                            >
                              <Trophy className="w-7 h-7" />
                              TRẬN ĐẤU GẦN ĐÂY
                            </h4>
                            {!selectedPlayer.recentMatches || selectedPlayer.recentMatches.length === 0 ? (
                              <div className="text-center py-8">
                                <Loader className="w-10 h-10 text-green-400 mx-auto mb-3 animate-spin" />
                                <p className="text-gray-400 font-bold">Đang tải trận đấu...</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {selectedPlayer.recentMatches.slice(0, 8).map((match, idx) => {
                                  const isWinner = match.result?.uuid === player.uuid;
                                  const change = match.changes?.find(c => c.uuid === player.uuid);
                                  
                                  return (
                                    <div 
                                      key={idx}
                                      className={`bg-gradient-to-r ${isWinner ? 'from-green-900/60 to-green-800/60 border-green-500' : 'from-red-900/60 to-red-800/60 border-red-500'} rounded-xl p-5 border-2 backdrop-blur-sm hover:scale-105 transition cursor-pointer shadow-lg animate-fade-in`}
                                      style={{animationDelay: `${idx * 50}ms`}}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        fetchMatchDetails(match.id);
                                      }}
                                    >
                                      <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-3">
                                            {isWinner ? (
                                              <div className="flex items-center gap-2 bg-green-700 px-4 py-2 rounded-lg">
                                                <Trophy className="w-6 h-6 text-yellow-400" />
                                                <span className="text-xl font-black text-white">THẮNG</span>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-2 bg-red-700 px-4 py-2 rounded-lg">
                                                <X className="w-6 h-6 text-red-300" />
                                                <span className="text-xl font-black text-white">THUA</span>
                                              </div>
                                            )}
                                            {change && (
                                              <span className={`text-lg font-black px-4 py-2 rounded-lg ${(change.change || 0) >= 0 ? 'bg-green-700 text-green-300' : 'bg-red-700 text-red-300'}`}>
                                                {(change.change || 0) >= 0 ? '+' : ''}{change.change || 0} ELO
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 text-sm text-gray-300 font-bold">
                                            <Clock className="w-4 h-4" />
                                            {formatDate(match.date)}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <div className="text-right">
                                            <p className="text-sm text-gray-400 font-bold">THỜI GIAN</p>
                                            <p className="text-2xl font-black text-yellow-400">
                                              {formatTime(match.result?.time)}
                                            </p>
                                          </div>
                                          <div className="bg-blue-700 p-3 rounded-lg">
                                            <Eye className="w-7 h-7 text-blue-300" />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 bg-gradient-to-t from-black via-black/90 to-transparent py-8 mt-16 border-t-4 border-green-800">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                  <Trophy className="w-10 h-10 text-yellow-400 animate-pulse" />
                  <h2 
                    className="text-2xl font-black text-white"
                    style={{textShadow: '2px 2px 0 #000'}}
                  >
                    MCSR Ranked Vietnam Leaderboard
                  </h2>
                </div>
                <p className="text-gray-400 font-bold">
                  Dữ liệu được cập nhật từ API chính thức của MCSR Ranked
                </p>
                <p className="text-gray-500 text-sm font-bold mt-2">
                  Dữ liệu chỉ tính người chơi Việt Nam
                </p>
              </div>
              
              <div className="flex flex-col items-center md:items-end gap-2">
                <button 
                  onClick={fetchLeaderboard}
                  className="px-8 py-4 bg-gradient-to-r from-green-700 to-emerald-800 hover:from-green-600 hover:to-emerald-700 rounded-xl transition transform hover:scale-105 border-4 border-green-800 shadow-xl flex items-center gap-3 group"
                >
                  <Zap className="w-6 h-6 text-yellow-400 animate-pulse group-hover:animate-spin" />
                  <span className="text-xl font-black text-white">CẬP NHẬT DỮ LIỆU</span>
                </button>
                <p className="text-gray-500 text-sm font-bold">
                  Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Floating Scroll to Top */}
      {window.scrollY > 500 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 z-40 p-4 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xl border-4 border-yellow-800 shadow-2xl hover:scale-110 transition transform animate-bounce"
        >
          <ChevronUp className="w-8 h-8 text-white" />
        </button>
      )}

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1.1); }
          50% { transform: translateY(-20px) scale(1.12); }
        }

        @keyframes slide-in {
          from { 
            opacity: 0;
            transform: translateX(-50px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slide-down {
          from { 
            opacity: 0;
            transform: translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-slow-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(5deg); }
          75% { transform: rotate(-5deg); }
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-float {
          animation: float 20s ease-in-out infinite;
        }

        .animate-slide-in {
          animation: slide-in 0.5s ease-out forwards;
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }

        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }

        .animate-spin-slow-reverse {
          animation: spin-slow-reverse 15s linear infinite;
        }

        .animate-wiggle {
          animation: wiggle 2s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
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
          background: linear-gradient(to bottom, #4ade80, #16a34a);
          border-radius: 10px;
          border: 3px solid rgba(0, 0, 0, 0.3);
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #22c55e, #15803d);
        }

        /* Responsive adjustments */
        @media (max-width: 1024px) {
          .text-7xl {
            font-size: 4rem;
          }
          
          .text-4xl {
            font-size: 2.5rem;
          }
        }

        @media (max-width: 768px) {
          .text-7xl {
            font-size: 3rem;
          }
          
          .grid-cols-3 {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          
          .pt-16, .pt-24 {
            padding-top: 0;
          }
        }

        @media (max-width: 640px) {
          .text-7xl {
            font-size: 2.5rem;
          }
          
          .flex-wrap {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .p-6 {
            padding: 1rem;
          }
          
          .gap-5 {
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
