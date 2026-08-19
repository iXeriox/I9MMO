// Minimal typed-message WebSocket client.
// Server sends/receives { type, payload } JSON frames — see server/src/index.js.

const WS_URL = 'wss://backend.infini9.net:8443';

export function createGameSocket() {
  const listeners = new Map();
  let ws = null;
  let shouldReconnect = true;
  let reconnectDelay = 1000;

  function on(type, fn) {
    if (!listeners.has(type)) {
      listeners.set(type, new Set());
    }

    listeners.get(type).add(fn);

    return () => {
      listeners.get(type)?.delete(fn);
    };
  }

  function emit(type, payload) {
    listeners.get(type)?.forEach((fn) => {
      fn(payload);
    });
  }

  function send(type, payload) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type,
        payload
      }));
    }
  }

  function connect() {
    console.log('[socket] connecting:', WS_URL);

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[socket] connected');

      reconnectDelay = 1000;
      emit('_open');
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);

        emit(
            msg.type,
            msg.payload
        );
      } catch (e) {
        console.error(
            '[socket] bad message',
            e
        );
      }
    };

    ws.onclose = (event) => {
      console.warn(
          '[socket] closed',
          event.code,
          event.reason
      );

      emit('_close');

      if (shouldReconnect) {
        setTimeout(
            connect,
            reconnectDelay
        );

        reconnectDelay = Math.min(
            reconnectDelay * 1.5,
            10000
        );
      }
    };

    ws.onerror = (event) => {
      console.error(
          '[socket] websocket error',
          event
      );

      ws.close();
    };
  }

  function close() {
    shouldReconnect = false;
    ws?.close();
  }

  connect();

  return {
    on,
    send,
    close
  };
}