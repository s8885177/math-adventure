// effects.js — 聲光反饋：誇張慶祝 + 滑稽失敗，全部用程式產生（不需外部音檔/圖檔）

let audioCtx = null;
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function beep({ freq = 440, duration = 0.15, type = 'sine', gain = 0.2, delay = 0, slideTo = null }) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + delay + duration);
  g.gain.setValueAtTime(gain, ctx.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.02);
}

function playSuccessFanfare(comboLevel = 1) {
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((f, i) => beep({ freq: f, duration: 0.16, type: 'square', gain: 0.15, delay: i * 0.07 }));
    if (comboLevel >= 3) {
      beep({ freq: 1568, duration: 0.3, type: 'triangle', gain: 0.18, delay: 0.32 });
    }
  } catch (e) {}
}

function playFailHonk() {
  try {
    beep({ freq: 300, duration: 0.35, type: 'sawtooth', gain: 0.15, slideTo: 90 });
  } catch (e) {}
}

function playTapTick() {
  try { beep({ freq: 880, duration: 0.05, type: 'sine', gain: 0.08 }); } catch (e) {}
}

// ---------- Confetti ----------
let confettiCanvas, confettiCtx, confettiParticles = [], confettiRAF = null;

function ensureConfettiCanvas() {
  if (confettiCanvas) return;
  confettiCanvas = document.createElement('canvas');
  confettiCanvas.id = 'confetti-canvas';
  confettiCanvas.style.position = 'fixed';
  confettiCanvas.style.inset = '0';
  confettiCanvas.style.pointerEvents = 'none';
  confettiCanvas.style.zIndex = '9999';
  document.body.appendChild(confettiCanvas);
  confettiCtx = confettiCanvas.getContext('2d');
  const resize = () => {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();
}

const CONFETTI_COLORS = ['#F2A73B', '#EF6C57', '#5FCBA6', '#FFF7E8', '#8B5FBF', '#FFD166'];

function burstConfetti(intensity = 1) {
  ensureConfettiCanvas();
  const count = Math.round(70 * intensity);
  const cx = window.innerWidth / 2;
  for (let i = 0; i < count; i++) {
    confettiParticles.push({
      x: cx + (Math.random() - 0.5) * 120,
      y: window.innerHeight * 0.25,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -12 - 4,
      size: Math.random() * 8 + 4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      life: 0,
      shape: Math.random() < 0.5 ? 'rect' : 'circle'
    });
  }
  if (!confettiRAF) tickConfetti();
}

function tickConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach(p => {
    p.vy += 0.35;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life++;
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rot);
    confettiCtx.fillStyle = p.color;
    if (p.shape === 'rect') {
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    } else {
      confettiCtx.beginPath();
      confettiCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      confettiCtx.fill();
    }
    confettiCtx.restore();
  });
  confettiParticles = confettiParticles.filter(p => p.y < confettiCanvas.height + 40 && p.life < 240);
  if (confettiParticles.length > 0) {
    confettiRAF = requestAnimationFrame(tickConfetti);
  } else {
    confettiRAF = null;
  }
}

// ---------- 滑稽失敗畫面（純 CSS class 觸發，見 style.css） ----------
function triggerFailWobble(el) {
  el.classList.remove('fail-wobble');
  void el.offsetWidth; // reflow to restart animation
  el.classList.add('fail-wobble');
  playFailHonk();
}

function triggerSuccessPop(el, comboLevel = 1) {
  el.classList.remove('success-pop');
  void el.offsetWidth;
  el.classList.add('success-pop');
  playSuccessFanfare(comboLevel);
  burstConfetti(comboLevel >= 3 ? 1.6 : 1);
}

const FUNNY_FAIL_LINES = [
  '哎呀滑了一跤！香蕉皮：這不是我的錯 🍌',
  '答案跟你玩捉迷藏，躲起來了～',
  '砰！氣球消風的聲音，再試一次！',
  '這一步踩空啦，教練吹哨子：重來！',
  '數字寶寶說：你抱錯我了啦～',
  '哎喲，跌進坑裡了，爬起來再挑戰！',
  '氣球「噗」一聲飛走了，下一題追回來！'
];

const SUCCESS_LINES = [
  '太神啦！！🎉',
  '完美命中！探險隊長給你比讚 👍',
  '寶箱打開了，金光閃閃！✨',
  '這速度，簡直是數學忍者！',
  '全場歡呼～你是今天的 MVP！',
  '連續答對，超級連擊中！🔥'
];

function randomFunnyFail() {
  return FUNNY_FAIL_LINES[Math.floor(Math.random() * FUNNY_FAIL_LINES.length)];
}
function randomSuccessLine() {
  return SUCCESS_LINES[Math.floor(Math.random() * SUCCESS_LINES.length)];
}

window.MathEffects = {
  playTapTick, triggerFailWobble, triggerSuccessPop, randomFunnyFail, randomSuccessLine, burstConfetti
};
