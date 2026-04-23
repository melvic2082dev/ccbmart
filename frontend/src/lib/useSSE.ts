import { useEffect, useRef, useCallback } from 'react';

export type SSEEventPayload = {
  type: string;
  data: unknown;
};

export type SSEOptions = {
  /** Called on each SSE event (or poll tick for polling fallback) */
  onEvent?: (event: SSEEventPayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  /** Polling interval in ms used as fallback when SSE is unavailable (default: 60000) */
  pollIntervalMs?: number;
  /** Set false to disable the connection entirely (e.g. when user is not logged in) */
  enabled?: boolean;
};

/**
 * useSSE — subscribes to the backend /api/events SSE stream.
 * Falls back to interval polling if EventSource is unavailable or disconnects.
 * Automatically reconnects after disconnect with 5-second backoff.
 */
export function useSSE(url: string, options: SSEOptions = {}) {
  const {
    onEvent,
    onConnect,
    onDisconnect,
    pollIntervalMs = 60000,
    enabled = true,
  } = options;

  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current || !onEvent) return;
    pollRef.current = setInterval(() => {
      if (isMounted.current) onEvent({ type: 'poll', data: null });
    }, pollIntervalMs);
  }, [onEvent, pollIntervalMs]);

  const connect = useCallback(() => {
    if (!enabled || !isMounted.current) return;

    if (typeof EventSource === 'undefined') {
      startPolling();
      return;
    }

    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      if (!isMounted.current) return;
      stopPolling();
      onConnect?.();
    };

    es.onmessage = (event) => {
      if (!isMounted.current) return;
      try {
        const parsed = JSON.parse(event.data) as Record<string, unknown>;
        onEvent?.({ type: (parsed.type as string) || 'message', data: parsed });
      } catch {
        onEvent?.({ type: 'message', data: event.data });
      }
    };

    const namedEvents = [
      'transaction:new',
      'commission:calculated',
      'config:changed',
    ] as const;

    namedEvents.forEach((eventName) => {
      es.addEventListener(eventName, (e: Event) => {
        if (!isMounted.current) return;
        const msgEvent = e as MessageEvent;
        try {
          onEvent?.({ type: eventName, data: JSON.parse(msgEvent.data) });
        } catch {
          onEvent?.({ type: eventName, data: msgEvent.data });
        }
      });
    });

    es.onerror = () => {
      if (!isMounted.current) return;
      es.close();
      esRef.current = null;
      onDisconnect?.();
      startPolling();
      // Reconnect after 5 seconds
      reconnectRef.current = setTimeout(() => {
        if (!isMounted.current) return;
        stopPolling();
        connect();
      }, 5000);
    };
  }, [url, enabled, onEvent, onConnect, onDisconnect, startPolling, stopPolling]);

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      esRef.current?.close();
      esRef.current = null;
      stopPolling();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect, stopPolling]);
}
