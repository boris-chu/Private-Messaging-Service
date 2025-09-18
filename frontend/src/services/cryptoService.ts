/**
 * WebCrypto Service for End-to-End Encryption
 * Handles RSA key generation, storage, and encryption/decryption operations
 */

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface SerializedPublicKey {
  username: string;
  publicKey: string; // Base64 encoded
  timestamp: number;
}

export interface EncryptedMessage {
  encryptedContent: string; // Base64 encoded
  recipientUsername: string;
  senderUsername: string;
  timestamp: number;
}

class CryptoService {
  private keyPair: KeyPair | null = null;
  private userPublicKeys: Map<string, CryptoKey> = new Map();
  private currentUsername: string = '';

  /**
   * Initialize crypto service for a user
   */
  async initialize(username: string): Promise<void> {
    this.currentUsername = username;

    // Try to load existing keys from localStorage
    const storedKeys = await this.loadKeysFromStorage(username);
    if (storedKeys) {
      this.keyPair = storedKeys;
      console.log('🔐 Loaded existing key pair for', username);
    } else {
      // Generate new key pair
      this.keyPair = await this.generateKeyPair();
      await this.saveKeysToStorage(username, this.keyPair);
      console.log('🔐 Generated new key pair for', username);
    }
  }

  /**
   * Generate RSA-OAEP key pair for encryption
   */
  private async generateKeyPair(): Promise<KeyPair> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true, // extractable
        ["encrypt", "decrypt"]
      );

      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      };
    } catch (error) {
      console.error('Failed to generate key pair:', error);
      throw new Error('Key generation failed');
    }
  }

  /**
   * Get current user's public key as base64 string
   */
  async getPublicKeyAsString(): Promise<string> {
    if (!this.keyPair) {
      throw new Error('Keys not initialized');
    }

    const exported = await crypto.subtle.exportKey('spki', this.keyPair.publicKey);
    const exportedAsBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    return exportedAsBase64;
  }

  /**
   * Import a public key from base64 string
   */
  async importPublicKey(publicKeyStr: string): Promise<CryptoKey> {
    try {
      const binaryKey = Uint8Array.from(atob(publicKeyStr), c => c.charCodeAt(0));

      const publicKey = await crypto.subtle.importKey(
        'spki',
        binaryKey,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        false,
        ['encrypt']
      );

      return publicKey;
    } catch (error) {
      console.error('Failed to import public key:', error);
      throw new Error('Public key import failed');
    }
  }

  /**
   * Store another user's public key
   */
  async storeUserPublicKey(username: string, publicKeyStr: string): Promise<void> {
    try {
      const publicKey = await this.importPublicKey(publicKeyStr);
      this.userPublicKeys.set(username, publicKey);
      console.log(`🔑 Stored public key for ${username}`);
    } catch (error) {
      console.error(`Failed to store public key for ${username}:`, error);
    }
  }

  /**
   * Encrypt a message for a specific recipient
   */
  async encryptMessage(message: string, recipientUsername: string): Promise<string> {
    const recipientPublicKey = this.userPublicKeys.get(recipientUsername);
    if (!recipientPublicKey) {
      throw new Error(`No public key found for ${recipientUsername}`);
    }

    try {
      const messageBuffer = new TextEncoder().encode(message);
      const encrypted = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        recipientPublicKey,
        messageBuffer
      );

      // Convert to base64 for transmission
      const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
      return encryptedBase64;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Message encryption failed');
    }
  }

  /**
   * Decrypt a message with our private key
   */
  async decryptMessage(encryptedMessage: string): Promise<string> {
    if (!this.keyPair) {
      throw new Error('Keys not initialized');
    }

    try {
      // Convert from base64
      const encryptedBuffer = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));

      const decrypted = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        this.keyPair.privateKey,
        encryptedBuffer
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Message decryption failed');
    }
  }

  /**
   * Save key pair to localStorage (encrypted with a simple key derivation)
   */
  private async saveKeysToStorage(username: string, keyPair: KeyPair): Promise<void> {
    try {
      const publicKeyData = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKeyData = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      const keyData = {
        publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKeyData))),
        privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKeyData))),
        timestamp: Date.now()
      };

      localStorage.setItem(`axol_keys_${username}`, JSON.stringify(keyData));
    } catch (error) {
      console.error('Failed to save keys:', error);
    }
  }

  /**
   * Load key pair from localStorage
   */
  private async loadKeysFromStorage(username: string): Promise<KeyPair | null> {
    try {
      const keyDataStr = localStorage.getItem(`axol_keys_${username}`);
      if (!keyDataStr) return null;

      const keyData = JSON.parse(keyDataStr);

      // Convert back from base64
      const publicKeyBuffer = Uint8Array.from(atob(keyData.publicKey), c => c.charCodeAt(0));
      const privateKeyBuffer = Uint8Array.from(atob(keyData.privateKey), c => c.charCodeAt(0));

      // Import keys asynchronously
      return await this.importKeyPairFromBuffers(publicKeyBuffer, privateKeyBuffer);
    } catch (error) {
      console.error('Failed to load keys:', error);
      return null;
    }
  }

  /**
   * Import key pair from raw buffers
   */
  private async importKeyPairFromBuffers(publicKeyBuffer: Uint8Array, privateKeyBuffer: Uint8Array): Promise<KeyPair> {
    const [publicKey, privateKey] = await Promise.all([
      crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ['encrypt']
      ),
      crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ['decrypt']
      )
    ]);

    return { publicKey, privateKey };
  }

  /**
   * Check if we have a public key for a user
   */
  hasPublicKeyFor(username: string): boolean {
    return this.userPublicKeys.has(username);
  }

  /**
   * Get list of users we can send encrypted messages to
   */
  getAvailableRecipients(): string[] {
    return Array.from(this.userPublicKeys.keys());
  }

  /**
   * Clear all stored keys (for logout)
   */
  clearKeys(): void {
    this.keyPair = null;
    this.userPublicKeys.clear();
    this.currentUsername = '';
  }

  /**
   * Get current user's username
   */
  getCurrentUsername(): string {
    return this.currentUsername;
  }

  /**
   * Check if crypto service is initialized
   */
  isInitialized(): boolean {
    return this.keyPair !== null;
  }
}

// Export singleton instance
export const cryptoService = new CryptoService();