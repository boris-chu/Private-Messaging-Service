import { Env } from './index';

export class SSEService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async handleSSEConnection(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Get user information from query parameters or headers
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    const userId = url.searchParams.get('userId') || username;

    if (!username) {
      return new Response(JSON.stringify({
        error: 'Username required for SSE connection'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Route SSE connection to the connections manager
    const connectionId = this.env.CONNECTIONS.idFromName('global');
    const connectionObject = this.env.CONNECTIONS.get(connectionId);

    // Pass SSE connection to the Durable Object
    const response = await connectionObject.fetch('http://connection/sse', {
      method: 'GET',
      headers: {
        'X-Username': username,
        'X-User-ID': userId || username,
        'X-Client-IP': request.headers.get('CF-Connecting-IP') || 'unknown',
        'User-Agent': request.headers.get('User-Agent') || ''
      }
    });

    return response;
  }

  async handleMessagePost(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json() as {
        type?: 'message' | 'lobby_message' | 'encrypted_message';
        content?: string;
        encryptedContent?: string;
        recipient?: string;
        messageId?: string;
        sender?: string;
        isEncrypted?: boolean;
      };

      const { type, content, encryptedContent, recipient, messageId, sender, isEncrypted } = body;

      // Validate required fields
      if (!type || !sender) {
        return new Response(JSON.stringify({
          error: 'Message type and sender are required'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      if (type === 'encrypted_message' && !encryptedContent) {
        return new Response(JSON.stringify({
          error: 'Encrypted content required for encrypted messages'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      if ((type === 'message' || type === 'lobby_message') && !content) {
        return new Response(JSON.stringify({
          error: 'Content required for regular messages'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // Route message to the connections manager for processing and broadcasting
      const connectionId = this.env.CONNECTIONS.idFromName('global');
      const connectionObject = this.env.CONNECTIONS.get(connectionId);

      const response = await connectionObject.fetch('http://connection/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sender': sender,
          'X-Client-IP': request.headers.get('CF-Connecting-IP') || 'unknown'
        },
        body: JSON.stringify({
          type,
          content,
          encryptedContent,
          recipient,
          messageId: messageId || Date.now().toString(),
          sender,
          isEncrypted: isEncrypted || false,
          timestamp: Date.now()
        })
      });

      return new Response(await response.text(), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to process message'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
}