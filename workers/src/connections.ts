export class ConnectionManager {
  private state: DurableObjectState;
  private connections: Map<string, WebSocket> = new Map();
  private userConnections: Map<string, string> = new Map(); // username -> connectionId
  private connectionUsers: Map<string, string> = new Map(); // connectionId -> username

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketConnection(request);
    }

    // Handle HTTP requests for connection info
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/connections':
        return this.getConnections();
      case '/broadcast':
        return this.broadcastMessage(request);
      default:
        return new Response('Expected WebSocket', { status: 400 });
    }
  }

  private async handleWebSocketConnection(request: Request): Promise<Response> {
    // @ts-ignore - Cloudflare Workers WebSocket handling
    const webSocket = request.webSocket;
    if (!webSocket) {
      return new Response('Expected WebSocket', { status: 400 });
    }

    // Extract connection metadata
    const userAgent = request.headers.get('User-Agent') || '';
    const isMobile = request.headers.get('X-Is-Mobile') === 'true';
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    const connectionId = crypto.randomUUID();

    console.log(`New WebSocket connection: ${connectionId} - IP: ${clientIP}, Mobile: ${isMobile}`);

    try {
      // Accept the WebSocket connection
      webSocket.accept();

      // Store connection with metadata
      this.connections.set(connectionId, webSocket);

      // Set up event listeners with mobile-specific handling
      webSocket.addEventListener('message', (event) => {
        this.handleMessage(connectionId, event.data);
      });

      webSocket.addEventListener('close', (event) => {
        console.log(`WebSocket ${connectionId} closed: code=${event.code}, reason=${event.reason || 'No reason'}, clean=${event.wasClean}, mobile=${isMobile}`);
        this.handleDisconnection(connectionId);
      });

      webSocket.addEventListener('error', (error) => {
        console.error(`WebSocket error for ${connectionId} (mobile: ${isMobile}):`, error);
        this.handleDisconnection(connectionId);
      });

      // Send welcome message with connection info
      this.sendToConnection(connectionId, {
        type: 'connection_status',
        data: {
          status: 'connected',
          connectionId,
          isMobile,
          timestamp: new Date().toISOString()
        }
      });

      // For mobile connections, send a ping immediately to test stability
      if (isMobile) {
        setTimeout(() => {
          if (this.connections.has(connectionId)) {
            this.sendToConnection(connectionId, {
              type: 'ping',
              timestamp: new Date().toISOString()
            });
          }
        }, 1000);
      }

      return new Response(null, { status: 101 });
    } catch (error) {
      console.error(`Failed to setup WebSocket ${connectionId}:`, error);
      this.connections.delete(connectionId);
      return new Response('WebSocket setup failed', { status: 500 });
    }
  }

  private handleMessage(connectionId: string, data: string): void {
    try {
      const message = JSON.parse(data);
      console.log(`Message from ${connectionId}:`, message);

      switch (message.type) {
        case 'auth':
          this.handleAuthentication(connectionId, message);
          break;
        case 'authenticate':
          this.handleAuthentication(connectionId, message);
          break;
        case 'message':
          this.relayMessage(connectionId, message);
          break;
        case 'encrypted_message':
          this.relayEncryptedMessage(connectionId, message);
          break;
        case 'user_list_request':
          this.handleUserListRequest(connectionId);
          break;
        case 'public_key_exchange':
          this.relayPublicKeyExchange(connectionId, message);
          break;
        case 'public_key_request':
          this.relayPublicKeyRequest(connectionId, message);
          break;
        case 'ping':
          this.handlePing(connectionId);
          break;
        case 'pong':
          // Handle pong response
          console.log(`Received pong from ${connectionId}`);
          break;
        case 'connect_request':
          this.handleConnectionRequest(connectionId, message);
          break;
        case 'accept_connection':
          this.handleConnectionAcceptance(connectionId, message);
          break;
        default:
          console.warn(`Unknown message type: ${message.type} from ${connectionId}`);
          this.sendToConnection(connectionId, {
            type: 'error',
            data: { error: `Unknown message type: ${message.type}` }
          });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendToConnection(connectionId, {
        type: 'error',
        error: 'Invalid message format'
      });
    }
  }

  private handleAuthentication(connectionId: string, message: any): void {
    const { data, username: directUsername } = message;
    const username = data?.username || directUsername || data?.token;

    if (!username) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { error: 'Username or token required for authentication' }
      });
      return;
    }

    // Store the user-connection mapping
    this.userConnections.set(username, connectionId);
    this.connectionUsers.set(connectionId, username);

    this.sendToConnection(connectionId, {
      type: 'connection_status',
      data: {
        status: 'connected',
        authenticated: true,
        username
      }
    });

    // Broadcast user joined event
    this.broadcastToOthers(connectionId, {
      type: 'user_joined',
      data: { user: username },
      timestamp: Date.now()
    });

    console.log(`User ${username} authenticated on connection ${connectionId}`);
  }

  private handleConnectionRequest(connectionId: string, message: any): void {
    const { target } = message;
    const requesterUsername = this.connectionUsers.get(connectionId);

    if (!requesterUsername) {
      this.sendToConnection(connectionId, {
        type: 'error',
        error: 'Not authenticated'
      });
      return;
    }

    const targetConnectionId = this.userConnections.get(target);

    if (targetConnectionId) {
      this.sendToConnection(targetConnectionId, {
        type: 'connection_request',
        from: requesterUsername,
        timestamp: new Date().toISOString()
      });

      this.sendToConnection(connectionId, {
        type: 'request_sent',
        target,
        message: `Connection request sent to ${target}`
      });
    } else {
      this.sendToConnection(connectionId, {
        type: 'error',
        error: `User ${target} is not online`
      });
    }
  }

  private handleConnectionAcceptance(connectionId: string, message: any): void {
    const { target } = message;
    const accepterUsername = this.connectionUsers.get(connectionId);

    if (!accepterUsername) {
      this.sendToConnection(connectionId, {
        type: 'error',
        error: 'Not authenticated'
      });
      return;
    }

    const targetConnectionId = this.userConnections.get(target);

    if (targetConnectionId) {
      // Notify the original requester
      this.sendToConnection(targetConnectionId, {
        type: 'connection_accepted',
        from: accepterUsername,
        timestamp: new Date().toISOString()
      });

      // Confirm to the accepter
      this.sendToConnection(connectionId, {
        type: 'connection_established',
        with: target,
        message: `Connected to ${target}`
      });
    } else {
      this.sendToConnection(connectionId, {
        type: 'error',
        error: `User ${target} is no longer online`
      });
    }
  }

  private relayEncryptedMessage(connectionId: string, message: any): void {
    const { recipients, encryptedData } = message;
    const sender = this.connectionUsers.get(connectionId);

    if (!sender) {
      this.sendToConnection(connectionId, {
        type: 'error',
        error: 'Not authenticated'
      });
      return;
    }

    recipients.forEach((recipient: string) => {
      const recipientConnectionId = this.userConnections.get(recipient);
      if (recipientConnectionId) {
        this.sendToConnection(recipientConnectionId, {
          type: 'encrypted_message',
          from: sender,
          data: encryptedData,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Confirm message sent
    this.sendToConnection(connectionId, {
      type: 'message_sent',
      recipients: recipients.filter((r: string) => this.userConnections.has(r))
    });
  }

  private handlePing(connectionId: string): void {
    this.sendToConnection(connectionId, {
      type: 'pong',
      timestamp: new Date().toISOString()
    });
  }

  private relayMessage(connectionId: string, message: any): void {
    const sender = this.connectionUsers.get(connectionId);
    if (!sender) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { error: 'Not authenticated' }
      });
      return;
    }

    // Broadcast message to all connected users
    this.broadcastToOthers(connectionId, {
      type: 'message',
      data: {
        content: message.data?.content,
        recipient: message.data?.recipient
      },
      sender,
      timestamp: Date.now()
    });
  }

  private handleUserListRequest(connectionId: string): void {
    const users = Array.from(this.connectionUsers.values());
    this.sendToConnection(connectionId, {
      type: 'user_list',
      data: { users },
      timestamp: Date.now()
    });
  }

  private relayPublicKeyExchange(connectionId: string, message: any): void {
    const sender = this.connectionUsers.get(connectionId);
    if (!sender) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { error: 'Not authenticated' }
      });
      return;
    }

    // Broadcast public key to all other users
    this.broadcastToOthers(connectionId, {
      type: 'public_key_exchange',
      data: { publicKey: message.data?.publicKey },
      sender,
      timestamp: Date.now()
    });
  }

  private relayPublicKeyRequest(connectionId: string, message: any): void {
    const sender = this.connectionUsers.get(connectionId);
    const targetUsername = message.data?.username;

    if (!sender) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { error: 'Not authenticated' }
      });
      return;
    }

    if (!targetUsername) {
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { error: 'Target username required' }
      });
      return;
    }

    const targetConnectionId = this.userConnections.get(targetUsername);
    if (targetConnectionId) {
      this.sendToConnection(targetConnectionId, {
        type: 'public_key_request',
        sender,
        timestamp: Date.now()
      });
    }
  }

  private handleDisconnection(connectionId: string): void {
    const username = this.connectionUsers.get(connectionId);

    if (username) {
      // Broadcast user left event
      this.broadcastToOthers(connectionId, {
        type: 'user_left',
        data: { user: username },
        timestamp: Date.now()
      });

      // Clean up mappings
      this.userConnections.delete(username);
      this.connectionUsers.delete(connectionId);
    }

    this.connections.delete(connectionId);
    console.log(`Connection ${connectionId} (${username || 'anonymous'}) disconnected`);
  }

  private sendToConnection(connectionId: string, message: any): void {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === WebSocket.READY_STATE_OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to ${connectionId}:`, error);
        this.handleDisconnection(connectionId);
      }
    }
  }

  private broadcastToOthers(excludeConnectionId: string, message: any): void {
    this.connections.forEach((ws, connectionId) => {
      if (connectionId !== excludeConnectionId) {
        this.sendToConnection(connectionId, message);
      }
    });
  }

  private async getConnections(): Promise<Response> {
    const activeConnections = Array.from(this.connectionUsers.entries()).map(([connectionId, username]) => ({
      connectionId,
      username,
      connected: this.connections.has(connectionId)
    }));

    return new Response(JSON.stringify({
      activeConnections,
      totalConnections: this.connections.size
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async broadcastMessage(request: Request): Promise<Response> {
    try {
      const { message } = await request.json();

      this.connections.forEach((ws, connectionId) => {
        this.sendToConnection(connectionId, {
          type: 'broadcast',
          message,
          timestamp: new Date().toISOString()
        });
      });

      return new Response(JSON.stringify({
        success: true,
        sent: this.connections.size
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to broadcast message'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}