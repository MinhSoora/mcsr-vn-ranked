'use client';
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const API_BASE = 'https://api.mcsrranked.com';

const formatTime = (ms) => {
  if (!ms && ms !== 0) return '-';
  const totalSeconds = ms / 1000;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const millis = Math.floor(ms % 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
};

const getEloColor = (elo) => {
  if (elo >= 2000) return '#e74c3c';
  if (elo >= 1500) return '#3498db';
  if (elo >= 1200) return '#2ecc71';
  if (elo >= 900) return '#f39c12';
  if (elo >= 600) return '#95a5a6';
  return '#8b7355';
};

const SortHeader = ({ label, sortKey, currentSort, direction, onClick }) => (
  <div 
    onClick={() => onClick(sortKey)}
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

export default function VNMCSRLeaderboard() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('rank');
  const [sortDir, setSortDir] = useState('asc');
  const [currentSeason, setCurrentSeason] = useState(9);
  const [seasonEndDate, setSeasonEndDate] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [statsLoaded, setStatsLoaded] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!seasonEndDate) return;
    
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = seasonEndDate - now;
      
      if (diff <= 0) {
        setCountdown('Season Ended');
        clearInterval(interval);
        return;
      }
      
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = Math.floor(diff % 60);
      
      setCountdown(`${days} days ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [seasonEndDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch leaderboard with season info
      const response = await fetch(`${API_BASE}/leaderboard?type=2&country=VN&count=100`);
      const data = await response.json();
      
      if (data.status !== 'success' || !data.data) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      // Get season info from leaderboard response
      const { users, season, seasonEndDate: endDate } = data.data;
      
      if (season) setCurrentSeason(season);
      if (endDate) setSeasonEndDate(endDate);
      
      // Create basic player list first
      const basicPlayers = users.map((user, idx) => ({
        rank: idx + 1,
        uuid: user.uuid,
        nickname: user.nickname,
        elo: user.eloRate || 0,
        bestTime: null,
        avgTime: null,
        winRate: null,
        ffRate: null
      }));
      
      setPlayers(basicPlayers);
      setLoading(false);
      
      // Load stats in background
      loadPlayerStats(basicPlayers);
      
    } catch (err) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const loadPlayerStats = async (playerList) => {
    const batchSize = 5; // Load 5 players at a time
    
    for (let i = 0; i < playerList.length; i += batchSize) {
      const batch = playerList.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (player) => {
        try {
          const response = await fetch(`${API_BASE}/users/${player.uuid}/matches?type=2&count=50`);
          const data = await response.json();
          
          if (data.status === 'success' && data.data.matches) {
            const matches = data.data.matches;
            const stats = calculateStats(matches, player.uuid);
            
            setPlayers(prev => prev.map(p => 
              p.uuid === player.uuid ? { ...p, ...stats } : p
            ));
          }
        } catch (err) {
          console.error(`Error loading stats for ${player.nickname}:`, err);
        }
      }));
      
      setStatsLoaded(Math.min(i + batchSize, playerList.length));
      await new Promise(r => setTimeout(r, 100));
    }
  };

  const calculateStats = (matches, playerUuid) => {
    let wins = 0, losses = 0, forfeits = 0;
    let times = [];
    
    matches.forEach(match => {
      if (match.forfeited) forfeits++;
      
      const isWin = match.result?.uuid === playerUuid;
      const isLoss = match.result?.uuid && match.result.uuid !== playerUuid;
      
      if (isWin) wins++;
      else if (isLoss) losses++;
      
      const completion = match.completions?.find(c => c.uuid === playerUuid);
      if (completion?.time) times.push(completion.time);
    });
    
    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? (wins / totalMatches * 100).toFixed(2) : '0.00';
    const ffRate = matches.length > 0 ? (forfeits / matches.length * 100).toFixed(2) : '0.00';
    const bestTime = times.length > 0 ? Math.min(...times) : null;
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
    
    return { bestTime, avgTime, winRate, ffRate };
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
      case 'elo': valA = a.elo; valB = b.elo; break;
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
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <img 
            src="https://media.tenor.com/hlKEXPvlX48AAAAi/minecraft-loading.gif"
            alt="Loading"
            style={{ width: '120px', height: '120px', marginBottom: '20px' }}
          />
          <div style={{ fontSize: '24px', color: '#00ff00', fontFamily: 'monospace' }}>
            Loading...
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
      {/* Header */}
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
            alt="MCSR"
            style={{ width: '64px', height: '64px' }}
          />
          <h1 style={{
            fontSize: '42px',
            margin: 0,
            fontFamily: 'monospace',
            fontWeight: 'bold',
            textShadow: '4px 4px 0 rgba(0,0,0,0.3)',
            letterSpacing: '2px'
          }}>
            VNMCSR RANKED DATA
          </h1>
        </div>
      </div>

      {/* Leaderboards */}
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
          fontFamily: 'monospace',
          letterSpacing: '4px'
        }}>
          Leaderboards
        </h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
          <span style={{ fontSize: '32px' }}>👾</span>
          <span style={{ fontSize: '32px' }}>🏆</span>
          <span style={{ fontSize: '32px' }}>⚡</span>
        </div>
        <div style={{ fontSize: '28px', fontFamily: 'monospace', marginBottom: '15px' }}>
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
        <div style={{ marginTop: '15px', fontSize: '18px', fontFamily: 'monospace' }}>
          End in {countdown || 'Loading...'}
        </div>
        {statsLoaded < players.length && (
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#4CAF50' }}>
            Loading stats: {statsLoaded}/{players.length}
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: '#0a0a0a',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '2px solid #333'
      }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                {player.nickname}
                <span style={{ fontSize: '18px' }}>🇻🇳</span>
              </div>
              <div style={{ color: getEloColor(player.elo), fontWeight: 'bold', fontSize: '15px' }}>
                {player.elo}
              </div>
              <div style={{ color: '#4CAF50', fontFamily: 'monospace', fontSize: '14px' }}>
                {player.bestTime ? formatTime(player.bestTime) : '-'}
              </div>
              <div style={{ color: '#2196F3', fontFamily: 'monospace', fontSize: '14px' }}>
                {player.avgTime ? formatTime(player.avgTime) : '-'}
              </div>
              <div style={{ color: '#FFC107', fontWeight: 'bold' }}>
                {player.winRate ? `${player.winRate}%` : '-'}
              </div>
              <div style={{ color: '#F44336' }}>
                {player.ffRate ? `${player.ffRate}%` : '-'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
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
