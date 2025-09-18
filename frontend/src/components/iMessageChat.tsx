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
} from '@mui/icons-material';
import { messageService } from '../services/messageService';
import type { Message, MessageStatus } from '../services/messageService';
import { useTheme } from '../contexts/ThemeContext';
import { EncryptionStatus, MessageEncryptionBadge } from './EncryptionStatus';
import type { EncryptionState } from './EncryptionStatus';

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
  const { privacySettings } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(connected);
  const [encryptionState, setEncryptionState] = useState<EncryptionState>('no-encryption');
  const [encryptedUserCount, setEncryptedUserCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{"username":"guest"}');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<any>(null);

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

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
      onConnectionStatusChange: (connected: boolean) => {
        setIsConnected(connected);
      },
      onEncryptionStateChange: (state: EncryptionState, details?: any) => {
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

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100vh',
        width: '100vw',
        bgcolor: '#ffffff',
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
          bgcolor: '#f6f6f6',
          borderBottom: '1px solid #e5e5ea',
          minHeight: '48px'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Axol Chat Branding */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src="/axolotl.png" alt="Axol" style={{ width: 24, height: 24 }} />
            <Typography variant="h6" sx={{ color: '#007AFF', fontSize: '16px', fontWeight: 600 }}>
              Axol Chat
            </Typography>
          </Box>

          {/* Connection Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Circle
              sx={{
                fontSize: 10,
                color: isConnected ? '#34C759' : '#FF3B30'
              }}
            />
            <Box sx={{ fontSize: '13px', color: '#8A8A8E', fontWeight: 500 }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Box>
          </Box>

          {/* Online User Count */}
          {isConnected && onlineUserCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" sx={{ color: '#8A8A8E', fontSize: '12px' }}>
                {onlineUserCount} user{onlineUserCount !== 1 ? 's' : ''} online
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {user && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                <Typography variant="body2" sx={{ color: '#8A8A8E', fontSize: '12px' }}>
                  {user.fullName || user.username}
                </Typography>
                <Tooltip title="User Menu">
                  <IconButton
                    size="small"
                    onClick={handleMenu}
                    sx={{ color: '#8A8A8E', '&:hover': { color: '#007AFF' } }}
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
          bgcolor: '#f0f0f0',
          borderBottom: '1px solid #e5e5ea'
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
          bgcolor: '#ffffff',
          backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)'
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
              <Typography sx={{ color: '#8e8e93', fontSize: '1.1rem' }}>
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
                  bgcolor: '#007AFF',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#0056b3'
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
                    bgcolor: 'rgba(0,0,0,0.1)',
                    color: 'text.secondary',
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
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, px: 1 }}>
                      {message.sender}
                    </Typography>
                  )}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '18px',
                      bgcolor: message.isSelf ? (
                        message.status === 'sending' ? '#A0A0A0' :
                        '#007AFF'
                      ) : '#e5e5ea',
                      color: message.isSelf ? 'white' : '#000000',
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
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(message.timestamp)}
                    </Typography>
                    <MessageEncryptionBadge isEncrypted={message.isEncrypted || false} size="small" />
                    {message.isSelf && (
                      message.status === 'sending' ? (
                        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
                          Sending...
                        </Typography>
                      ) : message.status === 'delivered' ? (
                        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                          Delivered
                        </Typography>
                      ) : message.status === 'read' && privacySettings.showReadReceipts ? (
                        <DoneAll sx={{ fontSize: 12, color: '#007AFF' }} />
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
          borderTop: '1px solid #e5e5ea',
          bgcolor: '#f6f6f6'
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
                  bgcolor: '#ffffff',
                  border: '1px solid #d1d1d6',
                  '&:hover': {
                    borderColor: '#007AFF'
                  },
                  '&.Mui-focused': {
                    borderColor: '#007AFF'
                  },
                  '& fieldset': {
                    border: 'none'
                  }
                }
              }}
            />
            <IconButton
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !isConnected}
              sx={{
                bgcolor: inputMessage.trim() && isConnected ? '#007AFF' : '#c7c7cc',
                color: 'white',
                width: 32,
                height: 32,
                '&:hover': {
                  bgcolor: inputMessage.trim() && isConnected ? '#0056b3' : '#c7c7cc',
                },
                '&.Mui-disabled': {
                  color: 'white',
                  bgcolor: '#c7c7cc'
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
        borderLeft: '1px solid #e5e5ea',
        bgcolor: '#f6f6f6',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{
          p: 2,
          borderBottom: '1px solid #e5e5ea',
          bgcolor: '#ffffff'
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#000000' }}>
            Online Users
          </Typography>
        </Box>

        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {onlineUsers.length === 0 ? (
            <ListItem>
              <Typography sx={{ color: '#8e8e93', textAlign: 'center', width: '100%', py: 4 }}>
                No users online
              </Typography>
            </ListItem>
          ) : (
            onlineUsers.map((user, index) => (
              <ListItemButton
                key={index}
                sx={{
                  borderBottom: '1px solid #e5e5ea',
                  '&:hover': {
                    bgcolor: '#e5e5ea'
                  },
                  py: 1.5,
                  px: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <img src="/axolotl.png" alt="User" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: '#000000', fontWeight: 500 }}>
                      {user}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#8e8e93' }}>
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