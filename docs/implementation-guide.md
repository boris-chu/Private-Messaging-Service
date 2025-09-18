# Implementation Guide: Secure Messaging System

## Quick Start

This guide provides step-by-step instructions for implementing the **Cloudflare Workers architecture** for the secure messaging system.

## Architecture Overview

```
┌─────────────────┐    WSS/HTTPS    ┌─────────────────┐
│ Cloudflare Pages│◄──────────────►│ Cloudflare      │
│ (Frontend)      │                 │ Workers         │
│ - React App     │                 │ (Backend)       │
│ - Terminal UI   │                 └─────────────────┘
│ - WebCrypto     │                          │
└─────────────────┘                          │
         ▲                                   ▼
         │ E2E Encrypted Messages    ┌─────────────────┐
         │                          │ Durable Objects │
         ▼                          │ - Sessions      │
┌─────────────────┐                 │ - Connections   │
│   Client B      │                 │ - User Registry │
│ (Terminal UI)   │                 └─────────────────┘
└─────────────────┘
```

## Technology Stack

### Frontend (Cloudflare Pages)
- **React** with TypeScript
- **Material UI** for modern user interface
- **xterm.js** for terminal interface
- **WebCrypto API** for encryption
- **Native WebSockets** for real-time communication
- **Cloudflare Turnstile** for bot protection

### Backend (Cloudflare Workers)
- **TypeScript** with Workers runtime
- **WebSocketPair API** for WebSocket management
- **Durable Objects** for persistent state
- **Edge computing** for global deployment

## Step-by-Step Implementation

### Step 1: Project Setup

```bash
# Create project structure
mkdir secure-messaging
cd secure-messaging
mkdir frontend workers docs

# Initialize frontend (Cloudflare Pages)
cd frontend
npm init -y
npm install react react-dom typescript @types/react @types/react-dom
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material @mui/lab
npm install xterm @xterm/xterm
npm install vite @vitejs/plugin-react

# Initialize workers (Cloudflare Workers)
cd ../workers
npm init -y
npm install @cloudflare/workers-types typescript
npm install -g wrangler

# Initialize wrangler configuration
wrangler init --yes
```

### Step 2: Client-Side Crypto Implementation

```typescript
// client/src/crypto/KeyExchange.ts
export class KeyExchange {
  private keyPair: CryptoKeyPair | null = null;

  async generateKeyPair(): Promise<CryptoKeyPair> {
    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true,
      ["deriveKey"]
    );
    return this.keyPair;
  }

  async deriveSharedKey(publicKey: CryptoKey): Promise<CryptoKey> {
    if (!this.keyPair) throw new Error("Key pair not generated");

    return await window.crypto.subtle.deriveKey(
      {
        name: "ECDH",
        public: publicKey
      },
      this.keyPair.privateKey,
      {
        name: "AES-GCM",
        length: 256
      },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async exportPublicKey(): Promise<ArrayBuffer> {
    if (!this.keyPair) throw new Error("Key pair not generated");
    return await window.crypto.subtle.exportKey("raw", this.keyPair.publicKey);
  }
}
```

### Step 3: Message Encryption

```typescript
// client/src/crypto/MessageCrypto.ts
export class MessageCrypto {
  private sharedKey: CryptoKey | null = null;

  setSharedKey(key: CryptoKey) {
    this.sharedKey = key;
  }

  async encrypt(message: string): Promise<{
    ciphertext: ArrayBuffer;
    iv: ArrayBuffer;
  }> {
    if (!this.sharedKey) throw new Error("Shared key not set");

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      this.sharedKey,
      data
    );

    return { ciphertext, iv };
  }

  async decrypt(ciphertext: ArrayBuffer, iv: ArrayBuffer): Promise<string> {
    if (!this.sharedKey) throw new Error("Shared key not set");

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      this.sharedKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}
```

### Step 4: Terminal Interface

```typescript
// client/src/components/Terminal.tsx
import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

interface TerminalProps {
  onCommand: (command: string) => void;
}

export const TerminalComponent: React.FC<TerminalProps> = ({ onCommand }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal>();
  const fitAddon = useRef<FitAddon>();

  useEffect(() => {
    if (terminalRef.current) {
      terminal.current = new Terminal({
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4'
        },
        fontSize: 14,
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
      });

      fitAddon.current = new FitAddon();
      terminal.current.loadAddon(fitAddon.current);

      terminal.current.open(terminalRef.current);
      fitAddon.current.fit();

      terminal.current.write('secmsg v1.0 - Secure Messaging Terminal\r\n');
      terminal.current.write('Type /help for commands\r\n\r\n');
      terminal.current.write('> ');

      let currentLine = '';

      terminal.current.onData((data) => {
        if (data === '\r') {
          terminal.current!.write('\r\n');
          if (currentLine.trim()) {
            onCommand(currentLine.trim());
          }
          currentLine = '';
          terminal.current!.write('> ');
        } else if (data === '\u007F') { // Backspace
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            terminal.current!.write('\b \b');
          }
        } else {
          currentLine += data;
          terminal.current!.write(data);
        }
      });
    }

    return () => {
      terminal.current?.dispose();
    };
  }, [onCommand]);

  const writeMessage = (message: string) => {
    terminal.current?.write(`\r\n${message}\r\n> `);
  };

  return <div ref={terminalRef} style={{ height: '100vh', width: '100%' }} />;
};
```

### Step 5: Command Handler

```typescript
// client/src/services/CommandHandler.ts
export class CommandHandler {
  private socket: any;
  private crypto: MessageCrypto;
  private connections: Map<string, any> = new Map();

  constructor(socket: any, crypto: MessageCrypto) {
    this.socket = socket;
    this.crypto = crypto;
  }

  async handleCommand(command: string): Promise<string> {
    const parts = command.split(' ');
    const cmd = parts[0];

    switch (cmd) {
      case '/connect':
        return await this.handleConnect(parts[1]);
      case '/accept':
        return await this.handleAccept(parts[1]);
      case '/list':
        return this.handleList();
      case '/help':
        return this.handleHelp();
      case '/disconnect':
        return await this.handleDisconnect(parts[1]);
      default:
        if (command.startsWith('/')) {
          return `Unknown command: ${cmd}. Type /help for available commands.`;
        } else {
          return await this.sendMessage(command);
        }
    }
  }

  private async handleConnect(user: string): Promise<string> {
    if (!user) return 'Usage: /connect <user@domain>';

    this.socket.emit('connect_request', { target: user });
    return `Sending connection request to ${user}...`;
  }

  private async handleAccept(user: string): Promise<string> {
    if (!user) return 'Usage: /accept <user@domain>';

    this.socket.emit('accept_connection', { target: user });
    return `Accepting connection from ${user}...`;
  }

  private handleList(): string {
    if (this.connections.size === 0) {
      return 'No active connections.';
    }

    const list = Array.from(this.connections.keys()).join('\n');
    return `Active connections:\n${list}`;
  }

  private handleHelp(): string {
    return `Available commands:
/connect <user@domain>  - Send connection request
/accept <user@domain>   - Accept connection request
/list                   - Show active connections
/disconnect <user>      - Close connection
/help                   - Show this help

Type a message to send to connected users.`;
  }

  private async handleDisconnect(user: string): Promise<string> {
    if (!user) return 'Usage: /disconnect <user>';

    this.connections.delete(user);
    this.socket.emit('disconnect_user', { target: user });
    return `Disconnected from ${user}`;
  }

  private async sendMessage(message: string): Promise<string> {
    if (this.connections.size === 0) {
      return 'No active connections. Use /connect <user> to start.';
    }

    try {
      const encrypted = await this.crypto.encrypt(message);
      this.socket.emit('encrypted_message', {
        message: encrypted,
        recipients: Array.from(this.connections.keys())
      });
      return `[You] ${message}`;
    } catch (error) {
      return `Error encrypting message: ${error}`;
    }
  }
}
```

### Step 6: Cloudflare Workers Implementation

See the complete [Cloudflare Architecture](./cloudflare-architecture.md) document for detailed Workers implementation including:

- **Main Worker**: WebSocket handling and API endpoints
- **Durable Objects**: Session and connection management
- **WebSocket Implementation**: Real-time message relay
- **Deployment Configuration**: wrangler.toml setup

```typescript
// workers/src/index.ts - Main entry point
import { SessionManager, ConnectionManager } from './durableObjects';

export { SessionManager, ConnectionManager };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle WebSocket upgrades
    if (request.headers.get('Upgrade') === 'websocket') {
      return handleWebSocket(request, env);
    }

    // Handle API endpoints
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/api/register':
        return handleUserRegistration(request, env);
      case '/api/users':
        return handleUserLookup(request, env);
      default:
        return new Response('Not found', { status: 404 });
    }
  }
};
```

### Step 7: Cloudflare Deployment Configuration

```toml
# workers/wrangler.toml
name = "secure-messaging"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[durable_objects]
bindings = [
  { name = "SESSIONS", class_name = "SessionManager" },
  { name = "CONNECTIONS", class_name = "ConnectionManager" }
]

[[durable_objects.migrations]]
tag = "v1"
new_classes = ["SessionManager", "ConnectionManager"]

[vars]
ENVIRONMENT = "production"
```

```json
# frontend/package.json - Cloudflare Pages build config
{
  "name": "secure-messaging-frontend",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@mui/material": "^5.15.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "@mui/icons-material": "^5.15.0",
    "xterm": "^5.0.0"
  }
}
```

### Material UI Theme Setup
```tsx
// frontend/src/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4aa', // Terminal green
    },
    secondary: {
      main: '#ff6b35', // Warning orange
    },
    background: {
      default: '#0a0a0a',
      paper: '#1a1a1a',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h1: { fontFamily: '"Inter", sans-serif' },
    body2: { fontFamily: '"JetBrains Mono", monospace' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none' },
      },
    },
  },
});
```

### App with Material UI Provider
```tsx
// frontend/src/App.tsx
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { theme } from './theme';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TerminalPage } from './pages/TerminalPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/terminal" element={<TerminalPage />} />
          <Route path="/" element={<LoginPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
```

### Turnstile Integration
```tsx
// frontend/src/components/TurnstileWidget.tsx
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile: any;
  }
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  theme?: 'light' | 'dark' | 'auto';
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  onVerify,
  theme = 'dark'
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Turnstile script
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      document.head.appendChild(script);
    }

    const checkTurnstile = () => {
      if (widgetRef.current && window.turnstile) {
        window.turnstile.render(widgetRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          theme,
        });
      } else {
        setTimeout(checkTurnstile, 100);
      }
    };

    checkTurnstile();
  }, [siteKey, onVerify, theme]);

  return <div ref={widgetRef} />;
};
```

## Security Checklist

- [ ] HTTPS/WSS only in production
- [ ] Certificate pinning implemented
- [ ] Key rotation strategy defined
- [ ] Audit logging configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] CORS properly configured
- [ ] Dependencies regularly updated
- [ ] Penetration testing scheduled

## Deployment

### Development
```bash
# Frontend development
cd frontend
npm run dev

# Workers development
cd workers
wrangler dev
```

### Production
```bash
# Deploy Workers
cd workers
wrangler deploy

# Deploy Pages (via GitHub integration)
git push origin main  # Auto-deploys to Cloudflare Pages
```

### Monitoring
- **Cloudflare Analytics**: Built-in request/error monitoring
- **Custom Logging**: Worker console.log appears in Wrangler dashboard
- **Health Checks**: Automatic Cloudflare health monitoring

This Cloudflare-based implementation provides enterprise-grade security, global performance, and zero-infrastructure deployment with a simple git push workflow.