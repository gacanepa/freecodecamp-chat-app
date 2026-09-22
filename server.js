import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';

const PORT = 3001;
const PUBLIC_DIR = './public';

const server = http.createServer((req, res) => {
  // Determine which file is requested (index.html, script.js, etc.)
  const filePath = path.join(PUBLIC_DIR, `${req.url === '/' ? './index.html' : '.' + req.url}`);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('500 - Internal Server Error');
      return;
    }

    res.writeHead(200);
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket, req) => {
  const username = new URL(
    req.url,
    'http://localhost').searchParams.get('username') || 'Anonymous';
  const joinedMessage = JSON.stringify({
    type: 'system',
    text: `${username} joined`
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(joinedMessage);
    }
  });
  socket.on('message', rawData => {
    const chatMessage = JSON.stringify({
      type: 'chat',
      username,
      text: JSON.parse(rawData.toString()).text,
    });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(chatMessage);
      }
    });
  });
  socket.on('close', () => {
    const leaveMessage = JSON.stringify({
      type: 'system',
      text: `${username} left`,
    });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(leaveMessage);
      }
    });
  });
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
