import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Fade,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Terminal } from '../components/Terminal';
import { IMessageChat } from '../components/iMessageChat';
import { SettingsModal } from '../components/SettingsModal';
import { WebSocketDebugPanel } from '../components/WebSocketDebugPanel';
import { useTheme } from '../contexts/ThemeContext';
import { websocketService } from '../services/websocketService';
import { anonymousSessionManager } from '../utils/anonymousSessionManager';

interface User {
  username: string;
  fullName?: string;
  displayName?: string;
  isAnonymous?: boolean;
  sessionId?: string;
}

interface ConnectionStatusData {
  status: string;
}

interface UserListData {
  users?: string[];
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { chatTheme, debugSettings } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserCount, setOnlineUserCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    // Check for regular user session
    const userData = localStorage.getItem('user');
    const anonymousUserData = localStorage.getItem('anonymousUser');
    const isAnonymousSession = localStorage.getItem('isAnonymousSession') === 'true';

    if (isAnonymousSession && anonymousUserData) {
      // Handle anonymous user session with session manager
      const restoredSession = anonymousSessionManager.restoreSession();
      if (restoredSession) {
        setUser({
          username: restoredSession.username,
          displayName: restoredSession.displayName,
          fullName: restoredSession.displayName,
          isAnonymous: true,
          sessionId: restoredSession.sessionId
        });
      } else {
        // Session expired or invalid, redirect to login
        navigate('/login');
        return;
      }
    } else if (userData) {
      // Handle regular user session
      setUser(JSON.parse(userData));
    } else {
      // No valid session, redirect to login
      navigate('/login');
      return;
    }

    // Auto-reconnect to chat if user was previously connected
    const wasConnected = localStorage.getItem('axol-was-connected');
    if (wasConnected === 'true') {
      // Small delay to ensure components are ready
      setTimeout(() => {
        console.log('Auto-reconnecting to chat...');
        setConnected(websocketService.isConnected);
      }, 1000);
    }
  }, [navigate]);

  const handleSettings = () => {
    setSettingsOpen(true);
  };

  const handleLogout = async () => {
    // Disconnect from websocket before logout
    websocketService.disconnect();

    // Handle anonymous session cleanup
    if (user?.isAnonymous && anonymousSessionManager.isSessionActive()) {
      await anonymousSessionManager.endSession();
    }

    // Clear all session data (regular and anonymous)
    localStorage.removeItem('user');
    localStorage.removeItem('anonymousUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('isAnonymousSession');
    localStorage.removeItem('axol-chat-messages'); // Clear message cache
    localStorage.removeItem('axol-terminal-messages'); // Clear terminal message cache
    localStorage.removeItem('axol-was-connected'); // Clear connection state

    navigate('/login');
  };

  const handleDeleteAccount = () => {
    // Disconnect from websocket
    websocketService.disconnect();
    // Clear all user data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('axol-chat-messages'); // Clear message cache
    localStorage.removeItem('axol-terminal-messages'); // Clear terminal message cache
    localStorage.removeItem('axol-was-connected'); // Clear connection state
    localStorage.removeItem('axol-chat-theme');
    localStorage.removeItem('axol-color-mode');
    localStorage.removeItem('axol-privacy-settings');
    // Navigate to login
    navigate('/login');
  };

  const handleConnect = useCallback(() => {
    console.log('Connecting to WebSocket...');
    setConnected(websocketService.isConnected);
    // Save connection state for auto-reconnect
    localStorage.setItem('axol-was-connected', 'true');
  }, []);

  const handleCommand = useCallback((command: string) => {
    console.log('Command executed:', command);
  }, []);

  // Listen for WebSocket connection changes
  useEffect(() => {
    const handleConnectionStatus = (data: ConnectionStatusData) => {
      const isConnected = data.status === 'connected';
      setConnected(isConnected);
      // Save connection state for auto-reconnect (but not for manual disconnects)
      if (isConnected) {
        localStorage.setItem('axol-was-connected', 'true');
      }
    };

    const handleUserList = (data: UserListData) => {
      setOnlineUserCount(data.users ? data.users.length : 0);
    };

    const handleUserJoined = () => {
      websocketService.requestUserList();
    };

    const handleUserLeft = () => {
      websocketService.requestUserList();
    };

    const connectionStatusWrapper = (data: unknown) => handleConnectionStatus(data as ConnectionStatusData);
    const userListWrapper = (data: unknown) => handleUserList(data as UserListData);
    const userJoinedWrapper = () => handleUserJoined();
    const userLeftWrapper = () => handleUserLeft();

    websocketService.on('connection_status', connectionStatusWrapper);
    websocketService.on('user_list', userListWrapper);
    websocketService.on('user_joined', userJoinedWrapper);
    websocketService.on('user_left', userLeftWrapper);

    // Set initial connection state
    setConnected(websocketService.isConnected);

    return () => {
      websocketService.off('connection_status', connectionStatusWrapper);
      websocketService.off('user_list', userListWrapper);
      websocketService.off('user_joined', userJoinedWrapper);
      websocketService.off('user_left', userLeftWrapper);
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
        onDeleteAccount={handleDeleteAccount}
      />

      {/* WebSocket Debug Panel */}
      <WebSocketDebugPanel
        websocketService={websocketService}
        enabled={debugSettings.websocketDebugEnabled}
        onToggle={() => {}}
      />
    </Box>
  );
};