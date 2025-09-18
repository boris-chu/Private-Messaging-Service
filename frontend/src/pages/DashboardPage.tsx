import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Fade,
} from '@mui/material';
import {
  Logout,
  Settings,
  People
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Terminal } from '../components/Terminal';
import { IMessageChat } from '../components/iMessageChat';
import { SettingsModal } from '../components/SettingsModal';
import { useTheme } from '../contexts/ThemeContext';
import { websocketService } from '../services/websocketService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { chatTheme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSettings = () => {
    setAnchorEl(null);
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
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar position="static" sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <img src="/axolotl.png" alt="Axol" style={{ width: 32, height: 32, marginRight: 8 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Axol Chat
          </Typography>


          {/* User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#c9d1d9' }}>
              {user.fullName || user.username}
            </Typography>
            <IconButton
              size="large"
              onClick={handleMenu}
              color="inherit"
            >
              <img src="/axolotl.png" alt="User Avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            sx={{ mt: '45px' }}
          >
            <MenuItem onClick={handleSettings}>
              <Settings sx={{ mr: 1 }} />
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Fade in timeout={800}>
          <Box>

            {/* Discreet user count */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <People sx={{ fontSize: 16, color: '#8b949e' }} />
              <Typography variant="body2" sx={{ color: '#8b949e' }}>
                {connected ? `${onlineUserCount} user${onlineUserCount !== 1 ? 's' : ''} online` : 'Offline'}
              </Typography>
            </Box>

            {/* Chat Section */}
            <Paper
              elevation={2}
              sx={{
                p: chatTheme === 'imessage' ? 0 : 3,
                bgcolor: 'background.paper',
                borderRadius: 2,
                height: { xs: '400px', md: '500px' },
                overflow: 'hidden'
              }}
            >
              {chatTheme === 'terminal' ? (
                <Terminal
                  connected={connected}
                  onConnect={handleConnect}
                  onCommand={handleCommand}
                />
              ) : (
                <IMessageChat
                  connected={connected}
                  onConnect={handleConnect}
                />
              )}
            </Paper>
          </Box>
        </Fade>
      </Container>

      {/* Settings Modal */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
};