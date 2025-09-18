import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemButton,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  Send,
  Circle,
  DoneAll,
  Settings,
  Logout,
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { messageService } from '../services/messageService';
import type { Message, MessageStatus } from '../services/messageService';
import { useTheme } from '../contexts/ThemeContext';
import { EncryptionStatus, MessageEncryptionBadge } from './EncryptionStatus';
import type { EncryptionState } from './EncryptionStatus';
import { useChatMessages } from '../hooks/useChatStorage';

interface User {
  username: string;
  fullName?: string;
}

interface EncryptionDetails {
  encryptedUserCount?: number;
  totalUserCount?: number;
  error?: string;
}

interface iMessageChatProps {
  connected?: boolean;
  onConnect?: () => void;
  onSettings?: () => void;
  onLogout?: () => void;
  onlineUserCount?: number;
}

export const IMessageChat: React.FC<iMessageChatProps> = ({
  connected = false,
  onConnect,
  onSettings,
  onLogout,
  onlineUserCount = 0
}) => {
  const { privacySettings, colorMode, setColorMode } = useTheme();
  const {
    items: messages,
    setItems: setMessages
  } = useChatMessages<Message>();
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(connected);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [encryptionState, setEncryptionState] = useState<EncryptionState>('no-encryption');
  const [encryptedUserCount, setEncryptedUserCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{"username":"guest"}');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<User | null>(null);

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Messages are now automatically persisted by the useChatStorage hook

  // Menu handlers
  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSettings = () => {
    setAnchorEl(null);
    onSettings?.();
  };

  const handleLogout = () => {
    setAnchorEl(null);
    onLogout?.();
  };

  const handleThemeToggle = () => {
    setColorMode(colorMode === 'light' ? 'dark' : 'light');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    (async () => {
      await messageService.initialize({
      showReadReceipts: privacySettings.showReadReceipts,
      showOnlineStatus: privacySettings.showOnlineStatus,
      onMessageReceived: (message: Message) => {
        setMessages(prev => [...prev, message]);
      },
      onMessageStatusUpdate: (messageId: string, status: MessageStatus) => {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, status, isRead: status === 'read' }
            : msg
        ));
      },
      onUserJoined: (user: string) => {
        if (privacySettings.showOnlineStatus) {
          const systemMessage: Message = {
            id: Date.now().toString(),
            content: `${user} joined the chat`,
            sender: 'System',
            timestamp: Date.now(),
            isSelf: false
          };
          setMessages(prev => [...prev, systemMessage]);
        }
        setOnlineUsers(prev => [...prev.filter(u => u !== user), user]);
      },
      onUserLeft: (user: string) => {
        if (privacySettings.showOnlineStatus) {
          const systemMessage: Message = {
            id: Date.now().toString(),
            content: `${user} left the chat`,
            sender: 'System',
            timestamp: Date.now(),
            isSelf: false
          };
          setMessages(prev => [...prev, systemMessage]);
        }
        setOnlineUsers(prev => prev.filter(u => u !== user));
      },
      onUserListUpdate: (users: string[]) => {
        setOnlineUsers(users);
      },
      onConnectionStatusChange: (status: 'connected' | 'disconnected' | 'connecting') => {
        setConnectionStatus(status);
        setIsConnected(status === 'connected');
      },
      onEncryptionStateChange: (state: EncryptionState, details?: EncryptionDetails) => {
        setEncryptionState(state);
        setEncryptedUserCount(details?.encryptedUserCount || 0);
      }
    });
    })();

    return () => {
      messageService.cleanup();
    };
  }, [currentUser.username, privacySettings]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() && isConnected) {
      const result = await messageService.sendMessage(inputMessage.trim());

      // Add the message immediately with "sending" status
      const newMessage: Message = {
        id: result.messageId,
        content: inputMessage.trim(),
        sender: currentUser.username,
        timestamp: Date.now(),
        isSelf: true,
        status: 'sending',
        isEncrypted: result.isEncrypted
      };

      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to get message background color
  const getMessageBackgroundColor = (message: Message) => {
    if (message.isSelf) {
      // Sent messages (user's own messages)
      if (message.status === 'sending') {
        return colors.sentMessageSending;
      }
      return colors.sentMessage;
    } else {
      // Received messages (from others)
      if (message.isEncrypted || encryptionState === 'encrypted') {
        return colors.receivedMessageEncrypted; // Light blue for encrypted
      }
      return colors.receivedMessage; // Regular gray for unencrypted
    }
  };

  // Theme-aware colors
  const isDark = colorMode === 'dark';
  const colors = {
    background: isDark ? '#1c1c1e' : '#ffffff',
    headerBg: isDark ? '#2c2c2e' : '#f6f6f6',
    headerBorder: isDark ? '#3a3a3c' : '#e5e5ea',
    encryptionBg: isDark ? '#2c2c2e' : '#f0f0f0',
    encryptionBorder: isDark ? '#3a3a3c' : '#e5e5ea',
    messagesBg: isDark ? '#1c1c1e' : '#ffffff',
    inputBg: isDark ? '#2c2c2e' : '#ffffff',
    inputBorder: isDark ? '#3a3a3c' : '#e5e5ea',
    sidebarBg: isDark ? '#2c2c2e' : '#f6f6f6',
    sidebarBorder: isDark ? '#3a3a3c' : '#e5e5ea',
    text: isDark ? '#ffffff' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#8A8A8E',
    brandColor: isDark ? '#0A84FF' : '#007AFF',
    // Message bubble colors
    receivedMessage: isDark ? '#2c2c2e' : '#e5e5ea',
    receivedMessageEncrypted: isDark ? '#1e3a5f' : '#d6e8ff', // Light blue for encrypted
    sentMessage: isDark ? '#0A84FF' : '#007AFF',
    sentMessageSending: isDark ? '#666666' : '#A0A0A0',
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100vh',
        width: '100vw',
        bgcolor: colors.background,
        border: 'none',
        borderRadius: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* iMessage Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          bgcolor: colors.headerBg,
          borderBottom: `1px solid ${colors.headerBorder}`,
          minHeight: '48px'
        }}
      >
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1, sm: 2 },
          flex: 1,
          minWidth: 0 // Allow flex children to shrink
        }}>
          {/* Axol Chat Branding */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <img src="/axolotl.png" alt="Axol" style={{ width: 24, height: 24 }} />
            <Typography
              variant="h6"
              sx={{
                color: colors.brandColor,
                fontSize: { xs: '14px', sm: '16px' },
                fontWeight: 600,
                display: { xs: 'none', sm: 'block' } // Hide text on mobile, keep icon
              }}
            >
              Axol Chat
            </Typography>
          </Box>

          {/* Connection Status */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1.5 },
            flexShrink: 0
          }}>
            {connectionStatus === 'connecting' ? (
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  border: '2px solid #FFA500',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              />
            ) : (
              <Circle
                sx={{
                  fontSize: 10,
                  color: isConnected ? '#34C759' : '#FF3B30'
                }}
              />
            )}
            <Box sx={{
              fontSize: { xs: '11px', sm: '13px' },
              color: colors.textSecondary,
              fontWeight: 500,
              display: { xs: 'none', sm: 'block' } // Hide text on mobile, keep indicator
            }}>
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </Box>
          </Box>

          {/* Online User Count */}
          {isConnected && onlineUserCount > 0 && (
            <Box sx={{
              display: { xs: 'none', md: 'flex' }, // Hide on mobile and small tablets
              alignItems: 'center',
              gap: 0.5
            }}>
              <Typography variant="body2" sx={{ color: colors.textSecondary, fontSize: '12px' }}>
                {onlineUserCount} user{onlineUserCount !== 1 ? 's' : ''} online
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.25, sm: 0.5 },
          flexShrink: 0
        }}>
          {/* Theme Toggle */}
          <Tooltip title={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton
              size="small"
              onClick={handleThemeToggle}
              sx={{
                color: colors.textSecondary,
                '&:hover': { color: colors.brandColor },
                p: { xs: 0.5, sm: 1 } // Smaller padding on mobile
              }}
            >
              {colorMode === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
            </IconButton>
          </Tooltip>

          {user && (
            <>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 0.5, sm: 1 },
                mr: { xs: 0, sm: 1 }
              }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: colors.textSecondary,
                    fontSize: { xs: '10px', sm: '12px' },
                    display: { xs: 'none', sm: 'block' }, // Hide username on mobile
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: { sm: '100px', md: '150px' }
                  }}
                >
                  {user.fullName || user.username}
                </Typography>
                <Tooltip title="User Menu">
                  <IconButton
                    size="small"
                    onClick={handleMenu}
                    sx={{
                      color: colors.textSecondary,
                      '&:hover': { color: colors.brandColor },
                      p: { xs: 0.5, sm: 1 }
                    }}
                  >
                    <img src="/axolotl.png" alt="User Avatar" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Encryption Status Bar */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 1,
          bgcolor: colors.encryptionBg,
          borderBottom: `1px solid ${colors.encryptionBorder}`
        }}>
          <EncryptionStatus
            state={encryptionState}
            encryptedUserCount={encryptedUserCount}
            totalUserCount={onlineUsers.length}
            compact={true}
          />
        </Box>

        {/* Messages */}
        <Box sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          bgcolor: colors.messagesBg,
          backgroundImage: isDark
            ? 'linear-gradient(180deg, #1c1c1e 0%, #161618 100%)'
            : 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)'
        }}>
          {!isConnected && (
            <Box sx={{
              textAlign: 'center',
              py: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2
            }}>
              <img src="/axolotl.png" alt="Axol" style={{ width: 64, height: 64, opacity: 0.5 }} />
              <Typography sx={{ color: colors.textSecondary, fontSize: '1.1rem' }}>
                Not connected to chat
              </Typography>
              <Chip
                label="Connect"
                onClick={() => {
                  messageService.connect()
                    .then(() => {
                      messageService.requestUserList();
                      onConnect?.();
                    })
                    .catch((error) => {
                      console.error('Failed to connect:', error);
                    });
                }}
                clickable
                sx={{
                  bgcolor: colors.brandColor,
                  color: 'white',
                  '&:hover': {
                    bgcolor: isDark ? '#0080FF' : '#0056b3'
                  },
                  px: 3,
                  py: 1,
                  fontSize: '1rem'
                }}
              />
            </Box>
          )}

        {isConnected && (
          <Box sx={{ p: 2 }}>
            <EncryptionStatus
              state={encryptionState}
              encryptedUserCount={encryptedUserCount}
              totalUserCount={onlineUsers.length}
              compact={false}
            />
          </Box>
        )}

        <List sx={{ py: 0 }}>
          {messages.map((message) => (
            <ListItem key={message.id} sx={{
              flexDirection: 'column',
              alignItems: message.isSelf ? 'flex-end' : 'flex-start',
              py: 0.5
            }}>
              {message.sender === 'System' ? (
                <Chip
                  label={message.content}
                  size="small"
                  sx={{
                    bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    color: colors.textSecondary,
                    fontSize: '0.75rem'
                  }}
                />
              ) : (
                <Box sx={{
                  maxWidth: '70%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.isSelf ? 'flex-end' : 'flex-start'
                }}>
                  {!message.isSelf && (
                    <Typography variant="caption" sx={{ mb: 0.5, px: 1, color: colors.textSecondary }}>
                      {message.sender}
                    </Typography>
                  )}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '18px',
                      bgcolor: getMessageBackgroundColor(message),
                      color: message.isSelf ? 'white' : colors.text,
                      borderBottomRightRadius: message.isSelf ? '4px' : '18px',
                      borderBottomLeftRadius: message.isSelf ? '18px' : '4px',
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                      opacity: message.status === 'sending' ? 0.7 : 1,
                      boxShadow: '0 1px 0 0 rgba(0,0,0,0.05)'
                    }}
                  >
                    <Typography variant="body2">
                      {message.content}
                    </Typography>
                  </Paper>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, px: 1 }}>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      {formatTime(message.timestamp)}
                    </Typography>
                    <MessageEncryptionBadge isEncrypted={message.isEncrypted || false} size="small" />
                    {message.isSelf && (
                      message.status === 'sending' ? (
                        <Typography variant="caption" sx={{ fontSize: 10, color: colors.textSecondary, opacity: 0.7 }}>
                          Sending...
                        </Typography>
                      ) : message.status === 'delivered' ? (
                        <Typography variant="caption" sx={{ fontSize: 10, color: colors.textSecondary }}>
                          Delivered
                        </Typography>
                      ) : message.status === 'read' && privacySettings.showReadReceipts ? (
                        <DoneAll sx={{ fontSize: 12, color: colors.brandColor }} />
                      ) : null
                    )}
                  </Box>
                </Box>
              )}
            </ListItem>
          ))}
        </List>
        <div ref={messagesEndRef} />
      </Box>

        {/* Input */}
        <Box sx={{
          p: 2,
          borderTop: `1px solid ${colors.inputBorder}`,
          bgcolor: colors.headerBg
        }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder={isConnected ? "iMessage" : "Connect to start chatting"}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isConnected}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '20px',
                  bgcolor: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  color: colors.text,
                  '&:hover': {
                    borderColor: colors.brandColor
                  },
                  '&.Mui-focused': {
                    borderColor: colors.brandColor
                  },
                  '& fieldset': {
                    border: 'none'
                  },
                  '& input::placeholder, & textarea::placeholder': {
                    color: colors.textSecondary,
                    opacity: 1
                  }
                }
              }}
            />
            <IconButton
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !isConnected}
              sx={{
                bgcolor: inputMessage.trim() && isConnected ? colors.brandColor : (isDark ? '#444444' : '#c7c7cc'),
                color: 'white',
                width: 32,
                height: 32,
                '&:hover': {
                  bgcolor: inputMessage.trim() && isConnected ? (isDark ? '#0080FF' : '#0056b3') : (isDark ? '#444444' : '#c7c7cc'),
                },
                '&.Mui-disabled': {
                  color: 'white',
                  bgcolor: isDark ? '#444444' : '#c7c7cc'
                }
              }}
            >
              <Send sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* User List Sidebar */}
      <Box sx={{
        width: 260,
        borderLeft: `1px solid ${colors.sidebarBorder}`,
        bgcolor: colors.sidebarBg,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{
          p: 2,
          borderBottom: `1px solid ${colors.sidebarBorder}`,
          bgcolor: colors.headerBg
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: colors.text }}>
            Online Users
          </Typography>
        </Box>

        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {onlineUsers.length === 0 ? (
            <ListItem>
              <Typography sx={{ color: colors.textSecondary, textAlign: 'center', width: '100%', py: 4 }}>
                No users online
              </Typography>
            </ListItem>
          ) : (
            onlineUsers.map((user, index) => (
              <ListItemButton
                key={index}
                sx={{
                  borderBottom: `1px solid ${colors.sidebarBorder}`,
                  '&:hover': {
                    bgcolor: isDark ? '#3a3a3c' : '#e5e5ea'
                  },
                  py: 1.5,
                  px: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <img src="/axolotl.png" alt="User" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: colors.text, fontWeight: 500 }}>
                      {user}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                      Active now
                    </Typography>
                  </Box>
                  <Circle sx={{ fontSize: 8, color: '#34C759' }} />
                </Box>
              </ListItemButton>
            ))
          )}
        </List>
      </Box>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
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
    </Paper>
  );
};