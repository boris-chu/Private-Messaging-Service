import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Box, Paper, IconButton, Tooltip, Typography, Menu, MenuItem } from '@mui/material';
import {
  Refresh,
  Settings,
  Logout
} from '@mui/icons-material';
import '@xterm/xterm/css/xterm.css';
import { messageService } from '../services/messageService';
import type { Message, MessageStatus } from '../services/messageService';
import { useTheme } from '../contexts/ThemeContext';
import type { EncryptionState } from '../components/EncryptionStatus';
import { useTerminalMessages } from '../hooks/useChatStorage';

interface User {
  username: string;
  fullName?: string;
}

interface ExtendedTerminal extends XTerm {
  _onCommand?: (command: string) => void;
  _onConnect?: () => void;
}

interface EncryptionDetails {
  encryptedUserCount?: number;
  totalUserCount?: number;
  error?: string;
}

interface TerminalProps {
  onCommand?: (command: string) => void;
  onConnect?: () => void;
  connected?: boolean;
  onSettings?: () => void;
  onLogout?: () => void;
  onlineUserCount?: number;
}

export const Terminal: React.FC<TerminalProps> = ({
  onCommand,
  onConnect,
  connected = false,
  onSettings,
  onLogout,
  onlineUserCount = 0
}) => {
  const { privacySettings, updatePrivacySettings } = useTheme();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  // Removed fixed terminal size - now using fit addon for dynamic sizing
  const [sentMessages, setSentMessages] = useState<Map<string, Message>>(new Map());
  const {
    items: terminalMessages,
    addItem: addToTerminalHistory
  } = useTerminalMessages();
  const [prevPrivacySettings, setPrevPrivacySettings] = useState(privacySettings);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const terminalCommandChangeRef = useRef(false); // Track if change came from terminal command

  // Load user data
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Terminal messages are now automatically persisted by the useChatStorage hook

  // Helper function to add message to terminal and history
  const addTerminalMessage = (message: string) => {
    if (xtermRef.current) {
      xtermRef.current.writeln(message);
      addToTerminalHistory(message);
    }
  };

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
      scrollback: 10000, // Increased scrollback buffer
      tabStopWidth: 4,
      convertEol: true,
      scrollOnUserInput: true,
      fastScrollModifier: 'alt'
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
    terminal.writeln('\x1b[32m│\x1b[0m                      \x1b[1;36mAxol Chat\x1b[0m                          \x1b[32m│\x1b[0m');
    terminal.writeln('\x1b[32m│\x1b[0m              \x1b[33mAxol — private talk, under the shell.\x1b[0m      \x1b[32m│\x1b[0m');
    terminal.writeln('\x1b[32m╰─────────────────────────────────────────────────────────╯\x1b[0m');
    terminal.writeln('');

    if (!connected) {
      terminal.writeln('\x1b[31m[DISCONNECTED]\x1b[0m Type \x1b[32mconnect\x1b[0m to establish secure connection');
    } else {
      terminal.writeln('\x1b[32m[CONNECTED]\x1b[0m Secure WebSocket connection established');
      terminal.writeln('\x1b[32m[CRYPTO]\x1b[0m RSA-OAEP 2048-bit end-to-end encryption initialized');
    }

    terminal.writeln('Type \x1b[32mhelp\x1b[0m for available commands');
    terminal.writeln('');

    // Restore message history on terminal initialization
    if (terminalMessages.length > 0) {
      terminal.writeln('\x1b[90m[RESTORING MESSAGE HISTORY]\x1b[0m');
      terminal.writeln('');
      terminalMessages.forEach(message => {
        terminal.writeln(message);
      });
      terminal.writeln('');
    }
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
            // Send message via messageService
            (async () => {
              const result = await messageService.sendMessage(inputBuffer.trim(), messageRecipient);

              // Store sent message for status tracking
              const sentMessage: Message = {
                id: result.messageId,
                content: inputBuffer.trim(),
                sender: JSON.parse(localStorage.getItem('user') || '{"username":"guest"}').username,
                timestamp: Date.now(),
                isSelf: true,
                status: 'sending',
                isEncrypted: result.isEncrypted
              };
              setSentMessages(prev => new Map(prev.set(result.messageId, sentMessage)));

              const encryptionIndicator = result.isEncrypted ? '\x1b[32m[🔒]\x1b[0m' : '\x1b[31m[📢]\x1b[0m';
              terminal.writeln(`\x1b[90m[SENDING]\x1b[0m ${encryptionIndicator} \x1b[32m[TO ${messageRecipient}]\x1b[0m ${inputBuffer.trim()}`);
            })();
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
      terminal.write(`${status} \x1b[36m${user.username}@axol\x1b[0m \x1b[34m~\x1b[0m $ `);
      // Ensure cursor stays visible
      setTimeout(() => terminal.scrollToBottom(), 10);
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
          terminal.writeln('  \x1b[32mread mode\x1b[0m   - Show read receipt status');
          terminal.writeln('  \x1b[32mread -on\x1b[0m    - Enable read receipts');
          terminal.writeln('  \x1b[32mread -off\x1b[0m   - Disable read receipts');
          terminal.writeln('  \x1b[32mclear\x1b[0m       - Clear terminal');
          terminal.writeln('  \x1b[32mhelp\x1b[0m        - Show this help');
          terminal.writeln('');
          break;

        case 'connect':
          if (!messageService.isConnected) {
            terminal.writeln('\x1b[33mEstablishing secure connection...\x1b[0m');
            messageService.connect()
              .then(() => {
                terminal.writeln('\x1b[32m[CONNECTED]\x1b[0m Secure WebSocket connection established');
                terminal.writeln('\x1b[32m[CRYPTO]\x1b[0m RSA-OAEP 2048-bit end-to-end encryption initialized');
                localStorage.setItem('axol-was-connected', 'true'); // Save connection state
                messageService.requestUserList();
                ((terminal as ExtendedTerminal)._onConnect || onConnect)?.();
                showPrompt();
              })
              .catch((error) => {
                terminal.writeln(`\x1b[31m[ERROR]\x1b[0m Failed to connect: ${error.message}`);
              });
          } else {
            terminal.writeln('\x1b[33mAlready connected to server\x1b[0m');
          }
          break;

        case 'disconnect':
          if (messageService.isConnected) {
            terminal.writeln('\x1b[33mDisconnecting from server...\x1b[0m');
            messageService.disconnect();
            localStorage.removeItem('axol-was-connected'); // Clear connection state on manual disconnect
            terminal.writeln('\x1b[31m[DISCONNECTED]\x1b[0m Connection closed');
          } else {
            terminal.writeln('\x1b[31mNot connected to server\x1b[0m');
          }
          break;

        case 'status': {
          const wsStatus = messageService.isConnected;
          const statusText = wsStatus ?
            '\x1b[32m[CONNECTED]\x1b[0m Secure WebSocket connection active' :
            '\x1b[31m[DISCONNECTED]\x1b[0m No active connection';
          terminal.writeln(statusText);
          if (wsStatus) {
            terminal.writeln('\x1b[32m[CRYPTO]\x1b[0m RSA-OAEP 2048-bit encryption: Active');
            const encryptionState = messageService.getCurrentEncryptionState();
            const encryptedUsers = messageService.getEncryptedUsers();
            terminal.writeln(`\x1b[90mEncryption status: ${encryptionState}, Users with keys: ${encryptedUsers.length}\x1b[0m`);

            if (privacySettings.showOnlineStatus) {
              terminal.writeln(`\x1b[90mOnline users: ${onlineUsers.length}\x1b[0m`);
            }

            const readReceiptStatus = privacySettings.showReadReceipts ? 'enabled' : 'disabled';
            terminal.writeln(`\x1b[90mRead receipts: ${readReceiptStatus}\x1b[0m`);
          }
          break;
        }

        case 'clear':
          terminal.clear();
          break;

        case 'users':
          if (messageService.isConnected) {
            if (privacySettings.showOnlineStatus) {
              terminal.writeln('\x1b[33mOnline Users:\x1b[0m');
              if (onlineUsers.length > 0) {
                onlineUsers.forEach(user => {
                  terminal.writeln(`  \x1b[36m${user}\x1b[0m - Online`);
                });
              } else {
                terminal.writeln('  \x1b[90mNo other users online\x1b[0m');
              }
            } else {
              terminal.writeln('\x1b[90mOnline status visibility disabled\x1b[0m');
            }
            messageService.requestUserList();
          } else {
            terminal.writeln('\x1b[31mNot connected to server\x1b[0m');
          }
          break;

        case 'read mode': {
          const readStatus = privacySettings.showReadReceipts ? 'enabled' : 'disabled';
          terminal.writeln(`\x1b[33mRead receipts:\x1b[0m ${readStatus}`);
          terminal.writeln('\x1b[90mUse \x1b[32mread -on\x1b[0m or \x1b[32mread -off\x1b[0m to change settings\x1b[0m');
          break;
        }

        case 'read -on':
          if (!privacySettings.showReadReceipts) {
            terminalCommandChangeRef.current = true; // Mark as terminal command change
            updatePrivacySettings({ showReadReceipts: true });
            terminal.writeln('\x1b[32m[PRIVACY]\x1b[0m Read receipts enabled');
            terminal.writeln('\x1b[90mOther users will see when you read their messages\x1b[0m');
          } else {
            terminal.writeln('\x1b[33mRead receipts are already enabled\x1b[0m');
          }
          break;

        case 'read -off':
          if (privacySettings.showReadReceipts) {
            terminalCommandChangeRef.current = true; // Mark as terminal command change
            updatePrivacySettings({ showReadReceipts: false });
            terminal.writeln('\x1b[31m[PRIVACY]\x1b[0m Read receipts disabled');
            terminal.writeln('\x1b[90mOther users will not see when you read their messages\x1b[0m');
          } else {
            terminal.writeln('\x1b[33mRead receipts are already disabled\x1b[0m');
          }
          break;

        default:
          if (cmd.startsWith('msg ')) {
            const user = cmd.substring(4).trim();
            if (user) {
              if (messageService.isConnected) {
                if (privacySettings.showOnlineStatus) {
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
                  terminal.writeln(`\x1b[33mSending message to \x1b[36m${user}\x1b[0m...`);
                  terminal.writeln('\x1b[90mType your message and press Enter:\x1b[0m');
                  messageRecipient = user;
                  inputMode = 'message';
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

      ((terminal as ExtendedTerminal)._onCommand || onCommand)?.(command);
    }


    // Initialize message service for terminal
    (async () => {
      await messageService.initialize({
      showReadReceipts: privacySettings.showReadReceipts,
      showOnlineStatus: privacySettings.showOnlineStatus,
      onMessageReceived: (message: Message) => {
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        const encryptionIndicator = message.isEncrypted ? '\x1b[32m[🔒]\x1b[0m' : '\x1b[31m[📢]\x1b[0m';
        const errorIndicator = message.encryptionError ? '\x1b[31m[❌]\x1b[0m' : '';
        const messageText = `\x1b[34m[${timestamp}]\x1b[0m ${encryptionIndicator}${errorIndicator} \x1b[36m${message.sender}\x1b[0m: ${message.content}`;
        addTerminalMessage(messageText);
        showPrompt();
      },
      onMessageStatusUpdate: (messageId: string, status: MessageStatus) => {
        const message = sentMessages.get(messageId);
        if (message) {
          const updated = { ...message, status };
          setSentMessages(prev => new Map(prev.set(messageId, updated)));

          // Update terminal display with status
          if (status === 'delivered') {
            terminal.writeln(`\x1b[90m[DELIVERED]\x1b[0m Message sent`);
          } else if (status === 'read' && privacySettings.showReadReceipts) {
            terminal.writeln(`\x1b[32m[READ]\x1b[0m Message read`);
          }
          showPrompt();
        }
      },
      onUserJoined: (user: string) => {
        if (privacySettings.showOnlineStatus) {
          terminal.writeln(`\x1b[32m[SYSTEM]\x1b[0m User \x1b[36m${user}\x1b[0m joined the chat`);
        }
        setOnlineUsers(prev => [...prev.filter(u => u !== user), user]);
        showPrompt();
      },
      onUserLeft: (user: string) => {
        if (privacySettings.showOnlineStatus) {
          terminal.writeln(`\x1b[33m[SYSTEM]\x1b[0m User \x1b[36m${user}\x1b[0m left the chat`);
        }
        setOnlineUsers(prev => prev.filter(u => u !== user));
        showPrompt();
      },
      onUserListUpdate: (users: string[]) => {
        setOnlineUsers(users);
      },
      onConnectionStatusChange: (status: 'connected' | 'disconnected' | 'connecting') => {
        if (status === 'connected') {
          terminal.writeln('\x1b[32m[SYSTEM]\x1b[0m WebSocket connection established');
        } else if (status === 'connecting') {
          terminal.writeln('\x1b[33m[SYSTEM]\x1b[0m Establishing WebSocket connection...');
        } else {
          terminal.writeln('\x1b[31m[SYSTEM]\x1b[0m WebSocket connection lost');
          setOnlineUsers([]);
        }
        if (status !== 'connecting') {
          showPrompt();
        }
      },
      onEncryptionStateChange: (state: EncryptionState, details?: EncryptionDetails) => {
        // Show encryption status updates in terminal
        switch (state) {
          case 'initializing':
            terminal.writeln('\x1b[33m[CRYPTO]\x1b[0m Initializing RSA-OAEP 2048-bit encryption...');
            break;
          case 'generating-keys':
            terminal.writeln('\x1b[33m[CRYPTO]\x1b[0m Generating RSA 2048-bit key pair (SHA-256)...');
            break;
          case 'exchanging-keys':
            terminal.writeln('\x1b[36m[CRYPTO]\x1b[0m Exchanging public keys with peers...');
            break;
          case 'encrypted':
            terminal.writeln(`\x1b[32m[CRYPTO]\x1b[0m E2E encryption active (RSA-OAEP) with ${details?.encryptedUserCount || 0} user(s)`);
            showPrompt();
            break;
          case 'partial-encryption':
            terminal.writeln(`\x1b[33m[CRYPTO]\x1b[0m Partial encryption: ${details?.encryptedUserCount || 0}/${details?.totalUserCount || 0} users have keys`);
            showPrompt();
            break;
          case 'error':
            terminal.writeln(`\x1b[31m[CRYPTO]\x1b[0m RSA encryption error: ${details?.error || 'Unknown error'}`);
            showPrompt();
            break;
        }
      }
    });
    })();

    // Fit terminal to container size for proper scrolling
    setTimeout(() => {
      fitAddon.fit();
      // Initial scroll to bottom after sizing
      terminal.scrollToBottom();
    }, 100);

    // Let xterm handle natural scrolling behavior like a real terminal

    // Handle window resize to keep terminal properly fitted
    const handleResize = () => {
      if (fitAddon) {
        setTimeout(() => fitAddon.fit(), 50);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      // Clean up message service
      messageService.cleanup();
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, []); // Remove dependencies to prevent reinitialization

  // Update callback references without reinitializing terminal
  useEffect(() => {
    // Store callback references for use in terminal functions
    // This allows us to update callbacks without recreating the entire terminal
    const currentTerminal = xtermRef.current;
    if (currentTerminal) {
      // Update internal callback references
      (currentTerminal as ExtendedTerminal)._onCommand = onCommand;
      (currentTerminal as ExtendedTerminal)._onConnect = onConnect;
    }
  }, [onCommand, onConnect]);

  // Watch for privacy settings changes and display in terminal
  useEffect(() => {
    // Skip if this is the initial setup (prevent showing changes on page load)
    if (prevPrivacySettings.showReadReceipts === privacySettings.showReadReceipts &&
        prevPrivacySettings.showOnlineStatus === privacySettings.showOnlineStatus) {
      return;
    }

    if (!xtermRef.current) {
      setPrevPrivacySettings(privacySettings);
      return;
    }

    const terminal = xtermRef.current;

    // Check if read receipts setting changed (but only if we have a real change, not initial load)
    if (prevPrivacySettings.showReadReceipts !== privacySettings.showReadReceipts) {
      // Only show message if this change did NOT come from a terminal command
      if (!terminalCommandChangeRef.current) {
        const status = privacySettings.showReadReceipts ? 'enabled' : 'disabled';
        const color = privacySettings.showReadReceipts ? '32' : '31';
        terminal.writeln(`\x1b[${color}m[PRIVACY]\x1b[0m Read receipts ${status} via settings`);

        // Show new prompt
        const user = JSON.parse(localStorage.getItem('user') || '{"username":"guest"}');
        const connectionStatus = connected ? '\x1b[32m●\x1b[0m' : '\x1b[31m●\x1b[0m';
        terminal.write(`${connectionStatus} \x1b[36m${user.username}@axol\x1b[0m \x1b[34m~\x1b[0m $ `);
      }
      // Reset the flag after processing
      terminalCommandChangeRef.current = false;
    }

    // Check if online status setting changed
    if (prevPrivacySettings.showOnlineStatus !== privacySettings.showOnlineStatus) {
      const status = privacySettings.showOnlineStatus ? 'enabled' : 'disabled';
      const color = privacySettings.showOnlineStatus ? '32' : '31';
      terminal.writeln(`\x1b[${color}m[PRIVACY]\x1b[0m Online status visibility ${status} via settings`);

      // Show new prompt
      const user = JSON.parse(localStorage.getItem('user') || '{"username":"guest"}');
      const connectionStatus = connected ? '\x1b[32m●\x1b[0m' : '\x1b[31m●\x1b[0m';
      terminal.write(`${connectionStatus} \x1b[36m${user.username}@axol\x1b[0m \x1b[34m~\x1b[0m $ `);
    }

    setPrevPrivacySettings(privacySettings);
  }, [privacySettings]);


  const handleRefresh = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.writeln('\x1b[32mTerminal refreshed\x1b[0m');
      xtermRef.current.writeln('');
    }
  };


  return (
    <Paper
      elevation={0}
      sx={{
        height: '100vh',
        width: '100vw',
        bgcolor: '#0d1117',
        border: 'none',
        borderRadius: 0,
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
          py: 1.5,
          bgcolor: '#161b22',
          borderBottom: '1px solid #30363d',
          minHeight: '48px'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Axol Chat Branding */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src="/axolotl.png" alt="Axol" style={{ width: 24, height: 24 }} />
            <Typography variant="h6" sx={{ color: '#00d4aa', fontSize: '16px', fontWeight: 600 }}>
              Axol Chat
            </Typography>
          </Box>

          {/* Connection Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: connected ? '#28ca42' : '#ff5f57'
              }}
            />
            <Box sx={{ fontSize: '13px', color: '#8b949e', fontWeight: 500 }}>
              {connected ? 'Connected' : 'Disconnected'}
            </Box>
          </Box>

          {/* Online User Count */}
          {connected && onlineUserCount > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" sx={{ color: '#8b949e', fontSize: '12px' }}>
                {onlineUserCount} user{onlineUserCount !== 1 ? 's' : ''} online
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {user && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                <Typography variant="body2" sx={{ color: '#8b949e', fontSize: '12px' }}>
                  {user.fullName || user.username}
                </Typography>
                <Tooltip title="User Menu">
                  <IconButton
                    size="small"
                    onClick={handleMenu}
                    sx={{ color: '#8b949e', '&:hover': { color: '#00d4aa' } }}
                  >
                    <img src="/axolotl.png" alt="User Avatar" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          )}

          <Tooltip title="Refresh Terminal">
            <IconButton
              size="small"
              onClick={handleRefresh}
              sx={{ color: '#8b949e', '&:hover': { color: '#00d4aa' } }}
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Terminal Content */}
      <Box
        ref={terminalRef}
        sx={{
          flex: 1,
          position: 'relative',
          '& .xterm': {
            height: '100% !important',
            padding: '16px',
            paddingTop: '12px',
            paddingBottom: '20px'
          },
          '& .xterm-viewport': {
            backgroundColor: 'transparent !important',
            overflowY: 'scroll !important',
            scrollBehavior: 'auto' // Changed from smooth to auto for immediate scrolling
          },
          '& .xterm-screen': {
            backgroundColor: 'transparent !important'
          },
          '& .xterm-rows': {
            display: 'block !important'
          },
          '& .xterm-helper-textarea': {
            position: 'absolute !important',
            left: '-9999px !important'
          }
        }}
      />

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