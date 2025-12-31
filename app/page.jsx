'use client';
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Settings, Download } from 'lucide-react';

const API_BASE = 'https://api.mcsrranked.com';

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
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [viewMode, setViewMode] = useState('two-column'); // 'two-column' or 'popup'
  const [showSettings, setShowSettings] = useState(false);

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
      
      // Load all players, not just top 100
      const response = await fetch(`${API_BASE}/leaderboard?type=2&country=VN`);
      const data = await response.json();
      
      if (data.status !== 'success' || !data.data) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const { users, season } = data.data;
      
      if (season) {
        if (typeof season === 'object' && season.number) {
          setCurrentSeason(season.number);
          if (season.endsAt) setSeasonEndDate(season.endsAt);
        } else if (typeof season === 'number') {
          setCurrentSeason(season);
        }
      }
      
      const basicPlayers = users.map((user, idx) => ({
        rank: idx + 1,
        uuid: user.uuid,
        nickname: user.nickname,
        elo: user.eloRate || 0
      }));
      
      setPlayers(basicPlayers);
      setLoading(false);
      
    } catch (err) {
      console.error('Error:', err);
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

  const downloadCSV = () => {
    const headers = ['Rank', 'Username', 'ELO'];
    const rows = sortedPlayers.map(p => [p.rank, p.nickname, p.elo]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcsr-vn-leaderboard-season${currentSeason}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortedPlayers = [...players].sort((a, b) => {
    let valA, valB;
    switch (sortBy) {
      case 'rank': valA = a.rank; valB = b.rank; break;
      case 'elo': valA = a.elo; valB = b.elo; break;
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
        fontFamily: '"Minecraft", monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPmxvZjghEiKmWHZrb5zra6E3cf41UGeN5nfFsO6xX2g&s=10"
            alt="Loading"
            style={{ width: '120px', height: '120px', marginBottom: '20px' }}
          />
          <div style={{ fontSize: '24px', color: '#00ff00', fontFamily: '"Minecraft", monospace' }}>
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
      fontFamily: '"Minecraft", monospace',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#2d5016',
          border: '3px solid #3a6b1e',
          color: '#fff',
          padding: '10px',
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: '"Minecraft", monospace',
          fontSize: '14px'
        }}
      >
        <Settings size={20} />
        Settings
      </button>

      {/* Settings Dropdown */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          background: '#1a1a1a',
          border: '3px solid #3a6b1e',
          borderRadius: '8px',
          padding: '15px',
          zIndex: 1000,
          minWidth: '200px',
          fontFamily: '"Minecraft", monospace',
          fontSize: '12px'
        }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>View Mode:</div>
          <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="viewMode"
              checked={viewMode === 'two-column'}
              onChange={() => setViewMode('two-column')}
              style={{ marginRight: '8px' }}
            />
            Two Column
          </label>
          <label style={{ display: 'block', cursor: 'pointer' }}>
            <input
              type="radio"
              name="viewMode"
              checked={viewMode === 'popup'}
              onChange={() => setViewMode('popup')}
              style={{ marginRight: '8px' }}
            />
            Popup Modal
          </label>
        </div>
      )}

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
            fontFamily: '"Minecraft", monospace',
            textShadow: '4px 4px 0 rgba(0,0,0,0.3)',
            letterSpacing: '2px'
          }}>
            VNMCSR RANKED DATA
          </h1>
        </div>
      </div>

      {/* Leaderboards Info */}
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
        <div style={{ fontSize: '28px', fontFamily: '"Minecraft", monospace', marginBottom: '15px' }}>
          Season {currentSeason}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <button style={{
            background: '#2d5016',
            border: '3px solid #3a6b1e',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: '"Minecraft", monospace'
          }}>
            Subscribe
          </button>
          <button
            onClick={downloadCSV}
            style={{
              background: '#2d5016',
              border: '3px solid #3a6b1e',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: '"Minecraft", monospace',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Download size={16} />
            Download Table
          </button>
        </div>
        
        {/* Social Links */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          marginBottom: '15px'
        }}>
          <a href="https://discord.gg/mcsrranked" target="_blank" rel="noopener noreferrer" style={{ color: '#7289da', fontSize: '24px' }}>
            <i className="fab fa-discord"></i>
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1877f2', fontSize: '24px' }}>
            <i className="fab fa-facebook"></i>
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontSize: '24px' }}>
            <i className="fab fa-github"></i>
          </a>
        </div>

        <div style={{ marginTop: '15px', fontSize: '18px', fontFamily: '"Minecraft", monospace' }}>
          End in {countdown || 'Loading...'}
        </div>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#4CAF50', fontFamily: '"Minecraft", monospace' }}>
          Total Players: {players.length}
        </div>
      </div>

      {/* Two Column Layout or Single Column */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: (viewMode === 'two-column' && selectedPlayer) ? '1fr 1fr' : '1fr',
        gap: '20px',
        transition: 'grid-template-columns 0.3s ease'
      }}>
        {/* Left Column - Table */}
        <div style={{
          background: '#0a0a0a',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '2px solid #333'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px 80px 1fr 120px',
            background: '#1a1a1a',
            padding: '15px 20px',
            borderBottom: '2px solid #333',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#aaa',
            fontFamily: '"Minecraft", monospace'
          }}>
            <SortHeader label="#" sortKey="rank" currentSort={sortBy} direction={sortDir} onClick={handleSort} />
            <div></div>
            <div>Name</div>
            <SortHeader label="Elo ▼" sortKey="elo" currentSort={sortBy} direction={sortDir} onClick={handleSort} />
          </div>

          <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {sortedPlayers.map((player) => (
              <div
                key={player.uuid}
                onClick={() => setSelectedPlayer(player)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 80px 1fr 120px',
                  padding: '12px 20px',
                  borderBottom: '1px solid #222',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: selectedPlayer?.uuid === player.uuid ? '#1a3a1a' : 'transparent',
                  fontFamily: '"Minecraft", monospace',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedPlayer?.uuid !== player.uuid) {
                    e.currentTarget.style.background = '#1a1a1a';
                    e.currentTarget.style.transform = 'translateX(5px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPlayer?.uuid !== player.uuid) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{player.rank}</div>
                <img 
                  src={`https://mc-heads.net/avatar/${player.uuid}/48`}
                  alt={player.nickname}
                  style={{ width: '48px', height: '48px', imageRendering: 'pixelated' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                  {player.nickname}
                  <span style={{ fontSize: '18px' }}>🇻🇳</span>
                </div>
                <div style={{ color: getEloColor(player.elo), fontWeight: 'bold', fontSize: '18px' }}>
                  {player.elo}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Player Stats iframe (Two Column Mode) */}
        {viewMode === 'two-column' && selectedPlayer && (
          <div style={{
            background: '#0a0a0a',
            borderRadius: '8px',
            border: '2px solid #333',
            overflow: 'hidden',
            position: 'sticky',
            top: '20px',
            height: 'fit-content',
            maxHeight: 'calc(100vh - 40px)',
            animation: 'slideInRight 0.3s ease'
          }}>
            <div style={{
              background: '#1a1a1a',
              padding: '15px 20px',
              borderBottom: '2px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: '"Minecraft", monospace'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src={`https://mc-heads.net/avatar/${selectedPlayer.uuid}/32`}
                  alt={selectedPlayer.nickname}
                  style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
                />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedPlayer.nickname}</div>
                  <div style={{ fontSize: '12px', color: getEloColor(selectedPlayer.elo) }}>
                    #{selectedPlayer.rank} • {selectedPlayer.elo} ELO
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={24} />
              </button>
            </div>
            <iframe
              src={`https://mcsrranked.com/stats/${selectedPlayer.nickname}`}
              style={{
                width: '100%',
                height: 'calc(100vh - 150px)',
                border: 'none'
              }}
              title={`Stats for ${selectedPlayer.nickname}`}
            />
          </div>
        )}
      </div>

      {/* Popup Modal */}
      {viewMode === 'popup' && selectedPlayer && (
        <div 
          onClick={() => setSelectedPlayer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0a0a0a',
              borderRadius: '12px',
              border: '3px solid #3a6b1e',
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              animation: 'scaleIn 0.3s ease'
            }}
          >
            <div style={{
              background: '#1a1a1a',
              padding: '20px',
              borderBottom: '2px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: '"Minecraft", monospace'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <img 
                  src={`https://mc-heads.net/avatar/${selectedPlayer.uuid}/48`}
                  alt={selectedPlayer.nickname}
                  style={{ width: '48px', height: '48px', imageRendering: 'pixelated' }}
                />
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedPlayer.nickname}</div>
                  <div style={{ fontSize: '14px', color: getEloColor(selectedPlayer.elo) }}>
                    #{selectedPlayer.rank} • {selectedPlayer.elo} ELO
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                style={{
                  background: '#2d5016',
                  border: '2px solid #3a6b1e',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '10px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={24} />
              </button>
            </div>
            <iframe
              src={`https://mcsrranked.com/stats/${selectedPlayer.nickname}`}
              style={{
                width: '100%',
                height: 'calc(90vh - 100px)',
                border: 'none'
              }}
              title={`Stats for ${selectedPlayer.nickname}`}
            />
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.cdnfonts.com/css/minecraft-4');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
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
