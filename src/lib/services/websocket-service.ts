/**
 * WebSocket 服務 (簡化實作)
 * 用於即時進度追蹤
 */

export interface WebSocketService {
  subscribe(
    userId: string,
    channel: string,
    callback: (data: any) => void
  ): Promise<void>;
  unsubscribe(userId: string, channel: string): Promise<void>;
  emit(userId: string, event: string, data: any): Promise<void>;
  getConnectedUsers(): string[];
}

export class SimpleWebSocketService implements WebSocketService {
  private connections: Map<string, any> = new Map();
  private subscriptions: Map<string, Map<string, (data: any) => void>> =
    new Map();

  async subscribe(
    userId: string,
    channel: string,
    callback: (data: any) => void
  ): Promise<void> {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Map());
    }
    this.subscriptions.get(userId)!.set(channel, callback);
  }

  async unsubscribe(userId: string, channel: string): Promise<void> {
    if (this.subscriptions.has(userId)) {
      this.subscriptions.get(userId)!.delete(channel);
    }
  }

  async emit(userId: string, event: string, data: any): Promise<void> {
    // 在真實實作中，這裡會通過 WebSocket 連線發送資料
    // 現在只是模擬
    console.log(`Emitting to ${userId}: ${event}`, data);
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connections.keys());
  }
}
