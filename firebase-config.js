// firebase-config.js — Firebase 初始化 + 英雄榜讀寫（ES Module，透過 CDN 載入 SDK）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBzKfRBJusEr5UlxRbahmH6OrYuUESEvBw",
  authDomain: "math-adventure-72e92.firebaseapp.com",
  projectId: "math-adventure-72e92",
  storageBucket: "math-adventure-72e92.firebasestorage.app",
  messagingSenderId: "646728820924",
  appId: "1:646728820924:web:b1edf88d57cb525e65c8b9",
  measurementId: "G-08CFQ5TZTQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SCORES_COLLECTION = "scores";

/**
 * 儲存一次遊戲結果到英雄榜
 * @param {Object} result
 * @param {string} result.name 玩家暱稱
 * @param {string} result.roomCode 房間代碼（同學間共用同一組代碼才會排在一起）
 * @param {string} result.zone 關卡區域 key
 * @param {number} result.accuracy 正確率 0~100
 * @param {number} result.avgSeconds 平均每題秒數
 * @param {number} result.focusScore 專注力綜合分數 0~100
 * @param {number} result.correctCount
 * @param {number} result.totalCount
 */
async function submitScore(result) {
  try {
    await addDoc(collection(db, SCORES_COLLECTION), {
      ...result,
      roomCode: (result.roomCode || 'public').toLowerCase().trim(),
      createdAt: serverTimestamp()
    });
    return { ok: true };
  } catch (err) {
    console.error('submitScore failed', err);
    return { ok: false, error: err.message };
  }
}

/**
 * 取得某房間代碼的英雄榜（依專注力分數排序）
 */
async function fetchLeaderboard(roomCode, topN = 20) {
  try {
    // 只用單一 where 條件查詢（不搭配 orderBy），避免需要額外設定 Firestore 複合索引；
    // 排序改在前端做。
    const q = query(
      collection(db, SCORES_COLLECTION),
      where('roomCode', '==', (roomCode || 'public').toLowerCase().trim())
    );
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach(doc => rows.push(doc.data()));
    rows.sort((a, b) => (b.focusScore || 0) - (a.focusScore || 0));
    return { ok: true, rows: rows.slice(0, topN) };
  } catch (err) {
    console.error('fetchLeaderboard failed', err);
    return { ok: false, error: err.message, rows: [] };
  }
}

window.MathFirebase = { submitScore, fetchLeaderboard };
