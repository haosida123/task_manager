// App-wide settings (stored in the database). Fetched once and shared so the
// masthead tagline and the dashboard title can be edited in place and persisted.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api';
import type { Settings } from '../types';

interface SettingsContextValue {
  settings: Settings | null;
  patch: (p: Partial<Settings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: null,
  patch: async () => {},
});

function pick(s: Settings): Settings {
  return { backupDir: s.backupDir, brandLine: s.brandLine, portfolioTitle: s.portfolioTitle };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    void api
      .getSettings()
      .then((s) => setSettings(pick(s)))
      .catch(() => {
        /* settings are optional; the UI falls back to defaults */
      });
  }, []);

  const patch = useCallback(async (p: Partial<Settings>) => {
    const res = await api.updateSettings(p);
    setSettings(pick(res));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, patch }}>{children}</SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  return useContext(SettingsContext);
}
