const roomId = location.pathname.split('/')[2];
const player = document.getElementById('player');
const emptyState = document.getElementById('empty-state');
const addForm = document.getElementById('add-form');
const addInput = document.getElementById('add-input');
const currentBlock = document.getElementById('current-block');
const queueList = document.getElementById('queue-list');

let state = { queue: [], current: null, playing: false, position: 0, updatedAt: Date.now() };
let loadedUrl = null;

navigator.serviceWorker.register('/uv.sw.js', { scope: '/' });

const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/${roomId}`);

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'state') {
    state = msg;
    render();
    return;
  }
  if (msg.type === 'play' || msg.type === 'pause' || msg.type === 'seek') {
    state.playing = msg.type !== 'pause';
    state.position = msg.position;
    state.updatedAt = msg.updatedAt;
    sendToFrame(msg.type, msg.position);
  }
};

function sendToFrame(type, position) {
  player.contentWindow?.postMessage({ source: 'wt-control', type, position }, '*');
}

function effectivePosition() {
  if (!state.playing) return state.position;
  return state.position + (Date.now() - state.updatedAt) / 1000;
}

function loadCurrent() {
  if (!state.current) {
    player.src = 'about:blank';
    loadedUrl = null;
    emptyState.style.display = 'flex';
    return;
  }
  emptyState.style.display = 'none';
  if (loadedUrl === state.current.url) return;
  loadedUrl = state.current.url;
  const encoded = self.__uv$config.encodeUrl(state.current.url);
  player.src = self.__uv$config.prefix + encoded;
  player.onload = () => {
    try {
      const doc = player.contentDocument;
      const s = doc.createElement('script');
      s.src = '/sync-inject.js';
      doc.head.appendChild(s);
      s.onload = () => sendToFrame(state.playing ? 'play' : 'pause', effectivePosition());
    } catch {}
  };
}

function render() {
  loadCurrent();
  currentBlock.textContent = state.current ? state.current.title : 'Ничего не играет';
  queueList.innerHTML = '';
  for (const item of state.queue) {
    const row = document.createElement('div');
    row.className = 'queue-item';
    const span = document.createElement('span');
    span.textContent = item.title;
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.onclick = () => ws.send(JSON.stringify({ type: 'remove', id: item.id }));
    row.append(span, btn);
    queueList.appendChild(row);
  }
}

addForm.onsubmit = (e) => {
  e.preventDefault();
  const url = addInput.value.trim();
  if (!url) return;
  ws.send(JSON.stringify({ type: 'add', url, title: url }));
  addInput.value = '';
};

window.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg || msg.source !== 'wt-sync') return;
  ws.send(JSON.stringify({ type: msg.type, position: msg.position }));
});
