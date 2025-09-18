import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Box, Paper, IconButton, Tooltip } from '@mui/material';
import {
  Fullscreen,
  FullscreenExit,
  Refresh
} from '@mui/icons-material';
import '@xterm/xterm/css/xterm.css';
import { websocketService } from '../services/websocketService';

interface TerminalProps {
  onCommand?: (command: string) => void;
  onConnect?: () => void;
  connected?: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({
  onCommand,
  onConnect,
  connected = false
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize terminal with dark theme matching our design
    const terminal = new XTerm({
      theme: {
        background: '#0d1117',
        foreground: '#00d4aa',
        cursor: '#00d4aa',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
        black: '#0d1117',
        red: '#ff6b35',
        green: '#00d4aa',
        yellow: '#ffb703',
        blue: '#219ebc',
        magenta: '#8b5cf6',
        cyan: '#00d4aa',
        white: '#c9d1d9',
        brightBlack: '#484f58',
        brightRed: '#ff7b72',
        brightGreen: '#7ee787',
        brightYellow: '#f9e71e',
        brightBlue: '#58a6ff',
        brightMagenta: '#bc8cff',
        brightCyan: '#39d0d6',
        brightWhite: '#e6edf3'
      },
      fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: false,
      macOptionIsMeta: true,
      scrollback: 1000,
      tabStopWidth: 4
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal in container
    terminal.open(terminalRef.current);

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Initial welcome message
    terminal.writeln('\x1b[32m╭─────────────────────────────────────────────────────────╮\x1b[0m');
    terminal.writeln('\x1b[32m│\x1b[0m                      \x1b[1;36mAxol Chat\x1b[0m                        \x1b[32m│\x1b[0m');
    terminal.writeln('\x1b[32m│\x1b[0m              \x1b[33mAxol — private talk, under the shell.\x1b[0m             \x1b[32m│\x1b[0m');
    terminal.writeln('\x1b[32m╰─────────────────────────────────────────────────────────╯\x1b[0m');
    terminal.writeln('');

    if (!connected) {
      terminal.writeln('\x1b[31m[DISCONNECTED]\x1b[0m Type \x1b[32mconnect\x1b[0m to establish secure connection');
    } else {
      terminal.writeln('\x1b[32m[CONNECTED]\x1b[0m Secure connection established');
    }

    terminal.writeln('Type \x1b[32mhelp\x1b[0m for available commands');
    terminal.writeln('');
    showPrompt();

    // Handle user input
    let inputBuffer = '';
    let inputMode = 'command'; // 'command' or 'message'
    let messageRecipient = '';

    terminal.onData((data) => {
      const char = data.charCodeAt(0);

      if (char === 13) { // Enter
        terminal.writeln('');
        if (inputBuffer.trim()) {
          if (inputMode === 'message' && messageRecipient) {
            // Send message via WebSocket
            websocketService.sendMessage(inputBuffer.trim(), messageRecipient);
            terminal.writeln(`\x1b[32m[TO ${messageRecipient}]\x1b[0m ${inputBuffer.trim()}`);
            messageRecipient = '';
            inputMode = 'command';
          } else {
            handleCommand(inputBuffer.trim());
          }
        }
        inputBuffer = '';
        showPrompt();
      } else if (char === 127) { // Backspace
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (char >= 32) { // Printable characters
        inputBuffer += data;
        terminal.write(data);
      }
    });

    function showPrompt() {
      const user = JSON.parse(localStorage.getItem('user') || '{"username":"guest"}');
      const status = connected ? '\x1b[32m●\x1b[0m' : '\x1b[31m●\x1b[0m';
      terminal.write(`${status} \x1b[36m${user.username}@axol\x1b[0m:\x1b[34m~\x1b[0m$ `);
    }

    function handleCommand(command: string) {
      const cmd = command.toLowerCase().trim();

      switch (cmd) {
        case 'help':
          terminal.writeln('\x1b[1;33mAvailable Commands:\x1b[0m');
          terminal.writeln('  \x1b[32mconnect\x1b[0m     - Connect to secure messaging server');
          terminal.writeln('  \x1b[32mdisconnect\x1b[0m  - Disconnect from server');
          terminal.writeln('  \x1b[32mstatus\x1b[0m      - Show connection status');
          terminal.writeln('  \x1b[32musers\x1b[0m       - List online users');
          terminal.writeln('  \x1b[32mmsg <user>\x1b[0m  - Send message to user');
          terminal.writeln('  \x1b[32mclear\x1b[0m       - Clear terminal');
          terminal.writeln('  \x1b[32mhelp\x1b[0m        - Show this help');
          terminal.writeln('');
          break;

        case 'connect':
          if (!websocketService.isConnected) {
            terminal.writeln('\x1b[33mEstablishing secure connection...\x1b[0m');
            websocketService.connect()
              .then(() => {
                terminal.writeln('\x1b[32m[CONNECTED]\x1b[0m Secure WebSocket connection established');
                websocketService.requestUserList();
                onConnect?.();
              })
              .catch((error) => {
                terminal.writeln(`\x1b[31m[ERROR]\x1b[0m Failed to connect: ${error.message}`);
              });
          } else {
            terminal.writeln('\x1b[33mAlready connected to server\x1b[0m');
          }
          break;

        case 'disconnect':
          if (websocketService.isConnected) {
            terminal.writeln('\x1b[33mDisconnecting from server...\x1b[0m');
            websocketService.disconnect();
            terminal.writeln('\x1b[31m[DISCONNECTED]\x1b[0m Connection closed');
          } else {
            terminal.writeln('\x1b[31mNot connected to server\x1b[0m');
          }
          break;

        case 'status':
          const wsStatus = websocketService.isConnected;
          const statusText = wsStatus ?
            '\x1b[32m[CONNECTED]\x1b[0m Secure WebSocket connection active' :
            '\x1b[31m[DISCONNECTED]\x1b[0m No active connection';
          terminal.writeln(statusText);
          if (wsStatus) {
            terminal.writeln(`\x1b[90mOnline users: ${onlineUsers.length}\x1b[0m`);
          }
          break;

        case 'clear':
          terminal.clear();
          break;

        case 'users':
          if (websocketService.isConnected) {
            terminal.writeln('\x1b[33mOnline Users:\x1b[0m');
            if (onlineUsers.length > 0) {
              onlineUsers.forEach(user => {
                terminal.writeln(`  \x1b[36m${user}\x1b[0m - Online`);
              });
            } else {
              terminal.writeln('  \x1b[90mNo other users online\x1b[0m');
            }
            websocketService.requestUserList();
          } else {
            terminal.writeln('\x1b[31mNot connected to server\x1b[0m');
          }
          break;

        default:
          if (cmd.startsWith('msg ')) {
            const user = cmd.substring(4).trim();
            if (user) {
              if (websocketService.isConnected) {
                if (onlineUsers.includes(user)) {
                  terminal.writeln(`\x1b[33mSending message to \x1b[36m${user}\x1b[0m...`);
                  terminal.writeln('\x1b[90mType your message and press Enter:\x1b[0m');
                  messageRecipient = user;
                  inputMode = 'message';
                } else {
                  terminal.writeln(`\x1b[31mUser '${user}' is not online\x1b[0m`);
                  terminal.writeln('Use \x1b[32musers\x1b[0m to see who is online');
                }
              } else {
                terminal.writeln('\x1b[31mNot connected to server\x1b[0m');
              }
            } else {
              terminal.writeln('\x1b[31mUsage: msg <username>\x1b[0m');
            }
          } else {
            terminal.writeln(`\x1b[31mCommand not found: ${command}\x1b[0m`);
            terminal.writeln('Type \x1b[32mhelp\x1b[0m for available commands');
          }
      }

      onCommand?.(command);
    }

    // Fit terminal to container
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    // WebSocket event listeners
    const handleMessage = (data: any) => {
      const timestamp = new Date(data.timestamp).toLocaleTimeString();
      terminal.writeln(`\x1b[34m[${timestamp}]\x1b[0m \x1b[36m${data.sender}\x1b[0m: ${data.content}`);
      showPrompt();
    };

    const handleUserJoined = (data: any) => {
      terminal.writeln(`\x1b[32m[SYSTEM]\x1b[0m User \x1b[36m${data.user}\x1b[0m joined the chat`);
      setOnlineUsers(prev => [...prev.filter(u => u !== data.user), data.user]);
      showPrompt();
    };

    const handleUserLeft = (data: any) => {
      terminal.writeln(`\x1b[33m[SYSTEM]\x1b[0m User \x1b[36m${data.user}\x1b[0m left the chat`);
      setOnlineUsers(prev => prev.filter(u => u !== data.user));
      showPrompt();
    };

    const handleUserList = (data: any) => {
      setOnlineUsers(data.users || []);
    };

    const handleConnectionStatus = (data: any) => {
      if (data.status === 'connected') {
        terminal.writeln('\x1b[32m[SYSTEM]\x1b[0m WebSocket connection established');
      } else if (data.status === 'disconnected') {
        terminal.writeln('\x1b[31m[SYSTEM]\x1b[0m WebSocket connection lost');
        setOnlineUsers([]);
      }
      showPrompt();
    };

    const handleError = (data: any) => {
      terminal.writeln(`\x1b[31m[ERROR]\x1b[0m ${data.error}`);
      showPrompt();
    };

    // Register WebSocket event listeners
    websocketService.on('message', handleMessage);
    websocketService.on('user_joined', handleUserJoined);
    websocketService.on('user_left', handleUserLeft);
    websocketService.on('user_list', handleUserList);
    websocketService.on('connection_status', handleConnectionStatus);
    websocketService.on('error', handleError);

    // Initial fit
    setTimeout(() => handleResize(), 100);

    // Handle window resize
    window.addEventListener('resize', handleResize);

    return () => {
      // Clean up WebSocket event listeners
      websocketService.off('message', handleMessage);
      websocketService.off('user_joined', handleUserJoined);
      websocketService.off('user_left', handleUserLeft);
      websocketService.off('user_list', handleUserList);
      websocketService.off('connection_status', handleConnectionStatus);
      websocketService.off('error', handleError);

      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, [connected, onCommand, onConnect]);

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }, 100);
  };

  const handleRefresh = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.writeln('\x1b[32mTerminal refreshed\x1b[0m');
      xtermRef.current.writeln('');
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 'auto',
        bottom: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        height: isFullscreen ? '100vh' : { xs: '400px', md: '500px' },
        width: isFullscreen ? '100vw' : '100%',
        bgcolor: '#0d1117',
        border: '1px solid #30363d',
        borderRadius: isFullscreen ? 0 : 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Terminal Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: '#161b22',
          borderBottom: '1px solid #30363d',
          minHeight: '40px'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: connected ? '#28ca42' : '#ff5f57'
            }}
          />
          <Box sx={{ ml: 1, fontSize: '13px', color: '#8b949e' }}>
            {connected ? 'Connected' : 'Disconnected'}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Refresh Terminal">
            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{ color: '#8b949e', '&:hover': { color: '#00d4aa' } }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton
              size="small"
              onClick={handleFullscreen}
              sx={{ color: '#8b949e', '&:hover': { color: '#00d4aa' } }}
            >
              {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Terminal Content */}
      <Box
        ref={terminalRef}
        sx={{
          flex: 1,
          '& .xterm': {
            height: '100% !important',
            padding: '10px'
          },
          '& .xterm-viewport': {
            backgroundColor: 'transparent !important'
          },
          '& .xterm-screen': {
            backgroundColor: 'transparent !important'
          }
        }}
      />
    </Paper>
  );
};