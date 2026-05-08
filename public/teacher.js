const ZONES = buildZones();
const ROAD_TERRITORIES = ['北門道路', '東門道路', '南門道路', '西門道路', '維仁路30巷', '柳橋東路'];
const MEGA_TERRITORIES = ['操場', '籃球場', '活動中心', '廚房'];

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

const CLASS_COLORS = {
  '502': '#2563eb',
  '503': '#dc2626',
};

let data = null;
let restoreOffered = false;

const $ = selector => document.querySelector(selector);
const BACKUP_KEY = 'gangshan-battle-teacher-backup-v1';

function makeBackupSnapshot(source = data) {
  return {
    version: 2,
    students: source?.students || {},
    territories: source?.territories || {},
    recordings: source?.recordings || [],
    answerLog: source?.answerLog || [],
    events: source?.events || [],
    customQuestions: source?.customQuestions || [],
    questionOverrides: source?.questionOverrides || {},
    deletedQuestionIds: source?.deletedQuestionIds || [],
    colorIndex: source?.colorIndex || 0,
    startedAt: source?.startedAt || Date.now(),
  };
}

function stateWeight(source) {
  const game = source?.game || source || {};
  const students = Object.keys(game.students || {}).length;
  const owned = Object.values(game.territories || {}).filter(t => t?.ownerClass || t?.ownerStudentId).length;
  const recordings = (game.recordings || []).length;
  const answers = (game.answerLog || []).length;
  const events = (game.events || []).length;
  return students * 5 + owned * 3 + recordings * 2 + answers * 2 + events;
}

function readLocalBackup() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null');
    if (!parsed?.game) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

function writeLocalBackup() {
  if (!data) return;
  const game = makeBackupSnapshot(data);
  const nextWeight = stateWeight(game);
  if (nextWeight === 0) return;
  const previous = readLocalBackup();
  const previousWeight = stateWeight(previous);
  if (previousWeight > nextWeight && Object.keys(game.students || {}).length === 0) return;
  localStorage.setItem(BACKUP_KEY, JSON.stringify({
    savedAt: new Date().toISOString(),
    game,
  }));
}

async function restoreSnapshot(snapshot) {
  const res = await fetch('/api/teacher/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game: snapshot }),
  });
  if (!res.ok) {
    const message = await res.json().catch(() => ({ error: '還原失敗。' }));
    throw new Error(message.error || '還原失敗。');
  }
  const result = await res.json();
  data = result.state;
  writeLocalBackup();
  render();
}

async function offerLocalRestoreIfNeeded() {
  if (restoreOffered || !data) return;
  const backup = readLocalBackup();
  if (!backup) return;
  if (stateWeight(data) > 2 || stateWeight(backup) <= 5) return;
  restoreOffered = true;
  const savedAt = backup.savedAt ? formatTime(backup.savedAt) : '之前';
  if (!confirm(`偵測到老師電腦有 ${savedAt} 的遊戲備份，目前伺服器像是空資料。要還原嗎？`)) return;
  try {
    await restoreSnapshot(backup.game);
    alert('已還原老師電腦中的備份。');
  } catch (err) {
    alert(err.message);
  }
}

async function loadState() {
  const res = await fetch('/api/state');
  data = await res.json();
  await offerLocalRestoreIfNeeded();
  writeLocalBackup();
  render();
}

function connectSocket() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.type !== 'state') return;
    data = message.data;
    writeLocalBackup();
    render();
  };
  ws.onclose = () => setTimeout(connectSocket, 1500);
}

function render() {
  if (!data) return;
  renderMap();
  renderStats();
  renderStudents();
  renderQuestions();
  renderWrongList();
  renderRecordings();
  renderAnswerLog();
}

function renderMap() {
  const svg = $('#teacherMapSvg');
  svg.innerHTML = '';

  Object.entries(ZONES).forEach(([name, zone]) => {
    const territory = data.territories[name];
    if (!territory) return;
    const ownerClass = territory?.ownerClass;
    const isRoom = /^[ABCD]\d/.test(name);
    const isRoad = ROAD_TERRITORIES.includes(name);
    const isMega = MEGA_TERRITORIES.includes(name);
    const fill = ownerClass ? CLASS_COLORS[ownerClass] : '#475569';

    svg.appendChild(svgEl('rect', {
      x: zone.x,
      y: zone.y,
      width: zone.w,
      height: zone.h,
      rx: 8,
      fill,
      'fill-opacity': ownerClass ? 0.56 : isRoad ? 0.38 : isMega ? 0.32 : 0.26,
      stroke: fill,
      'stroke-width': isRoad || isMega ? 3 : 2,
      class: `zone ${isRoad ? 'road-zone' : ''} ${isMega ? 'mega-zone' : ''}`,
    }));

    renderProgress(svg, territory, zone);
    svg.appendChild(svgEl('text', {
      x: zone.cx,
      y: isRoom ? zone.cy - 3 : zone.cy - 10,
      class: isRoom ? 'zone-label room-label' : isRoad ? 'zone-label road-label' : 'zone-label',
    }, name));

    const sub = ownerClass
      ? `${ownerClass} ${territory.ownerStudentName || ''}`
      : `502 ${territory.progress['502']}/${territory.maxHp} · 503 ${territory.progress['503']}/${territory.maxHp}`;
    svg.appendChild(svgEl('text', {
      x: zone.cx,
      y: isRoom ? zone.cy + 10 : zone.cy + 14,
      class: isRoom ? 'zone-sub room-sub' : isRoad ? 'zone-sub road-sub' : 'zone-sub',
    }, isRoom && sub.length > 12 ? `${sub.slice(0, 12)}` : sub));
  });
}

function renderProgress(svg, territory, zone) {
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
    svg.appendChild(svgEl('rect', {
      x: zone.x + 8,
      y: barY,
      width: Math.max(0, (territory.hp / territory.maxHp) * barWidth),
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

function renderStats() {
  const totals = {
    '502': { score: 0, students: 0, lands: 0 },
    '503': { score: 0, students: 0, lands: 0 },
  };

  Object.values(data.students).forEach(student => {
    totals[student.classNum].score += student.score || 0;
    totals[student.classNum].students += 1;
  });
  Object.values(data.territories).forEach(territory => {
    if (territory.ownerClass) totals[territory.ownerClass].lands += 1;
  });

  $('#teacher502Score').textContent = totals['502'].score;
  $('#teacher503Score').textContent = totals['503'].score;
  $('#teacher502Meta').textContent = `${totals['502'].students} 人 · ${totals['502'].lands} 地`;
  $('#teacher503Meta').textContent = `${totals['503'].students} 人 · ${totals['503'].lands} 地`;
}

function renderStudents() {
  const students = Object.values(data.students)
    .sort((a, b) => (a.classNum.localeCompare(b.classNum)) || ((b.score || 0) - (a.score || 0)));

  $('#studentRows').innerHTML = students.map(student => {
    const total = (student.correct || 0) + (student.wrong || 0);
    const rate = total ? `${Math.round((student.correct || 0) / total * 100)}%` : '-';
    const level = getLevelInfo(student);
    return `
      <tr>
        <td>${student.classNum}</td>
        <td>${escapeHtml(student.name)}</td>
        <td>${escapeHtml(roleName(student.role))}</td>
        <td>${student.score || 0}</td>
        <td>${student.coins || 0}</td>
        <td>${student.correct || 0}</td>
        <td>${student.wrong || 0}</td>
        <td>${rate}</td>
        <td>${escapeHtml(level.currentLevelName)}</td>
        <td>${attackPower(student)}</td>
        <td>${student.bestStreak || 0}</td>
        <td>${student.recordingCount || 0}</td>
        <td>
          <button class="mini-button" type="button" data-student-level="${escapeHtml(student.id)}" data-next-level="${student.manualLevel ? '' : 'festival'}">
            ${student.manualLevel ? '回自動' : '開第二關'}
          </button>
          <button class="mini-button" type="button" data-student-level="${escapeHtml(student.id)}" data-next-level="phonics">
            開第三關
          </button>
          <button class="mini-button" type="button" data-student-level="${escapeHtml(student.id)}" data-next-level="final">
            開第四關
          </button>
        </td>
      </tr>`;
  }).join('');

  document.querySelectorAll('[data-student-level]').forEach(button => {
    button.addEventListener('click', () => setStudentLevel(button.dataset.studentLevel, button.dataset.nextLevel));
  });
}

function roleName(role) {
  const roles = data?.roles || [];
  return roles.find(item => item.id === role)?.name || '戰士';
}

function getLevelInfo(student) {
  const questions = data?.questions || [];
  const stats = student.questionStats || {};
  const summary = level => {
    const ids = questions.filter(q => q.level === level).map(q => q.id);
    const answered = ids.filter(id => (stats[id]?.attempts || 0) > 0).length;
    const attempts = ids.reduce((sum, id) => sum + (stats[id]?.attempts || 0), 0);
    const correct = ids.reduce((sum, id) => sum + (stats[id]?.correct || 0), 0);
    const accuracy = attempts ? correct / attempts : 0;
    return { total: ids.length, answered, attempts, correct, accuracy };
  };
  const levelTitle = level => ({
    classroom: '第一關 課室英語',
    festival: '第二關 節慶英語',
    phonics: '第三關 Phonics 聽力',
    final: '第四關 學力檢測總挑戰',
  }[level] || '自訂關卡');
  const classroom = summary('classroom');
  const festival = summary('festival');
  const phonics = summary('phonics');
  const manualLevel = ['festival', 'phonics', 'final'].includes(student.manualLevel) ? student.manualLevel : '';
  const festivalUnlocked = manualLevel === 'festival'
    || manualLevel === 'phonics'
    || manualLevel === 'final'
    || (classroom.total > 0 && classroom.answered >= classroom.total && classroom.accuracy >= 0.9);
  const phonicsUnlocked = manualLevel === 'phonics'
    || manualLevel === 'final'
    || (festivalUnlocked && festival.total > 0 && festival.answered >= festival.total && festival.accuracy >= 0.9);
  const finalUnlocked = manualLevel === 'final'
    || (phonicsUnlocked && phonics.total > 0 && phonics.answered >= phonics.total && phonics.accuracy >= 0.9);
  const currentLevel = finalUnlocked ? 'final' : phonicsUnlocked ? 'phonics' : festivalUnlocked ? 'festival' : 'classroom';
  return {
    currentLevel,
    currentLevelName: manualLevel ? `${levelTitle(currentLevel)}（老師開啟）` : levelTitle(currentLevel),
  };
}

function attackPower(student) {
  const level = getLevelInfo(student);
  const levelBonus = level.currentLevel === 'final' ? 3 : level.currentLevel === 'phonics' ? 2 : level.currentLevel === 'festival' ? 1 : 0;
  return 1 + levelBonus + lineBonusAttack(student.classNum) + (student.powerUps?.boost || 0);
}

function lineBonusAttack(classNum) {
  return (data?.territoryPowers || [])
    .filter(power => power.type === 'line' && power.activeClass === classNum && (power.effect || '').includes('攻擊 +1'))
    .length;
}

function renderQuestions() {
  const questions = [...(data.questions || [])].sort((a, b) => {
    const levelOrder = (a.level || '').localeCompare(b.level || '');
    return levelOrder || a.id.localeCompare(b.id);
  });
  $('#questionCountLabel').textContent = `${questions.length} 題`;
  $('#questionRows').innerHTML = questions.map(question => `
    <tr>
      <td>${escapeHtml(question.levelName || question.level)}</td>
      <td><strong>${escapeHtml(question.en)}</strong><br><small>${escapeHtml(question.id)}</small></td>
      <td>${escapeHtml(question.zh)}</td>
      <td>
        <div class="question-row-actions">
          <button class="mini-button" type="button" data-edit-question="${escapeHtml(question.id)}">修改</button>
          <button class="mini-button danger" type="button" data-delete-question="${escapeHtml(question.id)}">刪除</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('[data-edit-question]').forEach(button => {
    button.addEventListener('click', () => editQuestion(button.dataset.editQuestion));
  });
  document.querySelectorAll('[data-delete-question]').forEach(button => {
    button.addEventListener('click', () => deleteQuestion(button.dataset.deleteQuestion));
  });
}

function renderWrongList() {
  const rows = [];
  Object.values(data.students).forEach(student => {
    Object.values(student.wrongLog || {}).forEach(item => {
      rows.push({ ...item, classNum: student.classNum, name: student.name });
    });
  });
  rows.sort((a, b) => b.count - a.count || a.classNum.localeCompare(b.classNum) || a.name.localeCompare(b.name));

  $('#wrongList').innerHTML = rows.length
    ? rows.slice(0, 80).map(item => `
      <div class="list-item">
        <div>
          <strong>${item.classNum} ${escapeHtml(item.name)} · ${escapeHtml(item.english)}</strong><br>
          <small>正確：${escapeHtml(item.correctZh)}；最近錯選：${escapeHtml(item.lastChosen || '-')}</small>
        </div>
        <strong>${item.count} 次</strong>
      </div>
    `).join('')
    : '<p>目前沒有錯題。</p>';
}

function renderRecordings() {
  const recordings = (data.recordings || []).slice(0, 50);
  $('#recordingList').innerHTML = recordings.length
    ? recordings.map(recording => {
      const q = data.questions.find(item => item.id === recording.questionId);
      const [studentKey, fileName] = recording.file.split('/');
      return `
        <div class="list-item">
          <div>
            <strong>${recording.classNum} ${escapeHtml(recording.studentName)}</strong><br>
            <small>${escapeHtml(q?.en || recording.questionId)} · ${formatTime(recording.ts)}</small>
          </div>
          <button class="soft-button" type="button" data-audio="/api/student-audio-file/${encodeURIComponent(studentKey)}/${encodeURIComponent(fileName)}">播放</button>
        </div>`;
    }).join('')
    : '<p>學生錄音後會出現在這裡。</p>';

  document.querySelectorAll('[data-audio]').forEach(button => {
    button.addEventListener('click', () => new Audio(button.dataset.audio).play());
  });
}

function renderAnswerLog() {
  const rows = (data.answerLog || []).slice(0, 120);
  $('#answerRows').innerHTML = rows.map(row => `
    <tr>
      <td>${formatTime(row.ts)}</td>
      <td>${row.classNum}</td>
      <td>${escapeHtml(row.studentName)}</td>
      <td>${escapeHtml(row.territoryName)}</td>
      <td>${escapeHtml(row.levelName || '')}</td>
      <td>${escapeHtml(row.english)}</td>
      <td>${escapeHtml(row.chosenZh)}</td>
      <td>${row.correct ? '對' : '錯'}</td>
    </tr>
  `).join('');
}

function resetQuestionForm() {
  $('#questionIdInput').value = '';
  $('#questionLevelInput').value = 'classroom';
  $('#questionEnInput').value = '';
  $('#questionZhInput').value = '';
  $('#saveQuestionButton').textContent = '新增題目';
  $('#cancelEditButton').hidden = true;
  $('#questionStatus').textContent = '';
}

function editQuestion(id) {
  const question = (data.questions || []).find(item => item.id === id);
  if (!question) return;
  $('#questionIdInput').value = question.id;
  $('#questionLevelInput').value = question.level || 'classroom';
  $('#questionEnInput').value = question.en || '';
  $('#questionZhInput').value = question.zh || '';
  $('#saveQuestionButton').textContent = '儲存修改';
  $('#cancelEditButton').hidden = false;
  $('#questionStatus').textContent = `正在修改：${question.en}`;
  $('#questionEnInput').focus();
}

async function saveQuestion(event) {
  event.preventDefault();
  const id = $('#questionIdInput').value;
  const body = {
    level: $('#questionLevelInput').value,
    en: $('#questionEnInput').value.trim(),
    zh: $('#questionZhInput').value.trim(),
  };
  if (!body.en || !body.zh) {
    $('#questionStatus').textContent = '英文和中文都要填。';
    return;
  }

  const res = await fetch(id ? `/api/teacher/questions/${encodeURIComponent(id)}` : '/api/teacher/questions', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await res.json();
  if (!res.ok) {
    $('#questionStatus').textContent = payload.error || '題目儲存失敗。';
    return;
  }
  data = payload.state;
  render();
  resetQuestionForm();
  $('#questionStatus').textContent = id ? '題目已修改。' : '題目已新增。';
}

async function deleteQuestion(id) {
  const question = (data.questions || []).find(item => item.id === id);
  if (!question || !confirm(`確定刪除「${question.en}」嗎？`)) return;
  const res = await fetch(`/api/teacher/questions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const payload = await res.json();
  if (!res.ok) {
    $('#questionStatus').textContent = payload.error || '題目刪除失敗。';
    return;
  }
  data = payload.state;
  render();
  resetQuestionForm();
  $('#questionStatus').textContent = '題目已刪除。';
}

async function setStudentLevel(studentId, level) {
  const res = await fetch(`/api/teacher/students/${encodeURIComponent(studentId)}/level`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level }),
  });
  const payload = await res.json();
  if (!res.ok) {
    alert(payload.error || '關卡設定失敗。');
    return;
  }
  data = payload.state;
  render();
}

function svgEl(name, attrs, text = '') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  if (text) el.textContent = text;
  return el;
}

function formatTime(ts) {
  return new Date(ts).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function postTeacherAction(url, message) {
  if (!confirm(message)) return;
  await fetch(url, { method: 'POST' });
}

function downloadBackup() {
  if (!data) return;
  const snapshot = {
    exportedAt: new Date().toISOString(),
    game: makeBackupSnapshot(data),
  };
  localStorage.setItem(BACKUP_KEY, JSON.stringify({
    savedAt: snapshot.exportedAt,
    game: snapshot.game,
  }));
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `岡山大作戰備份-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function restoreBackupFile(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const snapshot = parsed.game || parsed.data || parsed;
    if (!confirm('確定要用這份備份覆蓋目前遊戲資料嗎？')) return;
    await restoreSnapshot(snapshot);
    alert('備份已還原。');
  } catch (err) {
    alert(err.message || '備份檔無法讀取。');
  }
}

$('#downloadBackupButton').addEventListener('click', downloadBackup);

$('#restoreBackupButton').addEventListener('click', () => {
  const localBackup = readLocalBackup();
  if (localBackup && confirm(`要先還原老師電腦內 ${formatTime(localBackup.savedAt)} 的自動備份嗎？\n\n按「取消」可改選 JSON 備份檔。`)) {
    restoreSnapshot(localBackup.game)
      .then(() => alert('已還原老師電腦中的自動備份。'))
      .catch(err => alert(err.message));
    return;
  }
  $('#restoreBackupInput').click();
});

$('#restoreBackupInput').addEventListener('change', event => {
  restoreBackupFile(event.target.files?.[0]);
  event.target.value = '';
});

$('#resetMapButton').addEventListener('click', () => {
  postTeacherAction('/api/teacher/reset-map', '確定要清空土地佔領狀態嗎？學生分數與錯題會保留。');
});

$('#resetAllButton').addEventListener('click', () => {
  postTeacherAction('/api/teacher/reset-all', '確定要全部重置嗎？學生、錯題、答題紀錄都會清空。');
});

$('#questionForm').addEventListener('submit', saveQuestion);
$('#cancelEditButton').addEventListener('click', resetQuestionForm);

loadState();
connectSocket();
