function safe(label, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`[${label}]`, err);
  }
}

function openUri(uri) {
  // Native shim installed in MainActivity hands non-http(s) schemes off to
  // Android's intent resolver (see MainActivity.java). Fallback to a plain
  // navigation for anything running outside the wrapped app (e.g. browser testing).
  window.location.href = uri;
}

function connectUri(address, port) {
  return `minecraft://connect?serverUrl=${encodeURIComponent(address)}&serverPort=${port}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function skinFaceUrl(username, size = 128) {
  return `https://skins.nationsglory.fr/face/${encodeURIComponent(username)}/${size}`;
}

let config = { relay: {}, links: {}, servers: [] };

async function relayGet(pathSegment) {
  const baseUrl = config.relay && config.relay.baseUrl;
  if (!baseUrl) throw new Error('Relais non configuré');
  const res = await fetch(`${baseUrl}${pathSegment}`);
  if (!res.ok) throw new Error(`Le relais a répondu ${res.status}`);
  return res.json();
}

function setupSolo() {
  document.getElementById('solo-btn').addEventListener('click', () => {
    openUri('minecraft://');
  });
}

function setupLinks() {
  document.getElementById('wiki-btn').addEventListener('click', () => {
    if (config.links && config.links.wiki) openUri(config.links.wiki.url);
  });
  document.getElementById('codex-btn').addEventListener('click', () => {
    if (config.links && config.links.codex) openUri(config.links.codex.url);
  });
}

async function refreshServerCount(server, countLine) {
  if (!server.apiKey) return;
  try {
    const data = await relayGet('/playercount');
    const entry = data[server.apiKey];
    if (entry && typeof entry.players === 'number') {
      countLine.textContent = `${entry.players} connecté${entry.players === 1 ? '' : 's'}`;
    }
  } catch (err) {
    console.error('[server-count]', err);
  }
}

function setupServerSelect() {
  const select = document.getElementById('server-select');
  const countLine = document.getElementById('server-count');
  const joinBtn = document.getElementById('join-btn');

  (config.servers || []).forEach((server) => {
    const opt = document.createElement('option');
    opt.value = server.name;
    opt.textContent = server.address ? server.name : `${server.name} (non configuré)`;
    if (!server.address) opt.disabled = true;
    select.appendChild(opt);
  });

  function currentServer() {
    return (config.servers || []).find((s) => s.name === select.value);
  }

  select.addEventListener('change', () => {
    const server = currentServer();
    joinBtn.disabled = !server || !server.address;
    countLine.textContent = '';
    if (server) refreshServerCount(server, countLine);
  });

  joinBtn.addEventListener('click', () => {
    const server = currentServer();
    if (!server || !server.address) return;
    openUri(connectUri(server.address, server.port));
  });
}

function setLocked(locked) {
  document.getElementById('info-edit').hidden = locked;
  document.getElementById('info-summary').hidden = !locked;
}

async function refreshProfile() {
  const pseudo = document.getElementById('pseudo-input').value.trim();
  if (!pseudo) return;

  document.getElementById('skin-face').src = skinFaceUrl(pseudo, 128);

  const usernameEl = document.getElementById('profile-username');
  const crownEl = document.getElementById('profile-crown');
  const descEl = document.getElementById('profile-description');
  const lastConnEl = document.getElementById('profile-last-connection');

  usernameEl.textContent = pseudo;
  descEl.textContent = 'Chargement...';

  try {
    const data = await relayGet(`/user/${encodeURIComponent(pseudo)}`);
    usernameEl.textContent = data.username || pseudo;
    crownEl.hidden = !data.is_prime;
    descEl.textContent = data.description || 'Aucune description.';
    descEl.classList.remove('profile-error');
    lastConnEl.textContent = formatDate(data.last_connection);
  } catch (err) {
    descEl.textContent = `Erreur : ${err.message}`;
    descEl.classList.add('profile-error');
  }
}

function setupInfoCard() {
  const pseudoInput = document.getElementById('pseudo-input');
  const confirmBtn = document.getElementById('pseudo-confirm');
  const gearBtn = document.getElementById('info-gear');

  pseudoInput.value = localStorage.getItem('ngbe.pseudo') || '';
  pseudoInput.addEventListener('input', () => {
    localStorage.setItem('ngbe.pseudo', pseudoInput.value);
  });

  function tryLock() {
    if (pseudoInput.value.trim()) {
      setLocked(true);
      refreshProfile();
    }
  }

  confirmBtn.addEventListener('click', tryLock);
  pseudoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryLock();
  });
  gearBtn.addEventListener('click', () => setLocked(false));

  const shouldStartLocked = Boolean(pseudoInput.value.trim());
  setLocked(shouldStartLocked);
  if (shouldStartLocked) refreshProfile();
}

async function init() {
  try {
    const res = await fetch('servers.json');
    config = await res.json();
  } catch (err) {
    console.error('[config]', err);
  }

  safe('solo-btn', setupSolo);
  safe('links', setupLinks);
  safe('server-select', setupServerSelect);
  safe('info-card', setupInfoCard);
}

init();
