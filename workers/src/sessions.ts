export class SessionManager {
  private state: DurableObjectState;
  private users: Map<string, UserData> = new Map();

  constructor(state: DurableObjectState) {
    this.state = state;
    this.loadState();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/register':
        return this.registerUser(request);
      case '/anonymous':
        return this.registerAnonymousUser(request);
      case '/user':
        return this.getUser(request);
      case '/users':
        return this.getAllUsers();
      case '/heartbeat':
        return this.handleHeartbeat(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async registerUser(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        username?: string;
        password?: string;
        email?: string;
        fullName?: string;
        company?: string;
      };
      const { username, password, email, fullName, company } = body;

      // Basic validation
      if (!username || !password) {
        return new Response(JSON.stringify({
          error: 'Username and password are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (this.users.has(username)) {
        return new Response(JSON.stringify({
          error: 'User already exists'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const userData: UserData = {
        username: username || '',
        password: password || '',
        email: email || `${username}@axol.local`,
        fullName: fullName || username || '',
        company: company || 'Private User',
        registeredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        status: 'offline'
      };

      this.users.set(username, userData);
      await this.saveState();

      return new Response(JSON.stringify({
        success: true,
        message: 'User registered successfully'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Registration failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async getUser(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');

    if (!username || !this.users.has(username)) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = this.users.get(username)!;
    // Don't expose sensitive information
    const publicUser = {
      username: user.username,
      fullName: user.fullName,
      status: user.status,
      lastSeen: user.lastSeen
    };

    return new Response(JSON.stringify(publicUser), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getAllUsers(): Promise<Response> {
    const publicUsers = Array.from(this.users.values()).map(user => ({
      username: user.username,
      fullName: user.fullName,
      status: user.status,
      lastSeen: user.lastSeen
    }));

    return new Response(JSON.stringify(publicUsers), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async loadState(): Promise<void> {
    try {
      const stored = await this.state.storage.get('users');
      if (stored) {
        this.users = new Map(Object.entries(stored as Record<string, UserData>));
      }
    } catch (error) {
      console.error('Failed to load user state:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      const usersObject = Object.fromEntries(this.users);
      await this.state.storage.put('users', usersObject);
    } catch (error) {
      console.error('Failed to save user state:', error);
    }
  }

  private async registerAnonymousUser(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        username?: string;
        displayName?: string;
        sessionId?: string;
        sessionToken?: string;
        isAnonymous?: boolean;
      };
      const { username, displayName, sessionId, sessionToken, isAnonymous } = body;

      // Basic validation
      if (!username || !displayName || !sessionId) {
        return new Response(JSON.stringify({
          error: 'Username, displayName, and sessionId are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (this.users.has(username)) {
        return new Response(JSON.stringify({
          error: 'Username already exists'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const userData: UserData = {
        username,
        password: '', // Anonymous users don't have passwords
        email: `${username}@anonymous.local`,
        fullName: displayName,
        company: 'Anonymous User',
        registeredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        status: 'online',
        isAnonymous: true,
        sessionId,
        sessionToken
      };

      this.users.set(username, userData);
      await this.saveState();

      return new Response(JSON.stringify({
        success: true,
        message: 'Anonymous user registered successfully',
        user: {
          username: userData.username,
          displayName: userData.fullName,
          isAnonymous: userData.isAnonymous,
          sessionId: userData.sessionId
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Anonymous registration failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async updateUserStatus(username: string, status: 'online' | 'offline'): Promise<void> {
    const user = this.users.get(username);
    if (user) {
      user.status = status;
      user.lastSeen = new Date().toISOString();
      await this.saveState();
    }
  }

  private async handleHeartbeat(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json() as { username?: string };
      const { username } = body;

      if (!username) {
        return new Response(JSON.stringify({
          error: 'Username required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const user = this.users.get(username);
      if (!user) {
        return new Response(JSON.stringify({
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Update user's lastSeen timestamp
      user.lastSeen = new Date().toISOString();
      user.status = 'online'; // Ensure user is marked as online
      await this.saveState();

      return new Response(JSON.stringify({
        success: true,
        message: 'Heartbeat recorded',
        lastSeen: user.lastSeen
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Heartbeat processing failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}

interface UserData {
  username: string;
  password: string;
  email: string;
  fullName: string;
  company: string;
  registeredAt: string;
  lastSeen: string;
  status: 'online' | 'offline';
  isAnonymous?: boolean;
  sessionId?: string;
  sessionToken?: string;
}