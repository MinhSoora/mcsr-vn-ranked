import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Clock, User, MapPin, Calendar, Target, Search, Award, TrendingUp } from 'lucide-react';

export default function MCSRLeaderboard() {
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
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
      const response = await fetch('https://mcsrranked.com/api/leaderboard');
      const data = await response.json();
      
      // Lọc người chơi Việt Nam
      const vietnamesePlayers = data.data
        .filter(player => {
          const hasVNFlag = player.nationality === 'VN' || player.country === 'VN';
          const hasVNInName = (player.nickname || player.username || '').includes('VN');
          return hasVNFlag || hasVNInName;
        })
        .sort((a, b) => (b.elo_rate || 0) - (a.elo_rate || 0))
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

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-8 h-8 text-yellow-400 drop-shadow-lg" />;
    if (rank === 2) return <Medal className="w-8 h-8 text-gray-300 drop-shadow-lg" />;
    if (rank === 3) return <Medal className="w-8 h-8 text-orange-400 drop-shadow-lg" />;
    return <span className="text-xl font-black text-white drop-shadow-md" style={{fontFamily: 'Minecraft, monospace'}}>#{rank}</span>;
  };

  const calculateStats = (player) => {
    const wins = player.records?.win || player.win || 0;
    const loses = player.records?.lose || player.lose || 0;
    const total = wins + loses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    const loseRate = total > 0 ? ((loses / total) * 100).toFixed(1) : 0;
    
    return {
      wins,
      loses,
      total,
      winRate,
      loseRate,
      bestTime: player.best_record_time || null,
      avgTime: player.records?.avg_time || player.avg_time || null,
      elo: Math.round(player.elo_rate || player.elo || 0),
      highestElo: Math.round(player.highest_elo_rate || player.elo_rate || 0)
    };
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
            <p className="text-white text-3xl font-black" style={{fontFamily: 'Minecraft, monospace', textShadow: '4px 4px 0 #000'}}>
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
            <p className="text-2xl font-black mb-4" style={{fontFamily: 'Minecraft, monospace'}}>{error}</p>
            <button 
              onClick={fetchLeaderboard}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition font-black border-4 border-red-800"
              style={{fontFamily: 'Minecraft, monospace'}}
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
                  style={{
                    fontFamily: 'Minecraft, monospace',
                    textShadow: '6px 6px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000'
                  }}
                >
                  MCSR RANKED
                </h1>
              </div>
              <div className="flex items-center justify-center gap-2 mb-6">
                <MapPin className="w-6 h-6 text-red-500 drop-shadow-lg" />
                <p 
                  className="text-3xl font-black text-yellow-400"
                  style={{
                    fontFamily: 'Minecraft, monospace',
                    textShadow: '3px 3px 0 #000'
                  }}
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
                    style={{fontFamily: 'Minecraft, monospace'}}
                  />
                </div>
              </div>

              <p 
                className="text-gray-300 text-lg font-bold"
                style={{fontFamily: 'Minecraft, monospace', textShadow: '2px 2px 0 #000'}}
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
                    <p className="text-2xl font-black text-white" style={{fontFamily: 'Minecraft, monospace', textShadow: '2px 2px 0 #000'}}>
                      {filteredPlayers[1].nickname || filteredPlayers[1].username}
                    </p>
                    <p className="text-xl font-bold text-yellow-300" style={{fontFamily: 'Minecraft, monospace'}}>
                      {calculateStats(filteredPlayers[1]).elo} ELO
                    </p>
                  </div>
                  <div className="bg-gray-600/80 h-24 rounded-b-lg border-4 border-t-0 border-gray-700 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-4xl font-black text-white" style={{fontFamily: 'Minecraft, monospace', textShadow: '3px 3px 0 #000'}}>#2</span>
                  </div>
                </div>

                {/* 1st Place */}
                <div>
                  <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-t-lg p-6 text-center border-4 border-yellow-700 shadow-2xl">
                    <Trophy className="w-16 h-16 text-yellow-200 mx-auto mb-3 drop-shadow-2xl animate-pulse" />
                    <p className="text-3xl font-black text-white" style={{fontFamily: 'Minecraft, monospace', textShadow: '3px 3px 0 #000'}}>
                      {filteredPlayers[0].nickname || filteredPlayers[0].username}
                    </p>
                    <p className="text-2xl font-bold text-yellow-900" style={{fontFamily: 'Minecraft, monospace'}}>
                      {calculateStats(filteredPlayers[0]).elo} ELO
                    </p>
                  </div>
                  <div className="bg-yellow-600/80 h-32 rounded-b-lg border-4 border-t-0 border-yellow-700 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-5xl font-black text-white" style={{fontFamily: 'Minecraft, monospace', textShadow: '4px 4px 0 #000'}}>#1</span>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="pt-20">
                  <div className="bg-gradient-to-b from-orange-400 to-orange-600 rounded-t-lg p-4 text-center border-4 border-orange-700">
                    <Medal className="w-12 h-12 text-orange-200 mx-auto mb-2 drop-shadow-lg" />
                    <p className="text-2xl font-black text-white" style={{fontFamily: 'Minecraft, monospace', textShadow: '2px 2px 0 #000'}}>
                      {filteredPlayers[2].nickname || filteredPlayers[2].username}
                    </p>
                    <p className="text-xl font-bold text-yellow-300" style={{fontFamily: 'Minecraft, monospace'}}>
                      {calculateStats(filteredPlayers[2]).elo} ELO
                    </p>
                  </div>
                  <div className="bg-orange-600/80 h-16 rounded-b-lg border-4 border-t-0 border-orange-700 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-3xl font-black text-white" style={{fontFamily: 'Minecraft, monospace', textShadow: '2px 2px 0 #000'}}>#3</span>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div className="bg-black/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl border-4 border-green-800">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white text-2xl font-black" style={{fontFamily: 'Minecraft, monospace', textShadow: '3px 3px 0 #000'}}>
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
                        onClick={() => setSelectedPlayer(isSelected ? null : player)}
                        className="bg-gradient-to-r from-green-900/70 to-emerald-900/70 hover:from-green-800/90 hover:to-emerald-800/90 rounded-xl p-5 cursor-pointer transition-all duration-200 border-4 border-green-700/50 hover:border-green-500 hover:scale-[1.02] backdrop-blur-sm"
                      >
                        <div className="flex items-center gap-4">
                          {/* Rank */}
                          <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-black/50 rounded-lg border-2 border-green-600">
                            {getRankIcon(index + 1)}
                          </div>

                          {/* Player Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 
                                className="text-2xl font-black text-white"
                                style={{fontFamily: 'Minecraft, monospace', textShadow: '2px 2px 0 #000'}}
                              >
                                {player.nickname || player.username || 'Unknown'}
                              </h3>
                              <span 
                                className="px-4 py-2 bg-green-600 rounded-lg text-lg text-white font-black border-2 border-green-800 shadow-lg"
                                style={{fontFamily: 'Minecraft, monospace'}}
                              >
                                {stats.elo} ELO
                              </span>
                            </div>
                            <div className="flex gap-4 mt-2 text-base text-gray-200 font-bold flex-wrap" style={{fontFamily: 'Minecraft, monospace'}}>
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

                          {/* Best Time */}
                          {stats.bestTime && (
                            <div className="text-right bg-black/50 px-4 py-3 rounded-lg border-2 border-yellow-600">
                              <p className="text-sm text-gray-400 font-bold" style={{fontFamily: 'Minecraft, monospace'}}>KỶ LỤC</p>
                              <p className="text-3xl font-black text-yellow-400" style={{fontFamily: 'Minecraft, monospace', textShadow: '2px 2px 0 #000'}}>
                                {formatTime(stats.bestTime)}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Expanded Details */}
                        {isSelected && (
                          <div className="mt-5 pt-5 border-t-4 border-green-700/50">
                            <h4 
                              className="text-xl font-black text-yellow-400 mb-4"
                              style={{fontFamily: 'Minecraft, monospace', textShadow: '2px 2px 0 #000'}}
                            >
                              THÔNG SỐ CHI TIẾT
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-black/60 rounded-lg p-4 border-2 border-green-600">
                                <p className="text-sm text-gray-400 mb-1 font-bold" style={{fontFamily: 'Minecraft, monospace'}}>TỔNG TRẬN</p>
                                <p className="text-2xl font-black text-white" style={{fontFamily: 'Minecraft, monospace'}}>{stats.total}</p>
                              </div>
                              <div className="bg-black/60 rounded-lg p-4 border-2 border-yellow-600">
                                <p className="text-sm text-gray-400 mb-1 font-bold" style={{fontFamily: 'Minecraft, monospace'}}>ELO CAO NHẤT</p>
                                <p className="text-2xl font-black text-yellow-400" style={{fontFamily: 'Minecraft, monospace'}}>{stats.highestElo}</p>
                              </div>
                              <div className="bg-black/60 rounded-lg p-4 border-2 border-blue-600">
                                <p className="text-sm text-gray-400 mb-1 font-bold" style={{fontFamily: 'Minecraft, monospace'}}>TỶ LỆ THẮNG</p>
                                <p className="text-2xl font-black text-green-400" style={{fontFamily: 'Minecraft, monospace'}}>{stats.winRate}%</p>
                              </div>
                              <div className="bg-black/60 rounded-lg p-4 border-2 border-red-600">
                                <p className="text-sm text-gray-400 mb-1 font-bold" style={{fontFamily: 'Minecraft, monospace'}}>TỶ LỆ THUA</p>
                                <p className="text-2xl font-black text-red-400" style={{fontFamily: 'Minecraft, monospace'}}>{stats.loseRate}%</p>
                              </div>
                              <div className="bg-black/60 rounded-lg p-4 border-2 border-purple-600">
                                <p className="text-sm text-gray-400 mb-1 font-bold" style={{fontFamily: 'Minecraft, monospace'}}>THỜI GIAN TỐT NHẤT</p>
                                <p className="text-xl font-black text-purple-400" style={{fontFamily: 'Minecraft, monospace'}}>
                                  {stats.bestTime ? formatTime(stats.bestTime) : 'N/A'}
                                </p>
                              </div>
                              <div className="bg-black/60 rounded-lg p-4 border-2 border-orange-600">
                                <p className="text-sm text-gray-400 mb-1 font-bold" style={{fontFamily: 'Minecraft, monospace'}}>THỜI GIAN TB</p>
                                <p className="text-xl font-black text-orange-400" style={{fontFamily: 'Minecraft, monospace'}}>
                                  {stats.avgTime ? formatTime(stats.avgTime) : 'N/A'}
                                </p>
                              </div>
                              <div className="bg-black/60 rounded-lg p-4 border-2 border-green-600">
                                <p className="text-sm text-gray-400 mb-1 font-bold" style={{fontFamily: 'Minecraft, monospace'}}>CHIẾN THẮNG</p>
                                <p className="text-2xl font-black text-green-400" style={{fontFamily: 'Minecraft, monospace'}}>{stats.wins}</p>
                              </div>
                              <div className="bg-black/60 rounded-lg p-4 border-2 border-red-600">
                                <p className="text-sm text-gray-400 mb-1 font-bold" style={{fontFamily: 'Minecraft, monospace'}}>THẤT BẠI</p>
                                <p className="text-2xl font-black text-red-400" style={{fontFamily: 'Minecraft, monospace'}}>{stats.loses}</p>
                              </div>
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
                  style={{fontFamily: 'Minecraft, monospace', textShadow: '2px 2px 0 #000'}}
                >
                  VỀ TRANG NÀY
                </h3>
                <p className="text-gray-300 text-sm font-bold" style={{fontFamily: 'Minecraft, monospace'}}>
                  Bảng xếp hạng Minecraft Speedrun Ranked<br/>cho người chơi Việt Nam
                </p>
              </div>
              <div>
                <h3 
                  className="text-xl font-black text-yellow-400 mb-2"
                  style={{fontFamily: 'Minecraft, monospace', textShadow: '2px 2px 0 #000'}}
                >
                  DỮ LIỆU
                </h3>
                <p className="text-gray-300 text-sm font-bold" style={{fontFamily: 'Minecraft, monospace'}}>
                  Nguồn: MCSR Ranked API<br/>
                  Cập nhật: Thời gian thực
                </p>
              </div>
              <div>
                <h3 
                  className="text-xl font-black text-yellow-400 mb-2"
                  style={{fontFamily: 'Minecraft, monospace', textShadow: '2px 2px 0 #000'}}
                >
                  LIÊN HỆ
                </h3>
                <p className="text-gray-300 text-sm font-bold" style={{fontFamily: 'Minecraft, monospace'}}>
                  Website: mcsrranked.com<br/>
                  Tạo bởi Claude AI
                </p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t-2 border-green-800 text-center">
              <p 
                className="text-gray-400 text-sm font-bold"
                style={{fontFamily: 'Minecraft, monospace'}}
              >
                © 2024 MCSR Vietnam Leaderboard | Được tạo với ❤️ cho cộng đồng Minecraft Việt Nam
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
