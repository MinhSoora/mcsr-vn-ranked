'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Clock, User, MapPin, Calendar, Target, Search, Award, TrendingUp, Eye, X, Zap, Flame, Star } from 'lucide-react';

export default function MCSRLeaderboard() {
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
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
        (player.nickname || player.username || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPlayers(filtered);
    }
  }, [searchQuery, players]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('https://api.mcsrranked.com/leaderboard');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result || !result.data || result.status !== 'success') {
        throw new Error('Invalid data format');
      }
      
      // Lọc người chơi Việt Nam
      const vietnamesePlayers = result.data.users
        .filter(player => {
          const country = player.country?.toLowerCase();
          const hasVNFlag = country === 'vn';
          const hasVNInName = (player.nickname || '').toUpperCase().includes('VN');
          return hasVNFlag || hasVNInName;
        })
        .sort((a, b) => (b.eloRate || 0) - (a.eloRate || 0))
        .slice(0, 100);
      
      setPlayers(vietnamesePlayers);
      setFilteredPlayers(vietnamesePlayers);
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
    try {
      const response = await fetch(`https://api.mcsrranked.com/users/${uuid}/matches?type=2&count=5`);
      if (!response.ok) return [];
      
      const result = await response.json();
      return result.status === 'success' ? result.data.data : [];
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
      'enter_fortress': <Trophy className="w-4 h-4 text-gray-500" />,
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
    if (rank === 1) return <Trophy className="w-8 h-8 text-yellow-400 drop-shadow-lg" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-300 drop-shadow-lg" />;
    if (rank === 3) return <Medal className="w-8 h-8 text-orange-400 drop-shadow-lg" />;
    return <span className="text-xl font-black text-white drop-shadow-md">#{rank}</span>;
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
      setSelectedPlayer(player);
      const matches = await fetchPlayerMatches(player.uuid);
      setSelectedPlayer(prev => ({...player, recentMatches: matches}));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://wallpapercave.com/wp/wp2571595.png)',
            filter: 'blur(8px)',
            transform: 'scale(1.1)'
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-20 h-20 border-8 border-green-400 border-t-transparent rounded-lg animate-spin mx-auto mb-6"></div>
            <p className="text-white text-3xl font-black" style={{textShadow: '4px 4px 0 #000'}}>
              ĐANG TẢI...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://wallpapercave.com/wp/wp2571595.png)',
            filter: 'blur(8px)',
            transform: 'scale(1.1)'
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="bg-red-900/80 border-4 border-red-600 rounded-lg p-8 text-white backdrop-blur-sm">
            <p className="text-2xl font-black mb-4">{error}</p>
            <button 
              onClick={fetchLeaderboard}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition font-black border-4 border-red-800"
            >
              THỬ LẠI
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://wallpapercave.com/wp/wp2571595.png)',
          filter: 'blur(8px)',
          transform: 'scale(1.1)'
        }}
      />
      <div className="fixed inset-0 bg-black/60" />
      
      {/* Match Details Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gray-900 border-4 border-green-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b-4 border-green-700 p-6 flex justify-between items-center">
              <h2 className="text-3xl font-black text-yellow-400" style={{textShadow: '2px 2px 0 #000'}}>
                THÔNG TIN TRẬN ĐẤU
              </h2>
              <button 
                onClick={() => setSelectedMatch(null)}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Match Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/50 rounded-lg p-4 border-2 border-green-600">
                  <p className="text-sm text-gray-400 mb-1 font-bold">NGÀY</p>
                  <p className="text-xl font-black text-white">{formatDate(selectedMatch.date)}</p>
                </div>
                <div className="bg-black/50 rounded-lg p-4 border-2 border-yellow-600">
                  <p className="text-sm text-gray-400 mb-1 font-bold">THỜI GIAN</p>
                  <p className="text-xl font-black text-yellow-400">{formatTime(selectedMatch.result?.time)}</p>
                </div>
              </div>

              {/* Players */}
              <div>
                <h3 className="text-xl font-black text-green-400 mb-3">NGƯỜI CHƠI</h3>
                <div className="space-y-2">
                  {selectedMatch.players?.map((p, idx) => (
                    <div key={idx} className="bg-black/50 rounded-lg p-4 border-2 border-green-600 flex justify-between items-center">
                      <span className="text-lg font-bold text-white">{p.nickname}</span>
                      <div className="flex gap-2">
                        {selectedMatch.result?.uuid === p.uuid && (
                          <Trophy className="w-6 h-6 text-yellow-400" />
                        )}
                        <span className="text-lg font-bold text-yellow-400">
                          {selectedMatch.changes?.find(c => c.uuid === p.uuid)?.eloRate || 0} ELO
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Completions */}
              {selectedMatch.completions && selectedMatch.completions.length > 0 && (
                <div>
                  <h3 className="text-xl font-black text-purple-400 mb-3">HOÀN THÀNH</h3>
                  <div className="space-y-2">
                    {selectedMatch.completions.map((comp, idx) => {
                      const player = selectedMatch.players?.find(p => p.uuid === comp.uuid);
                      return (
                        <div key={idx} className="bg-black/50 rounded-lg p-3 border-2 border-purple-600 flex justify-between items-center">
                          <span className="text-base font-bold text-white">{player?.nickname}</span>
                          <span className="text-lg font-black text-purple-400">{formatTime(comp.time)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timelines */}
              {selectedMatch.timelines && selectedMatch.timelines.length > 0 && (
                <div>
                  <h3 className="text-xl font-black text-blue-400 mb-3">TIMELINE</h3>
                  <div className="space-y-3">
                    {selectedMatch.players?.map((player) => {
                      const playerTimelines = selectedMatch.timelines.filter(t => t.uuid === player.uuid);
                      if (playerTimelines.length === 0) return null;
                      
                      return (
                        <div key={player.uuid} className="bg-black/50 rounded-lg p-4 border-2 border-blue-600">
                          <p className="text-lg font-black text-white mb-3">{player.nickname}</p>
                          <div className="space-y-2">
                            {playerTimelines.sort((a, b) => a.time - b.time).map((timeline, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg animate-fade-in"
                                style={{animationDelay: `${idx * 100}ms`}}
                              >
                                <div className="flex-shrink-0">
                                  {getTimelineIcon(timeline.type)}
                                </div>
                                <span className="flex-1 text-sm font-bold text-gray-300">
                                  {getTimelineLabel(timeline.type)}
                                </span>
                                <span className="text-sm font-black text-blue-400">
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

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-1 p-4 pb-32">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 pt-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-2xl" />
                <h1 
                  className="text-6xl font-black text-white drop-shadow-2xl"
                  style={{textShadow: '6px 6px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000'}}
                >
                  MCSR RANKED
                </h1>
              </div>
              <div className="flex items-center justify-center gap-2 mb-6">
                <MapPin className="w-6 h-6 text-red-500 drop-shadow-lg" />
                <p 
                  className="text-3xl font-black text-yellow-400"
                  style={{textShadow: '3px 3px 0 #000'}}
                >
                  VIỆT NAM
                </p>
              </div>

              {/* Search Bar */}
              <div className="max-w-xl mx-auto mb-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm người chơi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-black/70 border-4 border-green-700 rounded-lg text-white text-xl font-bold focus:outline-none focus:border-green-500 transition backdrop-blur-sm"
                  />
                </div>
              </div>

              <p 
                className="text-gray-300 text-lg font-bold"
                style={{textShadow: '2px 2px 0 #000'}}
              >
                TÌM THẤY {filteredPlayers.length} NGƯỜI CHƠI
              </p>
            </div>

            {/* Top 3 Podium */}
            {filteredPlayers.length >= 3 && searchQuery === '' && (
              <div className="grid grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto">
                {/* 2nd Place */}
                <div className="pt-12">
                  <div className="bg-gradient-to-b from-gray-400 to-gray-600 rounded-t-lg p-4 text-center border-4 border-gray-700">
                    <Medal className="w-12 h-12 text-gray-300 mx-auto mb-2 drop-shadow-lg" />
                    <p className="text-2xl font-black text-white" style={{textShadow: '2px 2px 0 #000'}}>
                      {filteredPlayers[1].nickname}
                    </p>
                    <p className="text-xl font-bold text-yellow-300">
                      {calculateStats(filteredPlayers[1]).elo} ELO
                    </p>
                  </div>
                  <div className="bg-gray-600/80 h-24 rounded-b-lg border-4 border-t-0 border-gray-700 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-4xl font-black text-white" style={{textShadow: '3px 3px 0 #000'}}>#2</span>
                  </div>
                </div>

                {/* 1st Place */}
                <div>
                  <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-lg p-6 text-center border-4 border-yellow-700 shadow-2xl">
                    <Trophy className="w-16 h-16 text-yellow-200 mx-auto mb-3 drop-shadow-2xl animate-pulse" />
                    <p className="text-3xl font-black text-white" style={{textShadow: '3px 3px 0 #000'}}>
                      {filteredPlayers[0].nickname}
                    </p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {calculateStats(filteredPlayers[0]).elo} ELO
                    </p>
                  </div>
                  <div className="bg-yellow-600/80 h-32 rounded-b-lg border-4 border-t-0 border-yellow-700 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-5xl font-black text-white" style={{textShadow: '4px 4px 0 #000'}}>#1</span>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="pt-20">
                  <div className="bg-gradient-to-b from-orange-400 to-orange-600 rounded-t-lg p-4 text-center border-4 border-orange-700">
                    <Medal className="w-12 h-12 text-orange-200 mx-auto mb-2 drop-shadow-lg" />
                    <p className="text-2xl font-black text-white" style={{textShadow: '2px 2px 0 #000'}}>
                      {filteredPlayers[2].nickname}
                    </p>
                    <p className="text-xl font-bold text-yellow-300">
                      {calculateStats(filteredPlayers[2]).elo} ELO
                    </p>
                  </div>
                  <div className="bg-orange-600/80 h-16 rounded-b-lg border-4 border-t-0 border-orange-700 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-3xl font-black text-white" style={{textShadow: '2px 2px 0 #000'}}>#3</span>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div className="bg-black/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl border-4 border-green-800">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white text-2xl font-black" style={{textShadow: '3px 3px 0 #000'}}>
                    KHÔNG TÌM THẤY NGƯỜI CHƠI
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPlayers.map((player, index) => {
                    const stats = calculateStats(player);
                    const isSelected = selectedPlayer?.uuid === player.uuid;
                    
                    return (
                      <div
                        key={player.uuid || index}
                        className="bg-gradient-to-r from-green-900/70 to-emerald-900/70 hover:from-green-800/90 hover:to-emerald-800/90 rounded-xl p-5 transition-all duration-200 border-4 border-green-700/50 hover:border-green-500 hover:scale-[1.02] backdrop-blur-sm"
                      >
                        <div 
                          className="flex items-center gap-4 cursor-pointer"
                          onClick={() => handlePlayerClick(player)}
                        >
                          {/* Rank */}
                          <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-black/50 rounded-lg border-2 border-green-600">
                            {getRankIcon(index + 1)}
                          </div>

                          {/* Player Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 
                                className="text-2xl font-black text-white"
                                style={{textShadow: '2px 2px 0 #000'}}
                              >
                                {player.nickname || 'Unknown'}
                              </h3>
                              <span 
                                className="px-4 py-2 bg-green-600 rounded-lg text-lg text-white font-black border-2 border-green-800 shadow-lg"
                              >
                                {stats.elo} ELO
                              </span>
                            </div>
                            <div className="flex gap-4 mt-2 text-base text-gray-200 font-bold flex-wrap">
                              <span className="flex items-center gap-1">
                                <Award className="w-5 h-5 text-green-400" />
                                {stats.wins}W
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="w-5 h-5 text-red-400" />
                                {stats.loses}L
                              </span>
                              <span className="text-yellow-400">
                                WR: {stats.winRate}%
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                                {stats.total} Trận
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details - Recent Matches */}
                        {isSelected && selectedPlayer.recentMatches && (
                          <div className="mt-5 pt-5 border-t-4 border-green-700/50">
                            <h4 
                              className="text-xl font-black text-yellow-400 mb-4"
                              style={{textShadow: '2px 2px 0 #000'}}
                            >
                              TRẬN ĐẤU GẦN ĐÂY
                            </h4>
                            <div className="space-y-3">
                              {selectedPlayer.recentMatches.slice(0, 5).map((match, idx) => {
                                const isWinner = match.result?.uuid === player.uuid;
                                const change = match.changes?.find(c => c.uuid === player.uuid);
                                
                                return (
                                  <div 
                                    key={idx}
                                    className="bg-black/60 rounded-lg p-4 border-2 border-blue-600 hover:border-blue-400 transition cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      fetchMatchDetails(match.id);
                                    }}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          {isWinner ? (
                                            <Trophy className="w-5 h-5 text-yellow-400" />
                                          ) : (
                                            <X className="w-5 h-5 text-red-400" />
                                          )}
                                          <span className={`text-lg font-black ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                                            {isWinner ? 'THẮNG' : 'THUA'}
                                          </span>
                                          {change && (
                                            <span className={`text-sm font-bold ${(change.change || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                              {(change.change || 0) >= 0 ? '+' : ''}{change.change || 0} ELO
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-sm text-gray-400 font-bold">
                                          {formatDate(match.date)}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <p className="text-sm text-gray-400 font-bold">THỜI GIAN</p>
                                          <p className="text-xl font-black text-yellow-400">
                                            {formatTime(match.result?.time)}
                                          </p>
                                        </div>
                                        <Eye className="w-6 h-6 text-blue-400" />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
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
        <footer className="relative z-10 bg-black/80 backdrop-blur-md border-t-4 border-green-800 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
              <div>
                <h3 
                  className="text-xl font-black text-yellow-400 mb-2"
                  style={{textShadow: '2px 2px 0 #000'}}
                >
                  VỀ TRANG NÀY
                </h3>
                <p className="text-gray-300 text-sm font-bold">
