export type VoiceWsCallbacks = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: Event) => void;
  onMessage?: (data: unknown) => void;
};

export type VoiceWsClientOpts = {
  url: string;
  callbacks: VoiceWsCallbacks;
};

export type VoiceWsClient = {
  connect: () => void;
  close: () => void;
  sendJson: (obj: object) => void;
  sendBinary: (buffer: ArrayBuffer) => void;
};

export function createVoiceWsClient(opts: VoiceWsClientOpts): VoiceWsClient {
  const { url, callbacks } = opts;
  let ws: WebSocket | null = null;

  function connect() {
    if (typeof window === 'undefined') return;
    try {
      ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => callbacks.onOpen?.();
      ws.onclose = () => callbacks.onClose?.();
      ws.onerror = (e) => callbacks.onError?.(e);
      ws.onmessage = (event: MessageEvent<string | ArrayBuffer>) => {
        if (typeof event.data === 'string') {
          try {
            const json = JSON.parse(event.data) as unknown;
            callbacks.onMessage?.(json);
          } catch (_) {
            callbacks.onMessage?.(event.data);
          }
        } else {
          callbacks.onMessage?.({ type: 'tts_audio', payload: { data: event.data } });
        }
      };
    } catch (e) {
      callbacks.onError?.(e instanceof Event ? e : new Event('error'));
    }
  }

  function close() {
    if (ws) {
      ws.close();
      ws = null;
    }
    callbacks.onClose?.();
  }

  function sendJson(obj: object) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  function sendBinary(buffer: ArrayBuffer) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(buffer);
    }
  }

  return { connect, close, sendJson, sendBinary };
}
