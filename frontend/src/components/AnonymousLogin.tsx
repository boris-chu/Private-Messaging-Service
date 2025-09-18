import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Paper,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Fade,
  Avatar
} from '@mui/material';
import {
  PersonAdd,
  Refresh,
  Edit,
  Check,
  Close,
  AccountCircle,
  ChatBubble,
  Security
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  generateAnonymousUser,
  generateUsernameOptions,
  generateDisplayName,
  isValidUsernameFormat,
  cleanUsername,
  type AnonymousUser
} from '../utils/anonymousUserGenerator';
// import { apiService } from '../services/apiService'; // Disabled for demo mode
import { anonymousSessionManager } from '../utils/anonymousSessionManager';

interface AnonymousLoginProps {
  open: boolean;
  onClose: () => void;
}

export const AnonymousLogin: React.FC<AnonymousLoginProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [anonymousUser, setAnonymousUser] = useState<AnonymousUser | null>(null);
  const [isEditing, setIsEditing] = useState({ username: false, displayName: false });
  const [editValues, setEditValues] = useState({ username: '', displayName: '' });
  const [usernameOptions, setUsernameOptions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate initial user when modal opens
  useEffect(() => {
    if (open && !anonymousUser) {
      generateNewUser();
    }
  }, [open, anonymousUser]);

  const generateNewUser = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      let attempts = 0;
      let newUser: AnonymousUser;

      // Generate username and check availability (max 5 attempts)
      do {
        newUser = generateAnonymousUser();
        attempts++;

        // For demo mode, assume all generated usernames are available
        // In production, this would check against the backend API
        console.log(`Generated username (demo mode): ${newUser.username}`);
        break;
      } while (attempts < 5);

      const options = generateUsernameOptions(5);

      setAnonymousUser(newUser);
      setUsernameOptions(options);
      setEditValues({
        username: newUser.username,
        displayName: newUser.displayName
      });
    } catch (err) {
      setError('Failed to generate username. Please try again.');
      console.error('Username generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditToggle = (field: 'username' | 'displayName') => {
    setIsEditing(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
    setError(null);
  };

  const handleEditSave = (field: 'username' | 'displayName') => {
    if (field === 'username') {
      const cleaned = cleanUsername(editValues.username);
      if (!isValidUsernameFormat(cleaned)) {
        setError('Username must be 3-30 characters, letters, numbers, and underscores only');
        return;
      }
      setAnonymousUser(prev => prev ? { ...prev, username: cleaned } : null);
      setEditValues(prev => ({ ...prev, username: cleaned }));
    } else {
      setAnonymousUser(prev => prev ? { ...prev, displayName: editValues.displayName } : null);
    }

    setIsEditing(prev => ({ ...prev, [field]: false }));
    setError(null);
  };

  const handleUsernameOptionSelect = (username: string) => {
    setEditValues(prev => ({ ...prev, username }));
    setAnonymousUser(prev => prev ? { ...prev, username } : null);
    setIsEditing(prev => ({ ...prev, username: false }));
    setError(null);
  };

  const handleJoinChat = async () => {
    if (!anonymousUser) return;

    setIsJoining(true);
    setError(null);

    try {
      console.log('Starting anonymous login process...', anonymousUser);

      // For now, skip API calls and work in demo mode
      // This allows the frontend to function while backend anonymous endpoints are being developed
      console.log('Working in demo mode - skipping API calls');

      // Start session with session manager (offline mode)
      console.log('Starting session with session manager...');
      await anonymousSessionManager.startSession(
        anonymousUser.username,
        anonymousUser.displayName,
        anonymousUser.sessionId
      );

      // Store user data for compatibility (demo mode)
      const demoUser = {
        username: anonymousUser.username,
        displayName: anonymousUser.displayName,
        fullName: anonymousUser.displayName,
        isAnonymous: true,
        sessionId: anonymousUser.sessionId
      };

      // Store in both locations for compatibility
      localStorage.setItem('anonymousUser', JSON.stringify(demoUser));
      localStorage.setItem('user', JSON.stringify(demoUser));
      localStorage.setItem('isAnonymousSession', 'true');
      localStorage.setItem('sessionToken', `demo-token-${anonymousUser.sessionId}`);
      localStorage.setItem('authToken', `demo-auth-${anonymousUser.sessionId}`);

      console.log('Demo anonymous login successful, navigating to dashboard...');

      // Navigate to dashboard
      navigate('/dashboard');
      onClose();

    } catch (err) {
      console.error('Anonymous login error:', err);
      setError('Failed to join chat. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const generateNewDisplayName = () => {
    const newName = generateDisplayName();
    setEditValues(prev => ({ ...prev, displayName: newName }));
    setAnonymousUser(prev => prev ? { ...prev, displayName: newName } : null);
  };

  const handleClose = () => {
    setAnonymousUser(null);
    setIsEditing({ username: false, displayName: false });
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '500px'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <PersonAdd />
          </Avatar>
          <Box>
            <Typography variant="h5" component="h2">
              Join Anonymously
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start chatting instantly without creating an account
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {isGenerating ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Generating your anonymous identity...
            </Typography>
          </Box>
        ) : anonymousUser && (
          <Fade in timeout={500}>
            <Box>
              {/* Preview Section */}
              <Paper
                sx={{
                  p: 3,
                  mb: 3,
                  bgcolor: 'background.default',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderRadius: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <AccountCircle sx={{ fontSize: 32, color: 'primary.main' }} />
                  <Typography variant="h6" color="primary.main">
                    Your Anonymous Identity
                  </Typography>
                </Box>

                {/* Display Name */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Display Name
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isEditing.displayName ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <TextField
                          value={editValues.displayName}
                          onChange={(e) => setEditValues(prev => ({ ...prev, displayName: e.target.value }))}
                          size="small"
                          fullWidth
                          placeholder="Enter display name"
                        />
                        <IconButton
                          onClick={() => handleEditSave('displayName')}
                          color="primary"
                          size="small"
                        >
                          <Check />
                        </IconButton>
                        <IconButton
                          onClick={() => handleEditToggle('displayName')}
                          size="small"
                        >
                          <Close />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <Typography variant="h6" sx={{ flex: 1 }}>
                          {anonymousUser.displayName}
                        </Typography>
                        <IconButton
                          onClick={() => handleEditToggle('displayName')}
                          size="small"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          onClick={generateNewDisplayName}
                          size="small"
                          title="Generate new name"
                        >
                          <Refresh />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Username */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Username (Handle)
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isEditing.username ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <TextField
                          value={editValues.username}
                          onChange={(e) => setEditValues(prev => ({ ...prev, username: e.target.value }))}
                          size="small"
                          fullWidth
                          placeholder="Enter username"
                          helperText="3-30 characters, letters, numbers, underscores only"
                        />
                        <IconButton
                          onClick={() => handleEditSave('username')}
                          color="primary"
                          size="small"
                        >
                          <Check />
                        </IconButton>
                        <IconButton
                          onClick={() => handleEditToggle('username')}
                          size="small"
                        >
                          <Close />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            flex: 1,
                            fontFamily: 'monospace',
                            color: 'primary.main',
                            fontWeight: 'bold'
                          }}
                        >
                          @{anonymousUser.username}
                        </Typography>
                        <IconButton
                          onClick={() => handleEditToggle('username')}
                          size="small"
                        >
                          <Edit />
                        </IconButton>
                      </Box>
                    )}
                  </Box>

                  {/* Username Options */}
                  {usernameOptions.length > 0 && !isEditing.username && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Or try these suggestions:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {usernameOptions.slice(0, 4).map((option, index) => (
                          <Chip
                            key={index}
                            label={`@${option}`}
                            variant="outlined"
                            clickable
                            onClick={() => handleUsernameOptionSelect(option)}
                            sx={{ fontFamily: 'monospace' }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* Demo Mode Notice */}
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Demo Mode
                </Typography>
                <Typography variant="body2">
                  Currently running in demo mode. Anonymous login will work locally without backend authentication.
                </Typography>
              </Alert>

              {/* Privacy Notice */}
              <Alert severity="info" icon={<Security />} sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Anonymous Session Privacy
                </Typography>
                <Typography variant="body2">
                  • Your identity is temporary and not stored permanently
                  • No email, phone, or personal information required
                  • Session ends when you close the browser or sign out
                  • Messages are not tied to your real identity
                </Typography>
              </Alert>

              {/* Preview Chat */}
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  How you'll appear in chat:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'white', borderRadius: 1 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                    {anonymousUser.displayName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {anonymousUser.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      @{anonymousUser.username}
                    </Typography>
                  </Box>
                  <ChatBubble sx={{ color: 'text.secondary', ml: 'auto' }} />
                </Box>
              </Paper>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </Fade>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={handleClose} disabled={isJoining}>
          Cancel
        </Button>
        <Button onClick={generateNewUser} disabled={isGenerating || isJoining}>
          <Refresh sx={{ mr: 1 }} />
          Generate New Identity
        </Button>
        <Button
          variant="contained"
          onClick={handleJoinChat}
          disabled={!anonymousUser || isGenerating || isJoining}
          startIcon={isJoining ? <CircularProgress size={16} /> : <ChatBubble />}
          size="large"
        >
          {isJoining ? 'Joining...' : 'Start Anonymous Chat'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};