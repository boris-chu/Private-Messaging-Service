interface SSEMessage {
  type: string;
  data: Record<string, unknown>;
  sender?: string;
  timestamp: number;
}

export class SSEService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private currentUser: string = '';
  private apiUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 1000;
  private manualDisconnect = false;

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || 'https://api.axolchat.cc';
    this.setupMobileReconnectHandlers();
  }

  private setupMobileReconnectHandlers() {
    // Handle page visibility changes (mobile apps going to background/foreground)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // App came back to foreground, check connection
        setTimeout(() => {
          if (this.connectionStatus === 'disconnected' && !this.manualDisconnect) {
            console.log('App returned from background, attempting reconnection...');
            // Reset reconnect attempts for fresh start after background
            this.reconnectAttempts = 0;
            this.connect().catch(error => {
              console.error('Background reconnect failed:', error);
            });
          }
        }, 1000); // Small delay to allow network to stabilize
      }
    });

    // Handle window focus (additional mobile browser support)
    window.addEventListener('focus', () => {
      if (this.connectionStatus === 'disconnected' && !this.manualDisconnect) {
        setTimeout(() => {
          console.log('Window focused, checking connection...');
          this.connect().catch(error => {
            console.error('Focus reconnect failed:', error);
          });
        }, 500);
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      if (this.connectionStatus === 'disconnected' && !this.manualDisconnect) {
        console.log('Network came back online, reconnecting...');
        this.connect().catch(error => {
          console.error('Online reconnect failed:', error);
        });
      }
    });
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionStatus === 'connected') {
        resolve();
        return;
      }

      this.manualDisconnect = false;
      this.connectionStatus = 'connecting';
      this.emit('connection_status', { status: 'connecting' });

      // Get username from localStorage
      const userData = localStorage.getItem('user');
      let username = 'anonymous';

      if (userData) {
        try {
          const user = JSON.parse(userData);
          username = user.username || user.fullName || 'anonymous';
        } catch (e) {
          console.error('Failed to parse user data:', e);
        }
      }

      this.currentUser = username;

      const sseUrl = `${this.apiUrl}/api/v1/events?username=${encodeURIComponent(username)}`;

      console.log(`🔗 Connecting to SSE: ${sseUrl}`);

      try {
        this.eventSource = new EventSource(sseUrl);

        this.eventSource.onopen = () => {
          console.log('SSE connected');
          this.connectionStatus = 'connected';
          this.reconnectAttempts = 0;
          this.emit('connection_status', { status: 'connected' });
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          try {
            const message: SSEMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse SSE message:', error);
          }
        };

        this.eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          this.connectionStatus = 'disconnected';
          this.emit('connection_status', { status: 'disconnected' });

          // Only auto-reconnect if it wasn't a manual disconnect
          if (!this.manualDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }

          if (this.reconnectAttempts === 0) {
            reject(new Error('SSE connection failed'));
          }
        };

      } catch (error) {
        console.error('Failed to create SSE connection:', error);
        this.connectionStatus = 'disconnected';
        this.emit('connection_status', { status: 'disconnected' });
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.manualDisconnect = true;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connectionStatus = 'disconnected';
    this.emit('connection_status', { status: 'disconnected' });
  }

  private handleMessage(message: SSEMessage): void {
    console.log('Received SSE message:', message);

    switch (message.type) {
      case 'message':
        this.emit('message', {
          content: message.data.content,
          messageId: message.data.messageId,
          sender: message.sender,
          timestamp: message.timestamp,
          recipient: message.data.recipient
        });
        break;

      case 'lobby_message':
        this.emit('lobby_message', {
          content: message.data.content,
          messageId: message.data.messageId,
          sender: message.sender,
          timestamp: message.timestamp
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

      case 'public_key_received':
        this.emit('public_key_received', {
          username: message.data.username,
          publicKey: message.data.publicKey,
          timestamp: message.timestamp
        });
        break;

      case 'public_key_requested':
        this.emit('public_key_requested', {
          username: message.data.username,
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
        console.warn('Unknown SSE message type:', message.type);
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Scheduling SSE reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (this.connectionStatus === 'disconnected') {
        this.connect().catch(error => {
          console.error('SSE reconnect failed:', error);
        });
      }
    }, delay);
  }

  // HTTP POST methods for sending messages
  async sendMessage(content: string, recipient?: string): Promise<void> {
    await this.sendHTTPMessage({
      type: 'message',
      content,
      recipient,
      sender: this.currentUser,
      messageId: Date.now().toString(),
      timestamp: Date.now()
    });
  }

  async sendLobbyMessage(content: string): Promise<void> {
    await this.sendHTTPMessage({
      type: 'lobby_message',
      content,
      sender: this.currentUser,
      messageId: Date.now().toString(),
      timestamp: Date.now()
    });
  }

  async sendEncryptedMessage(encryptedContent: string, recipient: string, messageId: string): Promise<void> {
    await this.sendHTTPMessage({
      type: 'encrypted_message',
      encryptedContent,
      recipient,
      sender: this.currentUser,
      messageId,
      isEncrypted: true,
      timestamp: Date.now()
    });
  }

  async sendPublicKey(publicKey: string): Promise<void> {
    await this.sendHTTPMessage({
      type: 'public_key_exchange',
      publicKey,
      sender: this.currentUser,
      timestamp: Date.now()
    });
  }

  async requestPublicKey(username: string): Promise<void> {
    await this.sendHTTPMessage({
      type: 'public_key_request',
      username,
      sender: this.currentUser,
      timestamp: Date.now()
    });
  }

  async requestUserList(): Promise<void> {
    await this.sendHTTPMessage({
      type: 'user_list_request',
      sender: this.currentUser,
      timestamp: Date.now()
    });
  }

  private async sendHTTPMessage(data: Record<string, unknown>): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sender': this.currentUser
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('Message sent successfully:', data.type);
    } catch (error) {
      console.error('Failed to send HTTP message:', error);
      this.emit('error', { error: 'Failed to send message' });
    }
  }

  // Event system
  on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: unknown) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in SSE event listener:', error);
        }
      });
    }
  }

  // Getters
  get status(): string {
    return this.connectionStatus;
  }

  get isConnected(): boolean {
    return this.connectionStatus === 'connected' && this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Export singleton instance
export const sseService = new SSEService();