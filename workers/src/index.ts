import { SessionManager } from './sessions';
import { ConnectionManager } from './connections';

export { SessionManager, ConnectionManager };

// Environment interface
export interface Env {
  SESSIONS: DurableObjectNamespace;
  CONNECTIONS: DurableObjectNamespace;
  TURNSTILE_SECRET_KEY?: string;
  ENVIRONMENT?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Handle WebSocket upgrade for messaging
    if (request.headers.get('Upgrade') === 'websocket') {
      return handleWebSocket(request, env);
    }

    // API Gateway - Only expose versioned endpoints
    if (url.pathname.startsWith('/api/v1/')) {
      return handleAPIv1(request, env, url);
    }

    // Health check endpoint
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        service: 'SecureMsg API',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        endpoints: {
          auth: '/api/v1/auth/*',
          users: '/api/v1/users/*',
          websocket: 'ws://*/api/v1/ws'
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // All other routes return 404
    return new Response(JSON.stringify({
      error: 'Not found',
      message: 'Use /api/v1/* endpoints',
      timestamp: new Date().toISOString()
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  },
};

// API v1 Gateway Handler
async function handleAPIv1(request: Request, env: Env, url: URL): Promise<Response> {
  // Remove /api/v1 prefix for internal routing
  const path = url.pathname.replace('/api/v1', '');

  switch (true) {
    // Authentication endpoints
    case path === '/auth/register':
      return handleUserRegistration(request, env);
    case path === '/auth/login':
      return handleUserLogin(request, env);
    case path === '/auth/logout':
      return handleUserLogout(request, env);

    // User management endpoints
    case path.startsWith('/users/'):
      return handleUserLookup(request, env, path);
    case path === '/users':
      return handleUsersList(request, env);

    // WebSocket endpoint
    case path === '/ws':
      if (request.headers.get('Upgrade') === 'websocket') {
        return handleWebSocket(request, env);
      }
      return new Response('WebSocket upgrade required', { status: 400 });

    // Connection management
    case path === '/connections':
      return handleConnectionsAPI(request, env);

    default:
      return new Response(JSON.stringify({
        error: 'API endpoint not found',
        path: url.pathname,
        available: [
          '/api/v1/auth/register',
          '/api/v1/auth/login',
          '/api/v1/users',
          '/api/v1/ws',
          '/api/v1/connections'
        ]
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
  }
}

async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  try {
    const [client, server] = Object.values(new WebSocketPair());

    // Extract user agent for mobile detection
    const userAgent = request.headers.get('User-Agent') || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent);

    // Get client IP for logging
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    console.log(`WebSocket connection attempt - IP: ${clientIP}, Mobile: ${isMobile}, UA: ${userAgent.substring(0, 100)}`);

    // Accept the WebSocket connection
    server.accept();

    // Set up error handling for the server WebSocket
    server.addEventListener('error', (error) => {
      console.error('Server WebSocket error:', error);
    });

    server.addEventListener('close', (event) => {
      console.log(`Server WebSocket closed: code=${event.code}, reason=${event.reason}, clean=${event.wasClean}`);
    });

    // Get connection manager for this session
    const connectionId = env.CONNECTIONS.idFromName('global');
    const connectionObject = env.CONNECTIONS.get(connectionId);

    // Pass WebSocket to Durable Object for management with error handling
    try {
      await connectionObject.fetch('http://connection/websocket', {
        headers: {
          'Upgrade': 'websocket',
          'User-Agent': userAgent,
          'CF-Connecting-IP': clientIP,
          'X-Is-Mobile': isMobile.toString(),
        },
        // @ts-ignore - Cloudflare Workers WebSocket handling
        webSocket: server,
      });
    } catch (durableObjectError) {
      console.error('Durable Object WebSocket handling failed:', durableObjectError);
      server.close(1011, 'Server error in connection handling');
      return new Response('WebSocket handler error', { status: 500 });
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  } catch (error) {
    console.error('WebSocket setup failed:', error);
    return new Response('WebSocket upgrade failed', { status: 500 });
  }
}

async function handleUserRegistration(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { username, password, email, fullName, company, turnstileToken } = await request.json();

    // Basic validation
    if (!username || !password) {
      return new Response(JSON.stringify({
        error: 'Username and password are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Skip Turnstile verification in development or if not provided
    if (turnstileToken && env.TURNSTILE_SECRET_KEY) {
      const clientIP = request.headers.get('CF-Connecting-IP') || '';
      const isHuman = await verifyTurnstileToken(turnstileToken, clientIP, env.TURNSTILE_SECRET_KEY);

      if (!isHuman) {
        return new Response(JSON.stringify({
          error: 'Verification failed. Please try again.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Store user in Durable Object
    const sessionId = env.SESSIONS.idFromName('global');
    const sessionObject = env.SESSIONS.get(sessionId);

    const response = await sessionObject.fetch('http://session/register', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        email: email || `${username}@axol.local`,
        fullName: fullName || username,
        company: company || 'Private User'
      }),
    });

    const result = await response.text();
    return new Response(result, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
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

async function handleUserLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { username, password, turnstileToken } = await request.json();

    // For demo purposes, accept demo/demo credentials
    if (username === 'demo' && password === 'demo') {
      return new Response(JSON.stringify({
        success: true,
        token: 'demo-jwt-token',
        user: { username: 'demo', fullName: 'Demo User' }
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Invalid credentials'
    }), {
      status: 401,
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

async function handleUserLookup(request: Request, env: Env, path: string): Promise<Response> {
  // Extract username from path: /users/username
  const username = path.replace('/users/', '');

  if (!username) {
    return new Response(JSON.stringify({
      error: 'Username required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const sessionId = env.SESSIONS.idFromName('global');
  const sessionObject = env.SESSIONS.get(sessionId);

  const response = await sessionObject.fetch(`http://session/user?username=${username}`);

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}

async function handleUsersList(request: Request, env: Env): Promise<Response> {
  const sessionId = env.SESSIONS.idFromName('global');
  const sessionObject = env.SESSIONS.get(sessionId);

  const response = await sessionObject.fetch('http://session/users');

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}

async function handleUserLogout(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // In a real implementation, you'd invalidate the JWT token
  return new Response(JSON.stringify({
    success: true,
    message: 'Logged out successfully'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function handleConnectionsAPI(request: Request, env: Env): Promise<Response> {
  const connectionId = env.CONNECTIONS.idFromName('global');
  const connectionObject = env.CONNECTIONS.get(connectionId);

  const response = await connectionObject.fetch('http://connection/connections');

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}

async function verifyTurnstileToken(token: string, ip: string, secretKey?: string): Promise<boolean> {
  if (!secretKey || !token) {
    // In development, skip verification
    return true;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}