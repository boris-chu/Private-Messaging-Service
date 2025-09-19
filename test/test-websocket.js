const WebSocket = require('ws');

// Test WebSocket connection to local server
const ws = new WebSocket('ws://localhost:8787/');

ws.on('open', function open() {
  console.log('✅ WebSocket connected');

  // Send authentication message
  const authMessage = {
    type: 'auth',
    username: 'testuser1'
  };

  console.log('📤 Sending auth message:', authMessage);
  ws.send(JSON.stringify(authMessage));
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    console.log('📥 Received message:', parsed);
  } catch (e) {
    console.log('📥 Received raw data:', data.toString());
  }
});

ws.on('close', function close(code, reason) {
  console.log('❌ WebSocket closed:', code, reason.toString());
});

ws.on('error', function error(err) {
  console.error('💥 WebSocket error:', err);
});

// Keep alive for testing
setTimeout(() => {
  console.log('🔌 Disconnecting...');
  ws.close();
}, 5000);