export const BUS_NAME = 'torque_coach_bus';

export type CoachBusEnvelope = {
  type: string;
  ts: number;
  requestId?: string;
  payload: unknown;
};

export type CoachBusHandler = (envelope: CoachBusEnvelope) => void;

export type CoachBus = {
  publish: (type: string, payload: unknown, requestId?: string) => void;
  subscribe: (handler: CoachBusHandler) => () => void;
};

const noop = () => {};
const noopUnsubscribe = () => {};

export function createCoachBus(): CoachBus {
  if (typeof window === 'undefined') {
    return {
      publish: noop,
      subscribe: () => noopUnsubscribe,
    };
  }
  const channel = new BroadcastChannel(BUS_NAME);
  const listeners = new Set<CoachBusHandler>();
  channel.onmessage = (event: MessageEvent<CoachBusEnvelope>) => {
    const envelope = event.data;
    if (envelope && typeof envelope.type === 'string') {
      listeners.forEach((h) => {
        try {
          h(envelope);
        } catch (_) {}
      });
    }
  };
  return {
    publish(type: string, payload: unknown, requestId?: string) {
      try {
        channel.postMessage({
          type,
          ts: Date.now(),
          requestId,
          payload,
        } as CoachBusEnvelope);
      } catch (_) {}
    },
    subscribe(handler: CoachBusHandler) {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
  };
}
