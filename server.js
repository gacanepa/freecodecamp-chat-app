import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';

const PORT = 3001;
const PUBLIC_DIR = './public';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

const server = http.createServer((req, res) => {
  const filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? '404 - Not Found' : '500 - Internal Server Error');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket, req) => {
  const username = new URL(req.url, 'http://localhost').searchParams.get(
    'username',
  ) || 'Anonymous';
  const joinedMessage = JSON.stringify({
    type: 'system',
    text: `${username} joined`
  });
  wss.clients.forEach((client) => {
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
    wss.clients.forEach((client) => {
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