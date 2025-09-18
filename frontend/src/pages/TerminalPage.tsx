import React from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const TerminalPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <IconButton onClick={() => navigate('/dashboard')} edge="start">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Axol Chat
          </Typography>
          <Chip
            label="Connected as demo"
            color="success"
            size="small"
            sx={{ mr: 1 }}
          />
          <IconButton>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Terminal Interface */}
      <Box sx={{
        flexGrow: 1,
        bgcolor: '#1e1e1e',
        p: 2,
        fontFamily: 'monospace',
        color: '#00d4aa',
        overflow: 'auto'
      }}>
        <Typography variant="body2" sx={{ color: '#00d4aa', fontFamily: 'monospace' }}>
          Axol Chat v1.0 - Private talk, under the shell.
        </Typography>
        <Typography variant="body2" sx={{ color: '#b0b0b0', fontFamily: 'monospace', mt: 1 }}>
          Type /help for available commands
        </Typography>
        <Typography variant="body2" sx={{ color: '#b0b0b0', fontFamily: 'monospace', mt: 1 }}>
          End-to-end encryption: ✓ Active
        </Typography>
        <br />
        <Typography variant="body2" sx={{ color: '#00d4aa', fontFamily: 'monospace' }}>
          demo@secmsg:~$ █
        </Typography>

        {/* Coming Soon Message */}
        <Box sx={{ mt: 4, p: 3, border: '1px solid #333', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ color: '#ff6b35', fontFamily: 'monospace' }}>
            🚧 Terminal Interface Coming Soon
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0', fontFamily: 'monospace', mt: 1 }}>
            The full terminal messaging interface with xterm.js integration
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0', fontFamily: 'monospace' }}>
            will be implemented in the next development phase.
          </Typography>
          <br />
          <Typography variant="body2" sx={{ color: '#00d4aa', fontFamily: 'monospace' }}>
            Features in development:
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0', fontFamily: 'monospace' }}>
            • Real-time messaging with WebSocket connection
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0', fontFamily: 'monospace' }}>
            • Command interface (/connect, /list, /help)
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0', fontFamily: 'monospace' }}>
            • End-to-end encryption with WebCrypto API
          </Typography>
          <Typography variant="body2" sx={{ color: '#b0b0b0', fontFamily: 'monospace' }}>
            • User presence and connection management
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};