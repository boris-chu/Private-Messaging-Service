import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Box, Paper, IconButton, Tooltip } from '@mui/material';
import {
  Fullscreen,
  FullscreenExit,
  Settings,
  Refresh
} from '@mui/icons-material';
import '@xterm/xterm/css/xterm.css';

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
  const [currentLine, setCurrentLine] = useState('');

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
    terminal.writeln('\x1b[32m│\x1b[0m                    \x1b[1;36mSecureMsg Terminal\x1b[0m                  \x1b[32m│\x1b[0m');
    terminal.writeln('\x1b[32m│\x1b[0m              \x1b[33mPrivate Company Secure Messaging\x1b[0m             \x1b[32m│\x1b[0m');
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

    terminal.onData((data) => {
      const char = data.charCodeAt(0);

      if (char === 13) { // Enter
        terminal.writeln('');
        if (inputBuffer.trim()) {
          handleCommand(inputBuffer.trim());
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
      terminal.write(`${status} \x1b[36m${user.username}@securemsg\x1b[0m:\x1b[34m~\x1b[0m$ `);
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
          if (!connected) {
            terminal.writeln('\x1b[33mEstablishing secure connection...\x1b[0m');
            onConnect?.();
          } else {
            terminal.writeln('\x1b[33mAlready connected to server\x1b[0m');
          }
          break;

        case 'disconnect':
          if (connected) {
            terminal.writeln('\x1b[33mDisconnecting from server...\x1b[0m');
          } else {
            terminal.writeln('\x1b[31mNot connected to server\x1b[0m');
          }
          break;

        case 'status':
          const statusText = connected ?
            '\x1b[32m[CONNECTED]\x1b[0m Secure WebSocket connection active' :
            '\x1b[31m[DISCONNECTED]\x1b[0m No active connection';
          terminal.writeln(statusText);
          break;

        case 'clear':
          terminal.clear();
          break;

        case 'users':
          terminal.writeln('\x1b[33mOnline Users:\x1b[0m');
          terminal.writeln('  \x1b[36mdemo\x1b[0m - Demo User (online)');
          break;

        default:
          if (cmd.startsWith('msg ')) {
            const user = cmd.substring(4);
            if (user) {
              terminal.writeln(`\x1b[33mSending message to \x1b[36m${user}\x1b[0m...`);
              terminal.writeln('\x1b[90mType your message and press Enter:\x1b[0m');
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

    // Initial fit
    setTimeout(() => handleResize(), 100);

    // Handle window resize
    window.addEventListener('resize', handleResize);

    return () => {
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
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: '#ff5f57'
            }}
          />
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: '#ffbd2e'
            }}
          />
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: '#28ca42'
            }}
          />
          <Box sx={{ ml: 2, fontSize: '13px', color: '#8b949e' }}>
            SecureMsg Terminal
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