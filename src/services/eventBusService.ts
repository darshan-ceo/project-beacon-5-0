/**
 * Event Bus Service
 * Central event dispatcher for data changes and application events
 */

export type EventType =
  | 'entity:created'
  | 'entity:updated'
  | 'entity:deleted'
  | 'sync:queued'
  | 'sync:completed'
  | 'sync:failed'
  | 'sync:conflict'
  | 'network:online'
  | 'network:offline'
  | string; // Allow custom event types

export type EventHandler = (data: any) => void;

class EventBusService {
  private listeners: Map<EventType, Set<EventHandler>> = new Map();
  private eventHistory: Array<{ type: EventType; data: any; timestamp: string }> = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to an event
   */
  on(eventType: EventType, handler: EventHandler): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => this.off(eventType, handler);
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType: EventType, handler: EventHandler): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Emit an event
   */
  emit(eventType: EventType, data: any): void {
    // Add to history
    this.eventHistory.push({
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    });

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify all listeners
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }

    // Also emit to wildcard listeners
    const wildcardHandlers = this.listeners.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler({ type: eventType, data });
        } catch (error) {
          console.error('Error in wildcard event handler:', error);
        }
      });
    }
  }

  /**
   * Emit event once (shorthand for on + immediate off)
   */
  once(eventType: EventType, handler: EventHandler): () => void {
    const wrappedHandler = (data: any) => {
      handler(data);
      this.off(eventType, wrappedHandler);
    };

    return this.on(eventType, wrappedHandler);
  }

  /**
   * Clear all listeners for an event type
   */
  clearListeners(eventType?: EventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get event history
   */
  getEventHistory(
    eventType?: EventType,
    limit?: number
  ): Array<{ type: EventType; data: any; timestamp: string }> {
    let history = this.eventHistory;

    if (eventType) {
      history = history.filter(event => event.type === eventType);
    }

    if (limit) {
      history = history.slice(-limit);
    }

    return history;
  }

  /**
   * Get active listener count
   */
  getListenerCount(eventType?: EventType): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size || 0;
    }

    let total = 0;
    this.listeners.forEach(handlers => {
      total += handlers.size;
    });
    return total;
  }

  /**
   * Get all active event types
   */
  getActiveEventTypes(): EventType[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Debug: Log all events
   */
  enableDebugMode(): () => void {
    const unsubscribe = this.on('*', ({ type, data }) => {
      console.log(`[EventBus] ${type}:`, data);
    });

    console.log('🐛 Event Bus debug mode enabled');
    return unsubscribe;
  }
}

export const eventBusService = new EventBusService();
