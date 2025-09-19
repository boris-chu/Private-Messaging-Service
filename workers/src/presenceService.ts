export class PresenceService {
  private state: DurableObjectState;
  private activeUsers: Map<string, PresenceData> = new Map();
  private readonly HEARTBEAT_TIMEOUT = 30000; // 30 seconds timeout
  private readonly CLEANUP_INTERVAL = 60000; // Cleanup every 60 seconds
  private cleanupTimer: any = null;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.loadState();
    this.startCleanupTimer();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/heartbeat':
        return this.handleHeartbeat(request);
      case '/presence':
      case '':
        return this.getOnlineUsers();
      case '/presence/cleanup':
        return this.forceCleanup();
      case '/logout':
        return this.handleLogout(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async handleHeartbeat(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      const body = await request.json() as {
        username?: string;
        displayName?: string;
        isAnonymous?: boolean;
      };
      const { username, displayName, isAnonymous } = body;

      if (!username) {
        return new Response(JSON.stringify({
          error: 'Username required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const now = Date.now();
      const presenceData: PresenceData = {
        username,
        displayName: displayName || username,
        lastSeen: now,
        isAnonymous: isAnonymous || false,
        status: 'online'
      };

      this.activeUsers.set(username, presenceData);
      await this.saveState();

      // Get current online users for response
      const onlineUsers = this.getOnlineUsersList();

      return new Response(JSON.stringify({
        success: true,
        heartbeatReceived: now,
        onlineUsers,
        totalOnline: onlineUsers.length
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Heartbeat processing failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  private async getOnlineUsers(): Promise<Response> {
    try {
      const onlineUsers = this.getOnlineUsersList();

      return new Response(JSON.stringify({
        success: true,
        users: onlineUsers,
        total: onlineUsers.length,
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to get online users'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  private getOnlineUsersList(): OnlineUser[] {
    const now = Date.now();
    const onlineUsers: OnlineUser[] = [];

    for (const [username, data] of this.activeUsers.entries()) {
      if (now - data.lastSeen <= this.HEARTBEAT_TIMEOUT) {
        onlineUsers.push({
          username: data.username,
          displayName: data.displayName,
          isAnonymous: data.isAnonymous,
          lastSeen: data.lastSeen,
          status: data.status
        });
      }
    }

    return onlineUsers.sort((a, b) => b.lastSeen - a.lastSeen);
  }

  private async forceCleanup(): Promise<Response> {
    const beforeCount = this.activeUsers.size;
    await this.cleanupStaleUsers();
    const afterCount = this.activeUsers.size;

    return new Response(JSON.stringify({
      success: true,
      message: `Cleanup completed: ${beforeCount - afterCount} stale users removed`,
      activeUsers: afterCount
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  private async handleLogout(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    try {
      const body = await request.json() as {
        username?: string;
      };
      const { username } = body;

      if (!username) {
        return new Response(JSON.stringify({
          error: 'Username required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Immediately remove user from presence tracking
      const wasPresent = this.activeUsers.has(username);
      this.activeUsers.delete(username);
      await this.saveState();

      // Get updated online users list
      const onlineUsers = this.getOnlineUsersList();

      return new Response(JSON.stringify({
        success: true,
        message: wasPresent ? 'User logged out and removed from presence' : 'User was not present',
        username,
        onlineUsers,
        totalOnline: onlineUsers.length,
        timestamp: Date.now()
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Logout processing failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  private async cleanupStaleUsers(): Promise<void> {
    const now = Date.now();
    const staleUsers: string[] = [];

    for (const [username, data] of this.activeUsers.entries()) {
      if (now - data.lastSeen > this.HEARTBEAT_TIMEOUT) {
        staleUsers.push(username);
      }
    }

    if (staleUsers.length > 0) {
      for (const username of staleUsers) {
        this.activeUsers.delete(username);
      }
      await this.saveState();
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      await this.cleanupStaleUsers();
    }, this.CLEANUP_INTERVAL);
  }

  private async loadState(): Promise<void> {
    try {
      const stored = await this.state.storage.get('activeUsers');
      if (stored) {
        this.activeUsers = new Map(Object.entries(stored as Record<string, PresenceData>));
      }
    } catch (error) {
      // Silent fail for production - no console spam
    }
  }

  private async saveState(): Promise<void> {
    try {
      const usersObject = Object.fromEntries(this.activeUsers);
      await this.state.storage.put('activeUsers', usersObject);
    } catch (error) {
      // Silent fail for production - no console spam
    }
  }

  // Public method for integration with other services
  async getUserStatus(username: string): Promise<PresenceData | null> {
    const user = this.activeUsers.get(username);
    if (!user) return null;

    const now = Date.now();
    if (now - user.lastSeen > this.HEARTBEAT_TIMEOUT) {
      this.activeUsers.delete(username);
      await this.saveState();
      return null;
    }

    return user;
  }

  // Public method to mark user as offline
  async markUserOffline(username: string): Promise<void> {
    this.activeUsers.delete(username);
    await this.saveState();
  }
}

interface PresenceData {
  username: string;
  displayName: string;
  lastSeen: number;
  isAnonymous: boolean;
  status: 'online' | 'away';
}

interface OnlineUser {
  username: string;
  displayName: string;
  isAnonymous: boolean;
  lastSeen: number;
  status: 'online' | 'away';
}