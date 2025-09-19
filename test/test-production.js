const WebSocket = require('ws');

console.log('🔗 Testing production WebSocket with hibernation API...');
const ws = new WebSocket('wss://api.axolchat.cc/');

let messagesSent = 0;
let messagesReceived = 0;

ws.on('open', () => {
  console.log('✅ Production WebSocket connected');

  // Send auth message
  const authMessage = { type: 'auth', username: 'testuser_prod' };
  console.log('📤 Sending auth message:', authMessage);
  ws.send(JSON.stringify(authMessage));
  messagesSent++;

  // Send user list request
  setTimeout(() => {
    const userListMessage = { type: 'user_list_request' };
    console.log('📤 Sending user_list_request:', userListMessage);
    ws.send(JSON.stringify(userListMessage));
    messagesSent++;
  }, 2000);

  // Close after 8 seconds
  setTimeout(() => {
    console.log('🔌 Disconnecting...');
    ws.close();
  }, 8000);
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
});

ws.on('error', (error) => {
  console.error('💥 WebSocket error:', error.message);
});