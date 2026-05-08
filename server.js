const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const DATA_DIR = process.env.GAME_DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'game.json');
const STUDENT_AUDIO_DIR = path.join(DATA_DIR, 'student-audio');
const PORT = process.env.PORT || 3000;

const CLASSES = ['502', '503'];
const CLASS_COLORS = {
  '502': '#2563eb',
  '503': '#dc2626',
};

const QUESTIONS = [
  { id: 'q01', en: 'Sit down.', zh: '坐下。' },
  { id: 'q02', en: 'Stand up.', zh: '站起來。' },
  { id: 'q03', en: 'Hands up.', zh: '舉起雙手。' },
  { id: 'q04', en: 'Be quiet.', zh: '安靜。' },
  { id: 'q05', en: "Don't run.", zh: '不要跑。' },
  { id: 'q06', en: 'Open your book.', zh: '打開你的書。' },
  { id: 'q07', en: 'Close your book.', zh: '關上你的書。' },
  { id: 'q08', en: 'May I come in?', zh: '我可以進來嗎？' },
  { id: 'q09', en: 'May I go to the restroom?', zh: '可以去廁所嗎？' },
  { id: 'q10', en: 'May I borrow your eraser?', zh: '我可以借你的橡皮擦嗎？' },
  { id: 'q11', en: 'Thank you very much.', zh: '謝謝你。' },
  { id: 'q12', en: "Sorry, I'm late.", zh: '抱歉，我遲到了。' },
  { id: 'q13', en: 'Raise your hand.', zh: '舉手。' },
  { id: 'q14', en: 'Say it again.', zh: '再說一次。' },
  { id: 'q15', en: 'Repeat after me.', zh: '跟我重複說。' },
  { id: 'q16', en: "Don't run in the hallway.", zh: '不要在走廊奔跑。' },
  { id: 'q17', en: 'Give me a hand.', zh: '幫我一個忙。' },
  { id: 'q18', en: 'Clap your hands!', zh: '拍手！' },
  { id: 'q19', en: 'Turn around.', zh: '轉身。' },
  { id: 'q20', en: 'Look at the board.', zh: '看黑板。' },
  { id: 'q21', en: 'Touch your nose.', zh: '摸鼻子。' },
  { id: 'q22', en: "You're welcome!", zh: '不客氣！' },
  { id: 'q23', en: 'No talking in class.', zh: '上課不可以說話。' },
  { id: 'q24', en: 'Look at me.', zh: '看我。' },
  { id: 'q25', en: 'Write it down.', zh: '寫下來。' },
  { id: 'q26', en: 'Wave your hand.', zh: '揮揮手。' },
  { id: 'q27', en: 'Touch your head.', zh: '摸頭。' },
  { id: 'q28', en: 'May I sit down?', zh: '我可以坐下嗎？' },
  { id: 'q29', en: 'May I go out?', zh: '我可以出去嗎？' },
  { id: 'q30', en: 'May I stand up?', zh: '我可以站起來嗎？' },
  { id: 'q31', en: 'Give me your eraser.', zh: '把你的橡皮擦給我。' },
  { id: 'q32', en: 'Take my eraser.', zh: '拿我的橡皮擦。' },
  { id: 'q33', en: 'Open your bag.', zh: '打開你的書包。' },
  { id: 'q34', en: 'Good morning!', zh: '早安！' },
  { id: 'q35', en: 'Thank you!', zh: '謝謝你！' },
  { id: 'q36', en: 'Put away your book.', zh: '收起你的書。' },
  { id: 'q37', en: 'Read your book.', zh: '讀你的書。' },
  { id: 'q38', en: 'Stamp your feet!', zh: '跺腳！' },
  { id: 'q39', en: 'Jump up!', zh: '跳起來！' },
  { id: 'q40', en: 'Look out the window.', zh: '看窗外。' },
  { id: 'q41', en: 'Look at the ceiling.', zh: '看天花板。' },
  { id: 'q42', en: 'Look at the floor.', zh: '看地板。' },
  { id: 'q43', en: 'Touch your ear.', zh: '摸耳朵。' },
  { id: 'q44', en: 'Touch your eye.', zh: '摸眼睛。' },
  { id: 'q45', en: 'Goodbye!', zh: '再見！' },
  { id: 'q46', en: "That's OK.", zh: '沒關係。' },
].map(q => ({ ...q, level: 'classroom', levelName: '第一關 課室英語' })).concat([
  { id: 'f01', en: 'Chinese New Year', zh: '農曆新年' },
  { id: 'f02', en: 'lucky money', zh: '壓歲錢' },
  { id: 'f03', en: 'a big family dinner', zh: '年夜飯' },
  { id: 'f04', en: 'Dragon Boat Festival', zh: '端午節' },
  { id: 'f05', en: 'rice dumplings', zh: '粽子' },
  { id: 'f06', en: 'dragon boat races', zh: '龍舟比賽' },
  { id: 'f07', en: 'stand eggs at noon', zh: '中午立蛋' },
  { id: 'f08', en: 'Moon Festival', zh: '中秋節' },
  { id: 'f09', en: 'moon cakes', zh: '月餅' },
  { id: 'f10', en: 'pomelo hats', zh: '柚子帽' },
  { id: 'f11', en: 'Lantern Festival', zh: '元宵節' },
  { id: 'f12', en: 'lanterns', zh: '燈籠' },
  { id: 'f13', en: 'Halloween', zh: '萬聖節' },
  { id: 'f14', en: 'costumes', zh: '服裝' },
  { id: 'f15', en: 'Trick or treat!', zh: '不給糖就搗蛋！' },
  { id: 'f16', en: 'Thanksgiving', zh: '感恩節' },
  { id: 'f17', en: 'turkey', zh: '火雞' },
  { id: 'f18', en: 'pumpkin pie', zh: '南瓜派' },
  { id: 'f19', en: "Teacher's Day", zh: '教師節' },
  { id: 'f20', en: 'September 28th', zh: '九月二十八日' },
  { id: 'f21', en: 'Christmas', zh: '聖誕節' },
  { id: 'f22', en: 'Christmas tree', zh: '聖誕樹' },
  { id: 'f23', en: 'stockings', zh: '長襪' },
  { id: 'f24', en: 'Santa Claus', zh: '聖誕老人' },
  { id: 'f25', en: 'Easter', zh: '復活節' },
  { id: 'f26', en: 'Easter eggs', zh: '復活節彩蛋' },
  { id: 'f27', en: "Mother's Day", zh: '母親節' },
  { id: 'f28', en: 'the second Sunday in May', zh: '五月的第二個星期日' },
  { id: 'f29', en: "Father's Day", zh: '父親節' },
  { id: 'f30', en: "Valentine's Day", zh: '情人節' },
  { id: 'f31', en: 'spring couplets', zh: '春聯' },
  { id: 'f32', en: 'witch', zh: '女巫' },
  { id: 'f33', en: 'ghost', zh: '鬼' },
  { id: 'f34', en: 'vampire', zh: '吸血鬼' },
  { id: 'f35', en: 'candy', zh: '糖果' },
].map(q => ({ ...q, level: 'festival', levelName: '第二關 節慶英語' })));

const LEVELS = [
  { id: 'classroom', name: '第一關 課室英語', order: 1 },
  { id: 'festival', name: '第二關 節慶英語', order: 2 },
];

const ROLES = {
  warrior: { id: 'warrior', name: '戰士', short: '攻擊 +1' },
  engineer: { id: 'engineer', name: '工程師', short: '修復更強' },
  merchant: { id: 'merchant', name: '商人', short: '金幣 +1' },
  guardian: { id: 'guardian', name: '守衛', short: '佔領帶防護' },
};

const TERRITORIES = buildTerritories();

function levelName(level) {
  return LEVELS.find(item => item.id === level)?.name || '自訂關卡';
}

function normalizeQuestion(raw) {
  const level = LEVELS.some(item => item.id === raw.level) ? raw.level : 'classroom';
  return {
    id: String(raw.id || '').trim(),
    en: String(raw.en || '').trim(),
    zh: String(raw.zh || '').trim(),
    level,
    levelName: levelName(level),
  };
}

function allQuestions() {
  const deleted = new Set(gameData.deletedQuestionIds || []);
  const overrides = gameData.questionOverrides || {};
  const baseQuestions = QUESTIONS
    .filter(q => !deleted.has(q.id))
    .map(q => normalizeQuestion({ ...q, ...(overrides[q.id] || {}), id: q.id }));
  const customQuestions = (gameData.customQuestions || [])
    .filter(q => !deleted.has(q.id))
    .map(normalizeQuestion)
    .filter(q => q.id && q.en && q.zh);
  return [...baseQuestions, ...customQuestions];
}

function buildTerritories() {
  const names = [
    'A001', 'A002', 'A101', 'A102', 'A103', 'A104', 'A105', 'A106', 'A107', 'A108',
    'A201', 'A202', 'A203', 'A204', 'A205', 'A206', 'A207', 'A208', 'A209', 'A210', 'A211',
    'A301', 'A302', 'A303', 'A304', 'A305', 'A306', 'A307', 'A308', 'A309', 'A310', 'A311',
    'A401', 'A402', 'A403',
    'B101', 'B102', 'B103', 'B104', 'B105', 'B201', 'B202', 'B203', 'B204', 'B205', 'B206',
    'B301', 'B302', 'B401', 'B402', 'B403', 'B404', 'B405', 'B406', 'B407',
    'C101', 'C102', 'C103', 'C104', 'C105', 'C106', 'C201', 'C202', 'C203', 'C204',
    'C301', 'C302', 'C303', 'C304', 'C305', 'C306',
    'D101', 'D102', 'D103', 'D104', 'D105', 'D106', 'D107', 'D108',
    'D201', 'D202', 'D203', 'D204', 'D205', 'D206', 'D207', 'D208', 'D209', 'D210',
    'D301', 'D302', 'D303', 'D304', 'D305', 'D306', 'D307', 'D308', 'D309', 'D310',
    'D401', 'D402', 'D403', 'D404', 'D405', 'D406',
    '操場', '籃球場', '活動中心', '廚房',
  ];
  return names.map(name => ({
    name,
    maxHp: ['操場', '活動中心'].includes(name) ? 24 : ['籃球場', '廚房'].includes(name) ? 14 : 8,
    power: name.match(/^[ABCD]/)
      ? '教室據點。攻下後會留下守擂學生名字。'
      : '大型據點，需要更多人合作。',
  }));
}

const STUDENT_COLORS = [
  '#0ea5e9', '#f97316', '#22c55e', '#a855f7', '#ec4899', '#14b8a6',
  '#eab308', '#ef4444', '#6366f1', '#84cc16', '#f43f5e', '#06b6d4',
  '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#d946ef', '#64748b',
];

function now() {
  return Date.now();
}

function makeTerritory(t) {
  return {
    name: t.name,
    ownerClass: null,
    ownerStudentId: null,
    ownerStudentName: '',
    hp: 0,
    maxHp: t.maxHp,
    progress: { '502': 0, '503': 0 },
    shieldUntil: 0,
    lastEvent: '',
    power: t.power,
  };
}

function initData() {
  const territories = {};
  TERRITORIES.forEach(t => {
    territories[t.name] = makeTerritory(t);
  });
  return {
    version: 2,
    students: {},
    territories,
    recordings: [],
    answerLog: [],
    events: [],
    customQuestions: [],
    questionOverrides: {},
    deletedQuestionIds: [],
    colorIndex: 0,
    startedAt: now(),
  };
}

let gameData = initData();

function normalizeLoadedData(data) {
  const fresh = initData();
  data.version = 2;
  data.students = data.students || {};
  data.territories = data.territories || {};
  data.recordings = data.recordings || [];
  data.answerLog = data.answerLog || [];
  data.events = data.events || [];
  data.customQuestions = (data.customQuestions || []).map(normalizeQuestion).filter(q => q.id && q.en && q.zh);
  data.questionOverrides = data.questionOverrides || {};
  data.deletedQuestionIds = data.deletedQuestionIds || [];
  data.colorIndex = data.colorIndex || 0;

  Object.entries(fresh.territories).forEach(([name, terr]) => {
    const old = data.territories[name] || {};
    data.territories[name] = {
      ...terr,
      ...old,
      ownerClass: old.ownerClass || classFromOldOwner(old.owner),
      ownerStudentId: old.ownerStudentId || old.owner || null,
      ownerStudentName: old.ownerStudentName || (old.owner && data.students?.[old.owner]?.name) || '',
      maxHp: terr.maxHp,
      progress: {
        '502': Math.min(old.progress?.['502'] || 0, terr.maxHp),
        '503': Math.min(old.progress?.['503'] || 0, terr.maxHp),
      },
      hp: Math.min(old.hp || 0, terr.maxHp),
      shieldUntil: old.shieldUntil || 0,
      power: terr.power,
    };
  });

  Object.values(data.students).forEach(s => {
    s.score = s.score || 0;
    s.coins = s.coins || 0;
    s.correct = s.correct || 0;
    s.wrong = s.wrong || 0;
    s.streak = s.streak || 0;
    s.bestStreak = s.bestStreak || s.streak || 0;
    s.wrongLog = s.wrongLog || {};
    s.recordingCount = s.recordingCount || 0;
    s.powerUps = s.powerUps || { boost: 0 };
    s.cards = normalizeCards(s.cards);
    s.questionStats = s.questionStats || {};
    s.manualLevel = LEVELS.some(level => level.id === s.manualLevel) ? s.manualLevel : '';
    s.role = normalizeRole(s.role);
    s.color = s.color || STUDENT_COLORS[(data.colorIndex++) % STUDENT_COLORS.length];
  });

  return data;
}

function classFromOldOwner(ownerId) {
  if (!ownerId || !gameData.students?.[ownerId]) return null;
  return gameData.students[ownerId].classNum || null;
}

function load() {
  if (!fs.existsSync(DATA_FILE)) return;
  try {
    gameData = normalizeLoadedData(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
  } catch (err) {
    console.log('資料讀取失敗，已建立新的遊戲資料。');
    gameData = initData();
  }
}

function save() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(gameData, null, 2), 'utf8');
}

function publicState() {
  return {
    ...gameData,
    questions: allQuestions(),
    levels: LEVELS,
    roles: Object.values(ROLES),
    territoryPowers: territoryPowerSummary(),
    leaderboard: leaderboard(),
    rankings: rankedStudents(),
    classColors: CLASS_COLORS,
  };
}

function broadcast() {
  const message = JSON.stringify({ type: 'state', data: publicState() });
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(message);
  });
}

function cleanName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 24);
}

function studentId(classNum, name) {
  return `${classNum}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function questionById(id) {
  return allQuestions().find(q => q.id === id);
}

function otherClass(classNum) {
  return classNum === '502' ? '503' : '502';
}

function pushEvent(text, type = 'info') {
  gameData.events.unshift({ text, type, ts: now() });
  gameData.events = gameData.events.slice(0, 80);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function normalizeRole(role) {
  return ROLES[role] ? role : 'warrior';
}

function roleName(role) {
  return ROLES[normalizeRole(role)].name;
}

function classOwns(classNum, territoryName) {
  return gameData.territories[territoryName]?.ownerClass === classNum;
}

function territoryPowerSummary() {
  return [
    { name: '操場', effect: '佔領班級全員攻擊 +1' },
    { name: '廚房', effect: '佔領班級答對金幣 +1' },
    { name: '活動中心', effect: '佔領班級答對時更容易拿補給卡' },
    { name: '籃球場', effect: '佔領班級突襲費用 -2' },
  ];
}

function normalizeCards(cards = {}) {
  return {
    boost: cards.boost || 0,
    repair: cards.repair || 0,
    shield: cards.shield || 0,
    steal: cards.steal || 0,
    freeze: cards.freeze || 0,
    rent: cards.rent || 0,
    flag: cards.flag || 0,
  };
}

function addCard(student, cardType, count = 1) {
  student.cards = normalizeCards(student.cards);
  student.cards[cardType] += count;
}

function randomCardType() {
  return randomItem(['boost', 'repair', 'shield', 'steal', 'freeze', 'rent', 'flag']);
}

function levelSummary(student, level = 'classroom') {
  const ids = allQuestions().filter(q => q.level === level).map(q => q.id);
  const stats = student.questionStats || {};
  const answered = ids.filter(id => (stats[id]?.attempts || 0) > 0).length;
  const attempts = ids.reduce((sum, id) => sum + (stats[id]?.attempts || 0), 0);
  const correct = ids.reduce((sum, id) => sum + (stats[id]?.correct || 0), 0);
  const accuracy = attempts ? correct / attempts : 0;
  return { level, total: ids.length, answered, attempts, correct, accuracy };
}

function studentLevelInfo(student) {
  const classroom = levelSummary(student, 'classroom');
  const manualFestival = student.manualLevel === 'festival';
  const festivalUnlocked = manualFestival || (classroom.answered >= classroom.total && classroom.accuracy >= 0.9);
  const currentLevel = festivalUnlocked ? 'festival' : 'classroom';
  return {
    currentLevel,
    currentLevelName: manualFestival ? '第二關 節慶英語（老師開啟）' : currentLevel === 'festival' ? '第二關 節慶英語' : '第一關 課室英語',
    unlockedLevels: festivalUnlocked ? ['classroom', 'festival'] : ['classroom'],
    classroom,
    festival: levelSummary(student, 'festival'),
    manualLevel: student.manualLevel || '',
  };
}

function attackPower(student) {
  const levelInfo = studentLevelInfo(student);
  return 1
    + (levelInfo.currentLevel === 'festival' ? 1 : 0)
    + (normalizeRole(student.role) === 'warrior' ? 1 : 0)
    + (classOwns(student.classNum, '操場') ? 1 : 0)
    + (student.powerUps?.boost || 0);
}

function leaderboard() {
  return rankedStudents().slice(0, 5);
}

function rankedStudents() {
  return Object.values(gameData.students)
    .map(s => ({
      id: s.id,
      name: s.name,
      classNum: s.classNum,
      score: s.score || 0,
      correct: s.correct || 0,
      wrong: s.wrong || 0,
      answered: (s.correct || 0) + (s.wrong || 0),
      lands: Object.values(gameData.territories).filter(t => t.ownerStudentId === s.id).length,
      attackPower: attackPower(s),
      roleName: roleName(s.role),
      levelName: studentLevelInfo(s).currentLevelName,
    }))
    .sort((a, b) => b.score - a.score || b.lands - a.lands || b.answered - a.answered)
    .map((row, index, rows) => ({
      ...row,
      rank: index + 1,
      gapToPrevious: index === 0 ? 0 : Math.max(0, (rows[index - 1].score || 0) - (row.score || 0)),
    }));
}

function applyCorrectAnswer(student, territoryName) {
  const terr = gameData.territories[territoryName];
  if (!terr) return { message: '找不到領地。', type: 'info' };

  let attack = 1;
  let coins = 3;
  let bonusScore = 10;
  let card = null;
  let captured = false;
  const roll = Math.random();
  const levelInfo = studentLevelInfo(student);
  const frozen = (student.powerUps?.freeze || 0) > 0;
  const nextStreak = (student.streak || 0) + 1;
  const role = normalizeRole(student.role);

  if (role === 'warrior') attack += 1;
  if (role === 'merchant') coins += 1;
  if (classOwns(student.classNum, '操場')) attack += 1;
  if (classOwns(student.classNum, '廚房')) coins += 1;

  if ((student.powerUps?.boost || 0) > 0) {
    attack += student.powerUps.boost;
    student.powerUps.boost = 0;
    card = '重擊卡';
  }

  if (frozen) {
    student.powerUps.freeze = Math.max(0, (student.powerUps.freeze || 0) - 1);
    attack = Math.max(0, attack - 1);
    card = card || '干擾效果';
  }

  if (!card && student.streak > 0 && student.streak % 5 === 0) {
    attack += 1;
    card = '連勝重擊';
  } else if (!card && roll < 0.10) {
    attack += 1;
    card = '雙倍攻擊';
  } else if (!card && roll < 0.20) {
    coins += 5;
    card = '幸運金幣';
  } else if (!card && roll < 0.29) {
    addCard(student, 'repair');
    card = '修復卡';
  } else if (!card && roll < 0.36) {
    addCard(student, 'steal');
    card = '偷金幣卡';
  } else if (!card && roll < 0.43) {
    addCard(student, 'shield');
    card = '防護罩卡';
  } else if (!card && roll < 0.50) {
    addCard(student, 'freeze');
    card = '干擾卡';
  } else if (!card && roll < 0.56) {
    addCard(student, 'rent');
    card = '收租卡';
  } else if (!card && roll < 0.60) {
    addCard(student, 'flag');
    card = '奪旗卡';
  }

  if (levelInfo.currentLevel === 'festival') {
    attack += 1;
    coins += 1;
  }

  if (!card && classOwns(student.classNum, '活動中心') && Math.random() < 0.18) {
    const supplyCard = randomCardType();
    addCard(student, supplyCard);
    card = `活動中心補給：${cardName(supplyCard)}`;
  }

  if (nextStreak > 0 && nextStreak % 3 === 0) {
    coins += 2;
  }

  if (!card && nextStreak > 0 && nextStreak % 10 === 0) {
    const streakCard = randomCardType();
    addCard(student, streakCard);
    card = `10 連勝補給：${cardName(streakCard)}`;
  }

  if (terr.ownerClass === student.classNum) {
    const repairAmount = attack + (role === 'engineer' ? 1 : 0);
    terr.hp = Math.min(terr.maxHp, (terr.hp || 0) + repairAmount);
    terr.lastEvent = `${student.classNum} ${student.name} 修復 +${repairAmount}`;
  } else if (terr.ownerClass && terr.ownerClass !== student.classNum) {
    if (terr.shieldUntil > now()) {
      terr.lastEvent = `${terr.name} 有防護罩，攻擊被擋下`;
      bonusScore -= 2;
    } else {
      terr.hp -= attack;
      terr.lastEvent = `${student.classNum} ${student.name} 攻擊 -${attack}`;
      if (terr.hp <= 0) {
        captureTerritory(terr, student, true);
        captured = true;
      }
    }
  } else {
    terr.progress[student.classNum] += attack;
    terr.progress[otherClass(student.classNum)] = Math.max(0, terr.progress[otherClass(student.classNum)] - 1);
    terr.lastEvent = `${student.classNum} ${student.name} 推進 +${attack}`;
    if (terr.progress[student.classNum] >= terr.maxHp) {
      captureTerritory(terr, student, false);
      captured = true;
    }
  }

  student.score += bonusScore;
  student.coins += coins;
  student.correct += 1;
  student.streak += 1;
  student.bestStreak = Math.max(student.bestStreak || 0, student.streak);

  const cardText = card ? ` 抽到「${card}」！` : '';
  const message = `${student.name} 答對，${terr.name} ${terr.lastEvent}。+${coins} 金幣。${cardText}`;
  pushEvent(message, 'correct');
  return {
    message,
    card,
    attack,
    coins,
    captured,
    territoryName: terr.name,
    ownerClass: terr.ownerClass,
    ownerStudentName: terr.ownerStudentName,
    type: 'correct',
  };
}

function captureTerritory(terr, student, fromEnemy) {
  terr.ownerClass = student.classNum;
  terr.ownerStudentId = student.id;
  terr.ownerStudentName = student.name;
  terr.hp = terr.maxHp;
  terr.progress = { '502': 0, '503': 0 };
  terr.shieldUntil = normalizeRole(student.role) === 'guardian' ? now() + 120 * 1000 : 0;
  student.score += fromEnemy ? 25 : 20;
  terr.lastEvent = `${student.classNum} 佔領成功`;
  pushEvent(`${student.classNum} ${student.name} 成為 ${terr.name} 守擂者！${normalizeRole(student.role) === 'guardian' ? '守衛防護啟動。' : ''}`, 'capture');
}

function repairOwnedTerritory(classNum) {
  const owned = Object.values(gameData.territories)
    .filter(t => t.ownerClass === classNum && t.hp < t.maxHp);
  if (owned.length === 0) return;
  const terr = randomItem(owned);
  terr.hp = Math.min(terr.maxHp, terr.hp + 2);
  terr.lastEvent = `${classNum} 班修復 +2`;
}

function stealCoins(student) {
  const enemies = Object.values(gameData.students)
    .filter(s => s.classNum !== student.classNum && (s.coins || 0) > 0);
  if (enemies.length === 0) {
    student.coins += 2;
    return;
  }
  const target = randomItem(enemies);
  const amount = Math.min(3, target.coins || 0);
  target.coins -= amount;
  student.coins += amount;
}

function stealCoinsFrom(student, targetStudentId) {
  const target = gameData.students[targetStudentId];
  if (!target || target.id === student.id) return { ok: false, error: '請選擇其他同學。' };
  if ((target.coins || 0) <= 0) return { ok: false, error: `${target.name} 目前沒有金幣可以偷。` };
  const amount = Math.min(5, target.coins || 0);
  target.coins -= amount;
  student.coins += amount;
  pushEvent(`${student.classNum} ${student.name} 偷走 ${target.name} 的 ${amount} 金幣。`, 'shop');
  return { ok: true, message: `偷到 ${target.name} 的 ${amount} 金幣。` };
}

function neutralizeTerritory(terr) {
  terr.ownerClass = null;
  terr.ownerStudentId = null;
  terr.ownerStudentName = '';
  terr.hp = 0;
  terr.progress = { '502': 0, '503': 0 };
  terr.shieldUntil = 0;
}

function itemCost(student, item) {
  const base = { repair: 5, shield: 6, boost: 8, steal: 7, freeze: 6, rent: 9, pack: 6, raid: 10 };
  let cost = base[item];
  if (!cost) return 0;
  if (normalizeRole(student.role) === 'merchant') cost = Math.max(1, cost - 1);
  if (item === 'raid' && classOwns(student.classNum, '籃球場')) cost = Math.max(1, cost - 2);
  return cost;
}

function useShopItem(student, item, targetStudentId, territoryName) {
  const cost = itemCost(student, item);
  if (!cost) return { ok: false, error: '找不到這個道具。' };
  if ((student.coins || 0) < cost) return { ok: false, error: '金幣不夠。' };

  if (['boost', 'repair', 'shield', 'steal', 'freeze', 'rent'].includes(item)) {
    student.coins -= cost;
    addCard(student, item);
    pushEvent(`${student.classNum} ${student.name} 買了 1 張${cardName(item)}。`, 'shop');
    return { ok: true, message: `已購買 1 張${cardName(item)}，可以在卡牌區使用。` };
  }

  if (item === 'pack') {
    student.coins -= cost;
    const cardType = randomCardType();
    addCard(student, cardType);
    pushEvent(`${student.classNum} ${student.name} 打開補給包，抽到${cardName(cardType)}。`, 'shop');
    return { ok: true, message: `補給包抽到 1 張${cardName(cardType)}。`, cardType };
  }

  if (item === 'raid') {
    const target = gameData.students[targetStudentId];
    if (!target || target.id === student.id) {
      return { ok: false, error: '請選擇其他同學。' };
    }
    const owned = Object.values(gameData.territories)
      .filter(t => t.ownerStudentId === target.id);
    if (owned.length === 0) return { ok: false, error: '這位同學目前沒有可突襲的據點。' };
    const terr = randomItem(owned);
    if (terr.shieldUntil > now()) {
      student.coins -= cost;
      pushEvent(`${student.name} 突襲 ${target.name}，但 ${terr.name} 的防護罩擋住了。`, 'shop');
      return { ok: true, message: `${target.name} 的 ${terr.name} 有防護罩，突襲被擋下。` };
    }
    student.coins -= cost;
    terr.hp -= 3;
    terr.lastEvent = `${student.name} 突襲 ${target.name} -3`;
    if (terr.hp <= 0) {
      neutralizeTerritory(terr);
      pushEvent(`${student.classNum} ${student.name} 突襲成功，打掉了 ${target.name} 的 ${terr.name}！`, 'shop');
      return { ok: true, message: `突襲成功！${target.name} 失去 ${terr.name}。` };
    }
    pushEvent(`${student.classNum} ${student.name} 突襲 ${target.name} 的 ${terr.name}。`, 'shop');
    return { ok: true, message: `${target.name} 的 ${terr.name} 受到突襲 -3。` };
  }

  return { ok: false, error: '道具使用失敗。' };
}

function cardName(item) {
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

function useCardItem(student, item, targetStudentId, territoryName) {
  student.cards = normalizeCards(student.cards);
  if (!student.cards[item]) return { ok: false, error: `你沒有${cardName(item)}。` };

  if (item === 'boost') {
    student.cards.boost -= 1;
    student.powerUps = student.powerUps || { boost: 0 };
    student.powerUps.boost = Math.min(5, (student.powerUps.boost || 0) + 2);
    pushEvent(`${student.classNum} ${student.name} 使用重擊卡。`, 'shop');
    return { ok: true, message: '重擊卡已啟動：下一次答對攻擊 +2。' };
  }

  if (item === 'repair') {
    const candidates = Object.values(gameData.territories)
      .filter(t => t.ownerClass === student.classNum && t.hp < t.maxHp);
    if (candidates.length === 0) {
      return { ok: false, error: '修復卡只能用在被攻擊、血量未滿的己方據點。現在己方據點都是滿血，所以卡會保留。' };
    }
    const selected = gameData.territories[territoryName];
    const terr = selected?.ownerClass === student.classNum && selected.hp < selected.maxHp
      ? gameData.territories[territoryName]
      : candidates.sort((a, b) => a.hp - b.hp)[0];
    student.cards.repair -= 1;
    const amount = normalizeRole(student.role) === 'engineer' ? 6 : 4;
    terr.hp = Math.min(terr.maxHp, terr.hp + amount);
    terr.lastEvent = `${student.name} 使用修復卡 +${amount}`;
    pushEvent(`${student.classNum} ${student.name} 修復了 ${terr.name}。`, 'shop');
    return { ok: true, message: `${terr.name} 修復 +${amount}。` };
  }

  if (item === 'shield') {
    const terr = gameData.territories[territoryName];
    if (!terr || terr.ownerClass !== student.classNum) {
      return { ok: false, error: '請先選一塊己方佔領的土地。' };
    }
    student.cards.shield -= 1;
    const seconds = normalizeRole(student.role) === 'engineer' ? 150 : 90;
    terr.shieldUntil = now() + seconds * 1000;
    terr.lastEvent = `${student.name} 架設防護罩`;
    pushEvent(`${student.classNum} ${student.name} 替 ${terr.name} 架設防護罩。`, 'shop');
    return { ok: true, message: `${terr.name} 已獲得 ${seconds} 秒防護罩。` };
  }

  if (item === 'steal') {
    const result = stealCoinsFrom(student, targetStudentId);
    if (!result.ok) return result;
    student.cards.steal -= 1;
    return result;
  }

  if (item === 'freeze') {
    const target = gameData.students[targetStudentId];
    if (!target || target.id === student.id) return { ok: false, error: '請選擇其他同學。' };
    student.cards.freeze -= 1;
    target.powerUps = target.powerUps || {};
    target.powerUps.freeze = Math.min(3, (target.powerUps.freeze || 0) + 1);
    pushEvent(`${student.classNum} ${student.name} 對 ${target.name} 使用干擾卡。`, 'shop');
    return { ok: true, message: `${target.name} 下一次答對時攻擊 -1。` };
  }

  if (item === 'rent') {
    const lands = Object.values(gameData.territories).filter(t => t.ownerStudentId === student.id).length;
    const amount = lands ? Math.min(14, lands * 2 + 2 + (normalizeRole(student.role) === 'merchant' ? 2 : 0)) : 3;
    student.cards.rent -= 1;
    student.coins += amount;
    pushEvent(`${student.classNum} ${student.name} 收租得到 ${amount} 金幣。`, 'shop');
    return { ok: true, message: lands ? `你有 ${lands} 塊據點，收租得到 ${amount} 金幣。` : `還沒有據點，得到保底 ${amount} 金幣。` };
  }

  if (item === 'flag') {
    const target = gameData.students[targetStudentId];
    if (!target || target.id === student.id) return { ok: false, error: '請選擇其他同學。' };
    const owned = Object.values(gameData.territories).filter(t => t.ownerStudentId === target.id);
    if (owned.length === 0) return { ok: false, error: '這位同學目前沒有可奪旗的據點。' };
    const terr = randomItem(owned);
    student.cards.flag -= 1;
    if (terr.shieldUntil > now()) {
      pushEvent(`${student.name} 對 ${target.name} 使用奪旗卡，但防護罩擋住了。`, 'shop');
      return { ok: true, message: `${target.name} 的 ${terr.name} 有防護罩，奪旗失敗。` };
    }
    captureTerritory(terr, student, true);
    pushEvent(`${student.classNum} ${student.name} 奪走 ${target.name} 的 ${terr.name}！`, 'shop');
    return { ok: true, message: `奪旗成功！${terr.name} 現在是你的據點。` };
  }

  return { ok: false, error: '卡牌使用失敗。' };
}

function applyWrongAnswer(student, territoryName) {
  const terr = gameData.territories[territoryName];
  student.wrong += 1;
  student.streak = 0;
  student.score = Math.max(0, (student.score || 0) - 3);

  if (terr) {
    if (terr.ownerClass === student.classNum) {
      terr.hp = Math.max(0, (terr.hp || 0) - 1);
      terr.lastEvent = `${student.classNum} 答錯，土地受損 -1`;
      if (terr.hp === 0) {
        terr.ownerClass = null;
        terr.ownerStudentId = null;
        terr.ownerStudentName = '';
        terr.progress = { '502': 0, '503': 0 };
        pushEvent(`${terr.name} 變成無主土地。`, 'wrong');
      }
    } else if (!terr.ownerClass) {
      terr.progress[student.classNum] = Math.max(0, terr.progress[student.classNum] - 1);
      terr.progress[otherClass(student.classNum)] += 1;
      terr.lastEvent = `${student.classNum} 答錯，${otherClass(student.classNum)} 班反推 +1`;
    } else {
      terr.hp = Math.min(terr.maxHp, (terr.hp || terr.maxHp) + 1);
      terr.lastEvent = `${student.classNum} 答錯，守方恢復 +1`;
    }
  }

  const message = `${student.name} 答錯，${territoryName || '目標土地'} 遭到反擊。`;
  pushEvent(message, 'wrong');
  return { message, type: 'wrong' };
}

function recordAnswer({ student, questionId, chosenZh, correct, territoryName }) {
  const q = questionById(questionId);
  student.questionStats = student.questionStats || {};
  student.questionStats[questionId] = student.questionStats[questionId] || { attempts: 0, correct: 0, level: q?.level || '' };
  student.questionStats[questionId].attempts += 1;
  if (correct) student.questionStats[questionId].correct += 1;
  student.questionStats[questionId].lastTs = now();

  const entry = {
    ts: now(),
    classNum: student.classNum,
    studentId: student.id,
    studentName: student.name,
    questionId,
    english: q?.en || questionId,
    correctZh: q?.zh || '',
    chosenZh: chosenZh || '',
    correct,
    territoryName: territoryName || '',
    level: q?.level || '',
    levelName: q?.levelName || '',
  };
  gameData.answerLog.unshift(entry);
  gameData.answerLog = gameData.answerLog.slice(0, 5000);

  if (!correct) {
    student.wrongLog[questionId] = student.wrongLog[questionId] || {
      count: 0,
      english: entry.english,
      correctZh: entry.correctZh,
      lastChosen: '',
      lastTs: 0,
    };
    student.wrongLog[questionId].count += 1;
    student.wrongLog[questionId].lastChosen = chosenZh || '';
    student.wrongLog[questionId].lastTs = now();
  }
}

function classTotals() {
  const totals = {
    '502': { score: 0, coins: 0, students: 0, territories: 0 },
    '503': { score: 0, coins: 0, students: 0, territories: 0 },
  };
  Object.values(gameData.students).forEach(s => {
    if (!totals[s.classNum]) return;
    totals[s.classNum].score += s.score || 0;
    totals[s.classNum].coins += s.coins || 0;
    totals[s.classNum].students += 1;
  });
  Object.values(gameData.territories).forEach(t => {
    if (t.ownerClass && totals[t.ownerClass]) totals[t.ownerClass].territories += 1;
  });
  return totals;
}

function excelDate(ts) {
  return new Date(ts).toLocaleString('zh-TW', { hour12: false });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function exportWorkbookHtml() {
  const rows = [...gameData.answerLog].reverse();
  const wrongSummary = [];
  Object.values(gameData.students).forEach(s => {
    Object.entries(s.wrongLog || {}).forEach(([, item]) => {
      wrongSummary.push({
        classNum: s.classNum,
        name: s.name,
        english: item.english,
        correctZh: item.correctZh,
        count: item.count,
        lastChosen: item.lastChosen,
        lastTs: item.lastTs,
      });
    });
  });
  wrongSummary.sort((a, b) => a.classNum.localeCompare(b.classNum) || a.name.localeCompare(b.name) || b.count - a.count);

  const sheet1 = rows.map(r => `
    <tr>
      <td>${escapeHtml(excelDate(r.ts))}</td>
      <td>${escapeHtml(r.classNum)}</td>
      <td>${escapeHtml(r.studentName)}</td>
      <td>${escapeHtml(r.territoryName)}</td>
      <td>${escapeHtml(r.levelName || '')}</td>
      <td>${escapeHtml(r.english)}</td>
      <td>${escapeHtml(r.correctZh)}</td>
      <td>${escapeHtml(r.chosenZh)}</td>
      <td>${r.correct ? '對' : '錯'}</td>
    </tr>`).join('');

  const sheet2 = wrongSummary.map(r => `
    <tr>
      <td>${escapeHtml(r.classNum)}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.english)}</td>
      <td>${escapeHtml(r.correctZh)}</td>
      <td>${escapeHtml(r.lastChosen)}</td>
      <td>${escapeHtml(r.count)}</td>
      <td>${r.lastTs ? escapeHtml(excelDate(r.lastTs)) : ''}</td>
    </tr>`).join('');

  return `<!doctype html>
  <html><head><meta charset="utf-8">
  <style>
    table { border-collapse: collapse; }
    th, td { border: 1px solid #999; padding: 6px 10px; mso-number-format:"\\@"; }
    th { background: #d9eaf7; font-weight: bold; }
  </style></head><body>
  <h2>答題明細</h2>
  <table>
    <tr><th>時間</th><th>班級</th><th>英文名字</th><th>攻打土地</th><th>關卡</th><th>英文題目</th><th>正確中文</th><th>學生答案</th><th>結果</th></tr>
    ${sheet1}
  </table>
  <h2>錯題整理</h2>
  <table>
    <tr><th>班級</th><th>英文名字</th><th>英文題目</th><th>正確中文</th><th>最近錯選</th><th>錯誤次數</th><th>最近錯誤時間</th></tr>
    ${sheet2}
  </table>
  </body></html>`;
}

load();
save();
fs.mkdirSync(STUDENT_AUDIO_DIR, { recursive: true });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/state', (req, res) => res.json(publicState()));

app.get('/api/questions', (req, res) => res.json({ questions: allQuestions(), levels: LEVELS }));

app.post('/api/teacher/questions', (req, res) => {
  const question = normalizeQuestion({
    id: `custom-${now()}-${Math.random().toString(36).slice(2, 7)}`,
    en: req.body.en,
    zh: req.body.zh,
    level: req.body.level,
  });
  if (!question.en || !question.zh) return res.status(400).json({ error: '英文和中文都要填。' });
  gameData.customQuestions.push(question);
  pushEvent(`老師新增題目：${question.en}`, 'teacher');
  save();
  broadcast();
  res.json({ ok: true, question, state: publicState() });
});

app.put('/api/teacher/questions/:id', (req, res) => {
  const id = String(req.params.id || '');
  const base = QUESTIONS.find(q => q.id === id);
  const custom = (gameData.customQuestions || []).find(q => q.id === id);
  if (!base && !custom) return res.status(404).json({ error: '找不到題目。' });

  const question = normalizeQuestion({
    id,
    en: req.body.en,
    zh: req.body.zh,
    level: req.body.level,
  });
  if (!question.en || !question.zh) return res.status(400).json({ error: '英文和中文都要填。' });

  if (custom) {
    Object.assign(custom, question);
  } else {
    gameData.questionOverrides[id] = {
      en: question.en,
      zh: question.zh,
      level: question.level,
      levelName: question.levelName,
    };
  }
  gameData.deletedQuestionIds = (gameData.deletedQuestionIds || []).filter(item => item !== id);
  pushEvent(`老師修改題目：${question.en}`, 'teacher');
  save();
  broadcast();
  res.json({ ok: true, question, state: publicState() });
});

app.delete('/api/teacher/questions/:id', (req, res) => {
  const id = String(req.params.id || '');
  const before = gameData.customQuestions.length;
  gameData.customQuestions = gameData.customQuestions.filter(q => q.id !== id);
  if (gameData.customQuestions.length === before && QUESTIONS.some(q => q.id === id)) {
    gameData.deletedQuestionIds = Array.from(new Set([...(gameData.deletedQuestionIds || []), id]));
  }
  delete gameData.questionOverrides[id];
  pushEvent(`老師刪除題目：${id}`, 'teacher');
  save();
  broadcast();
  res.json({ ok: true, state: publicState() });
});

app.post('/api/teacher/students/:id/level', (req, res) => {
  const student = gameData.students[req.params.id];
  if (!student) return res.status(404).json({ error: '找不到學生。' });
  const level = String(req.body.level || '');
  student.manualLevel = level === 'festival' ? 'festival' : '';
  pushEvent(
    student.manualLevel
      ? `老師開啟 ${student.name} 的第二關。`
      : `老師將 ${student.name} 改回自動關卡。`,
    'teacher'
  );
  save();
  broadcast();
  res.json({ ok: true, student, state: publicState() });
});

app.post('/api/login', (req, res) => {
  const classNum = String(req.body.classNum || '');
  const name = cleanName(req.body.name);
  const role = normalizeRole(req.body.role);
  if (!CLASSES.includes(classNum)) return res.status(400).json({ error: '請選擇班級。' });
  if (!/^[A-Za-z][A-Za-z0-9 ]{0,23}$/.test(name)) {
    return res.status(400).json({ error: '英文名字請用英文字母開頭。' });
  }

  const id = studentId(classNum, name);
  if (!gameData.students[id]) {
    gameData.students[id] = {
      id,
      name,
      classNum,
      score: 0,
      coins: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      bestStreak: 0,
      powerUps: { boost: 0 },
      cards: normalizeCards(),
      questionStats: {},
      manualLevel: '',
      role,
      wrongLog: {},
      recordingCount: 0,
      color: STUDENT_COLORS[gameData.colorIndex++ % STUDENT_COLORS.length],
      joinedAt: now(),
      lastSeen: now(),
    };
    pushEvent(`${classNum} 班 ${name} 以${roleName(role)}加入戰場。`, 'join');
  } else {
    gameData.students[id].role = normalizeRole(gameData.students[id].role || role);
    gameData.students[id].lastSeen = now();
  }
  save();
  broadcast();
  res.json({ student: gameData.students[id], state: publicState() });
});

app.post('/api/answer', (req, res) => {
  const { studentId, questionId, chosenZh, territoryName } = req.body;
  const student = gameData.students[studentId];
  const q = questionById(questionId);
  if (!student) return res.status(404).json({ error: '找不到學生。' });
  if (!q) return res.status(400).json({ error: '找不到題目。' });
  if (!gameData.territories[territoryName]) return res.status(400).json({ error: '請選擇攻打土地。' });

  student.lastSeen = now();
  const correct = chosenZh === q.zh;
  const result = correct
    ? applyCorrectAnswer(student, territoryName)
    : applyWrongAnswer(student, territoryName);

  recordAnswer({ student, questionId, chosenZh, correct, territoryName });
  save();
  broadcast();
  res.json({ ok: true, correct, result, student, state: publicState(), classTotals: classTotals() });
});

app.post('/api/shop/use', (req, res) => {
  const { studentId, item, targetStudentId, territoryName } = req.body;
  const student = gameData.students[studentId];
  if (!student) return res.status(404).json({ error: '找不到學生。' });

  student.lastSeen = now();
  const result = useShopItem(student, item, targetStudentId, territoryName);
  if (!result.ok) return res.status(400).json({ error: result.error });

  save();
  broadcast();
  res.json({ ok: true, result, student, state: publicState() });
});

app.post('/api/card/use', (req, res) => {
  const { studentId, item, targetStudentId, territoryName } = req.body;
  const student = gameData.students[studentId];
  if (!student) return res.status(404).json({ error: '找不到學生。' });

  student.lastSeen = now();
  const result = useCardItem(student, item, targetStudentId, territoryName);
  if (!result.ok) return res.status(400).json({ error: result.error });

  save();
  broadcast();
  res.json({ ok: true, result, student, state: publicState() });
});

app.post('/api/student-audio/:studentId/:questionId', (req, res) => {
  const { studentId, questionId } = req.params;
  const student = gameData.students[studentId];
  if (!student) return res.status(404).json({ error: '找不到學生。' });

  const safeStudent = studentId.replace(/[^a-zA-Z0-9-]/g, '_');
  const studentDir = path.join(STUDENT_AUDIO_DIR, safeStudent);
  fs.mkdirSync(studentDir, { recursive: true });

  const ext = (req.headers['content-type'] || '').includes('ogg') ? 'ogg' : 'webm';
  const filename = `${questionId}-${now()}.${ext}`;
  const filePath = path.join(studentDir, filename);
  const chunks = [];

  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    fs.writeFileSync(filePath, Buffer.concat(chunks));
    student.recordingCount = (student.recordingCount || 0) + 1;
    student.lastSeen = now();
    gameData.recordings.unshift({
      studentId,
      questionId,
      studentName: student.name,
      classNum: student.classNum,
      file: `${safeStudent}/${filename}`,
      ts: now(),
    });
    gameData.recordings = gameData.recordings.slice(0, 300);
    save();
    broadcast();
    res.json({ ok: true });
  });
});

app.get('/api/student-audio-file/:studentKey/:fileName', (req, res) => {
  const studentKey = req.params.studentKey.replace(/[^a-zA-Z0-9-]/g, '_');
  const fileName = req.params.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = path.join(STUDENT_AUDIO_DIR, studentKey, fileName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'not found' });
  res.sendFile(filePath);
});

app.get('/api/export.xls', (req, res) => {
  const filename = `岡山大作戰錯題紀錄-${new Date().toISOString().slice(0, 10)}.xls`;
  res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send('\ufeff' + exportWorkbookHtml());
});

app.post('/api/teacher/reset-map', (req, res) => {
  Object.entries(initData().territories).forEach(([name, terr]) => {
    gameData.territories[name] = terr;
  });
  pushEvent('老師重置地圖。', 'teacher');
  save();
  broadcast();
  res.json({ ok: true });
});

app.post('/api/teacher/reset-all', (req, res) => {
  gameData = initData();
  save();
  broadcast();
  res.json({ ok: true });
});

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'state', data: publicState() }));
});

server.listen(PORT, '0.0.0.0', () => {
  let localIP = 'localhost';
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const net of iface || []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        break;
      }
    }
  }
  console.log('\n岡山大作戰 已啟動');
  console.log(`學生連線: http://${localIP}:${PORT}`);
  console.log(`教師後台: http://${localIP}:${PORT}/teacher.html`);
  console.log('按 Ctrl+C 停止伺服器\n');
});
