const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { nanoid } = require('nanoid');
const { createBareServer } = require('@tomphttp/bare-server-node');
const path = require('path');

const app = express();
const server = http.createServer();
const bare = createBareServer('/bare/');
const wss = new WebSocketServer({ noServer: true });

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UV_DIR = path.join(__dirname, '..', 'node_modules', '@titaniumnetwork-dev', 'ultraviolet', 'dist');

app.get('/uv.sw.js', (req, res) => res.sendFile(path.join(UV_DIR, 'uv.sw.js')));
app.use('/uv/', express.static(UV_DIR));

app.get('/', (req, res) => res.redirect(`/r/${nanoid(6)}`));
app.get('/r/:id', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.use(express.static(PUBLIC_DIR));

const rooms = new Map();

function getRoom(id) {
  if (!rooms.has(id)) {
    rooms.set(id, {
      id,
      queue: [],
      current: null,
      playing: false,
      position: 0,
      updatedAt: Date.now(),
      clients: new Set(),
    });
  }
  return rooms.get(id);
}

function broadcast(room, msg, except) {
  const data = JSON.stringify(msg);
  for (const ws of room.clients) {
    if (ws !== except && ws.readyState === ws.OPEN) ws.send(data);
  }
}

function snapshot(room) {
  return {
    type: 'state',
    queue: room.queue,
    current: room.current,
    playing: room.playing,
    position: room.position,
    updatedAt: room.updatedAt,
  };
}

function advanceQueue(room) {
  room.current = room.queue.shift() || null;
  room.playing = !!room.current;
  room.position = 0;
  room.updatedAt = Date.now();
}

wss.on('connection', (ws, req, roomId) => {
  const room = getRoom(roomId);
  room.clients.add(ws);
  ws.send(JSON.stringify(snapshot(room)));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === 'add') {
      const item = { id: nanoid(8), url: msg.url, title: msg.title || msg.url };
      if (!room.current) {
        room.current = item;
        room.playing = true;
        room.position = 0;
      } else {
        room.queue.push(item);
      }
      room.updatedAt = Date.now();
      broadcast(room, snapshot(room));
      return;
    }

    if (msg.type === 'remove') {
      room.queue = room.queue.filter((i) => i.id !== msg.id);
      broadcast(room, snapshot(room));
      return;
    }

    if (msg.type === 'skip') {
      advanceQueue(room);
      broadcast(room, snapshot(room));
      return;
    }

    if (msg.type === 'play' || msg.type === 'pause' || msg.type === 'seek') {
      room.playing = msg.type !== 'pause';
      if (typeof msg.position === 'number') room.position = msg.position;
      room.updatedAt = Date.now();
      broadcast(room, { type: msg.type, position: room.position, updatedAt: room.updatedAt }, ws);
      return;
    }
  });

  ws.on('close', () => {
    room.clients.delete(ws);
    if (room.clients.size === 0 && room.queue.length === 0 && !room.current) {
      rooms.delete(roomId);
    }
  });
});

server.on('request', (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on('upgrade', (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
    return;
  }
  const url = new URL(req.url, 'http://x');
  const match = url.pathname.match(/^\/ws\/([a-zA-Z0-9_-]+)$/);
  if (!match) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, match[1]);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`reelsync on :${PORT}`));
