/**
 * Realtime Preparation Service
 * Prepares infrastructure for real-time synchronization with external APIs
 */

import { eventBusService } from './eventBusService';
import { syncQueueService } from './syncQueueService';

export interface RealtimeConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
}

export interface ConnectionStatus {
  connected: boolean;
  lastConnected?: string;
  lastDisconnected?: string;
  reconnectAttempts: number;
  latency?: number;
}

class RealtimePreparationService {
  private config: RealtimeConfig = {
    enabled: false,
    reconnectAttempts: 5,
    reconnectDelay: 3000,
    heartbeatInterval: 30000,
  };

  private status: ConnectionStatus = {
    connected: false,
    reconnectAttempts: 0,
  };

  private websocket?: WebSocket;
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;

  /**
   * Initialize realtime service with configuration
   */
  async initialize(config: Partial<RealtimeConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    if (this.config.enabled && this.config.endpoint) {
      console.log('🔌 Initializing real-time connection...');
      await this.connect();
    }
  }

  /**
   * Connect to realtime endpoint (placeholder for actual WebSocket connection)
   */
  private async connect(): Promise<void> {
    if (!this.config.endpoint) {
      console.warn('⚠️ No realtime endpoint configured');
      return;
    }

    try {
      // This is a placeholder - actual WebSocket connection would be implemented here
      console.log(`🔌 Connecting to ${this.config.endpoint}...`);

      // Simulate connection for now
      this.status.connected = true;
      this.status.lastConnected = new Date().toISOString();
      this.status.reconnectAttempts = 0;

      eventBusService.emit('realtime:connected', { status: this.status });

      // Start heartbeat
      this.startHeartbeat();

      // Setup message handlers
      this.setupMessageHandlers();

      console.log('✅ Real-time connection established');
    } catch (error) {
      console.error('❌ Real-time connection failed:', error);
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from realtime endpoint
   */
  async disconnect(): Promise<void> {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    this.status.connected = false;
    this.status.lastDisconnected = new Date().toISOString();

    eventBusService.emit('realtime:disconnected', { status: this.status });
    console.log('🔌 Real-time connection closed');
  }

  /**
   * Setup message handlers for incoming realtime events
   */
  private setupMessageHandlers(): void {
    // Listen for entity changes from other clients
    eventBusService.on('realtime:message', (message) => {
      this.handleIncomingMessage(message);
    });
  }

  /**
   * Handle incoming realtime messages
   */
  private handleIncomingMessage(message: any): void {
    console.log('📨 Received realtime message:', message);

    const { type, entity_type, entity_id, payload } = message;

    switch (type) {
      case 'entity:created':
      case 'entity:updated':
      case 'entity:deleted':
        eventBusService.emit(type, {
          entityType: entity_type,
          entityId: entity_id,
          payload,
          source: 'remote',
        });
        break;

      case 'sync:conflict':
        eventBusService.emit('sync:conflict', {
          entityType: entity_type,
          entityId: entity_id,
          conflict: payload,
        });
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  }

  /**
   * Send message to realtime endpoint
   */
  async sendMessage(message: any): Promise<void> {
    if (!this.status.connected) {
      console.warn('⚠️ Cannot send message: Not connected');
      // Queue for later sending
      await syncQueueService.enqueue(
        message.entity_type,
        message.entity_id,
        message.operation,
        message.payload,
        message.priority || 'medium'
      );
      return;
    }

    try {
      // Placeholder for actual WebSocket send
      console.log('📤 Sending realtime message:', message);
      
      // In actual implementation:
      // this.websocket?.send(JSON.stringify(message));
    } catch (error) {
      console.error('❌ Failed to send realtime message:', error);
      // Queue for retry
      await syncQueueService.enqueue(
        message.entity_type,
        message.entity_id,
        message.operation,
        message.payload,
        message.priority || 'medium'
      );
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.status.connected) {
        // Send heartbeat
        console.log('💓 Heartbeat');
        // In actual implementation:
        // this.websocket?.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Handle connection errors and implement reconnect logic
   */
  private handleConnectionError(error: Error): void {
    this.status.connected = false;
    this.status.lastDisconnected = new Date().toISOString();

    eventBusService.emit('realtime:error', { error, status: this.status });

    // Attempt reconnection
    if (this.status.reconnectAttempts < this.config.reconnectAttempts) {
      this.status.reconnectAttempts++;
      
      const delay = this.config.reconnectDelay * this.status.reconnectAttempts;
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.status.reconnectAttempts}/${this.config.reconnectAttempts})...`);

      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('🚫 Max reconnection attempts reached');
      eventBusService.emit('realtime:reconnect_failed', { status: this.status });
    }
  }

  /**
   * Get connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status.connected;
  }

  /**
   * Format message for sending
   */
  formatMessage(
    type: string,
    entityType: string,
    entityId: string,
    payload: any
  ): any {
    return {
      type,
      entity_type: entityType,
      entity_id: entityId,
      payload,
      timestamp: new Date().toISOString(),
      client_id: this.getClientId(),
    };
  }

  /**
   * Get unique client ID for this session
   */
  private getClientId(): string {
    let clientId = sessionStorage.getItem('realtime_client_id');
    
    if (!clientId) {
      clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('realtime_client_id', clientId);
    }

    return clientId;
  }
}

export const realtimePreparationService = new RealtimePreparationService();
