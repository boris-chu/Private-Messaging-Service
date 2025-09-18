import { websocketService } from './websocketService';
import { cryptoService } from './cryptoService';
import type { EncryptionState } from '../components/EncryptionStatus';

export type MessageStatus = 'sending' | 'delivered' | 'read';

interface EncryptionDetails {
  encryptedUserCount?: number;
  totalUserCount?: number;
  error?: string;
}

interface MessageData {
  content?: string;
  messageId?: string;
  sender?: string;
  timestamp?: number;
  isEncrypted?: boolean;
  encryptedContent?: string;
}

interface UserData {
  username?: string;
  users?: string[];
  user?: string;
}

interface PublicKeyData {
  username: string;
  publicKey: string;
}

interface ConnectionStatusData {
  connected?: boolean;
  status?: string;
}

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
  isSelf: boolean;
  status?: MessageStatus;
  isRead?: boolean;
  readBy?: string[];
  isEncrypted?: boolean;
  encryptionError?: string;
}

export interface MessageServiceConfig {
  showReadReceipts: boolean;
  showOnlineStatus: boolean;
  onMessageReceived: (message: Message) => void;
  onMessageStatusUpdate: (messageId: string, status: MessageStatus) => void;
  onUserJoined: (user: string) => void;
  onUserLeft: (user: string) => void;
  onUserListUpdate: (users: string[]) => void;
  onConnectionStatusChange: (status: import('../components/ConnectionStatusIndicator').ConnectionStatus) => void;
  onEncryptionStateChange: (state: EncryptionState, details?: EncryptionDetails) => void;
}

class MessageService {
  private config: MessageServiceConfig | null = null;
  private currentUser: string = '';
  private encryptionState: EncryptionState = 'no-encryption';
  private encryptedUsers: Set<string> = new Set();

  // Store wrapper functions for proper cleanup
  private messageWrapper = (data: unknown) => this.handleMessage(data as MessageData);
  private encryptedMessageWrapper = (data: unknown) => this.handleEncryptedMessage(data as MessageData);
  private messageDeliveredWrapper = (data: unknown) => this.handleMessageDelivered(data as MessageData);
  private messageReadWrapper = (data: unknown) => this.handleMessageRead(data as MessageData);
  private userJoinedWrapper = (data: unknown) => this.handleUserJoined(data as UserData);
  private userLeftWrapper = (data: unknown) => this.handleUserLeft(data as UserData);
  private userListWrapper = (data: unknown) => this.handleUserList(data as UserData);
  private connectionStatusWrapper = (data: unknown) => this.handleConnectionStatus(data as ConnectionStatusData);
  private publicKeyReceivedWrapper = (data: unknown) => this.handlePublicKeyReceived(data as PublicKeyData);
  private publicKeyRequestedWrapper = (data: unknown) => this.handlePublicKeyRequested(data as UserData);

  async initialize(config: MessageServiceConfig) {
    this.config = config;
    this.currentUser = JSON.parse(localStorage.getItem('user') || '{"username":"guest"}').username;

    // Initialize encryption
    await this.initializeEncryption();

    // Set up WebSocket listeners with type-safe wrappers
    websocketService.on('message', this.messageWrapper);
    websocketService.on('encrypted_message', this.encryptedMessageWrapper);
    websocketService.on('message_delivered', this.messageDeliveredWrapper);
    websocketService.on('message_read', this.messageReadWrapper);
    websocketService.on('user_joined', this.userJoinedWrapper);
    websocketService.on('user_left', this.userLeftWrapper);
    websocketService.on('user_list', this.userListWrapper);
    websocketService.on('connection_status', this.connectionStatusWrapper);
    websocketService.on('public_key_received', this.publicKeyReceivedWrapper);
    websocketService.on('public_key_requested', this.publicKeyRequestedWrapper);
  }

  private async initializeEncryption() {
    try {
      this.updateEncryptionState('initializing');

      this.updateEncryptionState('generating-keys');
      await cryptoService.initialize(this.currentUser);

      this.updateEncryptionState('exchanging-keys');
      // Send our public key to all users
      const publicKey = await cryptoService.getPublicKeyAsString();
      websocketService.sendPublicKey(publicKey);

      this.updateEncryptionState('partial-encryption');
    } catch (error) {
      console.error('Encryption initialization failed:', error);
      this.updateEncryptionState('error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private updateEncryptionState(state: EncryptionState, details?: EncryptionDetails) {
    this.encryptionState = state;
    this.config?.onEncryptionStateChange(state, {
      encryptedUserCount: this.encryptedUsers.size,
      totalUserCount: this.encryptedUsers.size, // Will be updated when we get user list
      ...details
    });
  }

  cleanup() {
    websocketService.off('message', this.messageWrapper);
    websocketService.off('encrypted_message', this.encryptedMessageWrapper);
    websocketService.off('message_delivered', this.messageDeliveredWrapper);
    websocketService.off('message_read', this.messageReadWrapper);
    websocketService.off('user_joined', this.userJoinedWrapper);
    websocketService.off('user_left', this.userLeftWrapper);
    websocketService.off('user_list', this.userListWrapper);
    websocketService.off('connection_status', this.connectionStatusWrapper);
    websocketService.off('public_key_received', this.publicKeyReceivedWrapper);
    websocketService.off('public_key_requested', this.publicKeyRequestedWrapper);

    cryptoService.clearKeys();
    this.encryptedUsers.clear();
    this.config = null;
  }

  private handleMessage = (data: MessageData) => {
    if (!this.config) return;

    const message: Message = {
      id: data.messageId || Date.now().toString(),
      content: data.content || '',
      sender: data.sender || '',
      timestamp: data.timestamp || Date.now(),
      isSelf: data.sender === this.currentUser,
      status: 'delivered',
      isRead: false,
      readBy: [],
      isEncrypted: false // Plain text message
    };

    // Send delivery confirmation
    this.sendDeliveryConfirmation(message.id);

    // Send read receipt if enabled and message is not from self
    if (this.config.showReadReceipts && !message.isSelf) {
      this.sendReadReceipt(message.id);
    }

    this.config.onMessageReceived(message);
  };

  private handleEncryptedMessage = async (data: MessageData) => {
    if (!this.config) return;

    try {
      // Decrypt the message
      const decryptedContent = await cryptoService.decryptMessage(data.encryptedContent || '');

      const message: Message = {
        id: data.messageId || Date.now().toString(),
        content: decryptedContent,
        sender: data.sender || '',
        timestamp: data.timestamp || Date.now(),
        isSelf: data.sender === this.currentUser,
        status: 'delivered',
        isRead: false,
        readBy: [],
        isEncrypted: true
      };

      // Send delivery confirmation
      this.sendDeliveryConfirmation(message.id);

      // Send read receipt if enabled and message is not from self
      if (this.config.showReadReceipts && !message.isSelf) {
        this.sendReadReceipt(message.id);
      }

      this.config.onMessageReceived(message);
    } catch (error) {
      console.error('Failed to decrypt message:', error);

      // Still show the message but mark it as having encryption error
      const message: Message = {
        id: data.messageId || Date.now().toString(),
        content: '[Encrypted message - decryption failed]',
        sender: data.sender || '',
        timestamp: data.timestamp || Date.now(),
        isSelf: data.sender === this.currentUser,
        status: 'delivered',
        isRead: false,
        readBy: [],
        isEncrypted: true,
        encryptionError: error instanceof Error ? error.message : 'Decryption failed'
      };

      this.config.onMessageReceived(message);
    }
  };

  private handlePublicKeyReceived = async (data: PublicKeyData) => {
    const { username, publicKey } = data;
    if (username === this.currentUser) return; // Ignore our own key

    try {
      await cryptoService.storeUserPublicKey(username, publicKey);
      this.encryptedUsers.add(username);

      // Update encryption state
      if (this.encryptedUsers.size > 0) {
        this.updateEncryptionState('encrypted');
      }

      console.log(`🔑 Received and stored public key for ${username}`);
    } catch (error) {
      console.error(`Failed to store public key for ${username}:`, error);
    }
  };

  private handlePublicKeyRequested = async (data: UserData) => {
    const { username } = data;
    try {
      // Send our public key to the requesting user
      const publicKey = await cryptoService.getPublicKeyAsString();
      websocketService.sendPublicKey(publicKey);
      console.log(`📤 Sent public key to ${username}`);
    } catch (error) {
      console.error('Failed to send public key:', error);
    }
  };

  private handleMessageDelivered = (data: MessageData) => {
    if (!this.config) return;
    this.config.onMessageStatusUpdate(data.messageId || '', 'delivered');
  };

  private handleMessageRead = (data: MessageData) => {
    if (!this.config) return;
    this.config.onMessageStatusUpdate(data.messageId || '', 'read');
  };

  private handleUserJoined = (data: UserData) => {
    if (!this.config) return;
    this.config.onUserJoined(data.user || '');
  };

  private handleUserLeft = (data: UserData) => {
    if (!this.config) return;
    this.config.onUserLeft(data.user || '');
  };

  private handleUserList = (data: UserData) => {
    if (!this.config) return;
    this.config.onUserListUpdate(data.users || []);
  };

  private handleConnectionStatus = (data: ConnectionStatusData) => {
    if (!this.config) return;
    // Map WebSocket status to our connection states
    let status: import('../components/ConnectionStatusIndicator').ConnectionStatus = 'disconnected';
    if (data.status === 'connected' || data.connected === true) {
      status = 'connected';
    } else if (data.status === 'connecting') {
      status = 'connecting';
    } else {
      status = 'disconnected';
    }
    this.config.onConnectionStatusChange(status);
  };

  async sendMessage(content: string, recipient?: string): Promise<{ messageId: string; isEncrypted: boolean }> {
    const messageId = Date.now().toString();
    let isEncrypted = false;

    if (recipient && cryptoService.hasPublicKeyFor(recipient)) {
      // Send encrypted message
      try {
        const encryptedContent = await cryptoService.encryptMessage(content, recipient);
        websocketService.sendEncryptedMessage(encryptedContent, recipient, messageId);
        isEncrypted = true;
        console.log(`🔒 Sent encrypted message to ${recipient}`);
      } catch (error) {
        console.error('Encryption failed, sending as plain text:', error);
        // Fall back to plain text
        this.sendPlainTextMessage(content, recipient, messageId);
      }
    } else {
      // Send plain text message
      this.sendPlainTextMessage(content, recipient, messageId);
    }

    return { messageId, isEncrypted };
  }

  private sendPlainTextMessage(content: string, recipient?: string, messageId?: string) {
    const finalMessageId = messageId || Date.now().toString();
    websocketService.send({
      type: 'message',
      data: {
        content,
        recipient,
        messageId: finalMessageId,
        requireReadReceipt: this.config?.showReadReceipts || false
      },
      timestamp: Date.now()
    });
    return finalMessageId;
  }

  sendDeliveryConfirmation(messageId: string) {
    websocketService.send({
      type: 'message_delivered',
      data: { messageId },
      timestamp: Date.now()
    });
  }

  sendReadReceipt(messageId: string) {
    if (!this.config?.showReadReceipts) return;

    websocketService.send({
      type: 'message_read',
      data: { messageId },
      timestamp: Date.now()
    });
  }

  connect() {
    return websocketService.connect();
  }

  disconnect() {
    websocketService.disconnect();
  }

  requestUserList() {
    websocketService.requestUserList();
  }

  get isConnected() {
    return websocketService.isConnected;
  }

  getCurrentEncryptionState(): EncryptionState {
    return this.encryptionState;
  }

  getEncryptedUsers(): string[] {
    return Array.from(this.encryptedUsers);
  }

  canEncryptFor(username: string): boolean {
    return cryptoService.hasPublicKeyFor(username);
  }
}

export const messageService = new MessageService();