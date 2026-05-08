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
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_STATE_ID = process.env.SUPABASE_STATE_ID || 'main';

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
].map(q => ({ ...q, level: 'festival', levelName: '第二關 節慶英語' })))
  .concat(buildPhonicsQuestions())
  .concat(buildFinalReviewQuestions());

const LEVELS = [
  { id: 'classroom', name: '第一關 課室英語', order: 1 },
  { id: 'festival', name: '第二關 節慶英語', order: 2 },
  { id: 'phonics', name: '第三關 Phonics 聽力', order: 3 },
  { id: 'final', name: '第四關 學力檢測總挑戰', order: 4 },
];

const ROLES = {
  warrior: { id: 'warrior', name: '戰士', short: '攻擊 +1' },
  engineer: { id: 'engineer', name: '工程師', short: '修復更強' },
  merchant: { id: 'merchant', name: '商人', short: '金幣 +1' },
  guardian: { id: 'guardian', name: '守衛', short: '佔領帶防護' },
};

const ROAD_TERRITORIES = [];

const LINE_BONUSES = [
  {
    id: 'main-buildings',
    name: '教學主線',
    territories: ['A棟', 'B棟', 'C棟'],
    effect: '佔滿 A棟、B棟、C棟：答對金幣 +2',
    attack: 0,
    coins: 2,
    score: 0,
    raidDiscount: 0,
  },
  {
    id: 'north-buildings',
    name: '北棟防線',
    territories: ['後北棟', '前北棟'],
    effect: '佔滿後北棟、前北棟：答對攻擊 +1',
    attack: 1,
    coins: 0,
    score: 0,
    raidDiscount: 0,
  },
  {
    id: 'sports-zone',
    name: '運動核心',
    territories: ['操場', '籃球場'],
    effect: '佔滿操場、籃球場：每題分數 +3',
    attack: 1,
    coins: 0,
    score: 3,
    raidDiscount: 0,
  },
];

const TERRITORIES = buildTerritories();

function levelName(level) {
  return LEVELS.find(item => item.id === level)?.name || '自訂關卡';
}

function normalizeQuestion(raw) {
  const level = LEVELS.some(item => item.id === raw.level) ? raw.level : 'classroom';
  const question = {
    id: String(raw.id || '').trim(),
    en: String(raw.en || '').trim(),
    zh: String(raw.zh || '').trim(),
    level,
    levelName: levelName(level),
  };
  if (raw.mode) question.mode = String(raw.mode || '').trim();
  if (raw.prompt) question.prompt = String(raw.prompt || '').trim();
  if (raw.speak) question.speak = String(raw.speak || '').trim();
  if (raw.recordText) question.recordText = String(raw.recordText || '').trim();
  if (raw.skill) question.skill = String(raw.skill || '').trim();
  if (Array.isArray(raw.options)) {
    question.options = raw.options.map(option => String(option || '').trim()).filter(Boolean);
  }
  return question;
}

function buildPhonicsQuestions() {
  const questions = [];
  const phonicsLevelName = '第三關 Phonics 聽力';
  const listeningPrompt = '聽音，選出你聽到的答案。';

  const addListeningSet = (prefix, options, prompt = listeningPrompt, speakMap = {}) => {
    options.forEach((answer, index) => {
      questions.push({
        id: `${prefix}${String(index + 1).padStart(2, '0')}`,
        en: speakMap[answer] || answer,
        zh: answer,
        speak: speakMap[answer] || answer,
        prompt,
        options,
        mode: 'listening',
        level: 'phonics',
        levelName: phonicsLevelName,
      });
    });
  };

  addListeningSet('ph-letter-b-', ['p', 'b', 'd', 't'], '聽音，選出正確字母。');
  addListeningSet('ph-letter-n-', ['m', 'h', 'n', 'r'], '聽音，選出正確字母。');
  addListeningSet('ph-letter-g-', ['j', 'k', 'g', 'c'], '聽音，選出正確字母。');
  addListeningSet('ph-digraph-sh-', ['th', 'ch', 'sh', 'ph'], '聽音，選出正確字母組合。');
  addListeningSet('ph-digraph-ph-', ['sh', 'ch', 'th', 'ph'], '聽音，選出正確字母組合。');

  [
    ['ph-vowel-a-', ['hat', 'hate', 'hit', 'hot', 'map']],
    ['ph-vowel-i-', ['bike', 'bit', 'bite', 'bat', 'bet']],
    ['ph-vowel-u-', ['cup', 'cap', 'cop', 'bug', 'cope']],
    ['ph-vowel-e-', ['bed', 'bad', 'bid', 'red', 'ride']],
    ['ph-vowel-pin-', ['pin', 'pine', 'pan', 'pen', 'bin']],
    ['ph-vowel-o-', ['hop', 'hope', 'hug', 'hap', 'dog']],
    ['ph-vowel-ae-', ['make', 'back', 'neck', 'game', 'pick']],
    ['ph-vowel-ee-', ['see', 'sin', 'sun', 'son', 'team']],
  ].forEach(([prefix, options]) => {
    addListeningSet(prefix, options, '聽單字，選出你聽到的單字。');
  });

  addListeningSet('ph-past-letter-n-', ['a', 'n', 'm'], '聽音，選出正確字母。');
  addListeningSet('ph-past-letter-g-', ['t', 'k', 'g'], '聽音，選出正確字母。');

  [
    ['ph-past-short-i-tip-', ['tip', 'top', 'tap', 'sip']],
    ['ph-past-short-a-max-', ['mess', 'mash', 'max', 'mat']],
    ['ph-past-long-e-read-', ['read', 'ride', 'rude', 'red']],
    ['ph-past-short-e-get-', ['cat', 'lot', 'get', 'pet']],
    ['ph-past-fill-feel-', ['fear', 'fill', 'feel', 'fall']],
    ['ph-past-smile-', ['smile', 'small', 'smell', 'smooth']],
    ['ph-past-short-o-jog-', ['hug', 'jag', 'jog', 'mug']],
    ['ph-past-aw-call-', ['core', 'call', 'cool', 'cold']],
    ['ph-past-short-u-run-', ['rain', 'run', 'ran', 'room']],
    ['ph-past-short-a-dam-', ['bang', 'tame', 'dam', 'pen']],
    ['ph-past-oll-doll-', ['tall', 'wall', 'ball', 'doll']],
    ['ph-past-chase-', ['phase', 'chase', 'shoes', 'fare']],
    ['ph-past-phil-', ['pill', 'Phil', 'hill', 'wheel']],
    ['ph-past-bait-', ['bait', 'bake', 'bad', 'date']],
    ['ph-past-cheer-', ['cheer', 'there', 'share', 'where']],
    ['ph-past-trick-', ['drink', 'Derek', 'trick', 'truck']],
    ['ph-past-thursday-', ['Tuesday', 'Thursday', 'thirsty', 'thirty']],
    ['ph-past-white-', ['white', 'write', 'ride', 'right']],
    ['ph-past-bedroom-', ['bathroom', 'bedroom', 'balloon', 'bamboo']],
    ['ph-past-number-90-', ['nine', 'nineteen', 'ninety', 'night']],
  ].forEach(([prefix, options]) => {
    addListeningSet(prefix, options, '聽單字，選出你聽到的相近字。');
  });

  [
    ['ph-similar-teen-ty-01-', [['13', 'thirteen'], ['30', 'thirty'], ['14', 'fourteen'], ['40', 'forty']]],
    ['ph-similar-teen-ty-02-', [['15', 'fifteen'], ['50', 'fifty'], ['18', 'eighteen'], ['80', 'eighty']]],
    ['ph-similar-teen-ty-03-', [['19', 'nineteen'], ['90', 'ninety'], ['16', 'sixteen'], ['60', 'sixty']]],
  ].forEach(([prefix, pairs]) => {
    const options = pairs.map(([answer]) => answer);
    pairs.forEach(([answer, speak], index) => {
      questions.push({
        id: `${prefix}${String(index + 1).padStart(2, '0')}`,
        en: speak,
        zh: answer,
        speak,
        prompt: '聽數字，分辨 -teen 和 -ty。',
        options,
        mode: 'listening',
        level: 'phonics',
        levelName: phonicsLevelName,
      });
    });
  });

  [
    ['ph-spell-01', 'stomach', ['stomack', 'stomatch', 'stomach', 'stomech']],
    ['ph-spell-02', 'Tuesday', ['Tuseday', 'Tusday', 'Thursday', 'Tuesday']],
    ['ph-spell-03', 'Halloween', ['Halloeen', 'Haloween', 'Halloween', 'Hallween']],
    ['ph-spell-04', 'pumpkin', ['pumkin', 'pumpkin', 'pumkine', 'pampkin']],
    ['ph-spell-05', 'Christmas', ['Chrismas', 'Cristmas', 'Chritmas', 'Christmas']],
    ['ph-spell-06', 'library', ['libary', 'libarary', 'library', 'liberry']],
    ['ph-spell-07', 'umbrella', ['unbrella', 'umbrella', 'umbralla', 'umbrela']],
    ['ph-spell-08', 'stomachache', ['stomakache', 'stomachake', 'stomachace', 'stomachache']],
  ].forEach(([id, answer, options]) => {
    questions.push({
      id,
      en: answer,
      zh: answer,
      speak: answer,
      prompt: '聽單字，選出正確拼法。',
      options,
      mode: 'listening',
      level: 'phonics',
      levelName: phonicsLevelName,
    });
  });

  [
    ['ph-number-13-', [['30', 'thirty'], ['3', 'three'], ['13', 'thirteen'], ['300', 'three hundred']]],
    ['ph-number-80-', [['8', 'eight'], ['18', 'eighteen'], ['800', 'eight hundred'], ['80', 'eighty']]],
    ['ph-number-15-', [['50', 'fifty'], ['15', 'fifteen'], ['5', 'five'], ['500', 'five hundred']]],
    ['ph-number-90-', [['9', 'nine'], ['19', 'nineteen'], ['90', 'ninety'], ['900', 'nine hundred']]],
  ].forEach(([prefix, pairs]) => {
    const options = pairs.map(([answer]) => answer);
    pairs.forEach(([answer, speak], index) => {
      questions.push({
        id: `${prefix}${String(index + 1).padStart(2, '0')}`,
        en: speak,
        zh: answer,
        speak,
        prompt: '聽數字，選出正確答案。',
        options,
        mode: 'listening',
        level: 'phonics',
        levelName: phonicsLevelName,
      });
    });
  });

  questions.push({
    id: 'ph-meaning-thirsty',
    en: 'thirsty',
    zh: '口渴',
    speak: 'thirsty',
    prompt: '聽單字，選出正確意思。',
    options: ['三十', '口渴', '星期四', '十三'],
    mode: 'listening',
    level: 'phonics',
    levelName: phonicsLevelName,
  });

  return questions;
}

function buildFinalReviewQuestions() {
  const level = 'final';
  const levelName = '第四關 學力檢測總挑戰';
  const questions = [];
  const add = (id, prompt, answer, options, recordText = '') => {
    questions.push({
      id,
      en: prompt,
      zh: answer,
      prompt,
      recordText: recordText || answer,
      options,
      mode: 'quizRecord',
      level,
      levelName,
    });
  };

  [
    ['fr-class-01', 'May I come in?', '我可以進來嗎？', ['請坐下。', '我可以進來嗎？', '請舉手。', '請站起來。']],
    ['fr-class-02', 'May I go to the restroom?', '我可以去洗手間嗎？', ['我可以去洗手間嗎？', '我可以借你的鉛筆嗎？', '不要在走廊跑步。', '合上你的書。']],
    ['fr-class-03', 'Raise your hand.', '請舉手。', ['請站起來。', '請舉手。', '仔細聽。', '排隊。']],
    ['fr-class-04', "Don't run in the hallway.", '不要在走廊跑步。', ['保持安靜。', '不要在走廊跑步。', '打開你的書。', '幫我一個忙。']],
    ['fr-class-05', 'Listen carefully.', '仔細聽。', ['仔細聽。', '排隊。', '舉起雙手。', '不客氣。']],
    ['fr-class-06', 'Line up.', '排隊。', ['保持安靜。', '排隊。', '合上你的書。', '請坐下。']],
  ].forEach(([id, en, answer, options]) => add(id, `選出英文意思：${en}`, answer, options, `${en} ${answer}`));

  [
    ['fr-fest-01', 'We eat rice dumplings and stand eggs on ________.', 'Dragon Boat Festival', ['Chinese New Year', 'Dragon Boat Festival', 'Moon Festival', 'Halloween']],
    ['fr-fest-02', 'We eat moon cakes and pomelos on ________.', 'Moon Festival', ['Moon Festival', 'Christmas', 'Easter', "Father's Day"]],
    ['fr-fest-03', 'We go trick-or-treating on ________.', 'Halloween', ['Halloween', 'Teacher\'s Day', 'Double Tenth Day', 'Easter']],
    ['fr-fest-04', 'We get lucky money on ________.', 'Chinese New Year', ['Dragon Boat Festival', 'Chinese New Year', 'Christmas', "Mother's Day"]],
    ['fr-fest-05', 'September 28th is ________.', "Teacher's Day", ["Teacher's Day", "Father's Day", 'Christmas', 'Double Tenth Day']],
    ['fr-fest-06', 'October 10th is ________.', 'Double Tenth Day', ['Moon Festival', 'Double Tenth Day', 'Easter', 'Halloween']],
  ].forEach(([id, prompt, answer, options]) => add(id, prompt, answer, options, answer));

  [
    ['fr-qa-01', 'What time is it?', "It's seven thirty.", ["It's seven thirty.", "It's Tuesday.", "It's 35 dollars.", "I'm fine."]],
    ['fr-qa-02', 'Where is the library?', "It's on Green Street.", ["It's on Green Street.", "I'm going to the library.", "It's 35 dollars.", "She's a doctor."]],
    ['fr-qa-03', 'How much is it?', "It's 35 dollars.", ["It's Tuesday.", "It's 35 dollars.", 'I have a headache.', 'I go by bus.']],
    ['fr-qa-04', "What's wrong?", 'I have a headache.', ['I have a headache.', "It's seven thirty.", "I'm twelve.", 'Sure. Come in.']],
    ['fr-qa-05', 'What do you want for breakfast?', 'I want some milk and bread.', ['I want some milk and bread.', 'I go to school by bus.', "She's a doctor.", "It's on Green Street."]],
    ['fr-qa-06', 'How do you go to school?', 'I go to school by bus.', ['I go to school by bus.', "It's Tuesday.", 'I want juice.', "I'm fine."]],
    ['fr-qa-07', 'What does she do?', "She's a doctor.", ["She's a doctor.", "It's 35 dollars.", 'I have a cold.', 'I go by bike.']],
  ].forEach(([id, prompt, answer, options]) => add(id, `選出正確回答：${prompt}`, answer, options, `${prompt} ${answer}`));

  [
    ['fr-health-01', '頭痛', 'headache', ['headache', 'stomachache', 'toothache', 'fever']],
    ['fr-health-02', '胃痛', 'stomachache', ['stomachache', 'headache', 'cold', 'cough']],
    ['fr-health-03', '牙痛', 'toothache', ['toothache', 'fever', 'runny nose', 'cold']],
    ['fr-health-04', '發燒', 'fever', ['cold', 'cough', 'fever', 'headache']],
    ['fr-health-05', '流鼻水', 'runny nose', ['runny nose', 'cough', 'toothache', 'stomachache']],
    ['fr-job-01', '醫生', 'doctor', ['doctor', 'nurse', 'teacher', 'cook']],
    ['fr-job-02', '警察', 'police officer', ['firefighter', 'police officer', 'doctor', 'nurse']],
    ['fr-job-03', '消防員', 'firefighter', ['teacher', 'cook', 'firefighter', 'police officer']],
  ].forEach(([id, zh, answer, options]) => add(id, `選出英文：${zh}`, answer, options, `${answer} ${zh}`));

  [
    ['fr-place-01', '圖書館', 'library', ['library', 'laboratory', 'laundry', 'lobby']],
    ['fr-place-02', '超級市場', 'supermarket', ['superstore', 'supermarket', 'superman', 'station']],
    ['fr-place-03', '郵局', 'post office', ['police station', 'post office', 'pet shop', 'park']],
    ['fr-place-04', '博物館', 'museum', ['music hall', 'museum', 'mosque', 'market']],
    ['fr-place-05', '餐廳', 'restaurant', ['restaurant', 'restroom', 'reception', 'road']],
    ['fr-place-06', '醫院', 'hospital', ['hotel', 'house', 'hospital', 'hall']],
    ['fr-place-07', '書店', 'bookstore', ['bookshelf', 'bookstore', 'bookmark', 'bank']],
    ['fr-place-08', '麵包店', 'bakery', ['bakery', 'bank', 'barn', 'bookstore']],
  ].forEach(([id, zh, answer, options]) => add(id, `選出英文：${zh}`, answer, options, `${answer} ${zh}`));

  [
    ['fr-number-01', '215', 'two hundred and fifteen', ['two hundred and fifteen', 'two hundred and fifty', 'two thousand fifteen', 'two hundred five']],
    ['fr-number-02', '330', 'three hundred and thirty', ['three hundred and thirteen', 'three hundred and thirty', 'thirty-three hundred', 'three thousand thirty']],
    ['fr-number-03', '1,080', 'one thousand and eighty', ['one thousand and eighty', 'ten thousand and eighty', 'one hundred and eighty', 'one thousand eight hundred']],
    ['fr-number-04', '18', 'eighteen', ['eighty', 'eighteen', 'eight', 'eighth']],
    ['fr-number-05', '90', 'ninety', ['nineteen', 'ninety', 'nine hundred', 'nighty']],
    ['fr-time-01', '7:30', "It's seven thirty.", ["It's seven thirty.", "It's seven thirteen.", "It's six thirty.", "It's seven fifty."]],
    ['fr-time-02', '9:15', "It's nine fifteen.", ["It's nine fifty.", "It's nine fifteen.", "It's five fifteen.", "It's nine forty-five."]],
    ['fr-time-03', '6:45', "It's six forty-five.", ["It's six fourteen.", "It's six forty-five.", "It's seven forty-five.", "It's six fifteen."]],
  ].forEach(([id, prompt, answer, options]) => add(id, `選出英文：${prompt}`, answer, options, answer));

  [
    ['fr-case-01', "teacher's day", "TEACHER'S DAY", ["TEACHER'S DAY", "Teacher's Day", "tEaChEr'S dAy", "TEACHER's day"]],
    ['fr-case-02', 'New York', 'NEW YORK', ['NEW YORK', 'New York', 'nEW yORK', 'new York']],
    ['fr-case-03', 'christmas', 'Christmas', ['ChriStmas', 'CHRISTMAS', 'Christmas', 'cHRISTMAS']],
    ['fr-case-04', 'double tenth day', 'Double Tenth Day', ['Double Tenth Day', 'double tenth day', 'DOUBLE tenth DAY', 'Double tenth day']],
    ['fr-case-05', 'mOON fESTIVAL', 'Moon Festival', ['moon Festival', 'Moon festival', 'Moon Festival', 'MOON FESTIVAL']],
    ['fr-case-06', 'dragon boat festival', 'Dragon Boat Festival', ['Dragon boat Festival', 'Dragon Boat Festival', 'dragon boat festival', 'DRAGON BOAT FESTIVAL']],
  ].forEach(([id, prompt, answer, options]) => add(id, `大小寫修正：${prompt}`, answer, options, answer));

  [
    ['fr-vocab-01', 'by bus', '搭公車', ['搭公車', '騎腳踏車', '搭火車', '走路']],
    ['fr-vocab-02', 'by MRT', '搭捷運', ['搭飛機', '搭捷運', '搭計程車', '搭汽車']],
    ['fr-vocab-03', 'on foot', '走路', ['搭公車', '走路', '搭火車', '騎腳踏車']],
    ['fr-vocab-04', 'living room', '客廳', ['臥室', '浴室', '客廳', '廚房']],
    ['fr-vocab-05', 'dining room', '餐廳', ['客廳', '餐廳', '臥室', '浴室']],
    ['fr-vocab-06', 'moon cake', '月餅', ['粽子', '柚子', '月餅', '火雞']],
    ['fr-vocab-07', 'rice dumpling', '粽子', ['粽子', '春捲', '水餃', '月餅']],
    ['fr-vocab-08', 'spring roll', '春捲', ['水餃', '柚子', '火雞', '春捲']],
  ].forEach(([id, en, answer, options]) => add(id, `選出中文：${en}`, answer, options, `${en} ${answer}`));

  const moonPassage = 'Reading: Amy is celebrating Moon Festival. Her family has a barbecue tonight. They eat moon cakes and pomelos. Grandma tells stories about the moon.';
  add('fr-read-moon-01', `${moonPassage}\nWhat festival is today?`, 'Moon Festival', ['Halloween', 'Christmas', 'Moon Festival', 'Dragon Boat Festival'], 'Today is Moon Festival.');
  add('fr-read-moon-02', `${moonPassage}\nWhat do they eat?`, 'moon cakes and pomelos', ['rice dumplings', 'moon cakes and pomelos', 'turkey', 'cookies'], 'They eat moon cakes and pomelos.');
  add('fr-read-moon-03', `${moonPassage}\nWhat does Grandma do?`, 'She tells stories.', ['She sings songs.', 'She tells stories.', 'She watches TV.', 'She cooks dinner.'], 'Grandma tells stories.');

  const planPassage = 'Reading: Jason has basketball on Monday, swimming on Tuesday, art on Wednesday, English on Thursday, science on Friday, music on Saturday, and free day on Sunday.';
  add('fr-read-plan-01', `${planPassage}\nWhat does Jason do on Tuesday?`, 'He has swimming class.', ['He plays basketball.', 'He has swimming class.', 'He has art class.', 'He rests.'], 'He has swimming class on Tuesday.');
  add('fr-read-plan-02', `${planPassage}\nWhich day does Jason have English class?`, 'Thursday', ['Monday', 'Wednesday', 'Thursday', 'Friday'], 'Jason has English class on Thursday.');
  add('fr-read-plan-03', `${planPassage}\nWhen is Jason free?`, 'Sunday', ['Saturday', 'Sunday', 'Friday', 'Thursday'], 'Jason is free on Sunday.');

  const dinnerPassage = "Reading: Ken is hungry. Dad says they are having beef noodles tonight. Ken wants some juice. The orange juice is in the fridge.";
  add('fr-read-dinner-01', `${dinnerPassage}\nWhat do they have for dinner?`, 'beef noodles', ['rice', 'pizza', 'beef noodles', 'hamburgers'], 'They have beef noodles for dinner.');
  add('fr-read-dinner-02', `${dinnerPassage}\nWhat does Ken want to drink?`, 'juice', ['milk', 'tea', 'water', 'juice'], 'Ken wants some juice.');
  add('fr-read-dinner-03', `${dinnerPassage}\nWhere is the juice?`, 'in the fridge', ['on the table', 'in the fridge', 'in the bag', 'in the box'], 'The juice is in the fridge.');

  return questions;
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
    'A棟', 'B棟', 'C棟', '後北棟', '前北棟',
    '操場', '籃球場', '活動中心', '廚房',
  ];
  return names.map(name => ({
    name,
    maxHp: ['操場', '活動中心'].includes(name) ? 34 : ['籃球場', '廚房'].includes(name) ? 24 : 30,
    power: ['A棟', 'B棟', 'C棟', '後北棟', '前北棟'].includes(name)
      ? '樓棟據點。攻下後會顯示守擂學生名字。'
      : '大型據點，需要更多人合作，效果比一般樓棟強。',
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
    contributors: {},
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
let supabaseSaveTimer = null;
let supabaseSaving = false;
let supabaseDirty = false;

function restorableSnapshot(source = {}) {
  return {
    version: 2,
    students: source.students || {},
    territories: source.territories || {},
    recordings: source.recordings || [],
    answerLog: source.answerLog || [],
    events: source.events || [],
    customQuestions: source.customQuestions || [],
    questionOverrides: source.questionOverrides || {},
    deletedQuestionIds: source.deletedQuestionIds || [],
    colorIndex: source.colorIndex || 0,
    startedAt: source.startedAt || now(),
  };
}

function topContributor(terr, classNum, students = gameData.students) {
  return Object.entries(terr.contributors || {})
    .map(([studentId, points]) => ({ student: students[studentId], points }))
    .filter(row => row.student?.classNum === classNum && row.points > 0)
    .sort((a, b) => b.points - a.points || (b.student.score || 0) - (a.student.score || 0))[0] || null;
}

function refreshTerritoryLeader(terr, students = gameData.students) {
  const p502 = Math.max(0, terr.progress?.['502'] || 0);
  const p503 = Math.max(0, terr.progress?.['503'] || 0);
  terr.progress = { '502': p502, '503': p503 };
  let ownerClass = null;
  if (p502 > p503) ownerClass = '502';
  if (p503 > p502) ownerClass = '503';
  if (p502 === p503 && p502 > 0 && ['502', '503'].includes(terr.ownerClass)) ownerClass = terr.ownerClass;

  terr.ownerClass = ownerClass;
  if (!ownerClass) {
    terr.ownerStudentId = null;
    terr.ownerStudentName = '';
    terr.hp = 0;
    return;
  }
  const leader = topContributor(terr, ownerClass, students);
  terr.ownerStudentId = leader?.student?.id || null;
  terr.ownerStudentName = leader?.student?.name || '';
  terr.hp = terr.progress[ownerClass];
}

function addTerritoryContribution(terr, student, amount) {
  const classNum = student.classNum;
  const enemy = otherClass(classNum);
  const gain = Math.max(0, amount);
  terr.progress[classNum] = Math.min(terr.maxHp, (terr.progress[classNum] || 0) + gain);
  if (enemy) {
    terr.progress[enemy] = Math.max(0, (terr.progress[enemy] || 0) - Math.ceil(gain / 2));
  }
  terr.contributors = terr.contributors || {};
  terr.contributors[student.id] = Math.min(999, (terr.contributors[student.id] || 0) + gain);
  refreshTerritoryLeader(terr);
}

function normalizeLoadedData(data) {
  data = restorableSnapshot(data || {});
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
      contributors: old.contributors || {},
      hp: Math.min(old.hp || 0, terr.maxHp),
      shieldUntil: old.shieldUntil || 0,
      power: terr.power,
    };
    refreshTerritoryLeader(data.territories[name], data.students);
  });
  Object.keys(data.territories).forEach(name => {
    if (!fresh.territories[name]) delete data.territories[name];
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

function saveLocal() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(gameData, null, 2), 'utf8');
}

function supabaseEnabled() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest(pathname, options = {}) {
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  return fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...options,
    headers,
  });
}

async function loadFromSupabase() {
  if (!supabaseEnabled()) return false;
  const id = encodeURIComponent(SUPABASE_STATE_ID);
  const res = await supabaseRequest(`game_state?id=eq.${id}&select=data`, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Supabase 讀取失敗：HTTP ${res.status} ${await res.text()}`);
  }
  const rows = await res.json();
  if (!rows[0]?.data) return false;
  gameData = normalizeLoadedData(rows[0].data);
  return true;
}

async function saveToSupabaseNow() {
  if (!supabaseEnabled()) return;
  const res = await supabaseRequest('game_state', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      id: SUPABASE_STATE_ID,
      data: restorableSnapshot(gameData),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Supabase 儲存失敗：HTTP ${res.status} ${await res.text()}`);
  }
}

async function flushSupabaseSave() {
  supabaseSaveTimer = null;
  if (!supabaseEnabled() || supabaseSaving || !supabaseDirty) return;
  supabaseSaving = true;
  supabaseDirty = false;
  try {
    await saveToSupabaseNow();
  } catch (err) {
    console.log(err.message || err);
    supabaseDirty = true;
    supabaseSaveTimer = setTimeout(flushSupabaseSave, 5000);
  } finally {
    supabaseSaving = false;
    if (supabaseDirty && !supabaseSaveTimer) {
      supabaseSaveTimer = setTimeout(flushSupabaseSave, 500);
    }
  }
}

function scheduleSupabaseSave() {
  if (!supabaseEnabled()) return;
  supabaseDirty = true;
  if (!supabaseSaveTimer) {
    supabaseSaveTimer = setTimeout(flushSupabaseSave, 500);
  }
}

function save() {
  saveLocal();
  scheduleSupabaseSave();
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

function territoryShare(terr, classNum) {
  const p502 = Math.max(0, terr.progress?.['502'] || 0);
  const p503 = Math.max(0, terr.progress?.['503'] || 0);
  const total = p502 + p503;
  if (!total) return 0;
  return Math.round(((terr.progress?.[classNum] || 0) / total) * 100);
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

function activeLineBonuses(classNum) {
  return LINE_BONUSES.filter(bonus => bonus.territories.every(name => classOwns(classNum, name)));
}

function lineBonusTotals(classNum) {
  return activeLineBonuses(classNum).reduce((totals, bonus) => ({
    attack: totals.attack + bonus.attack,
    coins: totals.coins + bonus.coins,
    score: totals.score + bonus.score,
    raidDiscount: totals.raidDiscount + bonus.raidDiscount,
  }), { attack: 0, coins: 0, score: 0, raidDiscount: 0 });
}

function territoryPowerSummary() {
  const basePowers = [
    { name: '操場', effect: '大型據點：全班攻擊 +1' },
    { name: '廚房', effect: '大型據點：答對金幣 +2' },
    { name: '活動中心', effect: '大型據點：補給卡機率提高，10連勝補給加碼' },
    { name: '籃球場', effect: '大型據點：突襲費用 -2' },
  ];
  const linePowers = LINE_BONUSES.map(bonus => {
    const activeClass = CLASSES.find(classNum => bonus.territories.every(name => classOwns(classNum, name))) || '';
    return { name: bonus.name, effect: bonus.effect, activeClass, type: 'line' };
  });
  return [...basePowers, ...linePowers];
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
  const festival = levelSummary(student, 'festival');
  const phonics = levelSummary(student, 'phonics');
  const final = levelSummary(student, 'final');
  const manualLevel = LEVELS.some(level => level.id === student.manualLevel) ? student.manualLevel : '';
  const manualFestival = manualLevel === 'festival';
  const manualPhonics = manualLevel === 'phonics';
  const manualFinal = manualLevel === 'final';
  const festivalUnlocked = manualFestival
    || manualPhonics
    || manualFinal
    || (classroom.total > 0 && classroom.answered >= classroom.total && classroom.accuracy >= 0.9);
  const phonicsUnlocked = manualPhonics
    || manualFinal
    || (festivalUnlocked && festival.total > 0 && festival.answered >= festival.total && festival.accuracy >= 0.9);
  const finalUnlocked = manualFinal
    || (phonicsUnlocked && phonics.total > 0 && phonics.answered >= phonics.total && phonics.accuracy >= 0.9);
  const currentLevel = finalUnlocked ? 'final' : phonicsUnlocked ? 'phonics' : festivalUnlocked ? 'festival' : 'classroom';
  return {
    currentLevel,
    currentLevelName: manualLevel
      ? `${levelName(currentLevel)}（老師開啟）`
      : levelName(currentLevel),
    unlockedLevels: finalUnlocked
      ? ['classroom', 'festival', 'phonics', 'final']
      : phonicsUnlocked
      ? ['classroom', 'festival', 'phonics']
      : festivalUnlocked
      ? ['classroom', 'festival']
      : ['classroom'],
    classroom,
    festival,
    phonics,
    final,
    manualLevel,
  };
}

function attackPower(student) {
  const levelInfo = studentLevelInfo(student);
  const levelBonus = levelInfo.currentLevel === 'final' ? 3 : levelInfo.currentLevel === 'phonics' ? 2 : levelInfo.currentLevel === 'festival' ? 1 : 0;
  const lineBonus = lineBonusTotals(student.classNum);
  return 1
    + levelBonus
    + (normalizeRole(student.role) === 'warrior' ? 1 : 0)
    + (classOwns(student.classNum, '操場') ? 1 : 0)
    + lineBonus.attack
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
  const lineBonus = lineBonusTotals(student.classNum);

  if (role === 'warrior') attack += 1;
  if (role === 'merchant') coins += 1;
  if (classOwns(student.classNum, '操場')) attack += 1;
  if (classOwns(student.classNum, '廚房')) coins += 2;
  attack += lineBonus.attack;
  coins += lineBonus.coins;
  bonusScore += lineBonus.score;

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
  } else if (levelInfo.currentLevel === 'phonics') {
    attack += 2;
    coins += 2;
  } else if (levelInfo.currentLevel === 'final') {
    attack += 3;
    coins += 3;
  }

  if (!card && classOwns(student.classNum, '活動中心') && Math.random() < 0.28) {
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
    if (classOwns(student.classNum, '活動中心')) addCard(student, randomCardType());
    card = `10 連勝補給：${cardName(streakCard)}`;
  }

  const previousOwnerClass = terr.ownerClass;
  const previousOwnerStudentId = terr.ownerStudentId;
  const activeBefore = new Set(activeLineBonuses(student.classNum).map(bonus => bonus.id));
  if (terr.ownerClass && terr.ownerClass !== student.classNum && terr.shieldUntil > now()) {
    terr.lastEvent = `${terr.name} 有防護罩，這次推進被擋下`;
    bonusScore -= 2;
  } else {
    addTerritoryContribution(terr, student, attack);
    const myShare = territoryShare(terr, student.classNum);
    terr.lastEvent = `${student.classNum} ${student.name} 貢獻 +${attack}，佔比 ${myShare}%`;
    captured = previousOwnerClass !== terr.ownerClass || previousOwnerStudentId !== terr.ownerStudentId;
    if (previousOwnerClass !== terr.ownerClass && terr.ownerClass === student.classNum) {
      student.score += previousOwnerClass ? 25 : 20;
      terr.shieldUntil = normalizeRole(student.role) === 'guardian' ? now() + 120 * 1000 : terr.shieldUntil;
      pushEvent(`${student.classNum} ${student.name} 讓 ${terr.name} 轉為 ${student.classNum} 領先！`, 'capture');
    } else if (previousOwnerStudentId !== terr.ownerStudentId && terr.ownerStudentId === student.id) {
      student.score += 8;
      pushEvent(`${student.classNum} ${student.name} 成為 ${terr.name} 樓主！`, 'capture');
    }
    activeLineBonuses(student.classNum)
      .filter(bonus => !activeBefore.has(bonus.id))
      .forEach(bonus => {
        student.score += 15;
        student.coins += 5;
        addCard(student, randomCardType());
        pushEvent(`${student.classNum} 完成「${bonus.name}」連線！全班啟動：${bonus.effect}，${student.name} 獲得補給。`, 'capture');
      });
    if (terr.ownerStudentId === student.id) {
      coins += 1;
      card = card || '樓主獎勵';
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
  const activeBefore = new Set(activeLineBonuses(student.classNum).map(bonus => bonus.id));
  terr.progress[student.classNum] = terr.maxHp;
  terr.progress[otherClass(student.classNum)] = 0;
  terr.contributors = terr.contributors || {};
  terr.contributors[student.id] = Math.max(terr.contributors[student.id] || 0, terr.maxHp);
  refreshTerritoryLeader(terr);
  terr.shieldUntil = normalizeRole(student.role) === 'guardian' ? now() + 120 * 1000 : 0;
  student.score += fromEnemy ? 25 : 20;
  terr.lastEvent = `${student.classNum} 取得 100% 佔比`;
  pushEvent(`${student.classNum} ${student.name} 成為 ${terr.name} 樓主！${normalizeRole(student.role) === 'guardian' ? '守衛防護啟動。' : ''}`, 'capture');
  activeLineBonuses(student.classNum)
    .filter(bonus => !activeBefore.has(bonus.id))
    .forEach(bonus => {
      student.score += 15;
      student.coins += 5;
      addCard(student, randomCardType());
      pushEvent(`${student.classNum} 完成「${bonus.name}」連線！全班啟動：${bonus.effect}，${student.name} 獲得補給。`, 'capture');
    });
}

function repairOwnedTerritory(classNum) {
  const owned = Object.values(gameData.territories)
    .filter(t => t.ownerClass === classNum && (t.progress[classNum] || 0) < t.maxHp);
  if (owned.length === 0) return;
  const terr = randomItem(owned);
  terr.progress[classNum] = Math.min(terr.maxHp, (terr.progress[classNum] || 0) + 2);
  refreshTerritoryLeader(terr);
  terr.lastEvent = `${classNum} 班佔比 +2`;
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
  terr.contributors = {};
  terr.shieldUntil = 0;
}

function itemCost(student, item) {
  const base = { repair: 5, shield: 6, boost: 8, steal: 7, freeze: 6, rent: 9, pack: 6, raid: 10 };
  let cost = base[item];
  if (!cost) return 0;
  if (normalizeRole(student.role) === 'merchant') cost = Math.max(1, cost - 1);
  if (item === 'raid' && classOwns(student.classNum, '籃球場')) cost = Math.max(1, cost - 2);
  if (item === 'raid') cost = Math.max(1, cost - lineBonusTotals(student.classNum).raidDiscount);
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
    const targetClass = target.classNum;
    terr.progress[targetClass] = Math.max(0, (terr.progress[targetClass] || 0) - 5);
    terr.progress[student.classNum] = Math.min(terr.maxHp, (terr.progress[student.classNum] || 0) + 2);
    refreshTerritoryLeader(terr);
    terr.lastEvent = `${student.name} 突襲 ${target.name}`;
    pushEvent(`${student.classNum} ${student.name} 突襲 ${target.name} 的 ${terr.name}。`, 'shop');
    return { ok: true, message: `${target.name} 的 ${terr.name} 佔比被突襲削弱。` };
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
      .filter(t => t.ownerClass === student.classNum && (t.progress[student.classNum] || 0) < t.maxHp);
    if (candidates.length === 0) {
      return { ok: false, error: '修復卡只能用在己方仍可提高佔比的據點。現在己方據點佔比都已滿，所以卡會保留。' };
    }
    const selected = gameData.territories[territoryName];
    const terr = selected?.ownerClass === student.classNum && (selected.progress[student.classNum] || 0) < selected.maxHp
      ? gameData.territories[territoryName]
      : candidates.sort((a, b) => (a.progress[student.classNum] || 0) - (b.progress[student.classNum] || 0))[0];
    student.cards.repair -= 1;
    const amount = normalizeRole(student.role) === 'engineer' ? 6 : 4;
    terr.progress[student.classNum] = Math.min(terr.maxHp, (terr.progress[student.classNum] || 0) + amount);
    terr.contributors = terr.contributors || {};
    terr.contributors[student.id] = (terr.contributors[student.id] || 0) + amount;
    refreshTerritoryLeader(terr);
    terr.lastEvent = `${student.name} 使用修復卡，佔比 +${amount}`;
    pushEvent(`${student.classNum} ${student.name} 提高了 ${terr.name} 佔比。`, 'shop');
    return { ok: true, message: `${terr.name} 佔比 +${amount}。` };
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
    terr.progress[student.classNum] = Math.max(0, (terr.progress[student.classNum] || 0) - 1);
    terr.progress[otherClass(student.classNum)] = Math.min(terr.maxHp, (terr.progress[otherClass(student.classNum)] || 0) + 1);
    refreshTerritoryLeader(terr);
    terr.lastEvent = `${student.classNum} 答錯，${otherClass(student.classNum)} 班佔比 +1`;
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

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/state', (req, res) => res.json(publicState()));

app.get('/api/storage', (req, res) => {
  res.json({
    mode: supabaseEnabled() ? 'supabase' : 'local-file',
    supabaseConfigured: supabaseEnabled(),
    stateId: SUPABASE_STATE_ID,
  });
});

app.get('/api/teacher/backup.json', (req, res) => {
  const filename = `岡山大作戰備份-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.json({
    exportedAt: new Date().toISOString(),
    game: restorableSnapshot(gameData),
  });
});

app.get('/api/questions', (req, res) => res.json({ questions: allQuestions(), levels: LEVELS }));

app.post('/api/teacher/questions', (req, res) => {
  const question = normalizeQuestion({
    id: `custom-${now()}-${Math.random().toString(36).slice(2, 7)}`,
    en: req.body.en,
    zh: req.body.zh,
    level: req.body.level,
    mode: req.body.mode,
    prompt: req.body.prompt,
    speak: req.body.speak,
    recordText: req.body.recordText,
    options: req.body.options,
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
    ...(base || custom || {}),
    id,
    en: req.body.en,
    zh: req.body.zh,
    level: req.body.level,
    mode: req.body.mode || (base || custom || {}).mode,
    prompt: req.body.prompt || (base || custom || {}).prompt,
    speak: req.body.speak || (base || custom || {}).speak,
    recordText: req.body.recordText || (base || custom || {}).recordText,
    options: req.body.options || (base || custom || {}).options,
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
  student.manualLevel = ['festival', 'phonics', 'final'].includes(level) ? level : '';
  const openedLevelText = student.manualLevel === 'final' ? '第四關' : student.manualLevel === 'phonics' ? '第三關' : '第二關';
  pushEvent(
    student.manualLevel
      ? `老師開啟 ${student.name} 的${openedLevelText}。`
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

app.post('/api/teacher/restore', (req, res) => {
  const source = req.body?.game || req.body?.data || req.body;
  if (!source || typeof source !== 'object') {
    return res.status(400).json({ error: '備份檔格式不正確。' });
  }
  gameData = normalizeLoadedData(restorableSnapshot(source));
  pushEvent('老師還原備份資料。', 'teacher');
  save();
  broadcast();
  res.json({ ok: true, state: publicState() });
});

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'state', data: publicState() }));
});

async function start() {
  load();
  if (supabaseEnabled()) {
    try {
      const remoteLoaded = await loadFromSupabase();
      if (remoteLoaded) {
        saveLocal();
        console.log('已從 Supabase 載入遊戲資料。');
      } else {
        save();
        await flushSupabaseSave();
        console.log('Supabase 尚無遊戲資料，已建立第一份狀態。');
      }
    } catch (err) {
      console.log(err.message || err);
      console.log('Supabase 暫時不可用，先使用本機資料啟動。');
      save();
    }
  } else {
    save();
  }
  fs.mkdirSync(STUDENT_AUDIO_DIR, { recursive: true });

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
    console.log(`資料儲存: ${supabaseEnabled() ? 'Supabase' : '本機檔案'}`);
    console.log('按 Ctrl+C 停止伺服器\n');
  });
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
