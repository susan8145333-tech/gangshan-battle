const ZONES = buildZones();
const CLASS_COLORS = { '502': '#2563eb', '503': '#dc2626' };
const ROAD_TERRITORIES = [];
const MEGA_TERRITORIES = ['A棟', 'B棟', 'C棟', '後北棟', '前北棟', '操場', '籃球場', '活動中心', '廚房'];
let data = null;

const $ = selector => document.querySelector(selector);

function buildZones() {
  const zones = {};
  const add = (name, x, y, w = 54, h = 28) => {
    zones[name] = { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  };
  add('A棟', 205, 625, 890, 142);
  add('B棟', 850, 338, 188, 270);
  add('C棟', 78, 392, 188, 368);
  add('後北棟', 232, 184, 382, 92);
  add('前北棟', 600, 248, 288, 86);
  add('操場', 398, 404, 336, 104);
  add('籃球場', 255, 392, 126, 168);
  add('活動中心', 1055, 296, 96, 230);
  add('廚房', 918, 196, 126, 92);
  return zones;
}

async function loadState() {
  const res = await fetch('/api/state');
  data = await res.json();
  render();
}

function connectSocket() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.type !== 'state') return;
    data = message.data;
    render();
  };
  ws.onclose = () => setTimeout(connectSocket, 1500);
}

function render() {
  if (!data) return;
  renderClock();
  renderScores();
  renderMap();
  renderPowers();
  renderLeaders();
  renderEvents();
}

function renderClock() {
  $('#displayClock').textContent = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

function renderScores() {
  const totals = { '502': { score: 0, students: 0, lands: 0 }, '503': { score: 0, students: 0, lands: 0 } };
  Object.values(data.students || {}).forEach(student => {
    totals[student.classNum].score += student.score || 0;
    totals[student.classNum].students += 1;
  });
  Object.values(data.territories || {}).forEach(territory => {
    if (territory.ownerClass) totals[territory.ownerClass].lands += 1;
  });
  $('#display502Score').textContent = `${totals['502'].score} 分`;
  $('#display503Score').textContent = `${totals['503'].score} 分`;
  $('#display502Meta').textContent = `${totals['502'].students} 人 · ${totals['502'].lands} 地`;
  $('#display503Meta').textContent = `${totals['503'].students} 人 · ${totals['503'].lands} 地`;
}

function renderMap() {
  const svg = $('#displayMapSvg');
  svg.innerHTML = '';
  Object.entries(ZONES).forEach(([name, zone]) => {
    const territory = data.territories?.[name];
    if (!territory) return;
    const ownerClass = territory.ownerClass;
    const isRoad = ROAD_TERRITORIES.includes(name);
    const isMega = MEGA_TERRITORIES.includes(name);
    const fill = ownerClass ? CLASS_COLORS[ownerClass] : '#475569';
    svg.appendChild(svgEl('rect', {
      x: zone.x, y: zone.y, width: zone.w, height: zone.h, rx: 8,
      fill, 'fill-opacity': ownerClass ? 0.6 : isRoad ? 0.36 : isMega ? 0.3 : 0.22,
      stroke: fill, 'stroke-width': ownerClass ? 3 : isRoad || isMega ? 2.5 : 1.5,
      class: `zone ${isRoad ? 'road-zone' : ''} ${isMega ? 'mega-zone' : ''}`,
    }));
    svg.appendChild(svgEl('text', {
      x: zone.cx, y: /^[ABCD]\d/.test(name) ? zone.cy : zone.cy - 10,
      class: /^[ABCD]\d/.test(name) ? 'room-label zone-label' : isRoad ? 'road-label zone-label' : 'zone-label',
    }, name));
    if (ownerClass) {
      svg.appendChild(svgEl('text', {
        x: zone.cx, y: /^[ABCD]\d/.test(name) ? zone.cy + 11 : zone.cy + 15,
        class: /^[ABCD]\d/.test(name) ? 'room-sub zone-sub' : isRoad ? 'road-sub zone-sub' : 'zone-sub',
      }, `${ownerClass} ${territory.ownerStudentName || ''}`.slice(0, 13)));
    }
  });
  renderMapOverlay();
}

function renderMapOverlay() {
  const overlay = $('#displayMapOverlay');
  if (!overlay) return;
  overlay.innerHTML = Object.entries(ZONES).map(([name, zone]) => {
    const territory = data.territories?.[name];
    if (!territory) return '';
    const ownerClass = territory.ownerClass || '';
    const isMega = MEGA_TERRITORIES.includes(name);
    const isCompact = zone.w < 130 || zone.h < 120;
    const share502 = territory.maxHp ? Math.round(((territory.progress?.['502'] || 0) / territory.maxHp) * 100) : 0;
    const share503 = territory.maxHp ? Math.round(((territory.progress?.['503'] || 0) / territory.maxHp) * 100) : 0;
    const compactProgressHtml = compactProgressLabel(share502, share503);
    const ownerMeta = ownerClass ? mapOwnerMeta(territory, isCompact) : '';
    return `
      <div
        class="map-zone-card display-zone-card ${isMega ? 'mega-card' : ''} ${isCompact ? 'compact-card' : ''} ${ownerClass ? `owner-${ownerClass}` : ''}"
        style="left:${(zone.x / 1243) * 100}%;top:${(zone.y / 888) * 100}%;width:${(zone.w / 1243) * 100}%;height:${(zone.h / 888) * 100}%;"
      >
        <span>${escapeHtml(name)}</span>
        <div class="zone-scoreline"><b>502 ${share502}%</b><b>503 ${share503}%</b></div>
        ${ownerMeta ? `<small class="zone-owner-name">${escapeHtml(ownerMeta)}</small>` : '<small class="zone-owner-name">尚未領先</small>'}
        ${isCompact ? compactProgressHtml : ''}
        <div class="zone-battle-bar" aria-hidden="true">
          <i class="bar-502" style="width:${share502}%"></i>
          <i class="bar-503" style="width:${share503}%"></i>
        </div>
      </div>
    `;
  }).join('');
}

function compactProgressLabel(share502, share503) {
  return `
    <small class="zone-status compact-zone-status">
      <b>502 ${share502}</b>
      <b>503 ${share503}</b>
    </small>`;
}

function mapOwnerMeta(territory, isCompact = false) {
  const name = territory.ownerStudentName || '領先';
  if (!isCompact) return `${territory.ownerClass} ${name}`.trim();
  const shortName = name === '領先' ? name : name.slice(0, 1).toUpperCase();
  return `${territory.ownerClass} ${shortName}`.trim();
}

function renderPowers() {
  $('#displayPowers').innerHTML = (data.territoryPowers || []).map(power => {
    const owner = power.activeClass || data.territories?.[power.name]?.ownerClass;
    return `
      <div class="power-row ${owner ? `owner-${owner}` : ''}">
        <strong>${escapeHtml(power.name)}</strong>
        <span>${owner ? `${owner} 啟動` : power.type === 'line' ? '待連線' : '待爭奪'}</span>
        <small>${escapeHtml(power.effect)}</small>
      </div>`;
  }).join('');
}

function renderLeaders() {
  const rows = (data.rankings || data.leaderboard || []).slice(0, 10);
  const total = (data.rankings || data.leaderboard || []).length;
  $('#displayRankingCount').textContent = `${total} 人`;
  $('#displayLeaders').innerHTML = rows.length
    ? rows.map(row => `
      <div class="display-rank-row rank-${row.rank <= 3 ? row.rank : 'normal'} class-${row.classNum}">
        <b>#${row.rank}</b>
        <span>
          <strong>${row.classNum} ${escapeHtml(row.name)}</strong>
          <small>${escapeHtml(row.levelName || '')} · ${row.lands} 地 · ${row.answered} 題 · 攻 ${row.attackPower}</small>
        </span>
        <em>${row.score} 分</em>
      </div>
    `).join('')
    : '<div class="display-rank-empty">等待學生加入。</div>';
}

function renderEvents() {
  $('#displayEvents').innerHTML = (data.events || []).slice(0, 8).map(event => `
    <div class="display-event">${escapeHtml(event.text)}</div>
  `).join('') || '<div class="display-event">等待第一場攻佔。</div>';
}

function svgEl(name, attrs, text = '') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  if (text) el.textContent = text;
  return el;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

setInterval(renderClock, 30000);
loadState();
connectSocket();
