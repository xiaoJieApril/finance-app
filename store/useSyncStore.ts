import { create } from 'zustand';

type SyncStatus = 'synced' | 'syncing' | 'offline';

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  setStatus: (status: SyncStatus) => void;
  setPendingCount: (pendingCount: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'synced',
  pendingCount: 0,
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
}));
