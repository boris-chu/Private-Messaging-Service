import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography,
  Divider,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  Terminal,
  Chat,
  Visibility,
  MarkEmailRead,
  Person,
  AccountCircle,
  Delete,
  Save
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import type { ChatTheme } from '../contexts/ThemeContext';

interface User {
  username: string;
  fullName?: string;
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onDeleteAccount?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, onDeleteAccount }) => {
  const { chatTheme, setChatTheme, privacySettings, updatePrivacySettings } = useTheme();
  const [user, setUser] = useState<User>({ username: '', fullName: '' });
  const [editedUser, setEditedUser] = useState<User>({ username: '', fullName: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load user data on component mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setEditedUser({ ...parsedUser });
    }
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setIsEditing(false);
      setUsernameError('');
      setShowDeleteConfirm(false);
      // Reload user data
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setEditedUser({ ...parsedUser });
      }
    }
  }, [open]);

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChatTheme(event.target.value as ChatTheme);
  };

  const handlePrivacyToggle = (setting: keyof typeof privacySettings) => {
    updatePrivacySettings({
      [setting]: !privacySettings[setting]
    });
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original values
      setEditedUser({ ...user });
      setUsernameError('');
    }
    setIsEditing(!isEditing);
  };

  const validateUsername = (username: string): boolean => {
    if (!username.trim()) {
      setUsernameError('Username cannot be empty');
      return false;
    }
    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setUsernameError('Username can only contain letters, numbers, underscores, and hyphens');
      return false;
    }
    setUsernameError('');
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateUsername(editedUser.username)) {
      return;
    }

    setIsSaving(true);
    try {
      // TODO: In a real app, you would check username availability with the server
      // For now, we'll simulate a check
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if username is taken (simple simulation)
      if (editedUser.username !== user.username && editedUser.username.toLowerCase() === 'admin') {
        setUsernameError('This username is already taken');
        setIsSaving(false);
        return;
      }

      // Save to localStorage
      const updatedUser = { ...editedUser };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      setSnackbarMessage('Profile updated successfully!');
      setShowSnackbar(true);
    } catch {
      setUsernameError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    if (showDeleteConfirm) {
      // Actually delete the account
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      setShowSnackbar(false);
      onDeleteAccount?.();
      onClose();
    } else {
      // Show confirmation
      setShowDeleteConfirm(true);
    }
  };

  const handleInputChange = (field: keyof User, value: string) => {
    setEditedUser(prev => ({ ...prev, [field]: value }));
    if (field === 'username' && usernameError) {
      setUsernameError('');
    }
  };

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {/* User Profile Section */}
          <Typography variant="h6" gutterBottom>
            Profile
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage your display name and username
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <AccountCircle sx={{ color: 'primary.main', fontSize: 40 }} />
              <Box sx={{ flex: 1 }}>
                {isEditing ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Full Name"
                      value={editedUser.fullName || ''}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      fullWidth
                      size="small"
                      placeholder="Enter your full name"
                    />
                    <TextField
                      label="Username"
                      value={editedUser.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      fullWidth
                      size="small"
                      error={!!usernameError}
                      helperText={usernameError || 'This will be your unique identifier in chat'}
                      required
                    />
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                      {user.fullName || user.username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      @{user.username}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {isEditing ? (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveProfile}
                      disabled={isSaving || !!usernameError}
                      startIcon={isSaving ? <CircularProgress size={16} /> : <Save />}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleEditToggle}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleEditToggle}
                    startIcon={<Person />}
                  >
                    Edit
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Chat Interface Section */}
          <Typography variant="h6" gutterBottom>
            Chat Interface
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose your preferred chat interface style
          </Typography>

          <FormControl component="fieldset">
            <RadioGroup
              value={chatTheme}
              onChange={handleThemeChange}
              sx={{ gap: 1 }}
            >
              <FormControlLabel
                value="terminal"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Terminal sx={{ color: '#00d4aa' }} />
                    <Box>
                      <Typography variant="body1">Terminal</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Command-line interface for power users
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{
                  border: '1px solid',
                  borderColor: chatTheme === 'terminal' ? '#00d4aa' : 'divider',
                  borderRadius: 1,
                  p: 1,
                  m: 0,
                  bgcolor: chatTheme === 'terminal' ? 'action.selected' : 'transparent'
                }}
              />

              <FormControlLabel
                value="imessage"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chat sx={{ color: '#007AFF' }} />
                    <Box>
                      <Typography variant="body1">iMessage Style</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Familiar chat interface for everyone
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{
                  border: '1px solid',
                  borderColor: chatTheme === 'imessage' ? '#007AFF' : 'divider',
                  borderRadius: 1,
                  p: 1,
                  m: 0,
                  bgcolor: chatTheme === 'imessage' ? 'action.selected' : 'transparent'
                }}
              />
            </RadioGroup>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          {/* Privacy & Security Section */}
          <Typography variant="h6" gutterBottom>
            Privacy & Security
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Control what information others can see about you
          </Typography>

          <List sx={{ p: 0 }}>
            <ListItem sx={{ px: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                <MarkEmailRead sx={{ color: 'primary.main' }} />
              </Box>
              <ListItemText
                primary="Read Receipts"
                secondary="Let others see when you've read their messages"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={privacySettings.showReadReceipts}
                  onChange={() => handlePrivacyToggle('showReadReceipts')}
                  color="primary"
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem sx={{ px: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                <Visibility sx={{ color: 'primary.main' }} />
              </Box>
              <ListItemText
                primary="Online Status"
                secondary="Show others when you're online or offline"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={privacySettings.showOnlineStatus}
                  onChange={() => handlePrivacyToggle('showOnlineStatus')}
                  color="primary"
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          {/* Account Management Section */}
          <Typography variant="h6" gutterBottom sx={{ color: 'error.main' }}>
            Account Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Permanently delete your account and all associated data
          </Typography>

          {showDeleteConfirm && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Are you absolutely sure?
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                This action cannot be undone. This will permanently delete your account
                and remove all your data from our servers.
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant={showDeleteConfirm ? "contained" : "outlined"}
              color="error"
              startIcon={<Delete />}
              onClick={handleDeleteAccount}
              size="small"
            >
              {showDeleteConfirm ? 'Yes, Delete Account' : 'Delete Account'}
            </Button>
            {showDeleteConfirm && (
              <Button
                variant="outlined"
                onClick={() => setShowDeleteConfirm(false)}
                size="small"
              >
                Cancel
              </Button>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>

    <Snackbar
      open={showSnackbar}
      autoHideDuration={6000}
      onClose={() => setShowSnackbar(false)}
      message={snackbarMessage}
    />
    </>
  );
};