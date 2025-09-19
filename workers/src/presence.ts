export interface PresenceData {
  connectionId: string;
  username: string;
  status: 'online' | 'offline' | 'away';
  lastActivity: string;
  connectedAt: string;
  clientInfo?: {
    userAgent?: string;
    isMobile?: boolean;
    clientIP?: string;
  };
}

export interface UserPresence {
  username: string;
  status: 'online' | 'offline' | 'away';
  connections: string[];
  lastActivity: string;
  presenceUpdated: string;
}

export class PresenceManager {
  private state: DurableObjectState;
  private activeConnections: Map<string, PresenceData> = new Map();
  private userPresence: Map<string, UserPresence> = new Map();
  private sessionManagerBinding: DurableObjectNamespace;

  constructor(state: DurableObjectState, sessionManagerBinding: DurableObjectNamespace) {
    this.state = state;
    this.sessionManagerBinding = sessionManagerBinding;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/presence/connect':
        return this.handleConnectRequest(request);
      case '/presence/disconnect':
        return this.handleDisconnectRequest(request);
      case '/presence/update':
        return this.handleUpdateStatus(request);
      case '/presence/list':
        return this.getOnlineUsers();
      case '/presence/sync':
        return this.syncWithDatabase();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  async handleConnect(data: { connectionId: string; username: string; clientInfo?: any }): Promise<{ success: boolean; userPresence?: UserPresence; onlineUsers?: string[] }> {
    const { connectionId, username, clientInfo } = data;

    if (!connectionId || !username) {
      throw new Error('ConnectionId and username are required');
    }

    const now = new Date().toISOString();

    // Store connection data
    const presenceData: PresenceData = {
      connectionId,
      username,
      status: 'online',
      lastActivity: now,
      connectedAt: now,
      clientInfo
    };

    this.activeConnections.set(connectionId, presenceData);

    // Update user presence
    let userPresence = this.userPresence.get(username);
    if (!userPresence) {
      userPresence = {
        username,
        status: 'online',
        connections: [],
        lastActivity: now,
        presenceUpdated: now
      };
    }

    // Add connection if not already present
    if (!userPresence.connections.includes(connectionId)) {
      userPresence.connections.push(connectionId);
    }

    userPresence.status = 'online';
    userPresence.lastActivity = now;
    userPresence.presenceUpdated = now;

    this.userPresence.set(username, userPresence);

    // Sync with database
    await this.syncUserToDatabase(username, userPresence);

    console.log(`User ${username} connected on ${connectionId}. Total connections: ${userPresence.connections.length}`);

    return {
      success: true,
      userPresence,
      onlineUsers: await this.getOnlineUsersList()
    };
  }

  async handleDisconnect(data: { connectionId: string }): Promise<{ success: boolean; userPresence?: UserPresence; onlineUsers?: string[] }> {
    const { connectionId } = data;

    if (!connectionId) {
      throw new Error('ConnectionId is required');
    }

    const connectionData = this.activeConnections.get(connectionId);
    if (!connectionData) {
      return {
        success: true,
        onlineUsers: await this.getOnlineUsersList()
      };
    }

    const { username } = connectionData;

    // Remove connection
    this.activeConnections.delete(connectionId);

    // Update user presence
    const userPresence = this.userPresence.get(username);
    if (userPresence) {
      userPresence.connections = userPresence.connections.filter(id => id !== connectionId);
      userPresence.lastActivity = new Date().toISOString();
      userPresence.presenceUpdated = new Date().toISOString();

      // If no more connections, mark as offline
      if (userPresence.connections.length === 0) {
        userPresence.status = 'offline';
      }

      this.userPresence.set(username, userPresence);

      // Sync with database
      await this.syncUserToDatabase(username, userPresence);
    }

    console.log(`User ${username} disconnected from ${connectionId}. Remaining connections: ${userPresence?.connections.length || 0}`);

    return {
      success: true,
      userPresence,
      onlineUsers: await this.getOnlineUsersList()
    };
  }

  private async handleConnectRequest(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        connectionId: string;
        username: string;
        clientInfo?: {
          userAgent?: string;
          isMobile?: boolean;
          clientIP?: string;
        };
      };

      const result = await this.handleConnect(body);
      return new Response(JSON.stringify(result));
    } catch (error) {
      console.error('Error handling connect request:', error);
      return new Response(JSON.stringify({ error: 'Failed to handle connect' }), { status: 500 });
    }
  }

  private async handleDisconnectRequest(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { connectionId: string };
      const result = await this.handleDisconnect(body);
      return new Response(JSON.stringify(result));
    } catch (error) {
      console.error('Error handling disconnect request:', error);
      return new Response(JSON.stringify({ error: 'Failed to handle disconnect' }), { status: 500 });
    }
  }

  private async handleUpdateStatus(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { username: string; status: string };
      const { username, status } = body;

      if (!username || !status) {
        return new Response(JSON.stringify({
          error: 'Username and status are required'
        }), { status: 400 });
      }

      const userPresence = this.userPresence.get(username);
      if (!userPresence) {
        return new Response(JSON.stringify({
          error: 'User not found'
        }), { status: 404 });
      }

      const now = new Date().toISOString();
      userPresence.status = status as 'online' | 'offline' | 'away';
      userPresence.lastActivity = now;
      userPresence.presenceUpdated = now;

      this.userPresence.set(username, userPresence);

      // Sync with database
      await this.syncUserToDatabase(username, userPresence);

      return new Response(JSON.stringify({
        success: true,
        userPresence
      }));
    } catch (error) {
      console.error('Error updating status:', error);
      return new Response(JSON.stringify({ error: 'Failed to update status' }), { status: 500 });
    }
  }

  private async getOnlineUsers(): Promise<Response> {
    try {
      const onlineUsers = await this.getOnlineUsersList();
      return new Response(JSON.stringify({
        users: onlineUsers,
        total: onlineUsers.length
      }));
    } catch (error) {
      console.error('Error getting online users:', error);
      return new Response(JSON.stringify({ error: 'Failed to get online users' }), { status: 500 });
    }
  }

  async getOnlineUsersList(): Promise<string[]> {
    const onlineUsers: string[] = [];

    for (const [username, presence] of this.userPresence.entries()) {
      if (presence.status === 'online' && presence.connections.length > 0) {
        onlineUsers.push(username);
      }
    }

    return onlineUsers;
  }

  private async syncWithDatabase(): Promise<Response> {
    try {
      // Sync all current presence data with the database
      for (const [username, presence] of this.userPresence.entries()) {
        await this.syncUserToDatabase(username, presence);
      }

      return new Response(JSON.stringify({
        success: true,
        synced: this.userPresence.size
      }));
    } catch (error) {
      console.error('Error syncing with database:', error);
      return new Response(JSON.stringify({ error: 'Failed to sync with database' }), { status: 500 });
    }
  }

  private async syncUserToDatabase(username: string, presence: UserPresence): Promise<void> {
    try {
      // Get the SessionManager Durable Object instance
      const sessionId = this.sessionManagerBinding.idFromName('global');
      const sessionManager = this.sessionManagerBinding.get(sessionId);

      // Call the presence/connect endpoint on SessionManager
      await sessionManager.fetch('http://sessions/presence/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          connections: presence.connections,
          status: presence.status,
          lastActivity: presence.lastActivity,
          presenceUpdated: presence.presenceUpdated
        })
      });
    } catch (error) {
      console.error(`Failed to sync user ${username} to database:`, error);
      // Don't throw - presence tracking should continue even if database sync fails
    }
  }

  // Utility methods for ConnectionManager integration
  getUserByConnection(connectionId: string): string | undefined {
    const connectionData = this.activeConnections.get(connectionId);
    return connectionData?.username;
  }

  getConnectionsByUser(username: string): string[] {
    const userPresence = this.userPresence.get(username);
    return userPresence?.connections || [];
  }

  isUserOnline(username: string): boolean {
    const userPresence = this.userPresence.get(username);
    return userPresence?.status === 'online' && (userPresence.connections.length > 0);
  }

  getActiveConnectionsCount(): number {
    return this.activeConnections.size;
  }

  getOnlineUsersCount(): number {
    return Array.from(this.userPresence.values())
      .filter(p => p.status === 'online' && p.connections.length > 0)
      .length;
  }
}