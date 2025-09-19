const WebSocket = require('ws');

function testWebSocket() {
  return new Promise((resolve) => {
    console.log('🔗 Connecting to WebSocket...');
    const ws = new WebSocket('ws://localhost:8787/');

    let messagesSent = 0;
    let messagesReceived = 0;

    ws.on('open', () => {
      console.log('✅ WebSocket connected');

      // Send auth message immediately
      const authMessage = { type: 'auth', username: 'testuser1' };
      console.log('📤 Sending auth message:', authMessage);
      ws.send(JSON.stringify(authMessage));
      messagesSent++;

      // Send another message after 1 second
      setTimeout(() => {
        const pingMessage = { type: 'ping' };
        console.log('📤 Sending ping message:', pingMessage);
        ws.send(JSON.stringify(pingMessage));
        messagesSent++;
      }, 1000);

      // Send user list request after 2 seconds
      setTimeout(() => {
        const userListMessage = { type: 'user_list_request' };
        console.log('📤 Sending user_list_request:', userListMessage);
        ws.send(JSON.stringify(userListMessage));
        messagesSent++;
      }, 2000);

      // Close after 5 seconds
      setTimeout(() => {
        console.log('🔌 Disconnecting...');
        ws.close();
      }, 5000);
    });

    ws.on('message', (data) => {
      messagesReceived++;
      try {
        const message = JSON.parse(data);
        console.log('📥 Received message:', message);
      } catch (e) {
        console.log('📥 Received raw data:', data.toString());
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`❌ WebSocket closed: ${code}${reason ? ` (${reason})` : ''}`);
      console.log(`📊 Summary: Sent ${messagesSent}, Received ${messagesReceived}`);
      resolve();
    });

    ws.on('error', (error) => {
      console.error('💥 WebSocket error:', error.message);
      resolve();
    });
  });
}

testWebSocket().then(() => {
  console.log('Test completed');
});