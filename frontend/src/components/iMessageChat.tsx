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
  ListItemButton
} from '@mui/material';
import {
  Send,
  Circle,
  DoneAll
} from '@mui/icons-material';
import { messageService } from '../services/messageService';
import type { Message, MessageStatus } from '../services/messageService';
import { useTheme } from '../contexts/ThemeContext';
import { EncryptionStatus, MessageEncryptionBadge } from './EncryptionStatus';
import type { EncryptionState } from './EncryptionStatus';

interface iMessageChatProps {
  connected?: boolean;
  onConnect?: () => void;
}

export const iMessageChat: React.FC<iMessageChatProps> = ({
  connected = false,
  onConnect
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
    <Box sx={{ display: 'flex', height: '100%', bgcolor: '#ffffff' }}>
      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{
          p: 2,
          borderBottom: '1px solid #e5e5ea',
          bgcolor: '#f6f6f6',
          backdropFilter: 'blur(10px)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Circle
                sx={{
                  fontSize: 12,
                  color: isConnected ? '#34C759' : '#FF3B30'
                }}
              />
              <Typography variant="h6" sx={{ color: '#000000', fontWeight: 600 }}>
                Axol Chat
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <img src="/axolotl.png" alt="Users" style={{ width: 16, height: 16 }} />
                <Typography variant="body2" sx={{ color: '#8e8e93' }}>
                  {isConnected && privacySettings.showOnlineStatus ? `${onlineUsers.length} online` : 'Offline'}
                </Typography>
              </Box>
              <EncryptionStatus
                state={encryptionState}
                encryptedUserCount={encryptedUserCount}
                totalUserCount={onlineUsers.length}
                compact={true}
              />
            </Box>
          </Box>
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
    </Box>
  );
};