const TEST_URL = 'http://localhost:8787';

console.log('🔗 Testing immediate logout cleanup functionality...');

async function testLogoutCleanup() {
  try {
    // Test 1: Add two users to presence
    console.log('\n1. Adding two users to presence tracking...');

    // User 1
    const heartbeat1Response = await fetch(`${TEST_URL}/api/v1/users/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'user1',
        displayName: 'Test User 1',
        isAnonymous: false
      })
    });

    if (heartbeat1Response.ok) {
      const data1 = await heartbeat1Response.json();
      console.log('✅ User 1 added to presence');
      console.log(`👥 Online users: ${data1.totalOnline}`);
    }

    // User 2
    const heartbeat2Response = await fetch(`${TEST_URL}/api/v1/users/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'user2',
        displayName: 'Test User 2',
        isAnonymous: true
      })
    });

    if (heartbeat2Response.ok) {
      const data2 = await heartbeat2Response.json();
      console.log('✅ User 2 added to presence');
      console.log(`👥 Online users: ${data2.totalOnline}`);

      if (data2.onlineUsers) {
        console.log('📊 Current online users:');
        data2.onlineUsers.forEach(user => {
          console.log(`   - ${user.displayName} (${user.username}) ${user.isAnonymous ? '[Anonymous]' : ''}`);
        });
      }
    }

    // Test 2: Check presence before logout
    console.log('\n2. Checking presence before logout...');
    const presenceBeforeResponse = await fetch(`${TEST_URL}/api/v1/presence`);

    if (presenceBeforeResponse.ok) {
      const presenceBefore = await presenceBeforeResponse.json();
      console.log(`✅ Presence check before logout: ${presenceBefore.total} users online`);
    }

    // Test 3: Logout user1 immediately
    console.log('\n3. Logging out user1 immediately...');
    const logoutStartTime = Date.now();

    const logoutResponse = await fetch(`${TEST_URL}/api/v1/presence/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'user1'
      })
    });

    if (logoutResponse.ok) {
      const logoutData = await logoutResponse.json();
      const logoutEndTime = Date.now();
      const logoutDuration = logoutEndTime - logoutStartTime;

      console.log(`✅ User1 logged out in ${logoutDuration}ms`);
      console.log(`👥 Remaining online users: ${logoutData.totalOnline}`);

      if (logoutData.onlineUsers) {
        console.log('📊 Remaining online users:');
        logoutData.onlineUsers.forEach(user => {
          console.log(`   - ${user.displayName} (${user.username}) ${user.isAnonymous ? '[Anonymous]' : ''}`);
        });
      }
    }

    // Test 4: Verify presence immediately after logout
    console.log('\n4. Verifying presence immediately after logout...');
    const presenceAfterResponse = await fetch(`${TEST_URL}/api/v1/presence`);

    if (presenceAfterResponse.ok) {
      const presenceAfter = await presenceAfterResponse.json();
      console.log(`✅ Presence check after logout: ${presenceAfter.total} users online`);

      // Check if user1 is gone and user2 is still there
      const user1Present = presenceAfter.users.some(u => u.username === 'user1');
      const user2Present = presenceAfter.users.some(u => u.username === 'user2');

      console.log(`🔍 User1 still present: ${user1Present ? '❌ YES (should be NO)' : '✅ NO'}`);
      console.log(`🔍 User2 still present: ${user2Present ? '✅ YES' : '❌ NO (should be YES)'}`);
    }

    // Test 5: Test multiple rapid logouts
    console.log('\n5. Testing multiple rapid logouts...');

    // Add user3 and user4
    await fetch(`${TEST_URL}/api/v1/users/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'user3',
        displayName: 'Test User 3',
        isAnonymous: false
      })
    });

    await fetch(`${TEST_URL}/api/v1/users/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'user4',
        displayName: 'Test User 4',
        isAnonymous: true
      })
    });

    console.log('✅ Added user3 and user4');

    // Rapid logout both users
    const rapidLogout1 = fetch(`${TEST_URL}/api/v1/presence/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user3' })
    });

    const rapidLogout2 = fetch(`${TEST_URL}/api/v1/presence/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user4' })
    });

    await Promise.all([rapidLogout1, rapidLogout2]);
    console.log('✅ Rapid logout of user3 and user4 completed');

    // Check final presence
    const finalPresenceResponse = await fetch(`${TEST_URL}/api/v1/presence`);
    if (finalPresenceResponse.ok) {
      const finalPresence = await finalPresenceResponse.json();
      console.log(`📊 Final presence check: ${finalPresence.total} users online`);

      if (finalPresence.users && finalPresence.users.length > 0) {
        console.log('👥 Remaining users:');
        finalPresence.users.forEach(user => {
          console.log(`   - ${user.displayName} (${user.username})`);
        });
      } else {
        console.log('👥 All users successfully logged out except user2');
      }
    }

    // Test 6: Logout non-existent user
    console.log('\n6. Testing logout of non-existent user...');
    const nonExistentLogout = await fetch(`${TEST_URL}/api/v1/presence/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent_user' })
    });

    if (nonExistentLogout.ok) {
      const data = await nonExistentLogout.json();
      console.log(`✅ Non-existent user logout handled gracefully: ${data.message}`);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testLogoutCleanup();