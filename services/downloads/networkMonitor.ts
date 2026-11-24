import NetInfo, { type NetInfoState, type NetInfoSubscription } from '@react-native-community/netinfo';

export interface NetworkSnapshot {
  isOnline: boolean;
  isWifi: boolean;
}

type NetworkListener = (snapshot: NetworkSnapshot) => void;

let current: NetworkSnapshot = { isOnline: true, isWifi: true };
let unsub: NetInfoSubscription | null = null;
const listeners = new Set<NetworkListener>();

function toSnapshot(state: NetInfoState): NetworkSnapshot {
  const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
  const isWifi = state.type === 'wifi' || state.type === 'ethernet';
  return { isOnline, isWifi };
}

export const networkMonitor = {
  async start(): Promise<NetworkSnapshot> {
    try {
      const state = await NetInfo.fetch();
      current = toSnapshot(state);
    } catch {
      current = { isOnline: true, isWifi: true };
    }

    if (!unsub) {
      unsub = NetInfo.addEventListener((state) => {
        const next = toSnapshot(state);
        const changed = next.isOnline !== current.isOnline || next.isWifi !== current.isWifi;
        current = next;
        if (changed) {
          for (const cb of listeners) cb(next);
        }
      });
    }
    return current;
  },

  getSnapshot(): NetworkSnapshot {
    return current;
  },

  subscribe(cb: NetworkListener): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};
