import { io, Socket } from 'socket.io-client';
import type { WsEvent } from '@lifehub/types';

const WS_URL = import.meta.env.VITE_WS_URL || '';

type EventHandler = (data: unknown) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private handlers = new Map<WsEvent, Set<EventHandler>>();

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket'],
    });

    const events: WsEvent[] = [
      'notification',
      'event_updated',
      'task_updated',
      'expense_updated',
      'connection_updated',
    ];

    for (const event of events) {
      this.socket.on(event, (data: unknown) => {
        this.handlers.get(event)?.forEach((handler) => handler(data));
      });
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: WsEvent, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }
}

export const wsClient = new WebSocketClient();
