/**
 * Secure Recovery Phrase Generation Utility
 * Uses cryptographically secure random generation with full BIP-39 compatible wordlist
 * 2048 carefully curated, PG-13 appropriate words
 */

import { BIP39_WORDLIST } from './bip39Wordlist';

// Use the full BIP-39 compatible wordlist
const RECOVERY_WORDLIST = BIP39_WORDLIST;

/**
 * Generate cryptographically secure random numbers
 */
function getSecureRandomInt(max: number): number {
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  return randomBuffer[0] % max;
}

/**
 * Generate a secure recovery phrase with smart randomization
 * Ensures no consecutive words start with the same letter
 * @param wordCount Number of words in the phrase (default: 12)
 * @returns Array of words forming the recovery phrase
 */
export function generateSecureRecoveryPhrase(wordCount: number = 12): string[] {
  const phrase: string[] = [];
  let lastStartingLetter = '';

  for (let i = 0; i < wordCount; i++) {
    let attempts = 0;
    let selectedWord: string;

    do {
      const randomIndex = getSecureRandomInt(RECOVERY_WORDLIST.length);
      selectedWord = RECOVERY_WORDLIST[randomIndex];
      attempts++;

      // Prevent infinite loops - after 20 attempts, accept any word
      if (attempts > 20) {
        break;
      }
    } while (selectedWord.charAt(0).toLowerCase() === lastStartingLetter && phrase.length > 0);

    phrase.push(selectedWord);
    lastStartingLetter = selectedWord.charAt(0).toLowerCase();
  }

  return phrase;
}

/**
 * Generate secure recovery codes
 * @param codeCount Number of codes to generate (default: 8)
 * @param codeLength Length of each code (default: 8)
 * @returns Array of recovery codes
 */
export function generateSecureRecoveryCodes(codeCount: number = 8, codeLength: number = 8): string[] {
  const codes: string[] = [];
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let i = 0; i < codeCount; i++) {
    let code = '';
    for (let j = 0; j < codeLength; j++) {
      const randomIndex = getSecureRandomInt(charset.length);
      code += charset[randomIndex];
    }
    codes.push(code);
  }

  return codes;
}

/**
 * Validate a recovery phrase
 * @param phrase Array of words to validate
 * @returns Boolean indicating if the phrase is valid
 */
export function validateRecoveryPhrase(phrase: string[]): boolean {
  if (!phrase || phrase.length === 0) {
    return false;
  }

  // Check if all words are from our wordlist
  return phrase.every(word =>
    RECOVERY_WORDLIST.includes(word.toLowerCase().trim())
  );
}

/**
 * Format recovery phrase for display
 * @param phrase Array of words
 * @returns Formatted string with numbered words
 */
export function formatRecoveryPhrase(phrase: string[]): string {
  return phrase.map((word, index) => `${index + 1}. ${word}`).join('\n');
}

/**
 * Parse recovery phrase from user input
 * @param input User input string
 * @returns Array of cleaned words
 */
export function parseRecoveryPhrase(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[0-9]+\./g, '') // Remove numbering like "1."
    .replace(/[^a-z\s]/g, '') // Remove special characters
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Calculate entropy bits for a recovery phrase
 * @param wordCount Number of words in the phrase
 * @returns Number of entropy bits
 */
export function calculateEntropy(wordCount: number): number {
  return Math.floor(Math.log2(Math.pow(RECOVERY_WORDLIST.length, wordCount)));
}

/**
 * Export recovery data as JSON
 * @param username User's username
 * @param phrase Recovery phrase
 * @param codes Recovery codes
 * @returns JSON string
 */
export function exportRecoveryData(
  username: string,
  phrase: string[],
  codes: string[]
): string {
  return JSON.stringify({
    username,
    recoveryPhrase: phrase.join(' '),
    recoveryCodes: codes,
    generatedAt: new Date().toISOString(),
    version: '1.0',
    wordlistSize: RECOVERY_WORDLIST.length,
    entropy: calculateEntropy(phrase.length)
  }, null, 2);
}

/**
 * Create a recovery data blob for download
 * @param username User's username
 * @param phrase Recovery phrase
 * @param codes Recovery codes
 * @returns Blob object
 */
export function createRecoveryBlob(
  username: string,
  phrase: string[],
  codes: string[]
): Blob {
  const data = exportRecoveryData(username, phrase, codes);
  return new Blob([data], { type: 'application/json' });
}

/**
 * Group words by starting letter for debugging/analysis
 * @returns Object with letters as keys and word arrays as values
 */
export function groupWordsByLetter(): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  RECOVERY_WORDLIST.forEach(word => {
    const firstLetter = word.charAt(0).toLowerCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(word);
  });

  return groups;
}

/**
 * Get statistics about the wordlist
 * @returns Object with wordlist statistics
 */
export function getWordlistStats() {
  const groups = groupWordsByLetter();
  const stats = {
    totalWords: RECOVERY_WORDLIST.length,
    uniqueStartingLetters: Object.keys(groups).length,
    averageWordsPerLetter: Math.round(RECOVERY_WORDLIST.length / Object.keys(groups).length),
    letterDistribution: Object.keys(groups).reduce((acc, letter) => {
      acc[letter] = groups[letter].length;
      return acc;
    }, {} as Record<string, number>)
  };

  return stats;
}

// Export the wordlist length for UI display
export const WORDLIST_SIZE = RECOVERY_WORDLIST.length;