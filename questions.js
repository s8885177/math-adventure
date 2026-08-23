// questions.js — 出題邏輯（依「概念」出題，不照抄課本題庫的數字與格式）

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickDigitsNoRepeatZeroFirst(len) {
  // helper not currently required, placeholder for future expansion
}

// ---------- Zone 1：比大小 ----------
function genCompare(difficulty) {
  // difficulty 1: 位數不同或差距大；difficulty 2: 位數相同高位比較；difficulty 3: 只差最後一位
  let a, b;
  if (difficulty === 1) {
    a = randInt(100, 9999);
    b = randInt(100, 9999);
  } else if (difficulty === 2) {
    const base = randInt(1000, 9000);
    a = base + randInt(0, 90);
    b = base + randInt(0, 90) + randInt(-300, 300);
    if (b < 0) b = base + randInt(100, 900);
  } else {
    const base = randInt(1000, 9800);
    a = base;
    b = base + (Math.random() < 0.5 ? -1 : 1) * randInt(1, 9);
  }
  a = Math.max(0, Math.min(9999, a));
  b = Math.max(0, Math.min(9999, b));
  if (a === b) b = a + randInt(1, 9);
  const symbol = a > b ? '>' : a < b ? '<' : '=';
  return { type: 'compare', a, b, symbol };
}

// ---------- Zone 2：整數數線 ----------
function genNumberLine(difficulty, mode) {
  const step = difficulty === 1 ? randInt(1, 2) * (Math.random() < 0.5 ? 1 : 5)
             : difficulty === 2 ? [2, 5, 10][randInt(0, 2)]
             : [10, 50, 100][randInt(0, 2)];
  const ticks = 10;
  const start = 0;
  const end = step * ticks;

  if (mode === 'find-position') {
    const targetTickIndex = randInt(1, ticks - 1);
    const target = start + step * targetTickIndex;
    return { type: 'numberline-find-position', start, end, step, ticks, target, targetTickIndex };
  } else {
    // jump quest
    const fromTick = randInt(0, ticks - 3);
    const from = start + step * fromTick;
    const jumpTicks = randInt(1, Math.min(4, ticks - fromTick - 1));
    const direction = Math.random() < 0.5 || fromTick === 0 ? 1 : (Math.random() < 0.5 ? 1 : -1);
    let toTick = fromTick + direction * jumpTicks;
    toTick = Math.max(0, Math.min(ticks, toTick));
    const answer = start + step * toTick;
    return { type: 'numberline-jump', start, end, step, ticks, from, jumpTicks, direction, answer };
  }
}

// ---------- Zone 3：三位數加法（進位） ----------
function genAddition3(difficulty) {
  let a, b;
  let tries = 0;
  do {
    if (difficulty === 1) {
      a = randInt(100, 899);
      b = randInt(100, 899);
    } else if (difficulty === 2) {
      a = randInt(150, 950);
      b = randInt(150, 950);
    } else {
      a = randInt(500, 989);
      b = randInt(200, 989);
    }
    tries++;
  } while (!hasCarry(a, b) && tries < 20);
  return { type: 'add3', a, b, answer: a + b };
}

// ---------- Zone 4：四位數 + 一位數（進位鏈） ----------
function genAddition4plus1(difficulty) {
  let a, b;
  if (difficulty === 1) {
    a = randInt(1000, 8999);
    b = randInt(2, 9);
  } else if (difficulty === 2) {
    // 個位接近 10，觸發一次進位
    const unit = randInt(6, 9);
    a = randInt(100, 899) * 10 + unit;
    b = randInt(10 - unit + 1, 9);
    if (b < 1) b = randInt(1, 9);
  } else {
    // 連鎖進位，例如 x999 + n
    const base = randInt(1, 8) * 1000 + 999;
    a = base;
    b = randInt(1, 9);
  }
  a = Math.max(1000, Math.min(9998, a));
  return { type: 'add4plus1', a, b, answer: a + b };
}

function hasCarry(a, b) {
  let carry = false;
  let x = a, y = b;
  while (x > 0 || y > 0) {
    const dx = x % 10, dy = y % 10;
    if (dx + dy >= 10) { carry = true; break; }
    x = Math.floor(x / 10); y = Math.floor(y / 10);
  }
  return carry;
}

function digitsOf(n, len) {
  const s = String(n).padStart(len, '0');
  return s.split('').map(Number);
}

// ---------- BugHunt：故意做錯一位數字 ----------
function genBugHuntAddition(difficulty, fourDigit) {
  const q = fourDigit ? genAddition4plus1(difficulty) : genAddition3(difficulty);
  const correctAnswer = q.answer;
  const len = String(correctAnswer).length;
  const digits = digitsOf(correctAnswer, len);
  const buggy = Math.random() < 0.7; // 70% 機率真的出錯，30% 機率其實是對的（訓練不要盲目找碴）
  let wrongIndex = -1;
  const shownDigits = [...digits];
  if (buggy) {
    wrongIndex = randInt(0, len - 1);
    let newDigit = randInt(0, 9);
    while (newDigit === digits[wrongIndex]) newDigit = randInt(0, 9);
    shownDigits[wrongIndex] = newDigit;
  }
  const shownAnswer = Number(shownDigits.join(''));
  return { type: 'bughunt', a: q.a, b: q.b, correctAnswer, shownAnswer, len, wrongIndex, isCorrect: !buggy };
}

// ---------- 錯題複習池（localStorage） ----------
const REVIEW_KEY = 'mathAdventure_wrongPool_v1';

function loadReviewPool() {
  try {
    return JSON.parse(localStorage.getItem(REVIEW_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveToReviewPool(entry) {
  const pool = loadReviewPool();
  pool.unshift({ ...entry, ts: Date.now() });
  const trimmed = pool.slice(0, 60);
  localStorage.setItem(REVIEW_KEY, JSON.stringify(trimmed));
}

function removeFromReviewPool(ts) {
  const pool = loadReviewPool().filter(e => e.ts !== ts);
  localStorage.setItem(REVIEW_KEY, JSON.stringify(pool));
}

window.MathQuestions = {
  genCompare, genNumberLine, genAddition3, genAddition4plus1, genBugHuntAddition,
  loadReviewPool, saveToReviewPool, removeFromReviewPool, digitsOf, hasCarry
};
