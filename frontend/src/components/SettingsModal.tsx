import React from 'react';
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
  ListItemSecondaryAction
} from '@mui/material';
import { Terminal, Chat, Visibility, MarkEmailRead } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import type { ChatTheme } from '../contexts/ThemeContext';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { chatTheme, setChatTheme, privacySettings, updatePrivacySettings } = useTheme();

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChatTheme(event.target.value as ChatTheme);
  };

  const handlePrivacyToggle = (setting: keyof typeof privacySettings) => {
    updatePrivacySettings({
      [setting]: !privacySettings[setting]
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};