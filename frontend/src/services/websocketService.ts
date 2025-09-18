interface WebSocketMessage {
  type: 'message' | 'user_joined' | 'user_left' | 'user_list' | 'connection_status' | 'error' | 'auth' | 'user_list_request' | 'message_read' | 'message_delivered' | 'public_key_exchange' | 'public_key_request' | 'encrypted_message';
  data: any;
  timestamp: number;
  sender?: string;
}

interface User {
  username: string;
  fullName?: string;
  connected: boolean;
  lastSeen: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private listeners: Map<string, Function[]> = new Map();
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private authToken: string | null = null;

  constructor() {
    this.authToken = localStorage.getItem('authToken');
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionStatus === 'connected') {
        resolve();
        return;
      }

      this.connectionStatus = 'connecting';
      this.emit('connection_status', { status: 'connecting' });

      const wsUrl = import.meta.env.VITE_WS_URL || 'wss://secure-messaging.boris-chu.workers.dev';
      const fullUrl = `${wsUrl}/api/v1/ws`;

      try {
        this.ws = new WebSocket(fullUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.connectionStatus = 'connected';
          this.reconnectAttempts = 0;

          // Send authentication
          if (this.authToken) {
            this.send({
              type: 'auth',
              data: { token: this.authToken },
              timestamp: Date.now()
            });
          }

          this.emit('connection_status', { status: 'connected' });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.connectionStatus = 'disconnected';
          this.emit('connection_status', { status: 'disconnected', code: event.code, reason: event.reason });

          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', { error: 'WebSocket connection failed' });
          reject(new Error('WebSocket connection failed'));
        };

      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        this.connectionStatus = 'disconnected';
        this.emit('connection_status', { status: 'disconnected' });
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.connectionStatus = 'disconnected';
    this.emit('connection_status', { status: 'disconnected' });
  }

  send(message: Partial<WebSocketMessage>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        type: message.type || 'message',
        data: message.data || {},
        timestamp: message.timestamp || Date.now(),
        sender: message.sender
      };

      this.ws.send(JSON.stringify(fullMessage));
    } else {
      console.warn('WebSocket not connected, cannot send message');
      this.emit('error', { error: 'Not connected to server' });
    }
  }

  sendMessage(content: string, recipient?: string): void {
    this.send({
      type: 'message',
      data: { content, recipient },
      timestamp: Date.now()
    });
  }

  sendEncryptedMessage(encryptedContent: string, recipient: string, messageId: string): void {
    this.send({
      type: 'encrypted_message',
      data: {
        encryptedContent,
        recipient,
        messageId,
        isEncrypted: true
      },
      timestamp: Date.now()
    });
  }

  sendPublicKey(publicKey: string): void {
    this.send({
      type: 'public_key_exchange',
      data: { publicKey },
      timestamp: Date.now()
    });
  }

  requestPublicKey(username: string): void {
    this.send({
      type: 'public_key_request',
      data: { username },
      timestamp: Date.now()
    });
  }

  requestUserList(): void {
    this.send({
      type: 'user_list_request',
      data: {},
      timestamp: Date.now()
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log('Received WebSocket message:', message);

    switch (message.type) {
      case 'message':
        this.emit('message', {
          content: message.data.content,
          sender: message.sender,
          timestamp: message.timestamp,
          recipient: message.data.recipient
        });
        break;

      case 'user_joined':
        this.emit('user_joined', {
          user: message.data.user,
          timestamp: message.timestamp
        });
        break;

      case 'user_left':
        this.emit('user_left', {
          user: message.data.user,
          timestamp: message.timestamp
        });
        break;

      case 'user_list':
        this.emit('user_list', {
          users: message.data.users,
          timestamp: message.timestamp
        });
        break;

      case 'connection_status':
        this.emit('connection_status', message.data);
        break;

      case 'error':
        this.emit('error', {
          error: message.data.error || 'Unknown error',
          timestamp: message.timestamp
        });
        break;

      case 'message_read':
        this.emit('message_read', {
          messageId: message.data.messageId,
          readBy: message.sender,
          timestamp: message.timestamp
        });
        break;

      case 'message_delivered':
        this.emit('message_delivered', {
          messageId: message.data.messageId,
          deliveredTo: message.sender,
          timestamp: message.timestamp
        });
        break;

      case 'public_key_exchange':
        this.emit('public_key_received', {
          username: message.sender,
          publicKey: message.data.publicKey,
          timestamp: message.timestamp
        });
        break;

      case 'public_key_request':
        this.emit('public_key_requested', {
          username: message.sender,
          timestamp: message.timestamp
        });
        break;

      case 'encrypted_message':
        this.emit('encrypted_message', {
          encryptedContent: message.data.encryptedContent,
          sender: message.sender,
          messageId: message.data.messageId,
          timestamp: message.timestamp,
          isEncrypted: true
        });
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (this.connectionStatus === 'disconnected') {
        this.connect().catch(error => {
          console.error('Reconnect failed:', error);
        });
      }
    }, delay);
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Getters
  get status(): string {
    return this.connectionStatus;
  }

  get isConnected(): boolean {
    return this.connectionStatus === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export type { WebSocketMessage, User };