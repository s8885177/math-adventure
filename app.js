// app.js — 主控制器：畫面切換、玩法邏輯、計分、英雄榜串接
(function () {
  const Q = window.MathQuestions;
  const FX = window.MathEffects;
  const SESSION_LENGTH = 8;

  const ZONES = [
    {
      id: 'compare', name: '比大小峽谷', mascotClass: 'mascot--compare', color: '#FFD23F',
      desc: '誰是數字老大？眼明手快分勝負',
      modes: [
        { id: 'speedpick', name: '誰是老大', emoji: '🏁', sub: '限時搶答，點出比較大的數字' },
        { id: 'symbolmaze', name: '符號迷宮', emoji: '🧩', sub: '選出正確的 > < =' }
      ]
    },
    {
      id: 'numberline', name: '數線秘境', mascotClass: 'mascot--numberline', color: '#33FFC7',
      desc: '在探險地圖上找出正確的刻度位置',
      modes: [
        { id: 'lineagent', name: '數線特工', emoji: '📍', sub: '點出目標數字在數線上的位置' },
        { id: 'jumpquest', name: '跳格任務', emoji: '🦘', sub: '算出跳格後停在哪個刻度' }
      ]
    },
    {
      id: 'add3', name: '三位數加法林', mascotClass: 'mascot--add3', color: '#FF4D8D',
      desc: '進位加法基礎訓練，越練越快',
      modes: [
        { id: 'columnpuzzle', name: '直式拼圖', emoji: '🧱', sub: '逐位填入答案，完成直式計算' },
        { id: 'speedmental', name: '極速心算', emoji: '⚡', sub: '限時心算，直接打出總和' }
      ]
    },
    {
      id: 'add4', name: '四位數寶藏塔', mascotClass: 'mascot--add4', color: '#8C4DFF',
      desc: '進位鏈挑戰，找出藏在計算裡的錯誤',
      modes: [
        { id: 'treasurecolumn', name: '尋寶直式', emoji: '💰', sub: '挑戰連續進位的直式計算' },
        { id: 'bughunt', name: '抓抓蟲', emoji: '🐛', sub: '找出答案裡藏著的錯誤數字' }
      ]
    }
  ];

  const state = {
    screen: 'home',
    nickname: localStorage.getItem('mathAdventure_nickname') || '',
    roomCode: localStorage.getItem('mathAdventure_roomCode') || '',
    zone: null,
    mode: null,
    isReview: false,
    queue: [],
    index: 0,
    correctCount: 0,
    streak: 0,
    maxStreak: 0,
    times: [],
    qStartTime: 0,
    wrongThisSession: [],
    lastFocusScore: 0
  };

  const app = document.getElementById('app');

  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    state.screen = name;
  }

  // ---------------- HOME ----------------
  function renderHome() {
    document.getElementById('nickname-input').value = state.nickname;
  }

  function goHome() {
    showScreen('home');
    renderHome();
  }

  function saveNicknameIfNeeded() {
    const val = document.getElementById('nickname-input').value.trim();
    if (val) {
      state.nickname = val;
      localStorage.setItem('mathAdventure_nickname', val);
    }
  }

  // ---------------- ZONE SELECT ----------------
  function renderZoneSelect() {
    saveNicknameIfNeeded();
    const wrap = document.getElementById('zone-list');
    wrap.innerHTML = '';
    ZONES.forEach(z => {
      const div = document.createElement('div');
      div.className = 'zone-node';
      div.style.setProperty('--zone-color', z.color);
      div.innerHTML = `
        <div class="flag"><div class="mascot-blob ${z.mascotClass}"><div class="eye eye-l"></div><div class="eye eye-r"></div><div class="mouth"></div></div></div>
        <div class="info">
          <div class="name">${z.name}</div>
          <div class="desc">${z.desc}</div>
        </div>
        <button class="go">出發</button>
      `;
      div.querySelector('.go').onclick = () => selectZone(z.id);
      wrap.appendChild(div);
    });

    const reviewPool = Q.loadReviewPool();
    const reviewBtn = document.getElementById('review-zone-btn');
    reviewBtn.querySelector('.count').textContent = reviewPool.length > 0 ? `目前有 ${reviewPool.length} 題待複習` : '目前沒有錯題，先去闖關吧！';
  }

  function selectZone(zoneId) {
    state.zone = ZONES.find(z => z.id === zoneId);
    state.isReview = false;
    renderModeSelect();
    showScreen('modeselect');
  }

  function renderModeSelect() {
    document.getElementById('modeselect-title').textContent = state.zone.name;
    const wrap = document.getElementById('mode-list');
    wrap.innerHTML = '';
    state.zone.modes.forEach(m => {
      const div = document.createElement('div');
      div.className = 'mode-card';
      div.innerHTML = `
        <div class="emoji">${m.emoji}</div>
        <div class="body">
          <div class="title">${m.name}</div>
          <div class="sub">${m.sub}</div>
        </div>
        <button class="play">開始</button>
      `;
      div.querySelector('.play').onclick = () => startSession(m.id);
      wrap.appendChild(div);
    });
  }

  // ---------------- REVIEW ZONE ----------------
  function startReview() {
    const pool = Q.loadReviewPool();
    if (pool.length === 0) return;
    state.isReview = true;
    state.zone = { id: 'review', name: '複習特訓營', color: '#F2A73B' };
    state.mode = 'review';
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(SESSION_LENGTH, pool.length));
    state.queue = shuffled.map(entry => ({ ...entry.question, __reviewTs: entry.ts }));
    beginQueue();
  }

  // ---------------- SESSION START ----------------
  function startSession(modeId) {
    state.mode = modeId;
    state.isReview = false;
    state.queue = buildQuestionQueue(state.zone.id, modeId);
    beginQueue();
  }

  function beginQueue() {
    state.index = 0;
    state.correctCount = 0;
    state.streak = 0;
    state.maxStreak = 0;
    state.times = [];
    state.wrongThisSession = [];
    showScreen('play');
    renderCurrentQuestion();
  }

  function buildQuestionQueue(zoneId, modeId) {
    const list = [];
    for (let i = 0; i < SESSION_LENGTH; i++) {
      const difficulty = 1 + Math.floor(i / 3); // 逐漸變難 1→2→3
      list.push(generateQuestion(zoneId, modeId, Math.min(difficulty, 3)));
    }
    return list;
  }

  function generateQuestion(zoneId, modeId, difficulty) {
    switch (zoneId) {
      case 'compare':
        return { zoneId, modeId, ...Q.genCompare(difficulty) };
      case 'numberline':
        return { zoneId, modeId, ...Q.genNumberLine(difficulty, modeId === 'lineagent' ? 'find-position' : 'jump') };
      case 'add3':
        return { zoneId, modeId, ...(modeId === 'columnpuzzle' ? Q.genAddition3(difficulty) : Q.genAddition3(difficulty)) };
      case 'add4':
        if (modeId === 'bughunt') return { zoneId, modeId, ...Q.genBugHuntAddition(difficulty, true) };
        return { zoneId, modeId, ...Q.genAddition4plus1(difficulty) };
      default:
        return null;
    }
  }

  // ---------------- PLAY SCREEN ----------------
  function renderCurrentQuestion() {
    const q = state.queue[state.index];
    document.getElementById('hud-progress-fill').style.width = `${(state.index / state.queue.length) * 100}%`;
    document.getElementById('hud-streak').textContent = state.streak > 1 ? `🔥 連擊 x${state.streak}` : '';
    document.getElementById('hud-counter').textContent = `${state.index + 1} / ${state.queue.length}`;
    state.qStartTime = Date.now();

    const area = document.getElementById('question-area');
    area.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'question-card';
    area.appendChild(card);

    const renderers = {
      compare: renderCompare,
      numberline: renderNumberLine,
      add3: renderAddition,
      add4: renderAddition4,
    };
    (renderers[q.zoneId] || renderCompare)(card, q);
  }

  function afterAnswer(isCorrect, q) {
    const elapsed = (Date.now() - state.qStartTime) / 1000;
    state.times.push(elapsed);
    const card = document.querySelector('.question-card');

    if (isCorrect) {
      state.correctCount++;
      state.streak++;
      state.maxStreak = Math.max(state.maxStreak, state.streak);
      showBanner(FX.randomSuccessLine(), false);
      FX.triggerSuccessPop(card, state.streak);
      if (state.isReview && q.__reviewTs) Q.removeFromReviewPool(q.__reviewTs);
    } else {
      state.streak = 0;
      showBanner(FX.randomFunnyFail(), true);
      FX.triggerFailWobble(card);
      state.wrongThisSession.push(q);
      if (!state.isReview) Q.saveToReviewPool({ question: stripQuestion(q) });
    }

    setTimeout(() => {
      state.index++;
      if (state.index >= state.queue.length) {
        endSession();
      } else {
        renderCurrentQuestion();
      }
    }, 1150);
  }

  function stripQuestion(q) {
    const clone = { ...q };
    delete clone.__reviewTs;
    return clone;
  }

  function showBanner(text, isFail) {
    let banner = document.getElementById('feedback-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'feedback-banner';
      banner.className = 'feedback-banner';
      document.body.appendChild(banner);
    }
    banner.classList.remove('banner-show', 'fail');
    void banner.offsetWidth;
    banner.textContent = text;
    if (isFail) banner.classList.add('fail');
    banner.classList.add('banner-show');
  }

  // ---------- Zone: 比大小 ----------
  function renderCompare(card, q) {
    if (q.modeId === 'speedpick') {
      card.innerHTML = `
        <div class="prompt">哪一個數字比較大？點下去！</div>
        <div class="choice-grid">
          <button class="choice-btn" data-val="a">${q.a}</button>
          <button class="choice-btn" data-val="b">${q.b}</button>
        </div>
      `;
      card.querySelector('[data-val="a"]').onclick = () => { FX.playTapTick(); afterAnswer(q.a > q.b, q); };
      card.querySelector('[data-val="b"]').onclick = () => { FX.playTapTick(); afterAnswer(q.b > q.a, q); };
    } else {
      card.innerHTML = `
        <div class="prompt">選出正確的符號</div>
        <div class="big-numbers"><span>${q.a}</span><span id="symbol-slot">?</span><span>${q.b}</span></div>
        <div class="choice-grid" style="grid-template-columns: repeat(3,1fr);">
          <button class="choice-btn symbol" data-s=">">&gt;</button>
          <button class="choice-btn symbol" data-s="<">&lt;</button>
          <button class="choice-btn symbol" data-s="=">=</button>
        </div>
      `;
      card.querySelectorAll('[data-s]').forEach(btn => {
        btn.onclick = () => { FX.playTapTick(); afterAnswer(btn.dataset.s === q.symbol, q); };
      });
    }
  }

  // ---------- Zone: 數線 ----------
  function renderNumberLine(card, q) {
    if (q.modeId === 'lineagent') {
      card.innerHTML = `<div class="prompt">找出「${q.target}」在數線上的位置</div><div class="numberline-wrap"></div>`;
      const wrap = card.querySelector('.numberline-wrap');
      wrap.appendChild(buildNumberLineSVG(q, (tickIndex) => {
        FX.playTapTick();
        afterAnswer(tickIndex === q.targetTickIndex, q);
      }));
    } else {
      const dirWord = q.direction === 1 ? '右' : '左';
      card.innerHTML = `
        <div class="prompt">從刻度 ${q.from} 出發，往${dirWord}跳 ${q.jumpTicks} 格（每格 ${q.step}），會到哪個刻度？</div>
        <div class="number-input-row"><input id="jump-answer" type="number" inputmode="numeric" class="digit-box" style="width:120px;" /></div>
        <button class="confirm-btn" id="jump-confirm">確認答案</button>
      `;
      card.querySelector('#jump-confirm').onclick = () => {
        const val = Number(card.querySelector('#jump-answer').value);
        FX.playTapTick();
        afterAnswer(val === q.answer, q);
      };
    }
  }

  function buildNumberLineSVG(q, onTick) {
    const width = 320, height = 90, padding = 24;
    const usableWidth = width - padding * 2;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.classList.add('numberline-svg');

    const lineY = 45;
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', padding); line.setAttribute('x2', width - padding);
    line.setAttribute('y1', lineY); line.setAttribute('y2', lineY);
    line.setAttribute('stroke', '#0B2B2C'); line.setAttribute('stroke-width', '3');
    svg.appendChild(line);

    for (let i = 0; i <= q.ticks; i++) {
      const x = padding + (usableWidth / q.ticks) * i;
      const value = q.start + q.step * i;
      const g = document.createElementNS(svgNS, 'g');
      g.classList.add('tick-btn');
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', x); circle.setAttribute('cy', lineY); circle.setAttribute('r', 9);
      circle.setAttribute('fill', '#EF6C57');
      g.appendChild(circle);
      if (i % 2 === 0 || q.ticks <= 6) {
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', x); text.setAttribute('y', lineY + 26);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '11');
        text.setAttribute('fill', '#0B2B2C');
        text.textContent = value;
        g.appendChild(text);
      }
      g.addEventListener('click', () => onTick(i));
      svg.appendChild(g);
    }
    return svg;
  }

  // ---------- Zone: 三位數加法 ----------
  function renderAddition(card, q) {
    if (q.modeId === 'columnpuzzle') {
      renderColumnPuzzle(card, q, 3);
    } else {
      card.innerHTML = `
        <div class="prompt">極速心算：${q.a} + ${q.b} = ？</div>
        <div class="number-input-row"><input id="sm-answer" type="number" inputmode="numeric" class="digit-box" style="width:140px;" /></div>
        <button class="confirm-btn" id="sm-confirm">確認答案</button>
      `;
      const input = card.querySelector('#sm-answer');
      setTimeout(() => input.focus(), 50);
      card.querySelector('#sm-confirm').onclick = () => {
        FX.playTapTick();
        afterAnswer(Number(input.value) === q.answer, q);
      };
    }
  }

  function renderAddition4(card, q) {
    if (q.modeId === 'bughunt') {
      renderBugHunt(card, q);
    } else {
      renderColumnPuzzle(card, q, 4);
    }
  }

  function renderColumnPuzzle(card, q, maxLen) {
    const answerLen = String(q.answer).length;
    card.innerHTML = `
      <div class="prompt">直式計算：填入每一位數字</div>
      <div class="column-add">
        <div class="row"><div class="digit-static">&nbsp;</div>${digitCells(q.a, answerLen)}</div>
        <div class="op-row"><div class="digit-static">+</div>${digitCells(q.b, answerLen)}</div>
        <div class="row" id="answer-row">${inputCells(answerLen)}</div>
      </div>
      <button class="confirm-btn" id="col-confirm">確認答案</button>
    `;
    const inputs = [...card.querySelectorAll('.answer-input')];
    inputs.forEach((inp, idx) => {
      inp.addEventListener('input', () => {
        if (inp.value.length >= 1 && idx < inputs.length - 1) inputs[idx + 1].focus();
      });
    });
    if (inputs[0]) setTimeout(() => inputs[0].focus(), 50);
    card.querySelector('#col-confirm').onclick = () => {
      const combined = inputs.map(i => i.value || '').join('');
      FX.playTapTick();
      afterAnswer(Number(combined) === q.answer, q);
    };
  }

  function digitCells(num, len) {
    const s = String(num).padStart(len, ' ');
    return s.split('').map(ch => `<div class="digit-static">${ch === ' ' ? '' : ch}</div>`).join('');
  }
  function inputCells(len) {
    let html = '';
    for (let i = 0; i < len; i++) {
      html += `<input class="digit-box answer-input" maxlength="1" inputmode="numeric" />`;
    }
    return html;
  }

  function renderBugHunt(card, q) {
    const shownStr = String(q.shownAnswer).padStart(q.len, '0');
    card.innerHTML = `
      <div class="prompt">檢查這題：${q.a} + ${q.b} = ${shownStr}</div>
      <div class="prompt" style="font-size:0.9rem;color:#5a5a5a;">哪一位數字算錯了？如果全部正確，點「全對」</div>
      <div class="bughunt-cols" id="bughunt-cols"></div>
      <button class="confirm-btn" id="bh-all-correct" style="margin-top:14px;">這題全部正確</button>
    `;
    const colsWrap = card.querySelector('#bughunt-cols');
    let selected = null;
    for (let i = 0; i < q.len; i++) {
      const btn = document.createElement('button');
      btn.className = 'bughunt-col-btn';
      btn.textContent = shownStr[i];
      btn.onclick = () => {
        colsWrap.querySelectorAll('.bughunt-col-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selected = i;
        FX.playTapTick();
        const isCorrectGuess = !q.isCorrect && selected === q.wrongIndex;
        afterAnswer(isCorrectGuess, q);
      };
      colsWrap.appendChild(btn);
    }
    card.querySelector('#bh-all-correct').onclick = () => {
      FX.playTapTick();
      afterAnswer(q.isCorrect === true, q);
    };
  }

  // ---------------- END SESSION / RESULT ----------------
  function endSession() {
    const total = state.queue.length;
    const accuracy = Math.round((state.correctCount / total) * 100);
    const avgSeconds = state.times.length ? (state.times.reduce((a, b) => a + b, 0) / state.times.length) : 0;
    const speedScore = Math.max(0, Math.min(100, Math.round(100 - (avgSeconds - 4) * 8)));
    const focusScore = Math.round(accuracy * 0.7 + speedScore * 0.3);
    state.lastFocusScore = focusScore;

    document.getElementById('result-score').textContent = focusScore;
    document.getElementById('result-accuracy').textContent = `${accuracy}%`;
    document.getElementById('result-speed').textContent = `${avgSeconds.toFixed(1)} 秒`;
    document.getElementById('result-streak').textContent = `x${state.maxStreak}`;
    document.getElementById('result-zone-name').textContent = state.zone.name;

    showScreen('result');
  }

  async function saveResultAndShowLeaderboard() {
    saveNicknameIfNeeded();
    const roomCodeInput = document.getElementById('room-code-input');
    const roomCode = roomCodeInput ? roomCodeInput.value.trim() : state.roomCode;
    state.roomCode = roomCode || 'public';
    localStorage.setItem('mathAdventure_roomCode', state.roomCode);

    const btn = document.getElementById('save-score-btn');
    if (btn) { btn.disabled = true; btn.textContent = '上傳中…'; }

    const total = state.queue.length;
    await window.MathFirebase.submitScore({
      name: state.nickname || '小勇者',
      roomCode: state.roomCode,
      zone: state.zone.id,
      accuracy: Math.round((state.correctCount / total) * 100),
      avgSeconds: Number((state.times.reduce((a, b) => a + b, 0) / state.times.length).toFixed(1)),
      focusScore: state.lastFocusScore,
      correctCount: state.correctCount,
      totalCount: total
    });

    showLeaderboard(state.roomCode);
  }

  // ---------------- LEADERBOARD ----------------
  async function showLeaderboard(roomCode) {
    showScreen('leaderboard');
    document.getElementById('lb-room-label').textContent = roomCode || 'public';
    const listEl = document.getElementById('lb-list');
    listEl.innerHTML = '<div class="spinner"></div>';
    const res = await window.MathFirebase.fetchLeaderboard(roomCode || 'public');
    listEl.innerHTML = '';
    if (!res.ok || res.rows.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><span class="emoji">🗺️</span>這個房間還沒有人上榜，當第一個探險家吧！</div>`;
      return;
    }
    res.rows.forEach((row, idx) => {
      const div = document.createElement('div');
      div.className = `lb-row rank-${idx + 1}`;
      div.innerHTML = `<div class="rank">${idx + 1}</div><div class="name">${escapeHtml(row.name)}</div><div class="score">${row.focusScore} 分</div>`;
      listEl.appendChild(div);
    });
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------------- WIRE UP ----------------
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.quick-name-btn').forEach(btn => {
      btn.onclick = () => {
        document.getElementById('nickname-input').value = btn.dataset.name;
        state.nickname = btn.dataset.name;
        localStorage.setItem('mathAdventure_nickname', btn.dataset.name);
      };
    });
    document.getElementById('start-adventure-btn').onclick = () => { renderZoneSelect(); showScreen('zoneselect'); };
    document.getElementById('view-leaderboard-home-btn').onclick = () => {
      saveNicknameIfNeeded();
      showLeaderboard(state.roomCode || 'public');
    };
    document.getElementById('back-to-home-1').onclick = goHome;
    document.getElementById('back-to-zones').onclick = () => showScreen('zoneselect');
    document.getElementById('review-zone-btn').onclick = startReview;
    document.getElementById('save-score-btn').onclick = saveResultAndShowLeaderboard;
    document.getElementById('skip-save-btn').onclick = () => { goHome(); };
    document.getElementById('lb-back-btn').onclick = goHome;
    document.getElementById('play-again-btn').onclick = () => {
      if (state.isReview) startReview(); else startSession(state.mode);
    };
    document.getElementById('room-code-input').value = state.roomCode;
    goHome();
  });
})();
