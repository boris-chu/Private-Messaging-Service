export class ConnectionManager {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    console.log(`🟢 MINIMAL: fetch called with URL: ${request.url}`);

    if (request.headers.get('Upgrade') === 'websocket') {
      console.log(`🟢 MINIMAL: WebSocket upgrade detected`);
      return this.handleWebSocketConnection(request);
    }

    return new Response('Expected WebSocket', { status: 400 });
  }

  private async handleWebSocketConnection(request: Request): Promise<Response> {
    console.log('🟢 MINIMAL: Creating WebSocketPair');
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    const connectionId = crypto.randomUUID();
    console.log(`🟢 MINIMAL: New connection ${connectionId}`);

    // Set up message handler
    server.addEventListener('message', (event: MessageEvent) => {
      console.log(`🟢 MINIMAL: Received message from ${connectionId}:`, event.data);

      // Echo the message back
      server.send(`Echo: ${event.data}`);
    });

    server.addEventListener('close', (event: CloseEvent) => {
      console.log(`🟢 MINIMAL: Connection ${connectionId} closed`);
    });

    server.addEventListener('error', (error: Event) => {
      console.log(`🟢 MINIMAL: Connection ${connectionId} error:`, error);
    });

    // Accept the server connection
    server.accept();

    // Send a welcome message
    server.send('Welcome to minimal WebSocket server');

    console.log(`🟢 MINIMAL: Returning client WebSocket for ${connectionId}`);
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
}