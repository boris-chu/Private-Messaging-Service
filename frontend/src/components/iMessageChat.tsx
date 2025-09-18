import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Chip,
  List,
  ListItem
} from '@mui/material';
import {
  Send,
  Circle,
  DoneAll
} from '@mui/icons-material';
import { messageService } from '../services/messageService';
import type { Message, MessageStatus } from '../services/messageService';
import { useTheme } from '../contexts/ThemeContext';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{"username":"guest"}');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    messageService.initialize({
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
      }
    });

    return () => {
      messageService.cleanup();
    };
  }, [currentUser.username, privacySettings]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && isConnected) {
      const messageId = messageService.sendMessage(inputMessage.trim());

      // Add the message immediately with "sending" status
      const newMessage: Message = {
        id: messageId,
        content: inputMessage.trim(),
        sender: currentUser.username,
        timestamp: Date.now(),
        isSelf: true,
        status: 'sending'
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Circle
              sx={{
                fontSize: 12,
                color: isConnected ? '#34C759' : '#FF3B30'
              }}
            />
            <Typography variant="h6">
              Axol Chat
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src="/axolotl.png" alt="Users" style={{ width: 16, height: 16 }} />
            <Typography variant="body2" color="text.secondary">
              {isConnected && privacySettings.showOnlineStatus ? `${onlineUsers.length} online` : 'Offline'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        p: 1,
        bgcolor: '#f2f2f7'
      }}>
        {!isConnected && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary" gutterBottom>
              Not connected to chat
            </Typography>
            <Chip
              label="Connect"
              onClick={onConnect}
              clickable
              color="primary"
              sx={{ mt: 1 }}
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
                    elevation={1}
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      bgcolor: message.isSelf ? (
                        message.status === 'sending' ? '#A0A0A0' :
                        message.status === 'delivered' ? '#007AFF' :
                        '#007AFF'
                      ) : 'white',
                      color: message.isSelf ? 'white' : 'text.primary',
                      borderBottomRightRadius: message.isSelf ? 0.5 : 2.5,
                      borderBottomLeftRadius: message.isSelf ? 2.5 : 0.5,
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                      opacity: message.status === 'sending' ? 0.7 : 1
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
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={isConnected ? "Type a message..." : "Connect to start chatting"}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isConnected}
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                bgcolor: 'background.default'
              }
            }}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || !isConnected}
            sx={{
              bgcolor: inputMessage.trim() && isConnected ? '#007AFF' : 'action.disabled',
              color: 'white',
              '&:hover': {
                bgcolor: inputMessage.trim() && isConnected ? '#0056CC' : 'action.disabled',
              },
              '&.Mui-disabled': {
                color: 'white'
              }
            }}
          >
            <Send />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};