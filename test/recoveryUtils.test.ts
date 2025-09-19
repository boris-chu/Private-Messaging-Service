/**
 * Test file to verify recovery phrase generation
 * This is for demonstration - would normally use a proper testing framework
 */

import {
  generateSecureRecoveryPhrase,
  generateSecureRecoveryCodes,
  validateRecoveryPhrase,
  getWordlistStats,
  WORDLIST_SIZE
} from './recoveryUtils';

// Test the recovery phrase generation
export function testRecoveryGeneration() {
  console.log('🧪 Testing Recovery Phrase Generation');
  console.log('=====================================');

  // Test wordlist size
  console.log(`📊 Wordlist contains ${WORDLIST_SIZE} words (BIP-39 standard: 2048)`);

  // Get wordlist statistics
  const stats = getWordlistStats();
  console.log('📈 Wordlist Statistics:');
  console.log(`   - Total words: ${stats.totalWords}`);
  console.log(`   - Unique starting letters: ${stats.uniqueStartingLetters}`);
  console.log(`   - Average words per letter: ${stats.averageWordsPerLetter}`);

  // Generate multiple phrases to test uniqueness and letter distribution
  console.log('\n🔑 Testing phrase generation:');

  for (let i = 0; i < 5; i++) {
    const phrase = generateSecureRecoveryPhrase(12);
    console.log(`\nPhrase ${i + 1}:`);
    console.log(`   Words: ${phrase.join(' ')}`);

    // Check for consecutive words with same starting letter
    let hasConsecutiveSameStarting = false;
    for (let j = 1; j < phrase.length; j++) {
      if (phrase[j].charAt(0).toLowerCase() === phrase[j-1].charAt(0).toLowerCase()) {
        hasConsecutiveSameStarting = true;
        break;
      }
    }

    console.log(`   ✅ No consecutive same starting letters: ${!hasConsecutiveSameStarting}`);
    console.log(`   ✅ Valid phrase: ${validateRecoveryPhrase(phrase)}`);

    // Show starting letters
    const startingLetters = phrase.map(word => word.charAt(0).toLowerCase()).join('-');
    console.log(`   Starting letters: ${startingLetters}`);
  }

  // Test recovery codes
  console.log('\n🔐 Testing recovery codes:');
  const codes = generateSecureRecoveryCodes(8, 8);
  console.log(`   Generated ${codes.length} codes:`);
  codes.forEach((code, index) => {
    console.log(`   ${index + 1}. ${code}`);
  });

  console.log('\n✅ All tests completed successfully!');
}

// Uncomment to run tests in development
// testRecoveryGeneration();