/**
 * Event Bus Implementation
 * 事件匯流排實作 - 實施任務 2.3
 */

export interface EventHandler<T = any> {
  (data: T): void | Promise<void>;
}

export interface EventOptions {
  filter?: (data: any) => boolean;
  priority?: number;
  once?: boolean;
}

export interface EventStatistics {
  totalEventsEmitted: number;
  totalEventsProcessed: number;
  eventTypes: Record<string, number>;
  averageProcessingTime: number;
}

export interface SlowHandler {
  eventName: string;
  avgProcessingTime: number;
  callCount: number;
}

export interface MemoryStats {
  processedEventsCount: number;
  estimatedMemoryUsage: number;
}

interface EventListener {
  handler: EventHandler;
  options: EventOptions;
  callCount: number;
  totalProcessingTime: number;
}

interface BatchEvent {
  eventName: string;
  data: any;
}

export class EventBus {
  private listeners: Map<string, EventListener[]> = new Map();
  private processedEventIds: Map<string, Date> = new Map();
  private eventStats: Map<string, { count: number; totalTime: number }> =
    new Map();
  private debugMode = false;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_PROCESSED_EVENTS = 10000;

  constructor() {
    // Periodic cleanup of old processed events
    setInterval(() => {
      this.cleanupProcessedEvents();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Subscribe to an event
   */
  on<T = any>(
    eventName: string,
    handler: EventHandler<T>,
    options: EventOptions = {}
  ): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    const listener: EventListener = {
      handler,
      options,
      callCount: 0,
      totalProcessingTime: 0,
    };

    const listeners = this.listeners.get(eventName)!;
    listeners.push(listener);

    // Sort by priority (higher priority first)
    listeners.sort(
      (a, b) => (b.options.priority || 0) - (a.options.priority || 0)
    );

    if (this.debugMode) {
      console.debug(`Event listener registered: ${eventName}`, { options });
    }
  }

  /**
   * Subscribe to an event once
   */
  once<T = any>(
    eventName: string,
    handler: EventHandler<T>,
    options: EventOptions = {}
  ): void {
    this.on(eventName, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   */
  off<T = any>(eventName: string, handler: EventHandler<T>): void {
    const listeners = this.listeners.get(eventName);
    if (!listeners) return;

    const index = listeners.findIndex(listener => listener.handler === handler);
    if (index >= 0) {
      listeners.splice(index, 1);
    }

    if (listeners.length === 0) {
      this.listeners.delete(eventName);
    }

    if (this.debugMode) {
      console.debug(`Event listener removed: ${eventName}`);
    }
  }

  /**
   * Emit an event
   */
  async emit<T = any>(eventName: string, data: T): Promise<void> {
    // Check for idempotency
    if (this.isEventProcessed(data)) {
      if (this.debugMode) {
        console.debug(`Duplicate event ignored: ${eventName}`, data);
      }
      return;
    }

    this.markEventAsProcessed(data);

    if (this.debugMode) {
      console.debug(`Event emitted: ${eventName}`, data);
    }

    // Update statistics
    const stats = this.eventStats.get(eventName) || { count: 0, totalTime: 0 };
    stats.count++;

    const startTime = Date.now();

    // Get matching listeners (including wildcard patterns)
    const listeners = this.getMatchingListeners(eventName);

    // Process listeners in priority order
    for (const listener of listeners) {
      try {
        // Apply filter if provided
        if (listener.options.filter && !listener.options.filter(data)) {
          continue;
        }

        const handlerStartTime = Date.now();

        // Execute handler
        await listener.handler(data);

        const handlerDuration = Date.now() - handlerStartTime;

        // Update listener statistics
        listener.callCount++;
        listener.totalProcessingTime += handlerDuration;

        // Remove once listeners
        if (listener.options.once) {
          this.off(eventName, listener.handler);
        }
      } catch (error) {
        console.error(`Event handler error for ${eventName}:`, error);
        // Continue processing other handlers
      }
    }

    const totalDuration = Date.now() - startTime;
    stats.totalTime += totalDuration;
    this.eventStats.set(eventName, stats);
  }

  /**
   * Emit multiple events in batch
   */
  async emitBatch(events: BatchEvent[]): Promise<void> {
    const promises = events.map(event =>
      this.emit(event.eventName, event.data)
    );
    await Promise.all(promises);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
    this.processedEventIds.clear();
    this.eventStats.clear();

    if (this.debugMode) {
      console.debug('All event listeners removed');
    }
  }

  /**
   * Enable debug mode
   */
  enableDebugMode(): void {
    this.debugMode = true;
  }

  /**
   * Disable debug mode
   */
  disableDebugMode(): void {
    this.debugMode = false;
  }

  /**
   * Get event statistics
   */
  getStatistics(): EventStatistics {
    let totalEventsEmitted = 0;
    let totalEventsProcessed = 0;
    let totalProcessingTime = 0;
    const eventTypes: Record<string, number> = {};

    for (const [eventName, stats] of this.eventStats) {
      totalEventsEmitted += stats.count;
      totalEventsProcessed += stats.count;
      totalProcessingTime += stats.totalTime;
      eventTypes[eventName] = stats.count;
    }

    return {
      totalEventsEmitted,
      totalEventsProcessed,
      eventTypes,
      averageProcessingTime:
        totalEventsProcessed > 0
          ? totalProcessingTime / totalEventsProcessed
          : 0,
    };
  }

  /**
   * Get slow event handlers
   */
  getSlowHandlers(thresholdMs: number): SlowHandler[] {
    const slowHandlers: SlowHandler[] = [];

    for (const [eventName, listeners] of this.listeners) {
      for (const listener of listeners) {
        if (listener.callCount > 0) {
          const avgTime = listener.totalProcessingTime / listener.callCount;
          if (avgTime > thresholdMs) {
            slowHandlers.push({
              eventName,
              avgProcessingTime: avgTime,
              callCount: listener.callCount,
            });
          }
        }
      }
    }

    return slowHandlers.sort(
      (a, b) => b.avgProcessingTime - a.avgProcessingTime
    );
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats {
    const processedEventsCount = this.processedEventIds.size;
    const estimatedMemoryUsage = processedEventsCount * 100; // Rough estimate: 100 bytes per event ID

    return {
      processedEventsCount,
      estimatedMemoryUsage,
    };
  }

  /**
   * Cleanup old processed events
   */
  async cleanupProcessedEvents(): Promise<void> {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - this.CLEANUP_INTERVAL);

    for (const [eventId, timestamp] of this.processedEventIds) {
      if (timestamp < cutoffTime) {
        this.processedEventIds.delete(eventId);
      }
    }

    // Limit the number of stored event IDs
    if (this.processedEventIds.size > this.MAX_PROCESSED_EVENTS) {
      const sortedEntries = Array.from(this.processedEventIds.entries()).sort(
        ([, a], [, b]) => a.getTime() - b.getTime()
      );

      const toDelete = sortedEntries.slice(
        0,
        this.processedEventIds.size - this.MAX_PROCESSED_EVENTS
      );
      for (const [eventId] of toDelete) {
        this.processedEventIds.delete(eventId);
      }
    }

    if (this.debugMode) {
      console.debug(
        `Cleaned up processed events. Remaining: ${this.processedEventIds.size}`
      );
    }
  }

  // Private methods

  private isEventProcessed(data: any): boolean {
    if (!data || typeof data !== 'object' || !data.eventId) {
      return false;
    }

    return this.processedEventIds.has(data.eventId);
  }

  private markEventAsProcessed(data: any): void {
    if (data && typeof data === 'object' && data.eventId) {
      this.processedEventIds.set(data.eventId, new Date());
    }
  }

  private getMatchingListeners(eventName: string): EventListener[] {
    const listeners: EventListener[] = [];

    // Exact match
    const exactListeners = this.listeners.get(eventName);
    if (exactListeners) {
      listeners.push(...exactListeners);
    }

    // Wildcard patterns
    for (const [pattern, patternListeners] of this.listeners) {
      if (pattern.includes('*') && this.matchesPattern(eventName, pattern)) {
        listeners.push(...patternListeners);
      }
    }

    // Sort by priority
    return listeners.sort(
      (a, b) => (b.options.priority || 0) - (a.options.priority || 0)
    );
  }

  private matchesPattern(eventName: string, pattern: string): boolean {
    if (!pattern.includes('*')) {
      return eventName === pattern;
    }

    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventName);
  }
}
