import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { WebSocketMessage } from '../services/websocketService';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  Badge,
  Tooltip,
  Button,
  Chip,
  Divider
} from '@mui/material';
import {
  BugReport,
  ExpandMore,
  ExpandLess,
  Clear,
  NetworkCheck,
  People
} from '@mui/icons-material';

interface DebugEvent {
  id: string;
  timestamp: number;
  type: 'sent' | 'received' | 'connection' | 'error' | 'user' | 'system';
  category: string;
  data: unknown;
  description: string;
}


interface WebSocketDebugPanelProps {
  websocketService: {
    send: (message: Partial<WebSocketMessage>) => void;
    on: (event: string, listener: (data: unknown) => void) => void;
    off: (event: string, listener: (data: unknown) => void) => void;
    requestUserList: () => void;
  };
  enabled: boolean;
  onToggle: () => void;
}

export const WebSocketDebugPanel: React.FC<WebSocketDebugPanelProps> = ({
  websocketService,
  enabled,
  onToggle
}) => {
  const [expanded, setExpanded] = useState(false);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [stats, setStats] = useState({
    sent: 0,
    received: 0,
    connections: 0,
    errors: 0,
    users: 0
  });
  const eventsRef = useRef<HTMLDivElement>(null);

  const addEvent = useCallback((event: Omit<DebugEvent, 'id' | 'timestamp'>) => {
    if (!enabled) return;

    const newEvent: DebugEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    setEvents(prev => [...prev.slice(-99), newEvent]); // Keep last 100 events

    setStats(prev => ({
      ...prev,
      [event.type]: prev[event.type as keyof typeof prev] + 1
    }));

    // Auto-scroll to bottom
    setTimeout(() => {
      if (eventsRef.current) {
        eventsRef.current.scrollTop = eventsRef.current.scrollHeight;
      }
    }, 10);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !websocketService) return;

    // Intercept WebSocket events
    const originalSend = websocketService.send.bind(websocketService);
    websocketService.send = (message: Partial<WebSocketMessage>) => {
      addEvent({
        type: 'sent',
        category: message.type || 'unknown',
        data: message,
        description: `Sent ${message.type}: ${JSON.stringify(message.data || {}).substring(0, 100)}...`
      });
      return originalSend(message);
    };

    // Intercept WebSocket message reception by hooking into the handleMessage private method
    // We'll do this by listening to console logs for raw WebSocket messages
    const originalConsoleLog = console.log;
    console.log = (...args: unknown[]) => {
      if (args.length > 0 && typeof args[0] === 'string' && args[0] === 'Received WebSocket message:' && args[1]) {
        const message = args[1] as WebSocketMessage;
        addEvent({
          type: 'received',
          category: message.type || 'unknown',
          data: message,
          description: `Raw received: ${message.type} - ${JSON.stringify(message.data || {}).substring(0, 100)}...`
        });
      }
      return originalConsoleLog.apply(console, args);
    };

    // Listen to all events
    const eventTypes = [
      'connection_status',
      'message',
      'user_joined',
      'user_left',
      'user_list',
      'encrypted_message',
      'public_key_received',
      'public_key_requested',
      'error',
      'message_read',
      'message_delivered'
    ];

    const listeners: Array<() => void> = [];

    eventTypes.forEach(eventType => {
      const listener = (data: unknown) => {
        let description = '';
        let type: DebugEvent['type'] = 'received';
        const category = eventType;
        const dataObj = data as {
          status?: string;
          user?: string;
          username?: string;
          users?: string[];
          sender?: string;
          content?: string;
          error?: string;
          message?: string;
        };

        switch (eventType) {
          case 'connection_status':
            type = 'connection';
            description = `Connection status: ${dataObj.status}`;
            break;
          case 'user_joined':
            type = 'user';
            description = `User joined: ${dataObj.user || dataObj.username || 'unknown'}`;
            break;
          case 'user_left':
            type = 'user';
            description = `User left: ${dataObj.user || dataObj.username || 'unknown'}`;
            break;
          case 'user_list':
            type = 'user';
            description = `User list: ${dataObj.users ? dataObj.users.length : 0} users - [${(dataObj.users || []).join(', ')}]`;
            break;
          case 'message':
            type = 'received';
            description = `Message from ${dataObj.sender}: ${(dataObj.content || '').substring(0, 50)}...`;
            break;
          case 'encrypted_message':
            type = 'received';
            description = `Encrypted message from ${dataObj.sender}`;
            break;
          case 'error':
            type = 'error';
            description = `Error: ${dataObj.error || dataObj.message || 'Unknown error'}`;
            break;
          case 'message_read':
            type = 'received';
            description = `Message read by ${dataObj.sender}`;
            break;
          case 'message_delivered':
            type = 'received';
            description = `Message delivered to ${dataObj.sender}`;
            break;
          default:
            description = `${eventType}: ${JSON.stringify(data).substring(0, 100)}...`;
        }

        addEvent({
          type,
          category,
          data,
          description
        });
      };

      websocketService.on(eventType, listener);
      listeners.push(() => websocketService.off(eventType, listener));
    });

    // Add initial status
    addEvent({
      type: 'system',
      category: 'debug',
      data: { enabled: true },
      description: 'WebSocket debugging enabled'
    });

    return () => {
      listeners.forEach(cleanup => cleanup());
      // Restore original methods
      websocketService.send = originalSend;
      console.log = originalConsoleLog;
    };
  }, [enabled, websocketService, addEvent]);

  const clearEvents = () => {
    setEvents([]);
    setStats({ sent: 0, received: 0, connections: 0, errors: 0, users: 0 });
  };

  const getEventColor = (type: DebugEvent['type']) => {
    switch (type) {
      case 'sent': return '#2196f3';
      case 'received': return '#4caf50';
      case 'connection': return '#ff9800';
      case 'error': return '#f44336';
      case 'user': return '#9c27b0';
      case 'system': return '#607d8b';
      default: return '#9e9e9e';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const testConnection = () => {
    if (websocketService) {
      websocketService.requestUserList();
      addEvent({
        type: 'system',
        category: 'test',
        data: { action: 'user_list_request' },
        description: 'Manual user list request sent'
      });
    }
  };

  const testBackendHttp = async () => {
    addEvent({
      type: 'system',
      category: 'test',
      data: { action: 'backend_http_test' },
      description: 'Testing backend HTTP connectivity'
    });

    try {
      const apiUrl = 'https://secure-messaging.boris-chu.workers.dev/api/v1/users';
      console.log(`🧪 Testing backend HTTP: ${apiUrl}`);

      const response = await fetch(apiUrl);
      const data = await response.json();

      addEvent({
        type: 'system',
        category: 'test',
        data: { response: data, status: response.status },
        description: `HTTP test result: ${response.status} - ${JSON.stringify(data).substring(0, 100)}`
      });
    } catch (error) {
      addEvent({
        type: 'error',
        category: 'test',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        description: `HTTP test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  if (!enabled) {
    return (
      <Tooltip title="Enable WebSocket Debugging">
        <IconButton
          onClick={onToggle}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': { bgcolor: 'background.paper' }
          }}
        >
          <BugReport />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: expanded ? 400 : 'auto',
        maxHeight: expanded ? '70vh' : 'auto',
        zIndex: 1300,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BugReport fontSize="small" />
          <Typography variant="subtitle2">WebSocket Debug</Typography>
          <Badge badgeContent={events.length} color="secondary" max={99} />
        </Box>

        <Box>
          <IconButton size="small" onClick={testConnection} sx={{ color: 'inherit' }}>
            <NetworkCheck fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={clearEvents} sx={{ color: 'inherit' }}>
            <Clear fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ color: 'inherit' }}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
          <IconButton size="small" onClick={onToggle} sx={{ color: 'inherit' }}>
            ×
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        {/* Stats */}
        <Box sx={{ p: 1, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip label={`Sent: ${stats.sent}`} size="small" color="primary" />
            <Chip label={`Received: ${stats.received}`} size="small" color="success" />
            <Chip label={`Users: ${stats.users}`} size="small" color="secondary" />
            <Chip label={`Errors: ${stats.errors}`} size="small" color="error" />
          </Box>
        </Box>

        <Divider />

        {/* Events List */}
        <Box
          ref={eventsRef}
          sx={{
            height: '400px',
            overflowY: 'auto',
            p: 1
          }}
        >
          {events.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              No events yet. WebSocket events will appear here.
            </Typography>
          ) : (
            events.map((event) => (
              <Box
                key={event.id}
                sx={{
                  mb: 1,
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  borderLeft: '4px solid',
                  borderLeftColor: getEventColor(event.type),
                  fontSize: '0.75rem'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                      label={event.type}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: '0.65rem',
                        bgcolor: getEventColor(event.type),
                        color: 'white'
                      }}
                    />
                    <Typography variant="caption" fontWeight="bold">
                      {event.category}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(event.timestamp)}
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ fontSize: '0.7rem', mb: 0.5 }}>
                  {event.description}
                </Typography>

                <Box
                  sx={{
                    bgcolor: 'background.default',
                    p: 0.5,
                    borderRadius: 0.5,
                    fontSize: '0.65rem',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
                    {JSON.stringify(event.data ?? {})}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ p: 1, bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<People />}
            onClick={testConnection}
          >
            Request User List
          </Button>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            startIcon={<NetworkCheck />}
            onClick={testBackendHttp}
          >
            Test Backend HTTP
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
};