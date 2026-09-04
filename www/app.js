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

const NG_SHIELD_PATH =
  'M2 28.8288V5C2 3.34 2.56887 2 4.22887 2H35C36.66 2 38 3.34 38 5V28.8288C38 30.387 37.136 31.8101 35.7711 32.5L21.7711 39.5768C20.6547 40.1411 19.3453 40.1411 18.2289 39.5768L4.22888 32.5C2.86401 31.8101 2 30.387 2 28.8288Z';
const NG_ICON_PATH =
  'M20.5035 17.9345C20.9321 19.1409 22.6463 20.2925 22.83 19.078C22.8923 18.6663 22.7547 18.1522 22.6029 17.5848C22.3069 16.4788 21.9567 15.1705 22.928 14.0243C23.6521 13.1697 24.4087 12.719 25.2105 12.2414C26.0355 11.7499 26.9085 11.2299 27.8434 10.2118C27.8434 10.2118 29 9.31251 29 7.50001C29 6.50002 28.2812 6.70001 26 6.70001H8.3428C6.34954 6.70001 6.43977 8.00002 6.43995 12.18C6.44 13.34 7.26761 15.018 7.65956 15.8821C7.89526 16.4017 8.13366 16.9363 8.34276 17.45C8.75028 18.4511 10.8303 19.296 12.9692 20.1649L13.0369 20.1925C15.2145 21.0772 17.1978 21.5198 18 23.0708C18.5472 24.1289 18.5041 24.7467 18.4561 25.4358C18.3802 26.5252 18.4561 27.3363 19 28.1888C19.166 28.449 19.4418 28.7426 19.7126 29.0404C20.3158 29.7041 20.8135 30.7208 20.603 31.6012C20.192 33.3193 19.1191 35.8477 21.9701 34.4978L23.1209 33.916C25.2636 32.8329 27.5936 27.805 29.3686 26.1672C29.8 25.7691 30.2116 25.3488 30.5346 24.905C30.8838 24.4253 30.8752 23.7615 30.4895 23.3121C28.5252 21.0236 25.9682 21.8336 23.4974 22.1013L23.4974 22.1013C22.0058 22.2629 20.6982 22.4046 20 22.0472C19.6367 21.8613 19.2621 21.6887 18.8957 21.5198C17.2442 20.7587 15.7574 20.0735 16.2178 18.5926C16.7002 17.0407 19.6914 15.6487 20.5035 17.9345Z';

function ngLogoSvg(color) {
  return `
    <svg viewBox="0 0 40 40">
      <path fill="${color}" d="${NG_SHIELD_PATH}" />
      <path fill="#ffffff" d="${NG_ICON_PATH}" />
    </svg>
  `;
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
  const pickerBtn = document.getElementById('server-picker-btn');
  const pickerIcon = document.getElementById('server-picker-icon');
  const pickerLabel = document.getElementById('server-picker-label');
  const modal = document.getElementById('server-picker-modal');
  const list = document.getElementById('server-picker-list');
  const closeBtn = document.getElementById('server-picker-close');
  const countLine = document.getElementById('server-count');
  const joinBtn = document.getElementById('join-btn');

  let selected = null;

  function selectServer(server) {
    selected = server;
    pickerIcon.innerHTML = ngLogoSvg(server.color || '#003366');
    pickerLabel.textContent = server.name;
    joinBtn.disabled = !server.address;
    countLine.textContent = '';
    refreshServerCount(server, countLine);
    modal.hidden = true;
  }

  (config.servers || []).forEach((server) => {
    const row = document.createElement('div');
    const hasAddress = Boolean(server.address);
    row.className = 'server-picker-row' + (hasAddress ? '' : ' disabled');
    row.innerHTML = `
      <div class="server-icon-badge">${ngLogoSvg(server.color || '#003366')}</div>
      <div>
        <span class="server-name">${server.name}</span>
        <span class="server-address">${hasAddress ? server.address + ':' + server.port : 'non configuré'}</span>
      </div>
    `;
    if (hasAddress) {
      row.addEventListener('click', () => selectServer(server));
    }
    list.appendChild(row);
  });

  pickerBtn.addEventListener('click', () => {
    modal.hidden = false;
  });
  closeBtn.addEventListener('click', () => {
    modal.hidden = true;
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  joinBtn.addEventListener('click', () => {
    if (!selected || !selected.address) return;
    openUri(connectUri(selected.address, selected.port));
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

async function setupArticles() {
  const list = document.getElementById('news-list');
  list.textContent = 'Chargement...';
  try {
    const articles = await relayGet('/articles');
    list.innerHTML = '';
    if (!articles.length) {
      list.textContent = 'Aucune actualité trouvée.';
      return;
    }
    articles.forEach((article) => {
      const el = document.createElement('div');
      el.className = 'news-item';
      el.innerHTML = `
        <img class="news-thumb" src="${article.image}" alt="" />
        <div>
          <span class="news-date">${article.date}</span>
          <div class="news-title">${article.title}</div>
        </div>
      `;
      el.addEventListener('click', () => openUri(article.url));
      list.appendChild(el);
    });
  } catch (err) {
    list.innerHTML = `<span class="profile-error">Impossible de charger les actualités (${err.message})</span>`;
  }
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
  safe('articles', setupArticles);
  safe('info-card', setupInfoCard);
}

init();
