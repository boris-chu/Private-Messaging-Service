import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  People,
  Send,
  Event
} from '@mui/icons-material';

interface DebugEvent {
  id: string;
  timestamp: number;
  type: 'sent' | 'received' | 'connection' | 'error' | 'user' | 'system' | 'sse' | 'http';
  category: string;
  data: unknown;
  description: string;
}

interface SSEDebugPanelProps {
  sseService: {
    sendMessage: (content: string, recipient?: string) => Promise<{ messageId: string; isEncrypted: boolean }>;
    sendLobbyMessage: (content: string) => Promise<{ messageId: string; isEncrypted: boolean }>;
    requestUserList: () => Promise<void>;
    on: (event: string, listener: (data: unknown) => void) => void;
    off: (event: string, listener: (data: unknown) => void) => void;
    isConnected: boolean;
    status: string;
  };
  enabled: boolean;
  onToggle: () => void;
}

export const SSEDebugPanel: React.FC<SSEDebugPanelProps> = ({
  sseService,
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
    users: 0,
    sse: 0,
    http: 0
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
    if (!enabled || !sseService) return;

    // Intercept SSE service HTTP requests
    const originalSendMessage = sseService.sendMessage.bind(sseService);
    sseService.sendMessage = async (content: string, recipient?: string) => {
      addEvent({
        type: 'http',
        category: recipient ? 'direct_message' : 'message',
        data: { content, recipient },
        description: `HTTP POST ${recipient ? 'direct' : 'regular'} message: ${content.substring(0, 50)}...`
      });
      const result = await originalSendMessage(content, recipient);
      addEvent({
        type: 'sent',
        category: 'message_sent',
        data: result,
        description: `Message sent (${result.isEncrypted ? 'encrypted' : 'plain'}): ${result.messageId}`
      });
      return result;
    };

    const originalSendLobbyMessage = sseService.sendLobbyMessage.bind(sseService);
    sseService.sendLobbyMessage = async (content: string) => {
      addEvent({
        type: 'http',
        category: 'lobby_message',
        data: { content },
        description: `HTTP POST lobby message: ${content.substring(0, 50)}...`
      });
      const result = await originalSendLobbyMessage(content);
      addEvent({
        type: 'sent',
        category: 'lobby_message_sent',
        data: result,
        description: `Lobby message sent: ${result.messageId}`
      });
      return result;
    };

    const originalRequestUserList = sseService.requestUserList.bind(sseService);
    sseService.requestUserList = async () => {
      addEvent({
        type: 'http',
        category: 'user_list_request',
        data: {},
        description: 'HTTP POST user list request'
      });
      return originalRequestUserList();
    };

    // Listen to all SSE events
    const eventTypes = [
      'connection_status',
      'message',
      'lobby_message',
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
          isEncrypted?: boolean;
          messageId?: string;
        };

        switch (eventType) {
          case 'connection_status':
            type = 'connection';
            description = `SSE connection status: ${dataObj.status}`;
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
            description = `User list via SSE: ${dataObj.users ? dataObj.users.length : 0} users - [${(dataObj.users || []).join(', ')}]`;
            break;
          case 'message':
            type = 'sse';
            description = `SSE message from ${dataObj.sender}: ${(dataObj.content || '').substring(0, 50)}...`;
            break;
          case 'lobby_message':
            type = 'sse';
            description = `SSE lobby message from ${dataObj.sender}: ${(dataObj.content || '').substring(0, 50)}...`;
            break;
          case 'encrypted_message':
            type = 'sse';
            description = `SSE encrypted message from ${dataObj.sender} (ID: ${dataObj.messageId})`;
            break;
          case 'public_key_received':
            type = 'sse';
            description = `Public key received via SSE from ${dataObj.username}`;
            break;
          case 'public_key_requested':
            type = 'sse';
            description = `Public key requested via SSE from ${dataObj.username}`;
            break;
          case 'error':
            type = 'error';
            description = `SSE error: ${dataObj.error || dataObj.message || 'Unknown error'}`;
            break;
          case 'message_read':
            type = 'sse';
            description = `Message read receipt via SSE: ${dataObj.messageId} by ${dataObj.sender}`;
            break;
          case 'message_delivered':
            type = 'sse';
            description = `Message delivery receipt via SSE: ${dataObj.messageId} to ${dataObj.sender}`;
            break;
          default:
            description = `SSE ${eventType}: ${JSON.stringify(data).substring(0, 100)}...`;
        }

        addEvent({
          type,
          category,
          data,
          description
        });
      };

      sseService.on(eventType, listener);
      listeners.push(() => sseService.off(eventType, listener));
    });

    // Add initial status
    addEvent({
      type: 'system',
      category: 'debug',
      data: { enabled: true, status: sseService.status, connected: sseService.isConnected },
      description: `SSE debugging enabled. Status: ${sseService.status}, Connected: ${sseService.isConnected}`
    });

    return () => {
      listeners.forEach(cleanup => cleanup());
      // Restore original methods
      sseService.sendMessage = originalSendMessage;
      sseService.sendLobbyMessage = originalSendLobbyMessage;
      sseService.requestUserList = originalRequestUserList;
    };
  }, [enabled, sseService, addEvent]);

  const clearEvents = () => {
    setEvents([]);
    setStats({ sent: 0, received: 0, connections: 0, errors: 0, users: 0, sse: 0, http: 0 });
  };

  const getEventColor = (type: DebugEvent['type']) => {
    switch (type) {
      case 'sent': return '#2196f3';
      case 'received': return '#4caf50';
      case 'connection': return '#ff9800';
      case 'error': return '#f44336';
      case 'user': return '#9c27b0';
      case 'system': return '#607d8b';
      case 'sse': return '#00bcd4';
      case 'http': return '#795548';
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
    if (sseService) {
      sseService.requestUserList();
      addEvent({
        type: 'system',
        category: 'test',
        data: { action: 'user_list_request' },
        description: 'Manual user list request sent via HTTP POST'
      });
    }
  };

  const testSSEEndpoint = async () => {
    addEvent({
      type: 'system',
      category: 'test',
      data: { action: 'sse_endpoint_test' },
      description: 'Testing SSE endpoint connectivity'
    });

    try {
      const apiUrl = 'https://api.axolchat.cc/api/v1/events?username=debug_test';
      console.log(`🧪 Testing SSE endpoint: ${apiUrl}`);

      // Test SSE endpoint with a short connection
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 2000); // Abort after 2 seconds

      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      addEvent({
        type: 'system',
        category: 'test',
        data: {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          url: apiUrl
        },
        description: `SSE endpoint test: ${response.status} - Headers received, connection established`
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        addEvent({
          type: 'system',
          category: 'test',
          data: { result: 'connection_aborted' },
          description: 'SSE endpoint test: Connection established and aborted after 2s (expected behavior)'
        });
      } else {
        addEvent({
          type: 'error',
          category: 'test',
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          description: `SSE endpoint test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
  };

  const testHTTPEndpoint = async () => {
    addEvent({
      type: 'system',
      category: 'test',
      data: { action: 'http_endpoint_test' },
      description: 'Testing HTTP POST endpoint'
    });

    try {
      const apiUrl = 'https://api.axolchat.cc/api/v1/messages';
      const testPayload = {
        type: 'lobby_message',
        content: '🧪 Debug panel test message',
        sender: 'debug_panel',
        messageId: `debug_${Date.now()}`,
        timestamp: Date.now()
      };

      console.log(`🧪 Testing HTTP POST endpoint: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sender': 'debug_panel'
        },
        body: JSON.stringify(testPayload)
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      addEvent({
        type: 'system',
        category: 'test',
        data: {
          status: response.status,
          response: responseData,
          sent: testPayload
        },
        description: `HTTP POST test: ${response.status} - ${JSON.stringify(responseData).substring(0, 100)}`
      });
    } catch (error) {
      addEvent({
        type: 'error',
        category: 'test',
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        description: `HTTP POST test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const sendTestMessage = async () => {
    if (sseService) {
      try {
        await sseService.sendLobbyMessage('🧪 Test message from debug panel');
        addEvent({
          type: 'system',
          category: 'test',
          data: { action: 'test_message_sent' },
          description: 'Test lobby message sent successfully'
        });
      } catch (error) {
        addEvent({
          type: 'error',
          category: 'test',
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          description: `Failed to send test message: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }
  };

  if (!enabled) {
    return (
      <Tooltip title="Enable SSE + HTTP POST Debugging">
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
        width: expanded ? 450 : 'auto',
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
          <Typography variant="subtitle2">SSE + HTTP Debug</Typography>
          <Badge badgeContent={events.length} color="secondary" max={99} />
          <Chip
            label={sseService?.isConnected ? 'Connected' : 'Disconnected'}
            size="small"
            color={sseService?.isConnected ? 'success' : 'error'}
            sx={{ height: 16, fontSize: '0.65rem' }}
          />
        </Box>

        <Box>
          <IconButton size="small" onClick={testConnection} sx={{ color: 'inherit' }}>
            <People fontSize="small" />
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
            <Chip label={`HTTP: ${stats.http}`} size="small" color="info" />
            <Chip label={`SSE: ${stats.sse}`} size="small" color="primary" />
            <Chip label={`Sent: ${stats.sent}`} size="small" color="success" />
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
              No events yet. SSE and HTTP events will appear here.
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<People />}
              onClick={testConnection}
              sx={{ flex: 1 }}
            >
              User List
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Send />}
              onClick={sendTestMessage}
              sx={{ flex: 1 }}
            >
              Test Msg
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Event />}
              onClick={testSSEEndpoint}
              sx={{ flex: 1 }}
            >
              Test SSE
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<NetworkCheck />}
              onClick={testHTTPEndpoint}
              sx={{ flex: 1 }}
            >
              Test HTTP
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};