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
  Snackbar,
  IconButton,
  Paper
} from '@mui/material';
import {
  Terminal,
  Chat,
  Visibility,
  MarkEmailRead,
  Person,
  AccountCircle,
  Delete,
  Save,
  Lock,
  Security,
  Key,
  Download,
  VisibilityOff
} from '@mui/icons-material';
import { BugReport } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import type { ChatTheme } from '../contexts/ThemeContext';
import {
  generateSecureRecoveryPhrase,
  generateSecureRecoveryCodes,
  createRecoveryBlob
} from '../utils/recoveryUtils';

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
  const { chatTheme, setChatTheme, privacySettings, updatePrivacySettings, debugSettings, updateDebugSettings } = useTheme();
  const [user, setUser] = useState<User>({ username: '', fullName: '' });
  const [editedUser, setEditedUser] = useState<User>({ username: '', fullName: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showRecoveryOptions, setShowRecoveryOptions] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

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
      setShowPasswordReset(false);
      setShowRecoveryOptions(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
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

  const handleDebugToggle = (setting: keyof typeof debugSettings) => {
    updateDebugSettings({
      [setting]: !debugSettings[setting]
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

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setPasswordError('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handlePasswordReset = async () => {
    if (!currentPassword.trim()) {
      setPasswordError('Current password is required');
      return;
    }
    if (!validatePassword(newPassword)) {
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      // TODO: Implement actual password change API call
      // For now, simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate password verification
      if (currentPassword !== 'wrongpassword') { // Simple simulation
        setShowPasswordReset(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSnackbarMessage('Password changed successfully!');
        setShowSnackbar(true);

        // Generate new recovery options after password change
        generateRecoveryOptions();
      } else {
        setPasswordError('Current password is incorrect');
      }
    } catch {
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Use secure recovery generation from utils
  const generateRecoveryPhrase = (): string[] => {
    return generateSecureRecoveryPhrase(12);
  };

  const generateRecoveryCodes = (): string[] => {
    return generateSecureRecoveryCodes(8, 8);
  };

  const generateRecoveryOptions = () => {
    const phrase = generateRecoveryPhrase();
    const codes = generateRecoveryCodes();
    setRecoveryPhrase(phrase);
    setRecoveryCodes(codes);

    // Store in localStorage for demo purposes
    // In a real app, these would be securely stored
    localStorage.setItem('recovery-phrase', JSON.stringify(phrase));
    localStorage.setItem('recovery-codes', JSON.stringify(codes));
  };

  const downloadRecoveryData = () => {
    const blob = createRecoveryBlob(user.username, recoveryPhrase, recoveryCodes);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axol-recovery-${user.username}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShowRecoveryOptions = () => {
    // Check if recovery options already exist
    const existingPhrase = localStorage.getItem('recovery-phrase');
    const existingCodes = localStorage.getItem('recovery-codes');

    if (existingPhrase && existingCodes) {
      setRecoveryPhrase(JSON.parse(existingPhrase));
      setRecoveryCodes(JSON.parse(existingCodes));
    } else {
      generateRecoveryOptions();
    }

    setShowRecoveryOptions(true);
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
                      <Typography variant="body1">Modern Style</Typography>
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

          {/* Developer Tools Section */}
          <Typography variant="h6" gutterBottom>
            Developer Tools
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Advanced debugging and diagnostic tools for developers
          </Typography>

          <List sx={{ p: 0 }}>
            <ListItem sx={{ px: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
                <BugReport sx={{ color: 'primary.main' }} />
              </Box>
              <ListItemText
                primary="WebSocket Debugging"
                secondary="Show real-time WebSocket events, user broadcasting, and connection diagnostics"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={debugSettings.websocketDebugEnabled}
                  onChange={() => handleDebugToggle('websocketDebugEnabled')}
                  color="primary"
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          {/* Security Section */}
          <Typography variant="h6" gutterBottom>
            Security
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Manage your password and account recovery options
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            {/* Password Reset */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Lock sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Change Password
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Update your account password
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowPasswordReset(true)}
                startIcon={<Lock />}
              >
                Change
              </Button>
            </Box>

            {/* Recovery Options */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Recovery Options
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Backup codes and recovery phrase for account access
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={handleShowRecoveryOptions}
                startIcon={<Key />}
              >
                Manage
              </Button>
            </Box>
          </Box>

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

    {/* Password Reset Dialog */}
    <Dialog open={showPasswordReset} onClose={() => setShowPasswordReset(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Change Password</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your current password and choose a new secure password.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              fullWidth
              required
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                )
              }}
            />

            <TextField
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              fullWidth
              required
              helperText="Must be at least 8 characters with uppercase, lowercase, and number"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                )
              }}
            />

            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              fullWidth
              required
            />

            {passwordError && (
              <Alert severity="error">
                {passwordError}
              </Alert>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowPasswordReset(false)} disabled={isChangingPassword}>
          Cancel
        </Button>
        <Button
          onClick={handlePasswordReset}
          variant="contained"
          disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
          startIcon={isChangingPassword ? <CircularProgress size={16} /> : <Save />}
        >
          {isChangingPassword ? 'Changing...' : 'Change Password'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Recovery Options Dialog */}
    <Dialog open={showRecoveryOptions} onClose={() => setShowRecoveryOptions(false)} maxWidth="md" fullWidth>
      <DialogTitle>Account Recovery Options</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Important: Save these recovery options securely!
            </Typography>
            <Typography variant="body2">
              Store them in a safe place offline. You'll need these if you forget your password.
              These cannot be recovered if lost.
            </Typography>
          </Alert>

          {/* Recovery Phrase */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Key sx={{ color: 'primary.main' }} />
              Recovery Phrase
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Write down this 12-word recovery phrase in the exact order shown:
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.300' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                {recoveryPhrase.map((word, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: '20px' }}>
                      {index + 1}.
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                      {word}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>

          {/* Recovery Codes */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security sx={{ color: 'primary.main' }} />
              Recovery Codes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Each code can only be used once. Save all of them:
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.300' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                {recoveryCodes.map((code, index) => (
                  <Typography key={index} variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                    {code}
                  </Typography>
                ))}
              </Box>
            </Paper>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={downloadRecoveryData}
              startIcon={<Download />}
            >
              Download Recovery File
            </Button>
            <Button
              variant="outlined"
              onClick={generateRecoveryOptions}
            >
              Generate New Options
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowRecoveryOptions(false)} variant="contained">
          I've Saved These Securely
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