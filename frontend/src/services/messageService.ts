import { websocketService } from './websocketService';

export type MessageStatus = 'sending' | 'delivered' | 'read';

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
  isSelf: boolean;
  status?: MessageStatus;
  isRead?: boolean;
  readBy?: string[];
}

export interface MessageServiceConfig {
  showReadReceipts: boolean;
  showOnlineStatus: boolean;
  onMessageReceived: (message: Message) => void;
  onMessageStatusUpdate: (messageId: string, status: MessageStatus) => void;
  onUserJoined: (user: string) => void;
  onUserLeft: (user: string) => void;
  onUserListUpdate: (users: string[]) => void;
  onConnectionStatusChange: (connected: boolean) => void;
}

class MessageService {
  private config: MessageServiceConfig | null = null;
  private currentUser: string = '';

  initialize(config: MessageServiceConfig) {
    this.config = config;
    this.currentUser = JSON.parse(localStorage.getItem('user') || '{"username":"guest"}').username;

    // Set up WebSocket listeners
    websocketService.on('message', this.handleMessage);
    websocketService.on('message_delivered', this.handleMessageDelivered);
    websocketService.on('message_read', this.handleMessageRead);
    websocketService.on('user_joined', this.handleUserJoined);
    websocketService.on('user_left', this.handleUserLeft);
    websocketService.on('user_list', this.handleUserList);
    websocketService.on('connection_status', this.handleConnectionStatus);
  }

  cleanup() {
    websocketService.off('message', this.handleMessage);
    websocketService.off('message_delivered', this.handleMessageDelivered);
    websocketService.off('message_read', this.handleMessageRead);
    websocketService.off('user_joined', this.handleUserJoined);
    websocketService.off('user_left', this.handleUserLeft);
    websocketService.off('user_list', this.handleUserList);
    websocketService.off('connection_status', this.handleConnectionStatus);
    this.config = null;
  }

  private handleMessage = (data: any) => {
    if (!this.config) return;

    const message: Message = {
      id: data.messageId || Date.now().toString(),
      content: data.content,
      sender: data.sender,
      timestamp: data.timestamp,
      isSelf: data.sender === this.currentUser,
      status: 'delivered',
      isRead: false,
      readBy: []
    };

    // Send delivery confirmation
    this.sendDeliveryConfirmation(message.id);

    // Send read receipt if enabled and message is not from self
    if (this.config.showReadReceipts && !message.isSelf) {
      this.sendReadReceipt(message.id);
    }

    this.config.onMessageReceived(message);
  };

  private handleMessageDelivered = (data: any) => {
    if (!this.config) return;
    this.config.onMessageStatusUpdate(data.messageId, 'delivered');
  };

  private handleMessageRead = (data: any) => {
    if (!this.config) return;
    this.config.onMessageStatusUpdate(data.messageId, 'read');
  };

  private handleUserJoined = (data: any) => {
    if (!this.config) return;
    this.config.onUserJoined(data.user);
  };

  private handleUserLeft = (data: any) => {
    if (!this.config) return;
    this.config.onUserLeft(data.user);
  };

  private handleUserList = (data: any) => {
    if (!this.config) return;
    this.config.onUserListUpdate(data.users || []);
  };

  private handleConnectionStatus = (data: any) => {
    if (!this.config) return;
    this.config.onConnectionStatusChange(data.status === 'connected');
  };

  sendMessage(content: string, recipient?: string) {
    const messageId = Date.now().toString();
    websocketService.send({
      type: 'message',
      data: {
        content,
        recipient,
        messageId,
        requireReadReceipt: this.config?.showReadReceipts || false
      },
      timestamp: Date.now()
    });
    return messageId;
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
}

export const messageService = new MessageService();