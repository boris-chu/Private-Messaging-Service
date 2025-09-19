import { PresenceManager } from './presence';

export class ConnectionManager {
  private state: DurableObjectState;
  private env: any;
  private connections: Map<string, WebSocket> = new Map();
  private userConnections: Map<string, string> = new Map(); // username -> connectionId
  private connectionUsers: Map<string, string> = new Map(); // connectionId -> username
  private presenceManager: PresenceManager | null = null;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  private getPresenceManager(): PresenceManager {
    if (!this.presenceManager) {
      // Handle case where SESSIONS binding might not be available in local dev
      const sessionsBinding = this.env?.SESSIONS || null;
      this.presenceManager = new PresenceManager(this.state, sessionsBinding);
    }
    return this.presenceManager;
  }

  async fetch(request: Request): Promise<Response> {
    console.log(`🟢 CONNECTION_DO: fetch called with URL: ${request.url}`);
    if (request.headers.get('Upgrade') === 'websocket') {
      console.log(`🟢 CONNECTION_DO: WebSocket upgrade detected, handling connection`);
      return this.handleWebSocketConnection(request);
    }

    // Handle HTTP requests for connection info
    const url = new URL(request.url);

    // Delegate presence-related requests to PresenceManager
    if (url.pathname.startsWith('/presence/')) {
      return this.getPresenceManager().fetch(request);
    }

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
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Extract connection metadata
    const userAgent = request.headers.get('User-Agent') || '';
    const isMobile = request.headers.get('X-Is-Mobile') === 'true';
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    const connectionId = crypto.randomUUID();

    console.log(`New WebSocket connection: ${connectionId} - IP: ${clientIP}, Mobile: ${isMobile}`);

    try {
      // Accept the server-side WebSocket connection
      server.accept();

      // Store connection with metadata (using server WebSocket)
      this.connections.set(connectionId, server);

      // Set up event listeners with mobile-specific handling
      server.addEventListener('message', (event: MessageEvent) => {
        this.handleMessage(connectionId, event.data).catch(error => {
          console.error(`Error handling message from ${connectionId}:`, error);
        });
      });

      server.addEventListener('close', (event: CloseEvent) => {
        console.log(`WebSocket ${connectionId} closed: code=${event.code}, reason=${event.reason || 'No reason'}, clean=${event.wasClean}, mobile=${isMobile}`);
        this.handleDisconnection(connectionId).catch(error => {
          console.error(`Error handling disconnection for ${connectionId}:`, error);
        });
      });

      server.addEventListener('error', (error: Event) => {
        console.error(`WebSocket error for ${connectionId} (mobile: ${isMobile}):`, error);
        this.handleDisconnection(connectionId).catch(error => {
          console.error(`Error handling disconnection for ${connectionId}:`, error);
        });
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

      // Return the client-side WebSocket to complete the handshake
      return new Response(null, {
        status: 101,
        webSocket: client
      });
    } catch (error) {
      console.error(`Failed to setup WebSocket ${connectionId}:`, error);
      this.connections.delete(connectionId);
      return new Response('WebSocket setup failed', { status: 500 });
    }
  }

  private async handleMessage(connectionId: string, data: string): Promise<void> {
    try {
      const message = JSON.parse(data);
      console.log(`🟢 BACKEND: Message from ${connectionId}:`, message);

      switch (message.type) {
        case 'auth':
          await this.handleAuthentication(connectionId, message);
          break;
        case 'authenticate':
          await this.handleAuthentication(connectionId, message);
          break;
        case 'message':
          this.relayMessage(connectionId, message);
          break;
        case 'encrypted_message':
          this.relayEncryptedMessage(connectionId, message);
          break;
        case 'user_list_request':
          await this.handleUserListRequest(connectionId);
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

  private async handleAuthentication(connectionId: string, message: any): Promise<void> {
    const { data, username: directUsername } = message;
    const username = data?.username || directUsername || data?.token;

    console.log(`DEBUG: Authentication attempt for connection ${connectionId}:`, {
      data,
      directUsername,
      resolvedUsername: username,
      messageType: message.type
    });

    if (!username) {
      console.log(`DEBUG: Authentication failed for ${connectionId} - no username provided`);
      this.sendToConnection(connectionId, {
        type: 'error',
        data: { error: 'Username or token required for authentication' }
      });
      return;
    }

    // Store the user-connection mapping
    this.userConnections.set(username, connectionId);
    this.connectionUsers.set(connectionId, username);

    // Update presence tracking
    try {
      const clientInfo = {
        userAgent: message.userAgent,
        isMobile: message.isMobile,
        clientIP: message.clientIP
      };

      await this.getPresenceManager().handleConnect({
        connectionId,
        username,
        clientInfo
      });

      console.log(`DEBUG: User ${username} presence updated successfully`);
    } catch (error) {
      console.error(`Failed to update presence for ${username}:`, error);
      // Continue with authentication even if presence update fails
    }

    console.log(`DEBUG: User ${username} authenticated on connection ${connectionId}. Current user mappings:`, {
      totalConnections: this.connections.size,
      totalUsers: this.connectionUsers.size,
      userList: Array.from(this.connectionUsers.values())
    });

    this.sendToConnection(connectionId, {
      type: 'connection_status',
      data: {
        status: 'connected',
        authenticated: true,
        username
      }
    });

    // Get online users from PresenceManager for accurate count
    try {
      const onlineUsers = await this.getPresenceManager().getOnlineUsersList();
      const filteredUsers = onlineUsers.filter(u => u !== username);

      console.log(`DEBUG: Sending presence-based user list to ${username}:`, {
        filteredUsers,
        totalOtherUsers: filteredUsers.length
      });

      if (filteredUsers.length > 0) {
        this.sendToConnection(connectionId, {
          type: 'user_list',
          data: { users: filteredUsers },
          timestamp: Date.now()
        });
        console.log(`DEBUG: User list sent to ${username}`);
      } else {
        console.log(`DEBUG: No other users online, not sending user list to ${username}`);
      }

      // Broadcast user joined event to others
      console.log(`DEBUG: Broadcasting user_joined event for ${username} to other users`);
      this.broadcastToOthers(connectionId, {
        type: 'user_joined',
        data: { user: username },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Failed to get online users from PresenceManager:', error);
      // Fallback to connection-based user list
      const currentUsers = Array.from(this.connectionUsers.values()).filter(u => u !== username);
      if (currentUsers.length > 0) {
        this.sendToConnection(connectionId, {
          type: 'user_list',
          data: { users: currentUsers },
          timestamp: Date.now()
        });
      }

      this.broadcastToOthers(connectionId, {
        type: 'user_joined',
        data: { user: username },
        timestamp: Date.now()
      });
    }

    console.log(`User ${username} authenticated on connection ${connectionId}. Total users online: ${this.connectionUsers.size}`);
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

  private async handleUserListRequest(connectionId: string): Promise<void> {
    const requestingUser = this.connectionUsers.get(connectionId);

    try {
      // Get accurate online users from PresenceManager
      const users = await this.getPresenceManager().getOnlineUsersList();

      console.log(`DEBUG: User list requested by ${requestingUser || 'unknown'} (${connectionId}):`, {
        users,
        totalUsers: users.length,
        allConnections: this.connections.size,
        source: 'PresenceManager'
      });

      this.sendToConnection(connectionId, {
        type: 'user_list',
        data: { users },
        timestamp: Date.now()
      });
      console.log(`DEBUG: Presence-based user list response sent to ${requestingUser || 'unknown'}`);
    } catch (error) {
      console.error('Failed to get users from PresenceManager, falling back to connection-based list:', error);

      // Fallback to connection-based user list
      const users = Array.from(this.connectionUsers.values());
      console.log(`DEBUG: Fallback user list for ${requestingUser || 'unknown'}:`, {
        users,
        totalUsers: users.length,
        source: 'ConnectionManager fallback'
      });

      this.sendToConnection(connectionId, {
        type: 'user_list',
        data: { users },
        timestamp: Date.now()
      });
      console.log(`DEBUG: Fallback user list response sent to ${requestingUser || 'unknown'}`);
    }
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

  private async handleDisconnection(connectionId: string): Promise<void> {
    const username = this.connectionUsers.get(connectionId);

    if (username) {
      // Update presence tracking
      try {
        await this.getPresenceManager().handleDisconnect({ connectionId });

        console.log(`DEBUG: User ${username} presence disconnection updated successfully`);
      } catch (error) {
        console.error(`Failed to update presence disconnection for ${username}:`, error);
      }

      // Check if user still has other connections through PresenceManager
      try {
        const isStillOnline = this.getPresenceManager().isUserOnline(username);

        // Only broadcast user_left if they have no more connections
        if (!isStillOnline) {
          this.broadcastToOthers(connectionId, {
            type: 'user_left',
            data: { user: username },
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Failed to check user online status:', error);
        // Fallback: broadcast user_left if this was their only connection
        if (this.userConnections.get(username) === connectionId) {
          this.broadcastToOthers(connectionId, {
            type: 'user_left',
            data: { user: username },
            timestamp: Date.now()
          });
        }
      }

      // Clean up local mappings
      this.userConnections.delete(username);
      this.connectionUsers.delete(connectionId);
    }

    this.connections.delete(connectionId);
    console.log(`Connection ${connectionId} (${username || 'anonymous'}) disconnected`);
  }

  private sendToConnection(connectionId: string, message: any): void {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === 1) { // 1 = OPEN state in Cloudflare Workers
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
      const body = await request.json() as { message?: unknown };
      const { message } = body;

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