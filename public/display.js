const ZONES = buildZones();
const CLASS_COLORS = { '502': '#2563eb', '503': '#dc2626' };
const ROAD_TERRITORIES = ['北門道路', '東門道路', '南門道路', '西門道路', '維仁路30巷', '柳橋東路'];
const MEGA_TERRITORIES = ['操場', '籃球場', '活動中心', '廚房'];
let data = null;

const $ = selector => document.querySelector(selector);

function buildZones() {
  const zones = {};
  const add = (name, x, y, w = 54, h = 28) => {
    zones[name] = { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  };
  const addRow = (names, xs, y, w = 54, h = 28) => names.forEach((name, i) => add(name, xs[i], y, w, h));

  add('A001', 255, 744, 310, 30); add('A002', 760, 744, 300, 30);
  addRow(['A101', 'A102', 'A103', 'A104'], [255, 345, 435, 525], 712);
  addRow(['A105', 'A106', 'A107', 'A108'], [620, 760, 900, 1040], 712);
  addRow(['A201', 'A202', 'A203', 'A204'], [255, 345, 435, 525], 678);
  addRow(['A205', 'A206', 'A207', 'A208', 'A209', 'A210', 'A211'], [620, 700, 780, 860, 940, 1020, 1100], 678, 50, 26);
  addRow(['A301', 'A302', 'A303', 'A304'], [255, 345, 435, 525], 642);
  addRow(['A305', 'A306', 'A307', 'A308', 'A309', 'A310', 'A311'], [620, 700, 780, 860, 940, 1020, 1100], 642, 50, 26);
  add('A401', 520, 594, 70, 30); add('A402', 610, 594, 120, 30); add('A403', 560, 626, 175, 30);
  ['B105', 'B104', 'B103', 'B102', 'B101'].forEach((name, i) => add(name, 835, 330 + i * 52, 54, 32));
  ['B206', 'B205', 'B204', 'B203', 'B202', 'B201'].forEach((name, i) => add(name, 895, 330 + i * 45, 54, 30));
  add('B302', 945, 330, 54, 32); add('B301', 945, 548, 54, 32);
  ['B407', 'B406', 'B405', 'B404', 'B403', 'B402', 'B401'].forEach((name, i) => add(name, 965, 330 + i * 38, 54, 28));
  ['C301', 'C302', 'C303', 'C304', 'C305', 'C306'].forEach((name, i) => add(name, 88, 390 + i * 58, 54, 36));
  ['C201', 'C202', 'C203', 'C204'].forEach((name, i) => add(name, 145, 430 + i * 70, 54, 38));
  ['C101', 'C102', 'C103', 'C104', 'C105', 'C106'].forEach((name, i) => add(name, 205, 390 + i * 58, 54, 36));
  addRow(['D406', 'D405', 'D404', 'D403', 'D402', 'D401'], [230, 295, 360, 425, 490, 545], 160, 55, 24);
  addRow(['D310', 'D309', 'D308', 'D307', 'D306', 'D305'], [230, 295, 360, 425, 490, 545], 190, 55, 24);
  addRow(['D210', 'D209', 'D208', 'D207', 'D206', 'D205'], [230, 295, 360, 425, 490, 545], 220, 55, 24);
  addRow(['D110', 'D109', 'D108', 'D107', 'D106', 'D105'], [230, 295, 360, 425, 490, 545], 250, 55, 24);
  addRow(['D304', 'D303', 'D302', 'D301'], [590, 660, 740, 810], 220, 58, 28);
  addRow(['D204', 'D203', 'D202', 'D201'], [590, 660, 740, 810], 255, 58, 28);
  addRow(['D104', 'D103', 'D102', 'D101'], [590, 660, 740, 810], 290, 58, 28);
  add('操場', 392, 395, 340, 116);
  add('籃球場', 238, 395, 100, 150);
  add('活動中心', 1065, 285, 92, 230);
  add('廚房', 900, 180, 126, 104);
  add('北門道路', 585, 112, 300, 44);
  add('東門道路', 1154, 470, 48, 255);
  add('南門道路', 740, 806, 380, 44);
  add('西門道路', 35, 255, 48, 510);
  add('維仁路30巷', 210, 112, 370, 44);
  add('柳橋東路', 210, 806, 520, 44);
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
