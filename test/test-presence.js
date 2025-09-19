const TEST_URL = 'http://localhost:8787';

console.log('🔗 Testing HTTP-based presence system...');

async function testPresenceSystem() {
  try {
    // Test 1: Check API health
    console.log('\n1. Testing API health...');
    const healthResponse = await fetch(`${TEST_URL}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ API is healthy:', health.service);
    } else {
      console.log('❌ API health check failed');
      return;
    }

    // Test 2: Register a test user
    console.log('\n2. Registering test user...');
    const registerResponse = await fetch(`${TEST_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'presence_test_user',
        password: 'testpass123',
        fullName: 'Presence Test User'
      })
    });

    if (registerResponse.ok || registerResponse.status === 409) {
      console.log('✅ User registration successful or user already exists');
    } else {
      console.log('❌ User registration failed');
    }

    // Test 3: Send heartbeat with presence data
    console.log('\n3. Testing heartbeat with presence tracking...');
    const heartbeatResponse = await fetch(`${TEST_URL}/api/v1/users/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'presence_test_user',
        displayName: 'Presence Test User',
        isAnonymous: false
      })
    });

    if (heartbeatResponse.ok) {
      const heartbeatData = await heartbeatResponse.json();
      console.log('✅ Heartbeat successful');
      console.log('📊 Response:', JSON.stringify(heartbeatData, null, 2));

      if (heartbeatData.onlineUsers) {
        console.log(`👥 Online users: ${heartbeatData.totalOnline}`);
        heartbeatData.onlineUsers.forEach(user => {
          console.log(`   - ${user.displayName} (${user.username}) ${user.isAnonymous ? '[Anonymous]' : ''}`);
        });
      }
    } else {
      console.log('❌ Heartbeat failed:', await heartbeatResponse.text());
    }

    // Test 4: Test direct presence endpoint
    console.log('\n4. Testing direct presence endpoint...');
    const presenceResponse = await fetch(`${TEST_URL}/api/v1/presence`);

    if (presenceResponse.ok) {
      const presenceData = await presenceResponse.json();
      console.log('✅ Direct presence fetch successful');
      console.log('📊 Response:', JSON.stringify(presenceData, null, 2));
    } else {
      console.log('❌ Direct presence fetch failed:', await presenceResponse.text());
    }

    // Test 5: Add anonymous user
    console.log('\n5. Testing anonymous user presence...');
    const anonLoginResponse = await fetch(`${TEST_URL}/api/v1/auth/anonymous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'anon_test_user',
        displayName: 'Anonymous Test User',
        sessionId: 'test-session-123'
      })
    });

    if (anonLoginResponse.ok) {
      console.log('✅ Anonymous user created');

      // Send heartbeat for anonymous user
      const anonHeartbeatResponse = await fetch(`${TEST_URL}/api/v1/users/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'anon_test_user',
          displayName: 'Anonymous Test User',
          isAnonymous: true
        })
      });

      if (anonHeartbeatResponse.ok) {
        const anonHeartbeatData = await anonHeartbeatResponse.json();
        console.log('✅ Anonymous user heartbeat successful');
        console.log(`👥 Total online users: ${anonHeartbeatData.totalOnline}`);
      }
    }

    // Test 6: Final presence check
    console.log('\n6. Final presence check...');
    const finalPresenceResponse = await fetch(`${TEST_URL}/api/v1/presence`);

    if (finalPresenceResponse.ok) {
      const finalPresenceData = await finalPresenceResponse.json();
      console.log('✅ Final presence check successful');
      console.log(`📊 Total online: ${finalPresenceData.total}`);

      if (finalPresenceData.users && finalPresenceData.users.length > 0) {
        console.log('👥 Online users:');
        finalPresenceData.users.forEach(user => {
          const lastSeenDate = new Date(user.lastSeen);
          console.log(`   - ${user.displayName} (${user.username}) - Last seen: ${lastSeenDate.toLocaleTimeString()} ${user.isAnonymous ? '[Anonymous]' : ''}`);
        });
      } else {
        console.log('❌ No users showing as online');
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testPresenceSystem();