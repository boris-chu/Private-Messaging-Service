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
      case '/user':
        return this.getUser(request);
      case '/users':
        return this.getAllUsers();
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  private async registerUser(request: Request): Promise<Response> {
    try {
      const { username, email, fullName, company } = await request.json();

      if (this.users.has(username)) {
        return new Response(JSON.stringify({
          error: 'User already exists'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const userData: UserData = {
        username,
        email,
        fullName,
        company,
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

  async updateUserStatus(username: string, status: 'online' | 'offline'): Promise<void> {
    const user = this.users.get(username);
    if (user) {
      user.status = status;
      user.lastSeen = new Date().toISOString();
      await this.saveState();
    }
  }
}

interface UserData {
  username: string;
  email: string;
  fullName: string;
  company: string;
  registeredAt: string;
  lastSeen: string;
  status: 'online' | 'offline';
}