/**
 * Anonymous Session Manager
 * Handles anonymous user sessions with automatic cleanup and heartbeat
 */

import { apiService } from '../services/apiService';
import { DEFAULT_USERNAME_POLICY } from './usernameLifecycle';

interface AnonymousSession {
  username: string;
  displayName: string;
  sessionId: string;
  isAnonymous: boolean;
  createdAt: string;
  lastHeartbeat: string;
}

class AnonymousSessionManager {
  private session: AnonymousSession | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private beforeUnloadHandler: (() => void) | null = null;

  /**
   * Start an anonymous session
   */
  async startSession(username: string, displayName: string, sessionId: string): Promise<void> {
    const now = new Date().toISOString();

    this.session = {
      username,
      displayName,
      sessionId,
      isAnonymous: true,
      createdAt: now,
      lastHeartbeat: now
    };

    // Store session data
    localStorage.setItem('anonymousSession', JSON.stringify(this.session));
    localStorage.setItem('isAnonymousSession', 'true');

    // Start heartbeat
    this.startHeartbeat();

    // Set up cleanup on page unload
    this.setupBeforeUnloadHandler();

    console.log(`🎭 Anonymous session started for @${username}`);
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    if (!this.session) return;

    try {
      // Notify server about session end
      await apiService.anonymousLogout({
        username: this.session.username,
        sessionId: this.session.sessionId
      });

      console.log(`🎭 Anonymous session ended for @${this.session.username}`);
    } catch (error) {
      console.error('Failed to notify server about session end:', error);
    } finally {
      // Clean up local state
      this.cleanup();
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): AnonymousSession | null {
    return this.session;
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.session !== null;
  }

  /**
   * Restore session from localStorage
   */
  restoreSession(): AnonymousSession | null {
    try {
      const storedSession = localStorage.getItem('anonymousSession');
      const isAnonymous = localStorage.getItem('isAnonymousSession') === 'true';

      if (storedSession && isAnonymous) {
        this.session = JSON.parse(storedSession);

        // Check if session is expired
        if (this.isSessionExpired()) {
          console.log('🎭 Anonymous session expired, cleaning up...');
          this.cleanup();
          return null;
        }

        // Restart heartbeat for restored session
        this.startHeartbeat();
        this.setupBeforeUnloadHandler();

        console.log(`🎭 Anonymous session restored for @${this.session?.username}`);
        return this.session;
      }
    } catch (error) {
      console.error('Failed to restore anonymous session:', error);
      this.cleanup();
    }

    return null;
  }

  /**
   * Update session activity
   */
  private updateActivity(): void {
    if (!this.session) return;

    this.session.lastHeartbeat = new Date().toISOString();
    localStorage.setItem('anonymousSession', JSON.stringify(this.session));
  }

  /**
   * Start heartbeat to keep session alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(async () => {
      if (!this.session) {
        this.stopHeartbeat();
        return;
      }

      try {
        await apiService.heartbeatSession({
          username: this.session.username,
          sessionId: this.session.sessionId
        });

        this.updateActivity();
        console.log(`💓 Heartbeat sent for @${this.session.username}`);
      } catch (error) {
        console.error('Heartbeat failed:', error);

        // If heartbeat fails multiple times, end session
        const timeSinceLastHeartbeat = Date.now() - new Date(this.session.lastHeartbeat).getTime();
        if (timeSinceLastHeartbeat > 5 * 60 * 1000) { // 5 minutes
          console.log('🎭 Session lost connection, ending session...');
          await this.endSession();
        }
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(): boolean {
    if (!this.session) return true;

    const maxSessionMs = DEFAULT_USERNAME_POLICY.maxSessionHours * 60 * 60 * 1000;
    const sessionAge = Date.now() - new Date(this.session.createdAt).getTime();

    return sessionAge > maxSessionMs;
  }

  /**
   * Set up beforeunload handler for cleanup
   */
  private setupBeforeUnloadHandler(): void {
    if (this.beforeUnloadHandler) return;

    this.beforeUnloadHandler = () => {
      // Use sendBeacon for reliable cleanup on page unload
      if (this.session && navigator.sendBeacon) {
        const data = JSON.stringify({
          username: this.session.username,
          sessionId: this.session.sessionId
        });

        navigator.sendBeacon('/api/v1/auth/anonymous/logout', data);
      }
    };

    window.addEventListener('beforeunload', this.beforeUnloadHandler);
    window.addEventListener('pagehide', this.beforeUnloadHandler);
  }

  /**
   * Clean up all session data and handlers
   */
  private cleanup(): void {
    // Stop heartbeat
    this.stopHeartbeat();

    // Remove event listeners
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      window.removeEventListener('pagehide', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    // Clear local storage
    localStorage.removeItem('anonymousSession');
    localStorage.removeItem('anonymousUser');
    localStorage.removeItem('isAnonymousSession');
    localStorage.removeItem('sessionToken');

    // Clear session
    this.session = null;
  }

  /**
   * Get session duration in minutes
   */
  getSessionDuration(): number {
    if (!this.session) return 0;

    const sessionStart = new Date(this.session.createdAt).getTime();
    const now = Date.now();

    return Math.floor((now - sessionStart) / (1000 * 60));
  }

  /**
   * Get time until session expires
   */
  getTimeUntilExpiry(): number {
    if (!this.session) return 0;

    const maxSessionMs = DEFAULT_USERNAME_POLICY.maxSessionHours * 60 * 60 * 1000;
    const sessionStart = new Date(this.session.createdAt).getTime();
    const expiryTime = sessionStart + maxSessionMs;
    const now = Date.now();

    return Math.max(0, expiryTime - now);
  }

  /**
   * Check if session will expire soon (within 15 minutes)
   */
  isExpiringSoon(): boolean {
    const timeLeft = this.getTimeUntilExpiry();
    return timeLeft > 0 && timeLeft <= 15 * 60 * 1000; // 15 minutes in ms
  }
}

// Export singleton instance
export const anonymousSessionManager = new AnonymousSessionManager();

// Auto-restore session on module load
anonymousSessionManager.restoreSession();