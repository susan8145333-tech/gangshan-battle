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
  add('A棟', 250, 642, 870, 132);
  add('B棟', 835, 330, 185, 250);
  add('C棟', 88, 390, 170, 376);
  add('後北棟', 230, 160, 370, 118);
  add('前北棟', 590, 220, 280, 105);
  add('操場', 392, 395, 340, 116);
  add('籃球場', 238, 395, 100, 150);
  add('活動中心', 1065, 285, 92, 230);
  add('廚房', 900, 180, 126, 104);
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
  $('#displayLeaders').innerHTML = (data.leaderboard || []).map(row => `
    <div class="leader-row">
      <b>#${row.rank}</b>
      <span>${row.classNum} ${escapeHtml(row.name)}</span>
      <small>${row.score}分 · ${escapeHtml(row.roleName || '')} · ${row.lands}地</small>
    </div>
  `).join('') || '<small>等待學生加入。</small>';
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
