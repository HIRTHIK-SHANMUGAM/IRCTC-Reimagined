import { create } from 'zustand';

/** Accessibility settings. Persisted locally and applied to <html>. */
interface SettingsState {
  largeText: boolean;
  highContrast: boolean;
  elderMode: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'apply'>>) => void;
  apply: () => void;
}

const KEY = 'irctc-ri:a11y';

function load(): { largeText: boolean; highContrast: boolean; elderMode: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { largeText: false, highContrast: false, elderMode: false, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { largeText: false, highContrast: false, elderMode: false };
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...load(),

  set(patch) {
    set(patch);
    const { largeText, highContrast, elderMode } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify({ largeText, highContrast, elderMode }));
    } catch {
      /* ignore */
    }
    get().apply();
  },

  apply() {
    const { largeText, highContrast, elderMode } = get();
    const root = document.documentElement;
    root.style.setProperty('--ri-scale', elderMode ? '1.2' : largeText ? '1.125' : '1');
    root.dataset.contrast = highContrast ? 'high' : 'normal';
    root.dataset.elder = elderMode ? 'true' : 'false';
  },
}));
