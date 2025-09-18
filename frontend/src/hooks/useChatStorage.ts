import { useState, useEffect } from 'react';

interface UseChatStorageOptions<T> {
  storageKey: string;
  initialValue?: T[];
}

interface UseChatStorageReturn<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  addItem: (item: T) => void;
  clearItems: () => void;
  restoreItems: () => void;
}

/**
 * Custom hook for persistent chat storage with automatic restoration
 * Handles both terminal messages and chat messages with localStorage persistence
 */
export function useChatStorage<T = unknown>({
  storageKey,
  initialValue = []
}: UseChatStorageOptions<T>): UseChatStorageReturn<T> {

  // Initialize state with cached data from localStorage
  const [items, setItems] = useState<T[]>(() => {
    try {
      const cachedItems = localStorage.getItem(storageKey);
      return cachedItems ? JSON.parse(cachedItems) : initialValue;
    } catch (error) {
      console.error(`Failed to restore ${storageKey} from localStorage:`, error);
      return initialValue;
    }
  });

  // Persist items to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      console.error(`Failed to persist ${storageKey} to localStorage:`, error);
    }
  }, [items, storageKey]);

  // Helper function to add a single item
  const addItem = (newItem: T) => {
    setItems(prevItems => [...prevItems, newItem]);
  };

  // Helper function to clear all items
  const clearItems = () => {
    setItems([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error(`Failed to clear ${storageKey} from localStorage:`, error);
    }
  };

  // Helper function to manually restore items from localStorage
  const restoreItems = () => {
    try {
      const cachedItems = localStorage.getItem(storageKey);
      if (cachedItems) {
        setItems(JSON.parse(cachedItems));
      }
    } catch (error) {
      console.error(`Failed to restore ${storageKey} from localStorage:`, error);
    }
  };

  return {
    items,
    setItems,
    addItem,
    clearItems,
    restoreItems
  };
}

// Predefined hooks for common use cases
export const useTerminalMessages = () => useChatStorage<string>({
  storageKey: 'axol-terminal-messages',
  initialValue: []
});

export const useChatMessages = <T = unknown>() => useChatStorage<T>({
  storageKey: 'axol-chat-messages',
  initialValue: []
});