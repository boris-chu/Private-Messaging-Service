import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type ChatTheme = 'terminal' | 'imessage';
export type ColorMode = 'light' | 'dark';

interface PrivacySettings {
  showReadReceipts: boolean;
  showOnlineStatus: boolean;
}

interface ThemeContextType {
  chatTheme: ChatTheme;
  setChatTheme: (theme: ChatTheme) => void;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  privacySettings: PrivacySettings;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [chatTheme, setChatTheme] = useState<ChatTheme>(() => {
    const saved = localStorage.getItem('axol-chat-theme');
    return (saved as ChatTheme) || 'terminal';
  });

  const [colorMode, setColorMode] = useState<ColorMode>(() => {
    const saved = localStorage.getItem('axol-color-mode');
    return (saved as ColorMode) || 'light';
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(() => {
    const saved = localStorage.getItem('axol-privacy-settings');
    return saved ? JSON.parse(saved) : {
      showReadReceipts: true,
      showOnlineStatus: true
    };
  });

  const updateChatTheme = (theme: ChatTheme) => {
    setChatTheme(theme);
    localStorage.setItem('axol-chat-theme', theme);
  };

  const updateColorMode = (mode: ColorMode) => {
    setColorMode(mode);
    localStorage.setItem('axol-color-mode', mode);
  };

  const updatePrivacySettings = (newSettings: Partial<PrivacySettings>) => {
    const updated = { ...privacySettings, ...newSettings };
    setPrivacySettings(updated);
    localStorage.setItem('axol-privacy-settings', JSON.stringify(updated));
  };

  return (
    <ThemeContext.Provider value={{
      chatTheme,
      setChatTheme: updateChatTheme,
      colorMode,
      setColorMode: updateColorMode,
      privacySettings,
      updatePrivacySettings
    }}>
      {children}
    </ThemeContext.Provider>
  );
};