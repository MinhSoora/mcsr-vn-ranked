'use client';
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const API_BASE = 'https://api.mcsrranked.com';

// Utility functions
const formatTime = (ms) => {
  if (!ms && ms !== 0) return '-';
  const totalSeconds = ms / 1000;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const millis = Math.floor(ms % 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};

const getEloColor = (elo) => {
  if (elo >= 2000) return '#e74c3c'; // Netherite - red
  if (elo >= 1500) return '#3498db'; // Diamond - blue
  if (elo >= 1200) return '#2ecc71'; // Emerald - green
  if (elo >= 900) return '#f39c12';  // Gold - orange
  if (elo >= 600) return '#95a5a6';  // Iron - gray
  return '#8b7355'; // Coal - brown
};

const getRankName = (elo) => {
  if (elo >= 2000) return 'Netherite';
  if (elo >= 1500) return 'Diamond';
  if (elo >= 1200) return 'Emerald';
  if (elo >= 900) return 'Gold';
  if (elo >= 600) return 'Iron';
  return 'Coal';
};

// API Service
const fetchLeaderboard = async () => {
  const response = await fetch(`${API_BASE}/leaderboard?type=2&country=VN&count=100`);
  const data = await response.json();
  if (data.status === 'success') return data.data;
  throw new Error('Failed to fetch leaderboard');
};

const fetchUserMatches = async (uuid) => {
  const response = await fetch(`${API_BASE}/users/${uuid}/matches?type=2&count=100`);
  const data = await response.json();
  if (data.status === 'success') return data.data.matches || [];
  return [];
};

// Calculate stats from matches
const calculateStats = (matches, playerUuid) => {
  let wins = 0, losses = 0, forfeits = 0;
  let times = [], bestTime = null, totalTime = 0;
  let currentStreak = 0, bestStreak = 0, tempStreak = 0;

  const sorted = [...matches].sort((a, b) => b.date - a.date);

  sorted.forEach((match, idx) => {
    if (match.forfeited) forfeits++;
    
    const isWin = match.result?.uuid === playerUuid;
    const isLoss = match.result?.uuid && match.result.uuid !== playerUuid;
    
    if (isWin) {
      wins++;
      tempStreak++;
      if (idx === 0) currentStreak = tempStreak;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else if (isLoss) {
      losses++;
      tempStreak = 0;
    }

    const completion = match.completions?.find(c => c.uuid === playerUuid);
    if (completion?.time) {
      times.push(completion.time);
      totalTime += completion.time;
      if (!bestTime || completion.time < bestTime) bestTime = completion.time;
    }
  });

  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? (wins / totalMatches * 100).toFixed(2) : '0.00';
  const ffRate = matches.length > 0 ? (forfeits / matches.length * 100).toFixed(2) : '0.00';
  const avgTime = times.length > 0 ? totalTime / times.length : null;

  return { bestTime, avgTime, winRate, ffRate };
};

// Sort Header Component
const SortHeader = ({ label, sortKey, currentSort, direction, onClick }) => (
  <div 
    onClick={() => onClick(sortKey)}
    className="sort-header"
    style={{
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      userSelect: 'none',
      opacity: currentSort === sortKey ? 1 : 0.7,
      fontWeight: currentSort === sortKey ? 'bold' : 'normal'
    }}
  >
    {label}
    {currentSort === sortKey && (
      direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
    )}
  </div>
);

// Main Component
export default function VNMCSRLeaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [sortBy, setSortBy] = useState('rank');
  const [sortDir, setSortDir] = useState('asc');
  const [currentSeason, setCurrentSeason] = useState(9);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    loadData();
    
    // Countdown timer - estimate 90 days from now
    const endDate = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60);
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = endDate - now;
      if (diff <= 0) {
        setCountdown('Season Ended');
        return;
      }
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;
      setCountdown(`${days} days ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setProgress(0);
      
      const leaderboard = await fetchLeaderboard();
      const users = leaderboard.users || [];
      
      if (users.length > 0) {
        const firstMatches = await fetchUserMatches(users[0].uuid);
        if (firstMatches.length > 0) {
          setCurrentSeason(firstMatches[0].season || 9);
        }
      }

      const processed = [];
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const matches = await fetchUserMatches(user.uuid);
        const stats = calculateStats(matches, user.uuid);
        
        processed.push({
          rank: i + 1,
          uuid: user.uuid,
          nickname: user.nickname,
          elo: user.eloRate,
          ...stats
        });
        
        setProgress(Math.floor((i + 1) / users.length * 100));
        await new Promise(r => setTimeout(r, 30));
      }

      setPlayers(processed);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir(key === 'rank' ? 'asc' : 'desc');
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'rank': valA = a.rank; valB = b.rank; break;
      case 'elo': valA = a.elo || 0; valB = b.elo || 0; break;
      case 'bestTime': valA = a.bestTime || 999999999; valB = b.bestTime || 999999999; break;
      case 'avgTime': valA = a.avgTime || 999999999; valB = b.avgTime || 999999999; break;
      case 'winRate': valA = parseFloat(a.winRate) || 0; valB = parseFloat(b.winRate) || 0; break;
      case 'ffRate': valA = parseFloat(a.ffRate) || 0; valB = parseFloat(b.ffRate) || 0; break;
      default: valA = a.rank; valB = b.rank;
    }
    return sortDir === 'asc' ? valA - valB : valB - valA;
  });

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Press Start 2P", monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <img 
            src="https://media.tenor.com/hlKEXPvlX48AAAAi/minecraft-loading.gif"
            alt="Loading"
            style={{ width: '120px', height: '120px', marginBottom: '20px' }}
          />
          <div style={{ 
            fontSize: '24px', 
            color: '#00ff00',
            marginBottom: '20px',
            textShadow: '0 0 10px #00ff00'
          }}>
            {progress}%
          </div>
          <div style={{
            width: '300px',
            height: '30px',
            background: '#0a0a0a',
            border: '3px solid #00ff00',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #00ff00, #00aa00)',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(90deg, #7cb342 0%, #558b2f 100%)',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '20px',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '15px'
        }}>
          <img 
            src="https://mcsrranked.com/img/icon_x256.png"
            alt="MCSR Ranked"
            style={{ width: '64px', height: '64px' }}
          />
          <h1 style={{
            fontSize: '42px',
            margin: 0,
            fontFamily: '"Minecraft", monospace',
            textShadow: '4px 4px 0 rgba(0,0,0,0.3)',
            letterSpacing: '2px'
          }}>
            VNMCSR RANKED DATA
          </h1>
        </div>
      </div>

      {/* Leaderboards Title */}
      <div style={{
        background: '#1e3a3a',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '36px',
          margin: '0 0 10px 0',
          fontFamily: '"Minecraft", monospace',
          letterSpacing: '4px'
        }}>
          Leaderboards
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
          <span style={{ fontSize: '32px' }}>👾</span>
          <span style={{ fontSize: '32px' }}>🏆</span>
          <span style={{ fontSize: '32px' }}>⚡</span>
        </div>
        <div style={{
          fontSize: '28px',
          fontFamily: '"Minecraft", monospace',
          marginBottom: '15px'
        }}>
          Season {currentSeason}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <button style={{
            background: '#2d5016',
            border: '3px solid #3a6b1e',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            Subscribe
          </button>
          <button style={{
            background: '#2d5016',
            border: '3px solid #3a6b1e',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            Download Table
          </button>
        </div>
        <div style={{
          marginTop: '15px',
          fontSize: '18px',
          fontFamily: 'monospace'
        }}>
          End in {countdown}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: '#0a0a0a',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '2px solid #333'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 60px 200px 100px 120px 120px 100px 100px',
          background: '#1a1a1a',
          padding: '15px 20px',
          borderBottom: '2px solid #333',
          fontSize: '13px',
          fontWeight: 'bold',
          color: '#aaa'
        }}>
          <SortHeader label="#" sortKey="rank" currentSort={sortBy} direction={sortDir} onClick={handleSort} />
          <div></div>
          <div>Name</div>
          <SortHeader label="Elo ▼" sortKey="elo" currentSort={sortBy} direction={sortDir} onClick={handleSort} />
          <SortHeader label="Best time ▲" sortKey="bestTime" currentSort={sortBy} direction={sortDir} onClick={handleSort} />
          <SortHeader label="Avg Time ▲" sortKey="avgTime" currentSort={sortBy} direction={sortDir} onClick={handleSort} />
          <SortHeader label="Win rate ▼" sortKey="winRate" currentSort={sortBy} direction={sortDir} onClick={handleSort} />
          <SortHeader label="FF rate" sortKey="ffRate" currentSort={sortBy} direction={sortDir} onClick={handleSort} />
        </div>

        {/* Table Body */}
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {sortedPlayers.map((player) => (
            <div
              key={player.uuid}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 60px 200px 100px 120px 120px 100px 100px',
                padding: '12px 20px',
                borderBottom: '1px solid #222',
                alignItems: 'center',
                transition: 'background 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{player.rank}</div>
              <img 
                src={`https://mc-heads.net/avatar/${player.uuid}/32`}
                alt={player.nickname}
                style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
              />
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontWeight: '500'
              }}>
                {player.nickname}
                <span style={{ fontSize: '18px' }}>🇻🇳</span>
              </div>
              <div style={{ 
                color: getEloColor(player.elo),
                fontWeight: 'bold',
                fontSize: '15px'
              }}>
                {player.elo}
              </div>
              <div style={{ color: '#4CAF50', fontFamily: 'monospace', fontSize: '14px' }}>
                {formatTime(player.bestTime)}
              </div>
              <div style={{ color: '#2196F3', fontFamily: 'monospace', fontSize: '14px' }}>
                {formatTime(player.avgTime)}
              </div>
              <div style={{ color: '#FFC107', fontWeight: 'bold' }}>
                {player.winRate}%
              </div>
              <div style={{ color: '#F44336' }}>
                {player.ffRate}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.cdnfonts.com/css/minecraft-4');
        
        * {
          box-sizing: border-box;
        }
        
        ::-webkit-scrollbar {
          width: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 5px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
    }
