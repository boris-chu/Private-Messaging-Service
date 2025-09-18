/**
 * Anonymous Username Lifecycle Management
 * Handles the lifecycle of anonymous usernames with abuse prevention
 */

export interface UsernameReservation {
  username: string;
  sessionId: string;
  reservedAt: string;
  lastActivity: string;
  ipAddress?: string;
  status: 'active' | 'grace_period' | 'cooldown' | 'expired';
}

export interface UsernamePolicy {
  // Grace period after logout before username becomes available (minutes)
  gracePeriodMinutes: number;
  // Cooldown period before username can be reused (hours)
  cooldownHours: number;
  // Maximum session duration before auto-logout (hours)
  maxSessionHours: number;
  // Maximum anonymous sessions per IP per hour
  maxSessionsPerIpPerHour: number;
  // Maximum times same username can be reused per week
  maxUsernameReusesPerWeek: number;
}

// Default policy configuration
export const DEFAULT_USERNAME_POLICY: UsernamePolicy = {
  gracePeriodMinutes: 15,
  cooldownHours: 24,
  maxSessionHours: 4,
  maxSessionsPerIpPerHour: 3,
  maxUsernameReusesPerWeek: 2
};

/**
 * Calculate when a username becomes available again
 */
export function calculateAvailabilityTime(
  lastActivity: string,
  policy: UsernamePolicy = DEFAULT_USERNAME_POLICY
): Date {
  const lastActivityDate = new Date(lastActivity);
  const gracePeriodMs = policy.gracePeriodMinutes * 60 * 1000;
  return new Date(lastActivityDate.getTime() + gracePeriodMs);
}

/**
 * Calculate when a username exits cooldown period
 */
export function calculateCooldownEnd(
  lastActivity: string,
  policy: UsernamePolicy = DEFAULT_USERNAME_POLICY
): Date {
  const lastActivityDate = new Date(lastActivity);
  const cooldownMs = policy.cooldownHours * 60 * 60 * 1000;
  return new Date(lastActivityDate.getTime() + cooldownMs);
}

/**
 * Check if a username is in cooldown period
 */
export function isInCooldown(
  lastActivity: string,
  policy: UsernamePolicy = DEFAULT_USERNAME_POLICY
): boolean {
  const cooldownEnd = calculateCooldownEnd(lastActivity, policy);
  return new Date() < cooldownEnd;
}

/**
 * Check if a session has expired
 */
export function isSessionExpired(
  lastActivity: string,
  policy: UsernamePolicy = DEFAULT_USERNAME_POLICY
): boolean {
  const lastActivityDate = new Date(lastActivity);
  const maxSessionMs = policy.maxSessionHours * 60 * 60 * 1000;
  const expiryTime = new Date(lastActivityDate.getTime() + maxSessionMs);
  return new Date() > expiryTime;
}

/**
 * Generate a session heartbeat timestamp
 */
export function generateHeartbeat(): string {
  return new Date().toISOString();
}

/**
 * Create a username reservation record
 */
export function createReservation(
  username: string,
  sessionId: string,
  ipAddress?: string
): UsernameReservation {
  const now = new Date().toISOString();
  return {
    username,
    sessionId,
    reservedAt: now,
    lastActivity: now,
    ipAddress,
    status: 'active'
  };
}

/**
 * Update reservation activity
 */
export function updateReservationActivity(
  reservation: UsernameReservation
): UsernameReservation {
  return {
    ...reservation,
    lastActivity: generateHeartbeat()
  };
}

/**
 * Transition reservation to grace period
 */
export function transitionToGracePeriod(
  reservation: UsernameReservation
): UsernameReservation {
  return {
    ...reservation,
    status: 'grace_period',
    lastActivity: generateHeartbeat()
  };
}

/**
 * Calculate username usage statistics
 */
export interface UsernameStats {
  totalReservations: number;
  activeReservations: number;
  gracePeriodReservations: number;
  cooldownReservations: number;
  expiredReservations: number;
  averageSessionDuration: number; // in minutes
}

/**
 * Validate if username can be reserved
 */
export interface ReservationValidation {
  canReserve: boolean;
  reason?: string;
  availableAt?: Date;
  cooldownEnds?: Date;
}

export function validateReservation(
  username: string,
  existingReservations: UsernameReservation[],
  ipAddress?: string,
  policy: UsernamePolicy = DEFAULT_USERNAME_POLICY
): ReservationValidation {
  const now = new Date();

  // Check if username is currently active
  const activeReservation = existingReservations.find(
    r => r.username === username && r.status === 'active'
  );
  if (activeReservation) {
    return {
      canReserve: false,
      reason: 'Username is currently in use'
    };
  }

  // Check if username is in grace period
  const gracePeriodReservation = existingReservations.find(
    r => r.username === username && r.status === 'grace_period'
  );
  if (gracePeriodReservation) {
    const availableAt = calculateAvailabilityTime(gracePeriodReservation.lastActivity, policy);
    if (now < availableAt) {
      return {
        canReserve: false,
        reason: 'Username is in grace period',
        availableAt
      };
    }
  }

  // Check cooldown period
  const recentReservations = existingReservations.filter(
    r => r.username === username &&
    now.getTime() - new Date(r.lastActivity).getTime() < policy.cooldownHours * 60 * 60 * 1000
  );

  if (recentReservations.length > 0) {
    const latestReservation = recentReservations.sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    )[0];

    const cooldownEnd = calculateCooldownEnd(latestReservation.lastActivity, policy);
    if (now < cooldownEnd) {
      return {
        canReserve: false,
        reason: 'Username is in cooldown period',
        cooldownEnds: cooldownEnd
      };
    }
  }

  // Check IP rate limiting
  if (ipAddress) {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentIpReservations = existingReservations.filter(
      r => r.ipAddress === ipAddress &&
      new Date(r.reservedAt) > oneHourAgo
    );

    if (recentIpReservations.length >= policy.maxSessionsPerIpPerHour) {
      return {
        canReserve: false,
        reason: 'Rate limit exceeded for IP address'
      };
    }
  }

  // Check weekly usage limit
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyUsages = existingReservations.filter(
    r => r.username === username &&
    new Date(r.reservedAt) > oneWeekAgo
  );

  if (weeklyUsages.length >= policy.maxUsernameReusesPerWeek) {
    return {
      canReserve: false,
      reason: 'Username usage limit exceeded for this week'
    };
  }

  return { canReserve: true };
}

/**
 * Clean up expired reservations
 */
export function cleanupExpiredReservations(
  reservations: UsernameReservation[],
  policy: UsernamePolicy = DEFAULT_USERNAME_POLICY
): UsernameReservation[] {
  const now = new Date();

  return reservations.filter(reservation => {
    // Remove expired sessions
    if (isSessionExpired(reservation.lastActivity, policy)) {
      return false;
    }

    // Remove reservations past cooldown period
    if (reservation.status === 'cooldown') {
      const cooldownEnd = calculateCooldownEnd(reservation.lastActivity, policy);
      if (now > cooldownEnd) {
        return false;
      }
    }

    // Keep active and grace period reservations
    return true;
  });
}

/**
 * Get next available cleanup time
 */
export function getNextCleanupTime(
  reservations: UsernameReservation[],
  policy: UsernamePolicy = DEFAULT_USERNAME_POLICY
): Date | null {
  if (reservations.length === 0) return null;

  const cleanupTimes = reservations.map(reservation => {
    if (reservation.status === 'active' || reservation.status === 'grace_period') {
      return calculateAvailabilityTime(reservation.lastActivity, policy);
    } else if (reservation.status === 'cooldown') {
      return calculateCooldownEnd(reservation.lastActivity, policy);
    }
    return new Date(reservation.lastActivity);
  });

  return new Date(Math.min(...cleanupTimes.map(d => d.getTime())));
}