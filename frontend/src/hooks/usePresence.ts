import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService, type OnlineUser, type HeartbeatResponse } from '../services/apiService';

interface UsePresenceOptions {
  username: string;
  displayName?: string;
  isAnonymous?: boolean;
  enabled?: boolean;
  interval?: number;
}

interface UsePresenceReturn {
  onlineUsers: OnlineUser[];
  totalOnline: number;
  isLoading: boolean;
  error: string | null;
  lastUpdate: number | null;
  sendHeartbeat: () => Promise<void>;
  logoutPresence: () => Promise<void>;
}

export function usePresence({
  username,
  displayName,
  isAnonymous = false,
  enabled = true,
  interval = 10000 // 10 seconds
}: UsePresenceOptions): UsePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [totalOnline, setTotalOnline] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const intervalRef = useRef<number | null>(null);
  const isEnabledRef = useRef(enabled);

  const sendHeartbeat = useCallback(async () => {
    if (!username || !isEnabledRef.current) return;

    try {
      setError(null);
      const response: HeartbeatResponse = await apiService.heartbeatSession({
        username,
        displayName: displayName || username,
        isAnonymous
      });

      if (response.success && response.onlineUsers) {
        setOnlineUsers(response.onlineUsers);
        setTotalOnline(response.totalOnline);
        setLastUpdate(Date.now());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Heartbeat failed';
      setError(errorMessage);
    }
  }, [username, displayName, isAnonymous]);

  // Update enabled ref when prop changes
  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  // Start/stop heartbeat interval
  useEffect(() => {
    if (!enabled || !username) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Send initial heartbeat
    setIsLoading(true);
    sendHeartbeat().finally(() => setIsLoading(false));

    // Set up interval for subsequent heartbeats
    intervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, username, interval, sendHeartbeat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Logout function to immediately remove user from presence
  const logoutPresence = useCallback(async () => {
    if (!username) return;

    try {
      await apiService.logoutPresence(username);
      // Clear local state immediately
      setOnlineUsers([]);
      setTotalOnline(0);
      setLastUpdate(Date.now());
    } catch {
      // Silent fail for logout cleanup
    }
  }, [username]);

  return {
    onlineUsers,
    totalOnline,
    isLoading,
    error,
    lastUpdate,
    sendHeartbeat,
    logoutPresence
  };
}

// Hook for one-time presence fetch without heartbeat
export function usePresenceFetch() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [totalOnline, setTotalOnline] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPresence = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.getOnlineUsers();
      if (response.success && response.users) {
        setOnlineUsers(response.users);
        setTotalOnline(response.total);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch presence';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    onlineUsers,
    totalOnline,
    isLoading,
    error,
    fetchPresence
  };
}