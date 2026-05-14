const ZONES = buildZones();
const ROAD_TERRITORIES = [];
const MEGA_TERRITORIES = ['A棟', 'B棟', 'C棟', '後北棟', '前北棟', '操場', '籃球場', '活動中心', '廚房'];

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

const CLASS_COLORS = {
  '502': '#2563eb',
  '503': '#dc2626',
};

let data = null;
let restoreOffered = false;
let selectedStudentIds = new Set();
let selectedLevelFilter = 'all';
let selectedQuestionLevel = 'classroom';
let selectedQuestionIds = new Set();
let assignStatusMessage = '';
let selectedRecordStudentId = '';

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

let pollingTimer = null;

function startPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(() => {
    loadState().catch(() => {});
  }, 2500);
}

function connectSocket() {
  if (location.hostname.includes('netlify')) {
    startPolling();
    return;
  }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.type !== 'state') return;
    data = message.data;
    writeLocalBackup();
    render();
  };
  ws.onerror = () => {
    ws.close();
    startPolling();
  };
  ws.onclose = () => {
    if (!pollingTimer) setTimeout(connectSocket, 1500);
  };
}

function render() {
  if (!data) return;
  renderMap();
  renderStats();
  pruneSelections();
  renderDifferentiationPanel();
  renderStudents();
  renderQuestions();
  renderStudentRecords();
  renderRecordings();
}

function pruneSelections() {
  const validStudents = new Set(Object.keys(data.students || {}));
  selectedStudentIds = new Set([...selectedStudentIds].filter(id => validStudents.has(id)));
  if (selectedRecordStudentId && !validStudents.has(selectedRecordStudentId)) selectedRecordStudentId = '';
  const validQuestions = new Set((data.questions || []).map(q => q.id));
  selectedQuestionIds = new Set([...selectedQuestionIds].filter(id => validQuestions.has(id)));
}

function renderDifferentiationPanel() {
  const students = Object.values(data.students || {})
    .sort((a, b) => a.classNum.localeCompare(b.classNum) || a.name.localeCompare(b.name));
  $('#selectedStudentCount').textContent = `已選 ${selectedStudentIds.size} 人`;
  $('#assignStudentList').innerHTML = students.length
    ? students.map(student => `
      <label class="assign-student-item ${selectedStudentIds.has(student.id) ? 'selected' : ''}">
        <input type="checkbox" value="${escapeHtml(student.id)}" ${selectedStudentIds.has(student.id) ? 'checked' : ''}>
        <span>
          <strong>${student.classNum} ${escapeHtml(student.name)}</strong>
          <small>${escapeHtml(getLevelInfo(student).currentLevelName)} · 指定題 ${Array.isArray(student.assignedQuestionIds) ? student.assignedQuestionIds.length : 0}</small>
        </span>
      </label>
    `).join('')
    : '<span class="empty-cards">學生登入後會出現在這裡。</span>';

  $('#assignStudentList').querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      if (input.checked) selectedStudentIds.add(input.value);
      else selectedStudentIds.delete(input.value);
      assignStatusMessage = `已選 ${selectedStudentIds.size} 人，可一起套用關卡或題目。`;
      renderStudents();
      renderDifferentiationPanel();
    });
  });

  renderAssignQuestionList();
}

function renderAssignQuestionList() {
  const level = selectedQuestionLevel;
  const questions = (data.questions || [])
    .filter(question => level === 'all' || question.level === level)
    .sort((a, b) => (a.level || '').localeCompare(b.level || '') || a.en.localeCompare(b.en));
  $('#assignQuestionList').innerHTML = questions.length
    ? questions.map(question => `
      <label class="assign-question-item">
        <input type="checkbox" value="${escapeHtml(question.id)}" ${selectedQuestionIds.has(question.id) ? 'checked' : ''}>
        <span>
          <strong>${escapeHtml(question.en)}</strong>
          <small>${escapeHtml(question.zh)} · ${escapeHtml(question.levelName || question.level)}</small>
        </span>
      </label>
    `).join('')
    : '<p>這個關卡目前沒有題目。</p>';

  $('#assignQuestionList').querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      if (input.checked) selectedQuestionIds.add(input.value);
      else selectedQuestionIds.delete(input.value);
      updateAssignStatus();
    });
  });
  updateAssignStatus(assignStatusMessage);
}

function updateAssignStatus(text = '') {
  assignStatusMessage = text;
  $('#assignStatus').textContent = text || `已勾 ${selectedQuestionIds.size} 題。`;
}

function loadStudentAssignment(studentId) {
  const student = data?.students?.[studentId];
  if (!student) return;
  selectedQuestionIds = new Set(Array.isArray(student.assignedQuestionIds) ? student.assignedQuestionIds : []);
  const levelSelect = $('#batchLevelSelect');
  if (levelSelect) levelSelect.value = student.manualLevel || '';
  assignStatusMessage = `${student.classNum} ${student.name} 目前指定 ${selectedQuestionIds.size} 題。`;
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

    const share502 = territory.maxHp ? Math.round(((territory.progress?.['502'] || 0) / territory.maxHp) * 100) : 0;
    const share503 = territory.maxHp ? Math.round(((territory.progress?.['503'] || 0) / territory.maxHp) * 100) : 0;
    const sub = ownerClass
      ? `${ownerClass} ${territory.ownerStudentName || ''}`
      : `502 ${share502}% · 503 ${share503}%`;
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

  const p502 = Math.max(0, ((territory.progress['502'] || 0) / territory.maxHp) * barWidth);
  const p503 = Math.max(0, ((territory.progress['503'] || 0) / territory.maxHp) * barWidth);
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
    const assignedCount = Array.isArray(student.assignedQuestionIds) ? student.assignedQuestionIds.length : 0;
    return `
      <tr>
        <td>
          <input type="checkbox" data-student-select="${escapeHtml(student.id)}" ${selectedStudentIds.has(student.id) ? 'checked' : ''} aria-label="選取 ${escapeHtml(student.name)}">
        </td>
        <td>${student.classNum}</td>
        <td>
          <button class="link-button" type="button" data-record-student="${escapeHtml(student.id)}">
            ${escapeHtml(student.name)}
          </button>
        </td>
        <td>${escapeHtml(roleName(student.role))}</td>
        <td>${student.score || 0}</td>
        <td>${student.coins || 0}</td>
        <td>${student.correct || 0}</td>
        <td>${student.wrong || 0}</td>
        <td>${rate}</td>
        <td>${escapeHtml(level.currentLevelName)}</td>
        <td>${assignedCount ? `${assignedCount} 題` : '-'}</td>
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
  document.querySelectorAll('[data-record-student]').forEach(button => {
    button.addEventListener('click', () => selectRecordStudent(button.dataset.recordStudent, true));
  });
  $('#studentRows').querySelectorAll('[data-student-select]').forEach(input => {
    input.addEventListener('change', () => {
      if (input.checked) selectedStudentIds.add(input.dataset.studentSelect);
      else selectedStudentIds.delete(input.dataset.studentSelect);
      if (selectedStudentIds.size === 1) loadStudentAssignment([...selectedStudentIds][0]);
      if (selectedStudentIds.size !== 1) assignStatusMessage = `已選 ${selectedStudentIds.size} 人，可批次套用關卡或題目。`;
      renderStudents();
      renderDifferentiationPanel();
    });
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
  const manualLevel = ['classroom', 'festival', 'phonics', 'final'].includes(student.manualLevel) ? student.manualLevel : '';
  if (manualLevel) {
    return {
      currentLevel: manualLevel,
      currentLevelName: `${levelTitle(manualLevel)}（老師開啟）`,
    };
  }
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

function renderStudentRecords() {
  const students = Object.values(data.students || {})
    .sort((a, b) => a.classNum.localeCompare(b.classNum) || a.name.localeCompare(b.name));
  if (!selectedRecordStudentId && students.length) selectedRecordStudentId = students[0].id;
  const selected = data.students?.[selectedRecordStudentId] || students[0] || null;
  if (selected) selectedRecordStudentId = selected.id;

  $('#recordStudentCount').textContent = `${students.length} 人`;
  $('#studentRecordList').innerHTML = students.length
    ? students.map(student => {
      const answers = answerRowsForStudent(student.id);
      const wrongCount = Object.values(student.wrongLog || {}).reduce((sum, item) => sum + (item.count || 0), 0);
      const total = (student.correct || 0) + (student.wrong || 0);
      const rate = total ? `${Math.round((student.correct || 0) / total * 100)}%` : '-';
      const latest = answers[0]?.ts ? formatTime(answers[0].ts) : '尚未答題';
      return `
        <button class="student-record-button ${student.id === selectedRecordStudentId ? 'selected' : ''}" type="button" data-record-pick="${escapeHtml(student.id)}">
          <span>
            <strong>${student.classNum} ${escapeHtml(student.name)}</strong>
            <small>${escapeHtml(getLevelInfo(student).currentLevelName)}</small>
          </span>
          <b>${total} 題</b>
          <small>錯 ${wrongCount} · 正確率 ${rate} · ${latest}</small>
        </button>
      `;
    }).join('')
    : '<p class="empty-cards">學生登入後會出現在這裡。</p>';

  $('#studentRecordList').querySelectorAll('[data-record-pick]').forEach(button => {
    button.addEventListener('click', () => selectRecordStudent(button.dataset.recordPick));
  });

  renderSelectedStudentRecord(selected);
}

function renderSelectedStudentRecord(student) {
  if (!student) {
    $('#studentRecordSummary').innerHTML = '<p>目前沒有學生資料。</p>';
    $('#wrongList').innerHTML = '';
    $('#answerRows').innerHTML = '';
    return;
  }

  const answers = answerRowsForStudent(student.id);
  const wrongRows = wrongRowsForStudent(student);
  const total = (student.correct || 0) + (student.wrong || 0);
  const rate = total ? `${Math.round((student.correct || 0) / total * 100)}%` : '-';
  const level = getLevelInfo(student);
  $('#studentRecordSummary').innerHTML = `
    <div>
      <span>目前查看</span>
      <strong>${student.classNum} ${escapeHtml(student.name)}</strong>
      <small>${escapeHtml(level.currentLevelName)}</small>
    </div>
    <dl>
      <div><dt>答題</dt><dd>${total}</dd></div>
      <div><dt>答對</dt><dd>${student.correct || 0}</dd></div>
      <div><dt>答錯</dt><dd>${student.wrong || 0}</dd></div>
      <div><dt>正確率</dt><dd>${rate}</dd></div>
      <div><dt>錄音</dt><dd>${student.recordingCount || 0}</dd></div>
      <div><dt>指定題</dt><dd>${Array.isArray(student.assignedQuestionIds) ? student.assignedQuestionIds.length : 0}</dd></div>
    </dl>
  `;

  $('#wrongList').innerHTML = wrongRows.length
    ? wrongRows.map(item => `
      <div class="list-item">
        <div>
          <strong>${escapeHtml(item.english)}</strong><br>
          <small>正確：${escapeHtml(item.correctZh)}；最近錯選：${escapeHtml(item.lastChosen || '-')}；${formatTime(item.lastTs)}</small>
        </div>
        <strong>${item.count} 次</strong>
      </div>
    `).join('')
    : '<p>這位學生目前沒有錯題。</p>';

  $('#answerRows').innerHTML = answers.length
    ? answers.map(row => `
      <tr class="${row.correct ? 'answer-correct' : 'answer-wrong'}">
        <td>${formatTime(row.ts)}</td>
        <td>${escapeHtml(row.territoryName)}</td>
        <td>${escapeHtml(row.levelName || '')}</td>
        <td>${escapeHtml(row.english)}</td>
        <td>${escapeHtml(row.chosenZh)}</td>
        <td><span class="result-pill ${row.correct ? 'correct' : 'wrong'}">${row.correct ? '對' : '錯'}</span></td>
      </tr>
    `).join('')
    : '<tr><td colspan="6">這位學生目前沒有答題紀錄。</td></tr>';
}

function answerRowsForStudent(studentId) {
  return (data.answerLog || [])
    .filter(row => row.studentId === studentId)
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

function wrongRowsForStudent(student) {
  return Object.values(student?.wrongLog || {})
    .sort((a, b) => (b.count || 0) - (a.count || 0) || (b.lastTs || 0) - (a.lastTs || 0));
}

function selectRecordStudent(studentId, scrollToRecords = false) {
  if (!data?.students?.[studentId]) return;
  selectedRecordStudentId = studentId;
  renderStudentRecords();
  if (scrollToRecords) {
    $('#learningRecordsSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
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

async function applyBatchLevel() {
  const studentIds = [...selectedStudentIds];
  if (!studentIds.length) {
    updateAssignStatus('請先選擇學生。');
    return;
  }
  const level = $('#batchLevelSelect').value;
  const res = await fetch('/api/teacher/students/batch-level', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentIds, level }),
  });
  const payload = await res.json();
  if (!res.ok) {
    updateAssignStatus(payload.error || '關卡設定失敗。');
    return;
  }
  data = payload.state;
  render();
  updateAssignStatus(`已套用關卡給 ${payload.count} 位學生。`);
}

async function applyAssignedQuestions(clear = false) {
  const studentIds = [...selectedStudentIds];
  if (!studentIds.length) {
    updateAssignStatus('請先選擇學生。');
    return;
  }
  const questionIds = clear ? [] : [...selectedQuestionIds];
  if (!clear && !questionIds.length) {
    updateAssignStatus('請先勾選要指派的題目。');
    return;
  }
  const res = await fetch('/api/teacher/students/assign-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentIds, questionIds }),
  });
  const payload = await res.json();
  if (!res.ok) {
    updateAssignStatus(payload.error || '題目指派失敗。');
    return;
  }
  data = payload.state;
  render();
  updateAssignStatus(clear ? `已清除 ${payload.count} 位學生的指定題。` : `已指派 ${payload.questionCount} 題給 ${payload.count} 位學生。`);
}

function selectStudentsByClass(classNum) {
  Object.values(data.students || {})
    .filter(student => !classNum || student.classNum === classNum)
    .forEach(student => selectedStudentIds.add(student.id));
  if (selectedStudentIds.size === 1) loadStudentAssignment([...selectedStudentIds][0]);
  if (selectedStudentIds.size !== 1) assignStatusMessage = `已選 ${selectedStudentIds.size} 人，可批次套用關卡或題目。`;
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

$('#select502Button').addEventListener('click', () => selectStudentsByClass('502'));
$('#select503Button').addEventListener('click', () => selectStudentsByClass('503'));
$('#selectAllStudentsButton').addEventListener('click', () => selectStudentsByClass(''));
$('#clearStudentsButton').addEventListener('click', () => {
  selectedStudentIds.clear();
  assignStatusMessage = '已清除學生選取。';
  render();
});
$('#applyBatchLevelButton').addEventListener('click', applyBatchLevel);
$('#assignQuestionLevelSelect').addEventListener('change', event => {
  selectedQuestionLevel = event.target.value;
  renderAssignQuestionList();
});
$('#selectVisibleQuestionsButton').addEventListener('click', () => {
  $('#assignQuestionList').querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = true;
    selectedQuestionIds.add(input.value);
  });
  updateAssignStatus();
});
$('#clearQuestionsButton').addEventListener('click', () => {
  selectedQuestionIds.clear();
  renderAssignQuestionList();
});
$('#applyAssignedQuestionsButton').addEventListener('click', () => applyAssignedQuestions(false));
$('#clearAssignedQuestionsButton').addEventListener('click', () => applyAssignedQuestions(true));

loadState();
connectSocket();
