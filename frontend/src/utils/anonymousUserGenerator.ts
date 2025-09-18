/**
 * Anonymous User Generator
 * Generates realistic social media style usernames and names for anonymous users
 */

// Adjectives for username generation
const ADJECTIVES = [
  'cool', 'awesome', 'swift', 'clever', 'bright', 'cosmic', 'digital', 'electric',
  'epic', 'fierce', 'gentle', 'happy', 'instant', 'jolly', 'kind', 'lively',
  'magic', 'noble', 'oceanic', 'peaceful', 'quiet', 'rapid', 'stellar', 'turbo',
  'ultra', 'vivid', 'wild', 'zen', 'active', 'brave', 'crisp', 'dynamic',
  'elegant', 'fluid', 'golden', 'honest', 'inspired', 'joyful', 'keen', 'loyal',
  'modern', 'natural', 'optimistic', 'perfect', 'quirky', 'radiant', 'smart', 'timeless',
  'unique', 'vibrant', 'wise', 'young', 'zesty', 'artistic', 'bold', 'creative',
  'daring', 'energetic', 'fresh', 'groovy', 'humble', 'infinite', 'jazzy', 'kinetic'
] as const;

// Nouns for username generation
const NOUNS = [
  'dolphin', 'tiger', 'phoenix', 'runner', 'gamer', 'artist', 'explorer', 'ninja',
  'eagle', 'wolf', 'lion', 'shark', 'falcon', 'panther', 'bear', 'fox',
  'butterfly', 'dragonfly', 'seahorse', 'octopus', 'penguin', 'kangaroo', 'koala', 'panda',
  'cheetah', 'leopard', 'jaguar', 'lynx', 'otter', 'whale', 'sparrow', 'robin',
  'hawk', 'owl', 'raven', 'swan', 'peacock', 'flamingo', 'hummingbird', 'cardinal',
  'warrior', 'scholar', 'poet', 'musician', 'dancer', 'writer', 'dreamer', 'thinker',
  'builder', 'creator', 'inventor', 'designer', 'coder', 'hacker', 'pilot', 'captain',
  'knight', 'guardian', 'ranger', 'scout', 'hunter', 'seeker', 'wanderer', 'traveler',
  'star', 'moon', 'sun', 'comet', 'meteor', 'galaxy', 'nebula', 'cosmos',
  'thunder', 'lightning', 'storm', 'wind', 'wave', 'flame', 'spark', 'blaze'
] as const;

// Hobbies and interests
const INTERESTS = [
  'lover', 'enthusiast', 'fan', 'addict', 'pro', 'master', 'expert', 'champion',
  'collector', 'builder', 'creator', 'maker', 'player', 'rider', 'driver', 'flyer',
  'watcher', 'reader', 'listener', 'dancer', 'singer', 'photographer', 'filmmaker', 'blogger',
  'streamer', 'vlogger', 'podcaster', 'reviewer', 'critic', 'analyst', 'theorist', 'strategist'
] as const;

// Generic first names (gender-neutral and diverse)
const FIRST_NAMES = [
  'Alex', 'Sam', 'Jordan', 'Riley', 'Casey', 'Taylor', 'Morgan', 'Blake',
  'Avery', 'Cameron', 'Drew', 'Emery', 'Finley', 'Hayden', 'Jamie', 'Kai',
  'Logan', 'Mason', 'Noah', 'Parker', 'Quinn', 'Reese', 'Sage', 'Tate',
  'Adrian', 'Ash', 'Bailey', 'Brook', 'Charlie', 'Dakota', 'Eden', 'Ellis',
  'Gray', 'Harper', 'Indigo', 'Jules', 'Kelly', 'Lane', 'Max', 'Nico',
  'Ocean', 'Phoenix', 'River', 'Rowan', 'Skylar', 'Sydney', 'Tyler', 'Val',
  'Winter', 'Zion', 'Ari', 'Bay', 'Cedar', 'Dane', 'Ember', 'Faye',
  'Gage', 'Honor', 'Iris', 'Juno', 'Koda', 'Lux', 'Marley', 'Nova'
] as const;

// Last names for full name generation
const LAST_NAMES = [
  'Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
  'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia',
  'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall',
  'Allen', 'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green',
  'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts',
  'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart'
] as const;

// Username patterns and their generation functions
type UsernamePattern =
  | 'adjective_noun'
  | 'adjective_noun_number'
  | 'noun_interest'
  | 'noun_interest_number'
  | 'adjective_interest'
  | 'compound_noun'
  | 'name_style'
  | 'retro_style';

/**
 * Generate cryptographically secure random number
 */
function getSecureRandomInt(max: number): number {
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  return randomBuffer[0] % max;
}

/**
 * Pick random item from array
 */
function randomChoice<T>(array: readonly T[]): T {
  return array[getSecureRandomInt(array.length)];
}

/**
 * Generate random number for usernames
 */
function randomNumber(min: number = 1, max: number = 999): number {
  return getSecureRandomInt(max - min + 1) + min;
}

/**
 * Generate random year (90s to 2020s style)
 */
function randomYear(): number {
  const years = [92, 93, 94, 95, 96, 97, 98, 99, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  return randomChoice(years);
}

/**
 * Generate username based on pattern
 */
function generateUsernameByPattern(pattern: UsernamePattern): string {
  switch (pattern) {
    case 'adjective_noun':
      return `${randomChoice(ADJECTIVES)}_${randomChoice(NOUNS)}`;

    case 'adjective_noun_number':
      return `${randomChoice(ADJECTIVES)}_${randomChoice(NOUNS)}${randomNumber()}`;

    case 'noun_interest':
      return `${randomChoice(NOUNS)}_${randomChoice(INTERESTS)}`;

    case 'noun_interest_number':
      return `${randomChoice(NOUNS)}_${randomChoice(INTERESTS)}${randomNumber()}`;

    case 'adjective_interest':
      return `${randomChoice(ADJECTIVES)}_${randomChoice(INTERESTS)}`;

    case 'compound_noun':
      return `${randomChoice(NOUNS)}${randomChoice(NOUNS)}${randomNumber(1, 99)}`;

    case 'name_style':
      return `${randomChoice(FIRST_NAMES).toLowerCase()}${randomChoice(NOUNS)}${randomNumber(1, 99)}`;

    case 'retro_style':
      return `${randomChoice(ADJECTIVES)}${randomChoice(NOUNS)}${randomYear()}`;

    default:
      return `${randomChoice(ADJECTIVES)}_${randomChoice(NOUNS)}${randomNumber()}`;
  }
}

/**
 * Generate a social media style username
 */
export function generateUsername(): string {
  const patterns: UsernamePattern[] = [
    'adjective_noun',
    'adjective_noun_number',
    'noun_interest',
    'noun_interest_number',
    'adjective_interest',
    'compound_noun',
    'name_style',
    'retro_style'
  ];

  const pattern = randomChoice(patterns);
  return generateUsernameByPattern(pattern);
}

/**
 * Generate a realistic display name
 */
export function generateDisplayName(): string {
  // 70% chance of single first name, 30% chance of full name
  if (getSecureRandomInt(100) < 70) {
    return randomChoice(FIRST_NAMES);
  } else {
    return `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
  }
}

/**
 * Generate multiple username options
 */
export function generateUsernameOptions(count: number = 3): string[] {
  const usernames = new Set<string>();

  while (usernames.size < count) {
    usernames.add(generateUsername());
  }

  return Array.from(usernames);
}

/**
 * Check if username follows common patterns (for validation)
 */
export function isValidUsernameFormat(username: string): boolean {
  // Allow letters, numbers, underscores, 3-30 characters
  const pattern = /^[a-zA-Z0-9_]{3,30}$/;
  return pattern.test(username);
}

/**
 * Generate anonymous user data
 */
export interface AnonymousUser {
  username: string;
  displayName: string;
  isAnonymous: boolean;
  sessionId: string;
}

export function generateAnonymousUser(): AnonymousUser {
  return {
    username: generateUsername(),
    displayName: generateDisplayName(),
    isAnonymous: true,
    sessionId: crypto.randomUUID()
  };
}

/**
 * Clean username (remove special chars, ensure valid format)
 */
export function cleanUsername(username: string): string {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 30)
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .replace(/_+/g, '_'); // Replace multiple underscores with single
}

/**
 * Generate username suggestions based on input
 */
export function generateUsernameSuggestions(base: string): string[] {
  const cleaned = cleanUsername(base);
  const suggestions: string[] = [];

  if (cleaned.length >= 3) {
    // Add numbers
    for (let i = 1; i <= 5; i++) {
      suggestions.push(`${cleaned}${randomNumber(1, 999)}`);
    }

    // Add adjectives
    for (let i = 0; i < 3; i++) {
      suggestions.push(`${randomChoice(ADJECTIVES)}_${cleaned}`);
    }
  }

  // Fill remaining with random usernames
  while (suggestions.length < 8) {
    suggestions.push(generateUsername());
  }

  return suggestions.slice(0, 8);
}