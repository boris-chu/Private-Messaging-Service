import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Fade,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Terminal } from '../components/Terminal';
import { IMessageChat } from '../components/iMessageChat';
import { SettingsModal } from '../components/SettingsModal';
import { useTheme } from '../contexts/ThemeContext';
import { websocketService } from '../services/websocketService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { chatTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserCount, setOnlineUserCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleSettings = () => {
    setSettingsOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleConnect = useCallback(() => {
    console.log('Connecting to WebSocket...');
    setConnected(websocketService.isConnected);
  }, []);

  const handleCommand = useCallback((command: string) => {
    console.log('Command executed:', command);
  }, []);

  // Listen for WebSocket connection changes
  useEffect(() => {
    const handleConnectionStatus = (data: any) => {
      setConnected(data.status === 'connected');
    };

    const handleUserList = (data: any) => {
      setOnlineUserCount(data.users ? data.users.length : 0);
    };

    const handleUserJoined = () => {
      websocketService.requestUserList();
    };

    const handleUserLeft = () => {
      websocketService.requestUserList();
    };

    websocketService.on('connection_status', handleConnectionStatus);
    websocketService.on('user_list', handleUserList);
    websocketService.on('user_joined', handleUserJoined);
    websocketService.on('user_left', handleUserLeft);

    // Set initial connection state
    setConnected(websocketService.isConnected);

    return () => {
      websocketService.off('connection_status', handleConnectionStatus);
      websocketService.off('user_list', handleUserList);
      websocketService.off('user_joined', handleUserJoined);
      websocketService.off('user_left', handleUserLeft);
    };
  }, []);

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ height: '100vh', width: '100vw', bgcolor: 'background.default', overflow: 'hidden' }}>
      <Fade in timeout={800}>
        <Box sx={{ height: '100%', width: '100%' }}>
          {chatTheme === 'terminal' ? (
            <Terminal
              connected={connected}
              onConnect={handleConnect}
              onCommand={handleCommand}
              onSettings={handleSettings}
              onLogout={handleLogout}
              onlineUserCount={onlineUserCount}
            />
          ) : (
            <IMessageChat
              connected={connected}
              onConnect={handleConnect}
              onSettings={handleSettings}
              onLogout={handleLogout}
              onlineUserCount={onlineUserCount}
            />
          )}
        </Box>
      </Fade>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
};