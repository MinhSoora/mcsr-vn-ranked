'use client';
import React, { useState, useEffect } from 'react';
import { Settings, Trash2, Save, AlertCircle, CheckCircle, Activity } from 'lucide-react';

const WEBHOOK_TYPES = [
  { id: 'failure', label: 'Stream Failure', color: '#ef4444' },
  { id: 'recovery', label: 'Stream Recovery', color: '#10b981' },
  { id: 'low_bitrate', label: 'Low Bitrate', color: '#f59e0b' },
  { id: 'bitrate_recovery', label: 'Bitrate Recovery', color: '#3b82f6' }
];

export default function WebhookHandler() {
  const [webhookUrls, setWebhookUrls] = useState({
    failure: 'http://193.70.34.27:20251/webhook/camera-disconnected',
    recovery: 'http://193.70.34.27:20251/webhook/camera-reconnected',
    low_bitrate: 'http://193.70.34.27:20251/webhook/camera-weak',
    bitrate_recovery: 'http://193.70.34.27:20251/webhook/camera-stable'
  });
  
  const [logs, setLogs] = useState([]);
  const [savedConfig, setSavedConfig] = useState(false);
  const [serverRunning, setServerRunning] = useState(false);

  // Load saved configuration from storage
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await window.storage.get('webhook-config');
        if (result && result.value) {
          const config = JSON.parse(result.value);
          setWebhookUrls(config);
        }
      } catch (error) {
        console.log('No saved config found');
      }
    };
    loadConfig();
  }, []);

  // Load logs from storage
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const result = await window.storage.get('webhook-logs');
        if (result && result.value) {
          setLogs(JSON.parse(result.value));
        }
      } catch (error) {
        console.log('No logs found');
      }
    };
    loadLogs();
  }, []);

  const saveConfiguration = async () => {
    try {
      await window.storage.set('webhook-config', JSON.stringify(webhookUrls));
      setSavedConfig(true);
      addLog('Configuration saved successfully', 'success');
      setTimeout(() => setSavedConfig(false), 3000);
    } catch (error) {
      addLog('Failed to save configuration', 'error');
    }
  };

  const addLog = async (message, type = 'info') => {
    const newLog = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString()
    };
    
    const updatedLogs = [newLog, ...logs].slice(0, 100); // Keep last 100 logs
    setLogs(updatedLogs);
    
    try {
      await window.storage.set('webhook-logs', JSON.stringify(updatedLogs));
    } catch (error) {
      console.error('Failed to save logs');
    }
  };

  const clearLogs = async () => {
    setLogs([]);
    try {
      await window.storage.delete('webhook-logs');
      addLog('Logs cleared', 'info');
    } catch (error) {
      console.error('Failed to clear logs');
    }
  };

  const sendWebhook = async (type) => {
    const url = webhookUrls[type];
    
    if (!url) {
      addLog(`No URL configured for ${type}`, 'error');
      return;
    }

    try {
      addLog(`Sending ${type} webhook to ${url}...`, 'info');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: type,
          timestamp: new Date().toISOString(),
          source: 'webhook-handler-system'
        })
      });

      if (response.ok) {
        addLog(`✓ ${type} webhook sent successfully (${response.status})`, 'success');
      } else {
        addLog(`✗ ${type} webhook failed (${response.status})`, 'error');
      }
    } catch (error) {
      addLog(`✗ ${type} webhook error: ${error.message}`, 'error');
    }
  };

  // Simulated webhook receiver endpoint
  const handleIncomingWebhook = async (type) => {
    addLog(`Received ${type} event`, 'info');
    
    // Forward to configured URL
    await sendWebhook(type);
  };

  const getWebhookTypeConfig = (type) => {
    return WEBHOOK_TYPES.find(w => w.id === type);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '30px',
        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '10px'
        }}>
          <Activity size={40} />
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>
            Webhook Handler System
          </h1>
        </div>
        <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
          Configure and manage webhook forwarding for stream events
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Configuration Panel */}
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '25px',
          border: '1px solid #334155'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px'
          }}>
            <Settings size={24} />
            <h2 style={{ margin: 0, fontSize: '20px' }}>Webhook Configuration</h2>
          </div>

          {WEBHOOK_TYPES.map((webhook) => (
            <div key={webhook.id} style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: webhook.color
              }}>
                {webhook.label}
              </label>
              <input
                type="url"
                value={webhookUrls[webhook.id]}
                onChange={(e) => setWebhookUrls({
                  ...webhookUrls,
                  [webhook.id]: e.target.value
                })}
                placeholder={`https://your-endpoint.com/${webhook.id}`}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = webhook.color}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
              />
            </div>
          ))}

          <button
            onClick={saveConfiguration}
            style={{
              width: '100%',
              padding: '14px',
              background: savedConfig ? '#10b981' : '#6366f1',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!savedConfig) e.target.style.background = '#4f46e5';
            }}
            onMouseLeave={(e) => {
              if (!savedConfig) e.target.style.background = '#6366f1';
            }}
          >
            {savedConfig ? <CheckCircle size={20} /> : <Save size={20} />}
            {savedConfig ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>

        {/* Test Panel */}
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '25px',
          border: '1px solid #334155'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px' }}>
            Test Webhooks
          </h2>
          
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>
            Click to simulate receiving an event and forward it to the configured URL
          </p>

          {WEBHOOK_TYPES.map((webhook) => (
            <button
              key={webhook.id}
              onClick={() => handleIncomingWebhook(webhook.id)}
              disabled={!webhookUrls[webhook.id]}
              style={{
                width: '100%',
                padding: '14px',
                marginBottom: '12px',
                background: webhookUrls[webhook.id] ? webhook.color : '#334155',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '500',
                cursor: webhookUrls[webhook.id] ? 'pointer' : 'not-allowed',
                opacity: webhookUrls[webhook.id] ? 1 : 0.5,
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (webhookUrls[webhook.id]) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = `0 4px 12px ${webhook.color}40`;
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Send {webhook.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Panel */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        padding: '25px',
        border: '1px solid #334155'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Activity Logs</h2>
          <button
            onClick={clearLogs}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Trash2 size={16} />
            Clear Logs
          </button>
        </div>

        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          background: '#0f172a',
          borderRadius: '8px',
          padding: '15px'
        }}>
          {logs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#64748b',
              fontSize: '14px'
            }}>
              No logs yet. Test a webhook to see activity.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  background: '#1e293b',
                  borderRadius: '6px',
                  borderLeft: `4px solid ${
                    log.type === 'success' ? '#10b981' :
                    log.type === 'error' ? '#ef4444' :
                    '#6366f1'
                  }`,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                {log.type === 'success' && <CheckCircle size={16} color="#10b981" />}
                {log.type === 'error' && <AlertCircle size={16} color="#ef4444" />}
                {log.type === 'info' && <Activity size={16} color="#6366f1" />}
                <div style={{ flex: 1 }}>
                  <div>{log.message}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #0f172a;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}</style>
    </div>
  );
      }
