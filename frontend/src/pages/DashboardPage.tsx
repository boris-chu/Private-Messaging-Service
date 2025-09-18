import React from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Button,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  const openTerminal = () => {
    navigate('/terminal');
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            SecureMsg Dashboard
          </Typography>
          <IconButton color="inherit">
            <SettingsIcon />
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="md" sx={{ flexGrow: 1, py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome to SecureMsg
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Your secure messaging platform is ready. Start by opening the terminal interface
          to connect with your colleagues.
        </Typography>

        <Card sx={{ mt: 4 }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <TerminalIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Terminal Interface
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Access the secure messaging terminal with end-to-end encryption
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<TerminalIcon />}
              onClick={openTerminal}
              sx={{
                mt: 2,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0, 212, 170, 0.4)',
                }
              }}
            >
              Open Terminal
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Box sx={{ mt: 4, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Connections
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Messages Today
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="success.main">
                Online
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
};