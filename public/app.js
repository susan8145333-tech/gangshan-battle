const ZONES = buildZones();

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

  addRow(['B105', 'B104', 'B103', 'B102', 'B101'], [835, 835, 835, 835, 835], 330, 54, 26);
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
  return zones;
}

const CLASS_COLORS = {
  '502': '#2563eb',
  '503': '#dc2626',
};

const pageParams = new URLSearchParams(location.search);

const state = {
  selectedClass: '',
  student: null,
  data: null,
  questions: [],
  trialLevel: ['classroom', 'festival'].includes(pageParams.get('trialLevel')) ? pageParams.get('trialLevel') : '',
  target: '',
  currentQuestion: null,
  questionNumber: 0,
  recorder: null,
  chunks: [],
  recordBlob: null,
  stream: null,
  recognition: null,
  transcript: '',
  speechSupported: false,
  speechScore: 0,
  recordStartAt: 0,
  audioCtx: null,
};

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function soundContext() {
  if (!state.audioCtx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    state.audioCtx = new AudioCtor();
  }
  if (state.audioCtx.state === 'suspended') state.audioCtx.resume();
  return state.audioCtx;
}

function tone(freq, start, duration, type = 'sine', volume = 0.08) {
  const ctx = soundContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

function playSound(kind) {
  const patterns = {
    select: [[440, 0, 0.08, 'triangle', 0.04]],
    correct: [[523, 0, 0.08], [659, 0.08, 0.09], [784, 0.16, 0.12]],
    wrong: [[220, 0, 0.12, 'sawtooth', 0.06], [165, 0.13, 0.14, 'sawtooth', 0.05]],
    attack: [[130, 0, 0.08, 'square', 0.06], [196, 0.08, 0.10, 'square', 0.06]],
    capture: [[392, 0, 0.09], [523, 0.09, 0.09], [659, 0.18, 0.12], [1046, 0.3, 0.16]],
    card: [[740, 0, 0.08, 'triangle', 0.06], [988, 0.09, 0.12, 'triangle', 0.06]],
    shield: [[330, 0, 0.10, 'triangle', 0.05], [494, 0.1, 0.16, 'triangle', 0.05]],
  };
  (patterns[kind] || patterns.select).forEach(args => tone(...args));
}

function pulseMap(kind) {
  const shell = document.querySelector('.map-shell');
  if (!shell) return;
  shell.classList.remove('map-hit', 'map-capture');
  void shell.offsetWidth;
  shell.classList.add(kind === 'capture' ? 'map-capture' : 'map-hit');
  setTimeout(() => shell.classList.remove('map-hit', 'map-capture'), 520);
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickQuestion() {
  const level = state.trialLevel || myLevelInfo()?.currentLevel || 'classroom';
  const pool = state.questions.filter(q => q.level === level);
  const q = (pool.length ? pool : state.questions)[Math.floor(Math.random() * (pool.length ? pool.length : state.questions.length))];
  state.currentQuestion = q;
  state.questionNumber += 1;
  return q;
}

function setHint(text) {
  $('#loginHint').textContent = text;
}

function setResult(text, kind = '') {
  const box = $('#resultBox');
  box.textContent = text;
  box.className = `result-box ${kind}`;
}

function classTotals() {
  const totals = {
    '502': { score: 0, lands: 0 },
    '503': { score: 0, lands: 0 },
  };
  Object.values(state.data?.students || {}).forEach(student => {
    totals[student.classNum].score += student.score || 0;
  });
  Object.values(state.data?.territories || {}).forEach(territory => {
    if (territory.ownerClass) totals[territory.ownerClass].lands += 1;
  });
  return totals;
}

async function loadState() {
  const res = await fetch('/api/state');
  state.data = await res.json();
  state.questions = state.data.questions || [];
  renderAll();
}

function connectSocket() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.type !== 'state') return;
    state.data = message.data;
    state.questions = message.data.questions || state.questions;
    if (state.student && state.data.students[state.student.id]) {
      state.student = state.data.students[state.student.id];
    }
    renderAll();
  };
  ws.onclose = () => setTimeout(connectSocket, 1500);
}

function chooseClass(classNum) {
  state.selectedClass = classNum;
  $$('.class-choice').forEach(button => {
    button.classList.toggle('active', button.dataset.class === classNum);
  });
}

async function login() {
  const loginButton = $('#loginButton');
  const name = $('#nameInput').value.trim();
  if (!state.selectedClass) {
    setHint('請先點選班級。');
    return;
  }
  if (!name) {
    setHint('請輸入英文名字。');
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = '登入中...';

  let payload;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classNum: state.selectedClass, name }),
    });
    payload = await res.json();
    if (!res.ok) {
      setHint(payload.error || '登入失敗。');
      return;
    }
  } catch (error) {
    setHint('連線失敗，請確認老師電腦的遊戲伺服器有開著。');
    return;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = '開始攻佔';
  }

  state.student = payload.student;
  state.data = payload.state;
  state.questions = payload.state.questions || [];
  localStorage.setItem('gangshan-class', state.selectedClass);
  localStorage.setItem('gangshan-name', name);
  $('#loginView').hidden = true;
  $('#gameView').hidden = false;
  resetQuestionArea();
  renderAll();
}

function renderAll() {
  if (!state.data) return;
  renderPlayer();
  renderScores();
  renderMap();
  renderEvents();
  renderShop();
  renderTargetInfo();
  renderLevel();
  renderLeaderboard();
}

function renderPlayer() {
  if (!state.student) return;
  $('#playerTitle').textContent = `${state.student.classNum} ${state.student.name}`;
  $('#myScore').textContent = state.student.score || 0;
  $('#myCoins').textContent = state.student.coins || 0;
  $('#myStreak').textContent = state.student.streak || 0;
  $('#myAttack').textContent = currentAttackPower();
}

function getLevelInfo(student) {
  const questions = state.questions || [];
  const stats = student.questionStats || {};
  const ids = questions.filter(q => q.level === 'classroom').map(q => q.id);
  const answered = ids.filter(id => (stats[id]?.attempts || 0) > 0).length;
  const attempts = ids.reduce((sum, id) => sum + (stats[id]?.attempts || 0), 0);
  const correct = ids.reduce((sum, id) => sum + (stats[id]?.correct || 0), 0);
  const accuracy = attempts ? correct / attempts : 0;
  const festivalUnlocked = ids.length > 0 && answered >= ids.length && accuracy >= 0.9;
  if (student.manualLevel === 'festival') {
    return {
      currentLevel: 'festival',
      currentLevelName: '第二關 節慶英語（老師開啟）',
      classroom: { total: ids.length, answered, attempts, correct, accuracy },
      manualMode: true,
    };
  }
  if (state.trialLevel === 'festival') {
    return {
      currentLevel: 'festival',
      currentLevelName: '老師試玩 第二關 節慶英語',
      classroom: { total: ids.length, answered, attempts, correct, accuracy },
      trialMode: true,
    };
  }
  return {
    currentLevel: festivalUnlocked ? 'festival' : 'classroom',
    currentLevelName: festivalUnlocked ? '第二關 節慶英語' : '第一關 課室英語',
    classroom: { total: ids.length, answered, attempts, correct, accuracy },
  };
}

function myLevelInfo() {
  return state.student ? getLevelInfo(state.student) : null;
}

function currentAttackPower() {
  const info = myLevelInfo();
  return 1 + (info?.currentLevel === 'festival' ? 1 : 0) + (state.student?.powerUps?.boost || 0);
}

function renderLevel() {
  const info = myLevelInfo();
  if (!info || !$('#levelBadge')) return;
  const c = info.classroom;
  const pct = Math.round((c.accuracy || 0) * 100);
  $('#levelBadge').textContent = info.trialMode
    ? '老師試玩 第二關 節慶英語 · 攻擊 +1'
    : info.manualMode
    ? '老師已開啟 第二關 節慶英語 · 攻擊 +1'
    : info.currentLevel === 'festival'
    ? '第二關 節慶英語 · 攻擊 +1'
    : `第一關 課室英語 · ${c.answered}/${c.total} · ${pct}%`;
}

function renderLeaderboard() {
  const list = $('#leaderboardList');
  if (!list || !state.data) return;
  const rows = state.data.leaderboard || [];
  list.innerHTML = rows.length
    ? rows.map((row, index) => `
      <div class="leader-row">
        <b>#${index + 1}</b>
        <span>${row.classNum} ${escapeHtml(row.name)}</span>
        <small>${escapeHtml(row.levelName)} · 攻${row.attackPower} · ${row.answered}題 · ${row.lands}地</small>
      </div>
    `).join('')
    : '<small>還沒有排行資料。</small>';
}

function renderScores() {
  const totals = classTotals();
  $('#score502').textContent = `${totals['502'].score} 分`;
  $('#score503').textContent = `${totals['503'].score} 分`;
  $('#land502').textContent = `${totals['502'].lands} 塊土地`;
  $('#land503').textContent = `${totals['503'].lands} 塊土地`;
}

function renderMap() {
  const svg = $('#mapSvg');
  if (!svg || !state.data) return;
  svg.innerHTML = '';
  const defs = svgEl('defs', {});
  defs.innerHTML = `
    <filter id="zoneGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#f59e0b" flood-opacity="0.9"/>
    </filter>
    <filter id="mineGlow" x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#facc15" flood-opacity="0.95"/>
    </filter>
  `;
  svg.appendChild(defs);

  Object.entries(ZONES).forEach(([name, zone]) => {
    const territory = state.data.territories[name];
    if (!territory) return;
    const ownerClass = territory?.ownerClass;
    const isRoom = /^[ABCD]\d/.test(name);
    const isMine = territory.ownerStudentId === state.student?.id;
    const fill = ownerClass ? CLASS_COLORS[ownerClass] : '#475569';
    const opacity = ownerClass ? (isMine ? 0.72 : 0.48) : 0.18;
    const selected = name === state.target;

    if (selected) {
      svg.appendChild(svgEl('rect', {
        x: zone.x - 6,
        y: zone.y - 6,
        width: zone.w + 12,
        height: zone.h + 12,
        rx: 12,
        fill: '#f59e0b',
        'fill-opacity': 0.18,
        stroke: '#f59e0b',
        'stroke-width': 4,
        filter: 'url(#zoneGlow)',
      }));
    }

    const rect = svgEl('rect', {
      x: zone.x,
      y: zone.y,
      width: zone.w,
      height: zone.h,
      rx: 8,
      fill,
      'fill-opacity': opacity,
      stroke: isMine ? '#facc15' : selected ? '#f59e0b' : fill,
      'stroke-width': isMine ? 5 : selected ? 5 : 2,
      filter: isMine ? 'url(#mineGlow)' : '',
      class: `zone ${ownerClass ? `owner-zone owner-${ownerClass}` : ''} ${isMine ? 'mine-zone' : ''}`,
    });
    rect.addEventListener('click', () => selectTerritory(name));
    svg.appendChild(rect);

    renderProgress(svg, territory, zone);

    svg.appendChild(svgEl('text', {
      x: zone.cx,
      y: isRoom ? zone.cy - 3 : zone.cy - 10,
      class: isRoom ? 'zone-label room-label' : 'zone-label',
    }, name));

    const sub = ownerClass
      ? `${territory.ownerStudentName || ownerClass}`
      : `502 ${territory.progress['502']}/${territory.maxHp} · 503 ${territory.progress['503']}/${territory.maxHp}`;
    svg.appendChild(svgEl('text', {
      x: zone.cx,
      y: isRoom ? zone.cy + 10 : zone.cy + 14,
      class: isRoom ? 'zone-sub room-sub' : 'zone-sub',
    }, isRoom && sub.length > 12 ? `${sub.slice(0, 12)}` : sub));

    if (ownerClass && isRoom) {
      svg.appendChild(svgEl('circle', {
        cx: zone.x + zone.w - 8,
        cy: zone.y + 8,
        r: isMine ? 8 : 6,
        fill: isMine ? '#facc15' : '#fff',
        stroke: CLASS_COLORS[ownerClass],
        'stroke-width': 2,
      }));
      svg.appendChild(svgEl('text', {
        x: zone.x + zone.w - 8,
        y: zone.y + 10,
        class: 'owner-initial',
      }, (territory.ownerStudentName || ownerClass).charAt(0).toUpperCase()));
      if (isMine || selected) {
        svg.appendChild(svgEl('text', {
          x: zone.cx,
          y: zone.y - 6,
          class: 'zone-crown',
        }, `${ownerClass} ${territory.ownerStudentName || ''}`.trim()));
      }
    }

    if (territory.shieldUntil > Date.now()) {
      svg.appendChild(svgEl('text', {
        x: zone.x + zone.w - 18,
        y: zone.y + 24,
        class: 'zone-sub',
      }, '盾'));
    }
  });
}

function renderProgress(svg, territory, zone) {
  if (!territory) return;
  const barWidth = zone.w - 16;
  const barY = zone.y + zone.h - 18;
  svg.appendChild(svgEl('rect', {
    x: zone.x + 8,
    y: barY,
    width: barWidth,
    height: 9,
    rx: 4,
    fill: 'rgba(15, 23, 42, 0.55)',
  }));

  if (territory.ownerClass) {
    const hpWidth = Math.max(0, (territory.hp / territory.maxHp) * barWidth);
    svg.appendChild(svgEl('rect', {
      x: zone.x + 8,
      y: barY,
      width: hpWidth,
      height: 9,
      rx: 4,
      fill: '#f8fafc',
    }));
    return;
  }

  const p502 = Math.max(0, (territory.progress['502'] / territory.maxHp) * barWidth);
  const p503 = Math.max(0, (territory.progress['503'] / territory.maxHp) * barWidth);
  svg.appendChild(svgEl('rect', {
    x: zone.x + 8,
    y: barY,
    width: p502,
    height: 9,
    rx: 4,
    fill: CLASS_COLORS['502'],
  }));
  svg.appendChild(svgEl('rect', {
    x: zone.x + zone.w - 8 - p503,
    y: barY,
    width: p503,
    height: 9,
    rx: 4,
    fill: CLASS_COLORS['503'],
  }));
}

function svgEl(name, attrs, text = '') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  if (text) el.textContent = text;
  return el;
}

function renderEvents() {
  const events = (state.data.events || []).slice(0, 12);
  $('#events').innerHTML = events.length
    ? events.map(event => `<span class="event-pill">${escapeHtml(event.text)}</span>`).join('')
    : '<span class="event-pill">還沒有戰況，先攻下一塊土地吧。</span>';
}

function selectTerritory(name) {
  if (!state.student) return;
  playSound('select');
  state.target = name;
  $('#targetName').textContent = name;
  renderTargetInfo();
  $('#mapPrompt').textContent = `正在攻打 ${name}`;
  renderMap();
  startQuestion();
}

function renderTargetInfo() {
  const owner = $('#targetOwner');
  const power = $('#targetPower');
  if (!owner || !power) return;
  const territory = state.target ? state.data?.territories?.[state.target] : null;
  if (!territory) {
    owner.textContent = '目前尚未被佔領';
    owner.className = 'target-owner';
    power.textContent = '先點地圖上的教室或據點。';
    return;
  }

  if (territory.ownerClass) {
    owner.textContent = `目前：${territory.ownerClass} ${territory.ownerStudentName || ''} 守擂中 · 血量 ${territory.hp}/${territory.maxHp}`;
    owner.className = `target-owner owner-${territory.ownerClass}`;
  } else {
    owner.textContent = `尚未佔領 · 502 ${territory.progress['502']}/${territory.maxHp} · 503 ${territory.progress['503']}/${territory.maxHp}`;
    owner.className = 'target-owner';
  }
  power.textContent = territory.power || '答題成功就能推進。';
}

function renderShop() {
  if (!state.student || !state.data || !$('#opponentSelect')) return;
  $('#boostBadge').textContent = `重擊 +${state.student.powerUps?.boost || 0}`;
  const cards = state.student.cards || {};
  $('#cardBoost').textContent = cards.boost || 0;
  $('#cardRepair').textContent = cards.repair || 0;
  $('#cardShield').textContent = cards.shield || 0;
  $('#cardSteal').textContent = cards.steal || 0;
  $('#cardFreeze').textContent = cards.freeze || 0;
  $('#cardRent').textContent = cards.rent || 0;
  $('#cardFlag').textContent = cards.flag || 0;

  const opponents = Object.values(state.data.students)
    .filter(student => student.id !== state.student.id)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  $('#opponentSelect').innerHTML = opponents.length
    ? opponents.map(student => {
      const owned = Object.values(state.data.territories).filter(t => t.ownerStudentId === student.id).length;
      return `<option value="${escapeHtml(student.id)}">${student.classNum} ${escapeHtml(student.name)} · ${owned} 地 · ${student.coins || 0} 金幣</option>`;
    }).join('')
    : '<option value="">等待其他同學加入</option>';
}

function startQuestion() {
  const q = pickQuestion();
  resetRecording();
  $('#questionCard').hidden = false;
  $('#recordCard').hidden = true;
  $('#nextButton').hidden = true;
  $('#questionCount').textContent = `第 ${state.questionNumber} 題`;
  $('#englishText').textContent = q.en;
  $('#recordPrompt').textContent = `${q.en} ${q.zh}`;
  setResult('選出正確中文，答對後再錄音。');

  const sameLevel = state.questions.filter(item => item.level === q.level && item.id !== q.id);
  const wrongPool = sameLevel.length >= 3 ? sameLevel : state.questions.filter(item => item.id !== q.id);
  const wrongOptions = shuffle(wrongPool).slice(0, 3).map(item => item.zh);
  const options = shuffle([q.zh, ...wrongOptions]);
  $('#options').innerHTML = options.map((option, index) => `
    <button class="option-button" type="button" data-option="${escapeHtml(option)}">
      ${String.fromCharCode(65 + index)}. ${escapeHtml(option)}
    </button>
  `).join('');

  $$('.option-button').forEach(button => {
    button.addEventListener('click', () => chooseAnswer(button.dataset.option, button));
  });
  speakEnglish(q.en);
}

function chooseAnswer(chosen, button) {
  const q = state.currentQuestion;
  const correct = chosen === q.zh;
  $$('.option-button').forEach(option => {
    option.disabled = true;
    if (option.dataset.option === q.zh) option.classList.add('correct');
  });

  if (!correct) {
    playSound('wrong');
    button.classList.add('wrong');
    setResult(`答錯了。正確答案是「${q.zh}」。`, 'bad');
    submitAnswer(chosen);
    $('#nextButton').hidden = false;
    return;
  }

  playSound('correct');
  button.classList.add('correct');
  setResult('答對了。請錄音唸出英文和中文，再送出攻擊。', 'good');
  $('#recordCard').hidden = false;
}

async function submitAnswer(chosenZh, hasRecording = false) {
  const res = await fetch('/api/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: state.student.id,
      questionId: state.currentQuestion.id,
      chosenZh,
      territoryName: state.target,
      hasRecording,
    }),
  });
  const payload = await res.json();
  if (!res.ok) {
    setResult(payload.error || '送出失敗。', 'bad');
    return null;
  }
  state.student = payload.student;
  state.data = payload.state;
  renderAll();
  setResult(payload.result.message, payload.correct ? 'good' : 'bad');
  if (payload.correct) {
    playSound(payload.result?.captured ? 'capture' : payload.result?.card ? 'card' : 'attack');
    pulseMap(payload.result?.captured ? 'capture' : 'attack');
  } else {
    playSound('wrong');
    pulseMap('attack');
  }
  showReward(payload);
  return payload;
}

async function toggleRecording() {
  if (state.recorder && state.recorder.state === 'recording') {
    state.recorder.stop();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    const secureTip = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? '請檢查瀏覽器是否允許麥克風。'
      : '這個網址不是 HTTPS，瀏覽器會擋麥克風；老師電腦請改開 http://localhost:3000。平板要正式錄音需要 HTTPS。';
    $('#recordHint').textContent = secureTip;
    $('#submitButton').disabled = false;
    return;
  }

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const type = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
    state.recorder = new MediaRecorder(state.stream, { mimeType: type });
    state.chunks = [];
    state.recordBlob = null;
    state.recordStartAt = Date.now();
    startSpeechCheck();

    state.recorder.ondataavailable = event => {
      if (event.data.size > 0) state.chunks.push(event.data);
    };
    state.recorder.onstop = () => {
      state.recordBlob = new Blob(state.chunks, { type });
      stopSpeechCheck();
      stopStream();
      $('#recordButton').textContent = '重新錄音';
      $('#playRecordButton').disabled = false;
      updateSpeechGate();
    };

    state.recorder.start();
    $('#recordButton').textContent = '停止錄音';
    $('#playRecordButton').disabled = true;
    $('#submitButton').disabled = true;
    $('#recordHint').textContent = '錄音中，請清楚唸英文，再唸中文。';
  } catch (error) {
    const blocked = error.name === 'NotAllowedError'
      ? '瀏覽器沒有允許麥克風，請到網址列旁邊開啟麥克風權限。'
      : '麥克風沒有開啟，這題可先送出攻擊。';
    $('#recordHint').textContent = blocked;
    $('#submitButton').disabled = false;
  }
}

function speechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function startSpeechCheck() {
  state.transcript = '';
  state.speechScore = 0;
  state.speechSupported = false;
  const Recognition = speechRecognitionCtor();
  if (!Recognition || !state.currentQuestion) return;

  try {
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = event => {
      let text = '';
      for (let i = 0; i < event.results.length; i += 1) {
        text += ` ${event.results[i][0].transcript}`;
      }
      state.transcript = text.trim();
      state.speechScore = scoreSpeech(state.currentQuestion.en, state.transcript);
    };
    recognition.onerror = () => {};
    recognition.start();
    state.recognition = recognition;
    state.speechSupported = true;
  } catch (error) {
    state.recognition = null;
  }
}

function stopSpeechCheck() {
  if (!state.recognition) return;
  try {
    state.recognition.stop();
  } catch (error) {}
  state.recognition = null;
}

function updateSpeechGate() {
  const recordedMs = Date.now() - state.recordStartAt;
  if (recordedMs < 900) {
    $('#submitButton').disabled = true;
    $('#recordHint').textContent = '錄音太短了，請重新錄一次。';
    return;
  }

  if (!state.speechSupported) {
    $('#submitButton').disabled = false;
    $('#recordHint').textContent = '這台瀏覽器不能自動辨識英文，已改成老師抽查模式。';
    return;
  }

  const percent = Math.round(state.speechScore * 100);
  if (state.speechScore >= 0.62) {
    $('#submitButton').disabled = false;
    $('#recordHint').textContent = `英文辨識通過 ${percent}%。可以送出攻擊。`;
  } else {
    $('#submitButton').disabled = true;
    $('#recordHint').textContent = `沒有聽到足夠的英文關鍵字（${percent}%）。請按「重新錄音」。`;
  }
}

function scoreSpeech(expected, heard) {
  const expectedWords = normalizeWords(expected).filter(word => word.length > 1);
  const heardWords = normalizeWords(heard);
  if (expectedWords.length === 0 || heardWords.length === 0) return 0;
  const matched = expectedWords.filter(word => heardWords.includes(word)).length;
  return matched / expectedWords.length;
}

function normalizeWords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/don't/g, 'dont')
    .replace(/you're/g, 'youre')
    .replace(/i'm/g, 'im')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function playRecording() {
  if (!state.recordBlob) return;
  const url = URL.createObjectURL(state.recordBlob);
  const audio = new Audio(url);
  audio.play();
}

async function submitRecordedAttack() {
  $('#submitButton').disabled = true;
  $('#submitButton').textContent = '送出中...';

  let uploaded = false;
  if (state.recordBlob) {
    await fetch(`/api/student-audio/${encodeURIComponent(state.student.id)}/${state.currentQuestion.id}`, {
      method: 'POST',
      headers: { 'Content-Type': state.recordBlob.type },
      body: state.recordBlob,
    });
    uploaded = true;
  }

  await submitAnswer(state.currentQuestion.zh, uploaded);
  $('#recordCard').hidden = true;
  $('#nextButton').hidden = false;
  $('#submitButton').textContent = '送出攻擊';
}

function resetRecording() {
  stopSpeechCheck();
  stopStream();
  state.recorder = null;
  state.chunks = [];
  state.recordBlob = null;
  state.transcript = '';
  state.speechSupported = false;
  state.speechScore = 0;
  state.recordStartAt = 0;
  $('#recordButton').textContent = '開始錄音';
  $('#playRecordButton').disabled = true;
  $('#submitButton').disabled = true;
  $('#submitButton').textContent = '送出攻擊';
  $('#recordHint').textContent = '答對後錄音，老師之後可以抽聽。';
}

function stopStream() {
  if (state.stream) {
    state.stream.getTracks().forEach(track => track.stop());
    state.stream = null;
  }
}

function nextTurn() {
  resetQuestionArea();
}

function resetQuestionArea() {
  state.currentQuestion = null;
  $('#questionCard').hidden = true;
  $('#recordCard').hidden = true;
  $('#nextButton').hidden = true;
  $('#englishText').textContent = '';
  $('#options').innerHTML = '';
  $('#mapPrompt').textContent = state.target ? `可繼續攻打 ${state.target}，或改點其他土地` : '點選一塊土地開始攻打';
  setResult(state.target ? '點同一塊土地可繼續進攻，也可以改攻其他區域。' : '先在地圖上選擇要攻打的土地。');
}

async function useShopItem(item) {
  if (!state.student) return;
  const body = {
    studentId: state.student.id,
    item,
    territoryName: state.target,
    targetStudentId: $('#opponentSelect')?.value || '',
  };
  try {
    const res = await fetch('/api/shop/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json();
    if (!res.ok) {
      $('#shopHint').textContent = payload.error || '道具使用失敗。';
      return;
    }
    state.student = payload.student;
    state.data = payload.state;
    renderAll();
    $('#shopHint').textContent = payload.result.message;
    playSound(item === 'shield' ? 'shield' : item === 'raid' ? 'attack' : 'card');
    showShopReward(item, payload.result.message);
  } catch (error) {
    $('#shopHint').textContent = '連線失敗，請稍後再試。';
  }
}

async function useCardItem(item) {
  if (!state.student) return;
  const body = {
    studentId: state.student.id,
    item,
    territoryName: state.target,
    targetStudentId: $('#opponentSelect')?.value || '',
  };
  try {
    const res = await fetch('/api/card/use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json();
    if (!res.ok) {
      $('#shopHint').textContent = payload.error || '卡牌使用失敗。';
      return;
    }
    state.student = payload.student;
    state.data = payload.state;
    renderAll();
    $('#shopHint').textContent = payload.result.message;
    playSound(item === 'shield' ? 'shield' : item === 'flag' ? 'capture' : 'card');
    showShopReward(item, payload.result.message);
  } catch (error) {
    $('#shopHint').textContent = '連線失敗，請稍後再試。';
  }
}

function showCardHelp(item) {
  const help = {
    boost: '重擊卡：使用後，下一次答對攻擊 +2。',
    repair: '修復卡：修復己方受損據點。若目前選到己方據點，會優先修那一塊。',
    shield: '防護罩卡：請先點選己方已佔領土地，使用後保護 90 秒。',
    steal: '偷金幣卡：先在「選擇同學」選目標，再使用，最多偷 5 金幣。',
    freeze: '干擾卡：先選同學再使用，對方下一次答對時攻擊 -1。',
    rent: '收租卡：依照自己佔領的據點數拿金幣，據點越多越賺。',
    flag: '奪旗卡：先選同學再使用，直接搶走對方一塊沒有防護罩的據點。',
  };
  $('#rewardKicker').textContent = '卡牌說明';
  $('#rewardTitle').textContent = cardLabel(item);
  $('#rewardBody').innerHTML = `<div class="reward-line">${escapeHtml(help[item] || '這張卡還沒有說明。')}</div>`;
  $('#rewardModal').hidden = false;
}

function cardLabel(item) {
  return {
    boost: '重擊卡',
    repair: '修復卡',
    shield: '防護罩卡',
    steal: '偷金幣卡',
    freeze: '干擾卡',
    rent: '收租卡',
    flag: '奪旗卡',
  }[item] || '卡牌';
}

function showShopReward(item, message) {
  $('#rewardKicker').textContent = item === 'raid' ? '突襲發動' : item === 'pack' ? '補給開啟' : '道具使用';
  $('#rewardTitle').textContent = {
    boost: '重擊卡準備好了',
    repair: '修復完成',
    shield: '防護罩啟動',
    steal: '偷金幣卡到手',
    freeze: '干擾卡到手',
    rent: '收租卡到手',
    flag: '奪旗成功',
    pack: '抽到新卡',
    raid: '突襲結果',
  }[item] || '道具效果';
  $('#rewardBody').innerHTML = `<div class="reward-line">${escapeHtml(message)}</div>`;
  $('#rewardModal').hidden = false;
}

function showReward(payload) {
  const modal = $('#rewardModal');
  const title = $('#rewardTitle');
  const kicker = $('#rewardKicker');
  const body = $('#rewardBody');
  const result = payload.result || {};

  if (payload.correct) {
    kicker.textContent = '攻擊獎勵';
    title.textContent = result.captured
      ? `${result.territoryName} 守擂成功`
      : result.card ? `抽到「${result.card}」` : '攻擊成功';
    body.innerHTML = [
      result.captured ? `<div class="reward-line dojo-line">${escapeHtml(payload.student.classNum)} ${escapeHtml(payload.student.name)} 的據點</div>` : '',
      `<div class="reward-line">土地攻擊 +${result.attack || 1}</div>`,
      `<div class="reward-line">金幣 +${result.coins || 0}</div>`,
      `<div class="reward-line">連勝 ${payload.student.streak || 0}</div>`,
      result.card ? `<div class="reward-line">${escapeHtml(result.card)} 已加入卡牌區</div>` : '',
    ].join('');
  } else {
    kicker.textContent = '遭到反擊';
    title.textContent = '答錯了';
    body.innerHTML = [
      '<div class="reward-line">土地被對方反推</div>',
      '<div class="reward-line">這題已記到老師錯題面板</div>',
    ].join('');
  }

  modal.hidden = false;
}

function speakEnglish(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function restoreLogin() {
  const savedClass = localStorage.getItem('gangshan-class');
  const savedName = localStorage.getItem('gangshan-name');
  if (savedClass) chooseClass(savedClass);
  if (savedName) $('#nameInput').value = savedName;
}

$$('.class-choice').forEach(button => {
  button.addEventListener('click', () => chooseClass(button.dataset.class));
});

$('#loginButton').addEventListener('click', login);
$('#nameInput').addEventListener('keydown', event => {
  if (event.key === 'Enter') login();
});
$('#speakButton').addEventListener('click', () => {
  if (state.currentQuestion) speakEnglish(state.currentQuestion.en);
});
$('#recordButton').addEventListener('click', toggleRecording);
$('#playRecordButton').addEventListener('click', playRecording);
$('#submitButton').addEventListener('click', submitRecordedAttack);
$('#nextButton').addEventListener('click', nextTurn);
$$('.shop-button').forEach(button => {
  button.addEventListener('click', () => useShopItem(button.dataset.item));
});
$$('.card-button').forEach(button => {
  button.addEventListener('click', event => {
    if (event.target.classList.contains('help-dot')) return;
    useCardItem(button.dataset.card);
  });
});
$$('.help-dot').forEach(button => {
  button.addEventListener('click', event => {
    event.stopPropagation();
    showCardHelp(button.dataset.help);
  });
});
$('#raidButton').addEventListener('click', () => useShopItem('raid'));
$('#rewardCloseButton').addEventListener('click', () => {
  $('#rewardModal').hidden = true;
});

restoreLogin();
loadState();
connectSocket();
