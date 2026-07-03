import { create } from 'zustand';

interface UIState {
  isDarkMode: boolean;
  currency: string;
  toggleDarkMode: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDarkMode: false,
  currency: 'MYR',
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));