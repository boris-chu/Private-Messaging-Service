import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ChatTheme = 'terminal' | 'imessage';

interface PrivacySettings {
  showReadReceipts: boolean;
  showOnlineStatus: boolean;
}

interface ThemeContextType {
  chatTheme: ChatTheme;
  setChatTheme: (theme: ChatTheme) => void;
  privacySettings: PrivacySettings;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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

  const updatePrivacySettings = (newSettings: Partial<PrivacySettings>) => {
    const updated = { ...privacySettings, ...newSettings };
    setPrivacySettings(updated);
    localStorage.setItem('axol-privacy-settings', JSON.stringify(updated));
  };

  return (
    <ThemeContext.Provider value={{
      chatTheme,
      setChatTheme: updateChatTheme,
      privacySettings,
      updatePrivacySettings
    }}>
      {children}
    </ThemeContext.Provider>
  );
};