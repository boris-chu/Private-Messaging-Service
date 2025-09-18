import React, { useState, useEffect } from 'react';
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
  Avatar,
  Chip,
  Card,
  CardContent,
  Fade,
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  Settings,
  Security,
  People,
  Message
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Terminal } from '../components/Terminal';
import { websocketService } from '../services/websocketService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<any>(null);
  const [connected, setConnected] = useState(false);

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

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleConnect = () => {
    console.log('Connecting to WebSocket...');
    setConnected(websocketService.isConnected);
  };

  const handleCommand = (command: string) => {
    console.log('Command executed:', command);
  };

  // Listen for WebSocket connection changes
  useEffect(() => {
    const handleConnectionStatus = (data: any) => {
      setConnected(data.status === 'connected');
    };

    websocketService.on('connection_status', handleConnectionStatus);

    // Set initial connection state
    setConnected(websocketService.isConnected);

    return () => {
      websocketService.off('connection_status', handleConnectionStatus);
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
          <Security sx={{ mr: 2, color: '#00d4aa' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SecureMsg
          </Typography>

          {/* Connection Status */}
          <Chip
            icon={connected ? <Security /> : <Security />}
            label={connected ? "Connected" : "Disconnected"}
            color={connected ? "success" : "error"}
            variant="outlined"
            size="small"
            sx={{ mr: 2 }}
          />

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
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#00d4aa' }}>
                {(user.fullName || user.username).charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            sx={{ mt: '45px' }}
          >
            <MenuItem onClick={handleClose}>
              <AccountCircle sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleClose}>
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
            {/* Welcome Section */}
            <Paper
              elevation={2}
              sx={{
                p: 3,
                mb: 4,
                bgcolor: 'background.paper',
                borderRadius: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Security sx={{ fontSize: 32, color: '#00d4aa' }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    Welcome, {user.fullName || user.username}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Secure messaging terminal ready for encrypted communication
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Stats Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
              <Card elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <People sx={{ fontSize: 40, color: '#219ebc' }} />
                    <Box>
                      <Typography variant="h6">Online Users</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        {connected ? '3' : '0'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Card elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Message sx={{ fontSize: 40, color: '#00d4aa' }} />
                    <Box>
                      <Typography variant="h6">Messages</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        12
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Card elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Security sx={{ fontSize: 40, color: '#8b5cf6' }} />
                    <Box>
                      <Typography variant="h6">Encryption</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#00d4aa' }}>
                        AES-256
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Card elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: connected ? '#28ca42' : '#ff5f57',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: 'white'
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="h6">Status</Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: connected ? '#28ca42' : '#ff5f57'
                        }}
                      >
                        {connected ? 'Connected' : 'Offline'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Terminal Section */}
            <Paper
              elevation={2}
              sx={{
                p: 3,
                bgcolor: 'background.paper',
                borderRadius: 2
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security sx={{ color: '#00d4aa' }} />
                Secure Terminal
              </Typography>
              <Terminal
                connected={connected}
                onConnect={handleConnect}
                onCommand={handleCommand}
              />
            </Paper>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};