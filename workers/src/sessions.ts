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
      case '/recovery/save':
        return this.saveRecoveryData(request);
      case '/recovery/verify-phrase':
        return this.verifyRecoveryPhrase(request);
      case '/recovery/verify-code':
        return this.verifyRecoveryCode(request);
      case '/recovery/get':
        return this.getRecoveryData(request);
      case '/login':
        return this.loginUser(request);
      case '/presence/connect':
        return this.handleUserConnect(request);
      case '/presence/disconnect':
        return this.handleUserDisconnect(request);
      case '/presence/update':
        return this.updatePresence(request);
      case '/presence/list':
        return this.getOnlineUsers(request);
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
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      if (this.users.has(username)) {
        return new Response(JSON.stringify({
          error: 'User already exists'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Registration failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      if (this.users.has(username)) {
        return new Response(JSON.stringify({
          error: 'Username already exists'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Anonymous registration failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  private async loginUser(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
      const body = await request.json() as {
        username?: string;
        password?: string;
      };
      const { username, password } = body;

      if (!username || !password) {
        return new Response(JSON.stringify({
          error: 'Username and password are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const user = this.users.get(username);
      if (!user) {
        return new Response(JSON.stringify({
          error: 'Invalid credentials'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Simple password comparison (TODO: implement proper hashing)
      if (user.password !== password) {
        return new Response(JSON.stringify({
          error: 'Invalid credentials'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Update user status to online
      user.status = 'online';
      user.lastSeen = new Date().toISOString();
      await this.saveState();

      return new Response(JSON.stringify({
        success: true,
        token: `token-${username}-${Date.now()}`,
        user: {
          username: user.username,
          fullName: user.fullName
        }
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Login failed'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  private async handleUserConnect(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
      const body = await request.json() as {
        username?: string;
        connectionId?: string;
      };
      const { username, connectionId } = body;

      if (!username || !connectionId) {
        return new Response(JSON.stringify({
          error: 'Username and connectionId are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const user = this.users.get(username);
      if (!user) {
        return new Response(JSON.stringify({
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Initialize connections array if not exists
      if (!user.connections) {
        user.connections = [];
      }

      // Add connection if not already present
      if (!user.connections.includes(connectionId)) {
        user.connections.push(connectionId);
      }

      // Update presence status
      user.status = 'online';
      user.lastActivity = new Date().toISOString();
      user.presenceUpdated = new Date().toISOString();
      user.lastSeen = new Date().toISOString();

      await this.saveState();

      return new Response(JSON.stringify({
        success: true,
        user: {
          username: user.username,
          status: user.status,
          connectionCount: user.connections.length
        }
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to handle user connection'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  private async handleUserDisconnect(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
      const body = await request.json() as {
        username?: string;
        connectionId?: string;
      };
      const { username, connectionId } = body;

      if (!username || !connectionId) {
        return new Response(JSON.stringify({
          error: 'Username and connectionId are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const user = this.users.get(username);
      if (!user) {
        return new Response(JSON.stringify({
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Remove connection from user's connections
      if (user.connections) {
        user.connections = user.connections.filter(id => id !== connectionId);
      }

      // Update status based on remaining connections
      if (!user.connections || user.connections.length === 0) {
        user.status = 'offline';
      }

      user.lastSeen = new Date().toISOString();
      user.presenceUpdated = new Date().toISOString();

      await this.saveState();

      return new Response(JSON.stringify({
        success: true,
        user: {
          username: user.username,
          status: user.status,
          connectionCount: user.connections?.length || 0
        }
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to handle user disconnection'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  private async updatePresence(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
      const body = await request.json() as {
        username?: string;
        status?: 'online' | 'offline' | 'away';
      };
      const { username, status } = body;

      if (!username || !status) {
        return new Response(JSON.stringify({
          error: 'Username and status are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const user = this.users.get(username);
      if (!user) {
        return new Response(JSON.stringify({
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      user.status = status;
      user.lastActivity = new Date().toISOString();
      user.presenceUpdated = new Date().toISOString();
      if (status === 'offline') {
        user.lastSeen = new Date().toISOString();
      }

      await this.saveState();

      return new Response(JSON.stringify({
        success: true,
        user: {
          username: user.username,
          status: user.status,
          lastActivity: user.lastActivity
        }
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to update presence'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  private async getOnlineUsers(request: Request): Promise<Response> {
    try {
      const onlineUsers = Array.from(this.users.values())
        .filter(user => user.status === 'online' && user.connections && user.connections.length > 0)
        .map(user => ({
          username: user.username,
          fullName: user.fullName,
          status: user.status,
          lastActivity: user.lastActivity,
          connectionCount: user.connections?.length || 0,
          isAnonymous: user.isAnonymous || false
        }));

      return new Response(JSON.stringify({
        success: true,
        users: onlineUsers,
        total: onlineUsers.length
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
      return new Response('Method not allowed', { status: 405, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
      const body = await request.json() as { username?: string };
      const { username } = body;

      if (!username) {
        return new Response(JSON.stringify({
          error: 'Username required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const user = this.users.get(username);
      if (!user) {
        return new Response(JSON.stringify({
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
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

  private async saveRecoveryData(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
      const body = await request.json() as {
        username?: string;
        recoveryPhrase?: string[];
        recoveryCodes?: string[];
      };
      const { username, recoveryPhrase, recoveryCodes } = body;

      if (!username) {
        return new Response(JSON.stringify({
          error: 'Username required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const user = this.users.get(username);
      if (!user) {
        return new Response(JSON.stringify({
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Update user with recovery data
      user.recoveryPhrase = recoveryPhrase;
      user.recoveryCodes = recoveryCodes;
      user.usedRecoveryCodes = [];
      await this.saveState();

      return new Response(JSON.stringify({
        success: true,
        message: 'Recovery data saved successfully'
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to save recovery data'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  private async verifyRecoveryPhrase(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
      const body = await request.json() as {
        username?: string;
        recoveryPhrase?: string[];
      };
      const { username, recoveryPhrase } = body;

      if (!username || !recoveryPhrase) {
        return new Response(JSON.stringify({
          error: 'Username and recovery phrase required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const user = this.users.get(username);
      if (!user) {
        return new Response(JSON.stringify({
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Verify recovery phrase
      const isValid = user.recoveryPhrase &&
        user.recoveryPhrase.length === recoveryPhrase.length &&
        user.recoveryPhrase.every((word, index) => word === recoveryPhrase[index]);

      if (isValid) {
        return new Response(JSON.stringify({
          success: true,
          message: 'Recovery phrase verified'
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } else {
        return new Response(JSON.stringify({
          error: 'Invalid recovery phrase'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to verify recovery phrase'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  private async verifyRecoveryCode(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    try {
      const body = await request.json() as {
        username?: string;
        recoveryCode?: string;
      };
      const { username, recoveryCode } = body;

      if (!username || !recoveryCode) {
        return new Response(JSON.stringify({
          error: 'Username and recovery code required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const user = this.users.get(username);
      if (!user) {
        return new Response(JSON.stringify({
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Check if code has been used
      if (user.usedRecoveryCodes?.includes(recoveryCode)) {
        return new Response(JSON.stringify({
          error: 'Recovery code has already been used'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      // Verify recovery code
      if (user.recoveryCodes?.includes(recoveryCode)) {
        // Mark code as used
        if (!user.usedRecoveryCodes) {
          user.usedRecoveryCodes = [];
        }
        user.usedRecoveryCodes.push(recoveryCode);
        await this.saveState();

        return new Response(JSON.stringify({
          success: true,
          message: 'Recovery code verified'
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } else {
        return new Response(JSON.stringify({
          error: 'Invalid recovery code'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to verify recovery code'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }

  private async getRecoveryData(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');

    if (!username) {
      return new Response(JSON.stringify({
        error: 'Username required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const user = this.users.get(username);
    if (!user) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Return recovery data status (not the actual data for security)
    return new Response(JSON.stringify({
      hasRecoveryPhrase: !!user.recoveryPhrase,
      hasRecoveryCodes: !!user.recoveryCodes,
      remainingCodes: user.recoveryCodes ?
        user.recoveryCodes.length - (user.usedRecoveryCodes?.length || 0) : 0
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
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
  status: 'online' | 'offline' | 'away';
  isAnonymous?: boolean;
  sessionId?: string;
  sessionToken?: string;
  recoveryPhrase?: string[];
  recoveryCodes?: string[];
  usedRecoveryCodes?: string[];
  // New presence tracking fields
  connections?: string[]; // Array of connection IDs
  lastActivity?: string;
  presenceUpdated?: string;
}