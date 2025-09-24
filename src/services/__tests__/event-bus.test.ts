/**
 * Event Bus Tests
 * 事件匯流排測試 - 實施任務 2.3 的測試
 */

import { EventBus } from '../event-bus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.removeAllListeners();
  });

  describe('Basic Event Handling', () => {
    it('should emit and handle events', async () => {
      const handler = jest.fn();
      const eventData = { photoId: 'photo-123', status: 'uploaded' };

      eventBus.on('photo.uploaded', handler);
      await eventBus.emit('photo.uploaded', eventData);

      expect(handler).toHaveBeenCalledWith(eventData);
    });

    it('should support multiple listeners for the same event', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const eventData = { test: 'data' };

      eventBus.on('test.event', handler1);
      eventBus.on('test.event', handler2);
      await eventBus.emit('test.event', eventData);

      expect(handler1).toHaveBeenCalledWith(eventData);
      expect(handler2).toHaveBeenCalledWith(eventData);
    });

    it('should support once listeners', async () => {
      const handler = jest.fn();
      const eventData = { test: 'data' };

      eventBus.once('test.event', handler);
      await eventBus.emit('test.event', eventData);
      await eventBus.emit('test.event', eventData);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should remove listeners', async () => {
      const handler = jest.fn();
      const eventData = { test: 'data' };

      eventBus.on('test.event', handler);
      eventBus.off('test.event', handler);
      await eventBus.emit('test.event', eventData);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Idempotent Event Processing (Task 2.3)', () => {
    it('should prevent duplicate event processing with event IDs', async () => {
      const handler = jest.fn();
      const eventData = {
        eventId: 'event-123',
        photoId: 'photo-123',
        action: 'process',
      };

      eventBus.on('photo.process', handler);

      // Emit same event twice with same eventId
      await eventBus.emit('photo.process', eventData);
      await eventBus.emit('photo.process', eventData);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should track processed event IDs', async () => {
      const eventData1 = { eventId: 'event-1', data: 'first' };
      const eventData2 = { eventId: 'event-2', data: 'second' };

      const handler = jest.fn();
      eventBus.on('test.event', handler);

      await eventBus.emit('test.event', eventData1);
      await eventBus.emit('test.event', eventData2);
      await eventBus.emit('test.event', eventData1); // Duplicate

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, eventData1);
      expect(handler).toHaveBeenNthCalledWith(2, eventData2);
    });

    it('should cleanup old processed event IDs', async () => {
      const oldEventData = {
        eventId: 'old-event',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };

      const handler = jest.fn();
      eventBus.on('test.event', handler);

      await eventBus.emit('test.event', oldEventData);

      // Trigger cleanup
      await eventBus.cleanupProcessedEvents();

      // Should be able to process again after cleanup
      await eventBus.emit('test.event', oldEventData);

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Ordering and Reliability', () => {
    it('should process events in order', async () => {
      const processedEvents: number[] = [];
      const handler = jest.fn(data => {
        processedEvents.push(data.order);
      });

      eventBus.on('ordered.event', handler);

      // Emit events in sequence
      for (let i = 1; i <= 5; i++) {
        await eventBus.emit('ordered.event', { order: i });
      }

      expect(processedEvents).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle async event handlers', async () => {
      const results: string[] = [];

      const asyncHandler1 = async (data: any) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        results.push(`handler1-${data.id}`);
      };

      const asyncHandler2 = async (data: any) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        results.push(`handler2-${data.id}`);
      };

      eventBus.on('async.event', asyncHandler1);
      eventBus.on('async.event', asyncHandler2);

      await eventBus.emit('async.event', { id: 'test' });

      expect(results).toContain('handler1-test');
      expect(results).toContain('handler2-test');
    });

    it('should handle event handler errors gracefully', async () => {
      const workingHandler = jest.fn();
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });

      eventBus.on('error.event', workingHandler);
      eventBus.on('error.event', errorHandler);

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      await eventBus.emit('error.event', { test: 'data' });

      expect(workingHandler).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event handler error'),
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });
  });

  describe('Event Patterns and Filtering', () => {
    it('should support wildcard event patterns', async () => {
      const handler = jest.fn();

      eventBus.on('photo.*', handler);

      await eventBus.emit('photo.uploaded', { id: '1' });
      await eventBus.emit('photo.processed', { id: '2' });
      await eventBus.emit('photo.deleted', { id: '3' });
      await eventBus.emit('album.created', { id: '4' });

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should support event filtering', async () => {
      const handler = jest.fn();

      eventBus.on('photo.updated', handler, {
        filter: data => data.projectId === 'project-1',
      });

      await eventBus.emit('photo.updated', {
        photoId: '1',
        projectId: 'project-1',
      });
      await eventBus.emit('photo.updated', {
        photoId: '2',
        projectId: 'project-2',
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        photoId: '1',
        projectId: 'project-1',
      });
    });

    it('should support event priority', async () => {
      const results: string[] = [];

      const lowPriorityHandler = (data: any) => results.push('low');
      const highPriorityHandler = (data: any) => results.push('high');
      const normalPriorityHandler = (data: any) => results.push('normal');

      eventBus.on('priority.event', lowPriorityHandler, { priority: 1 });
      eventBus.on('priority.event', highPriorityHandler, { priority: 10 });
      eventBus.on('priority.event', normalPriorityHandler, { priority: 5 });

      await eventBus.emit('priority.event', {});

      expect(results).toEqual(['high', 'normal', 'low']);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high frequency events efficiently', async () => {
      const handler = jest.fn();
      eventBus.on('high.frequency', handler);

      const startTime = Date.now();

      // Emit 1000 events
      for (let i = 0; i < 1000; i++) {
        await eventBus.emit('high.frequency', { id: i });
      }

      const duration = Date.now() - startTime;

      expect(handler).toHaveBeenCalledTimes(1000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should limit memory usage with event history', async () => {
      const handler = jest.fn();
      eventBus.on('memory.test', handler);

      // Emit many events to test memory management
      for (let i = 0; i < 10000; i++) {
        await eventBus.emit('memory.test', {
          eventId: `event-${i}`,
          largeData: 'x'.repeat(1000), // 1KB per event
        });
      }

      const memoryStats = eventBus.getMemoryStats();

      expect(memoryStats.processedEventsCount).toBeLessThan(5000); // Should cleanup old events
      expect(memoryStats.estimatedMemoryUsage).toBeLessThan(10 * 1024 * 1024); // < 10MB
    });

    it('should support batch event emission', async () => {
      const handler = jest.fn();
      eventBus.on('batch.event', handler);

      const events = Array.from({ length: 100 }, (_, i) => ({
        eventName: 'batch.event',
        data: { id: i, timestamp: new Date() },
      }));

      await eventBus.emitBatch(events);

      expect(handler).toHaveBeenCalledTimes(100);
    });
  });

  describe('Monitoring and Debugging', () => {
    it('should provide event statistics', async () => {
      const handler = jest.fn();
      eventBus.on('stats.event', handler);

      for (let i = 0; i < 5; i++) {
        await eventBus.emit('stats.event', { id: i });
      }

      const stats = eventBus.getStatistics();

      expect(stats).toMatchObject({
        totalEventsEmitted: expect.any(Number),
        totalEventsProcessed: expect.any(Number),
        eventTypes: expect.objectContaining({
          'stats.event': 5,
        }),
        averageProcessingTime: expect.any(Number),
      });
    });

    it('should track slow event handlers', async () => {
      const slowHandler = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      };

      eventBus.on('slow.event', slowHandler);
      await eventBus.emit('slow.event', {});

      const slowHandlers = eventBus.getSlowHandlers(100); // Handlers taking > 100ms

      expect(slowHandlers).toHaveLength(1);
      expect(slowHandlers[0]).toMatchObject({
        eventName: 'slow.event',
        avgProcessingTime: expect.any(Number),
        callCount: 1,
      });
    });

    it('should support event debugging', async () => {
      const debugHandler = jest.fn();

      eventBus.enableDebugMode();
      eventBus.on('debug.event', debugHandler);

      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();

      await eventBus.emit('debug.event', { test: 'data' });

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Event emitted: debug.event'),
        expect.any(Object)
      );

      debugSpy.mockRestore();
    });
  });
});
