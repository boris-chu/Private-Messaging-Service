const WebSocket = require('ws');

console.log('🔗 Testing simple WebSocket connection...');
const ws = new WebSocket('ws://localhost:8787/');

ws.on('open', () => {
  console.log('✅ WebSocket connected');

  // Send a simple message and wait for response
  console.log('📤 Sending simple message...');
  ws.send('hello');

  // Wait for any response
  setTimeout(() => {
    console.log('🔌 Closing connection');
    ws.close();
  }, 3000);
});

ws.on('message', (data) => {
  console.log('📥 Received:', data.toString());
});

ws.on('close', (code, reason) => {
  console.log(`❌ Closed: ${code} (${reason || 'No reason'})`);
});

ws.on('error', (error) => {
  console.error('💥 Error:', error.message);
});