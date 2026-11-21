// ตรรกะเกม Hues & Cues (ฟังก์ชันล้วน เก็บเป็น JSON ได้)
import { CFG, turnsFor } from './config.js';
import { N, cdist, ptsFor, cellName } from './colors.js';

const fail = (error) => ({ ok: false, error });
const OK = { ok: true };

export function log(g, m, k = 'info') { g.ev += 1; g.log.push({ i: g.ev, m, k }); if (g.log.length > 30) g.log.shift(); }
function fx(g, k) { g.fxn += 1; g.fx.push({ i: g.fxn, k }); if (g.fx.length > 10) g.fx.shift(); }

export function newGame(players, turns, rnd = Math.random) {
  const order = players.map((p) => p.id);
  const t = [1, 2, 3].includes(turns) ? turns : turnsFor(order.length);
  const g = {
    phase: 'pick', names: {}, order, turns: t, totalRounds: order.length * t, round: 1,
    cue: null, cands: [], target: null, clue1: '', clue2: '', marks: {}, locked: {}, score: {},
    result: null, winners: [], log: [], ev: 0, fx: [], fxn: 0,
  };
  players.forEach((p) => { g.names[p.id] = p.name; g.score[p.id] = 0; });
  startRound(g, rnd);
  log(g, `เริ่มเกม ${order.length} คน · ทุกคนได้ให้คำใบ้คนละ ${t} ครั้ง (${g.totalRounds} รอบ)`);
  return g;
}

export const guessersOf = (g) => g.order.filter((p) => p !== g.cue);

function startRound(g, rnd = Math.random) {
  g.cue = g.order[(g.round - 1) % g.order.length];
  const set = new Set();
  while (set.size < 4) set.add(Math.floor(rnd() * N));
  g.cands = [...set];
  g.target = null; g.clue1 = ''; g.clue2 = ''; g.marks = {}; g.locked = {}; g.result = null;
  g.phase = 'pick';
  fx(g, 'turn');
}

const words = (s) => String(s || '').trim().replace(/\s+/g, ' ');

function advanceGuess(g) {
  const gs = guessersOf(g);
  if (!gs.every((p) => g.locked[p])) return;
  g.locked = {};
  if (g.phase === 'guess1') {
    g.phase = 'clue2';
    log(g, 'ทุกคนวางหมากแรกแล้ว รอคำใบ้ที่ 2', 'info');
    fx(g, 'turn');
    return;
  }
  // guess2 -> เปิดเฉลย + ให้คะแนน
  const rows = [];
  let cueP = 0;
  let exact = false, any = false;
  for (const p of gs) {
    const m = g.marks[p] || [null, null];
    const d = m.map((c) => (c == null ? null : cdist(c, g.target)));
    const pts = d.reduce((s, x) => s + (x == null ? 0 : ptsFor(x)), 0);
    d.forEach((x) => { if (x != null && x <= 1) cueP += 1; if (x === 0) exact = true; });
    if (pts > 0) any = true;
    g.score[p] += pts;
    rows.push({ pid: p, pts, d });
  }
  g.score[g.cue] += cueP;
  g.result = { rows, cue: cueP, target: g.target };
  g.phase = 'reveal';
  log(g, `เฉลย ${cellName(g.target)} · ${g.names[g.cue]} ได้ ${cueP} แต้ม`, exact ? 'good' : 'info');
  fx(g, exact ? 'bull' : any ? 'good' : 'miss');
}

function goNext(g, rnd = Math.random) {
  if (g.round >= g.totalRounds) {
    g.phase = 'over';
    const top = Math.max(...g.order.map((p) => g.score[p]));
    g.winners = g.order.filter((p) => g.score[p] === top);
    log(g, `จบเกม! ${g.winners.map((p) => g.names[p]).join(' และ ')} ชนะด้วย ${top} แต้ม`, 'good');
    fx(g, 'win');
    return;
  }
  g.round += 1;
  startRound(g, rnd);
}

export function act(g, pid, a, isHost = false, rnd = Math.random) {
  switch (a.type) {
    case 'pick': {
      if (g.phase !== 'pick') return fail('ตอนนี้ไม่ใช่ช่วงเลือกสี');
      if (pid !== g.cue) return fail('ไม่ใช่ตาของคุณ');
      const cell = Number(a.cell);
      if (!g.cands.includes(cell)) return fail('เลือกจาก 4 สีที่ได้รับเท่านั้น');
      const w = words(a.text);
      if (!w) return fail('กรุณาพิมพ์คำใบ้');
      if (w.includes(' ')) return fail('คำใบ้แรกต้องเป็นคำเดียว (ไม่เว้นวรรค)');
      if (w.length > CFG.clue1Max) return fail('คำใบ้ยาวเกินไป');
      g.target = cell; g.clue1 = w; g.phase = 'guess1'; g.locked = {};
      log(g, `${g.names[pid]} ให้คำใบ้แรก: “${w}”`);
      fx(g, 'clue');
      return OK;
    }
    case 'place': {
      if (g.phase !== 'guess1' && g.phase !== 'guess2') return fail('ตอนนี้วางหมากไม่ได้');
      if (!g.names[pid] || pid === g.cue) return fail('ผู้ให้คำใบ้วางหมากไม่ได้');
      if (g.locked[pid]) return fail('วางหมากแล้ว (กดยกเลิกก่อนถ้าจะเปลี่ยน)');
      const cell = Number(a.cell);
      if (!Number.isInteger(cell) || cell < 0 || cell >= N) return fail('ตำแหน่งไม่ถูกต้อง');
      const idx = g.phase === 'guess1' ? 0 : 1;
      const m = g.marks[pid] || [null, null];
      if (idx === 1 && m[0] === cell) return fail('หมากที่สองห้ามซ้ำตำแหน่งหมากแรก');
      m[idx] = cell; g.marks[pid] = m;
      g.locked[pid] = true;
      fx(g, 'lock');
      advanceGuess(g);
      return OK;
    }
    case 'undo': {
      if (g.phase !== 'guess1' && g.phase !== 'guess2') return fail('เปลี่ยนไม่ได้แล้ว');
      if (!g.locked[pid]) return OK;
      g.locked[pid] = false;
      return OK;
    }
    case 'clue2': {
      if (g.phase !== 'clue2') return fail('ตอนนี้ไม่ใช่ช่วงคำใบ้ที่ 2');
      if (pid !== g.cue) return fail('ไม่ใช่ตาของคุณ');
      const w = words(a.text);
      if (!w) return fail('กรุณาพิมพ์คำใบ้');
      if (w.split(' ').length > 2) return fail('คำใบ้ที่ 2 ใช้ได้ไม่เกิน 2 คำ');
      if (w.length > CFG.clue2Max) return fail('คำใบ้ยาวเกินไป');
      g.clue2 = w; g.phase = 'guess2'; g.locked = {};
      log(g, `${g.names[pid]} ให้คำใบ้ที่ 2: “${w}”`);
      fx(g, 'clue');
      return OK;
    }
    case 'next': {
      if (g.phase !== 'reveal') return fail('ยังไม่ถึงช่วงเฉลย');
      if (!isHost && pid !== g.cue) return fail('ให้ผู้ให้คำใบ้หรือจอทีวีกดไปต่อ');
      goNext(g, rnd);
      return OK;
    }
    case 'force': { // เจ้าของห้อง: ข้ามคนที่ยังไม่วางหมาก
      if (!isHost) return fail('เฉพาะเจ้าของห้อง');
      if (g.phase !== 'guess1' && g.phase !== 'guess2') return fail('ใช้ได้ตอนรอวางหมากเท่านั้น');
      guessersOf(g).forEach((p) => { g.locked[p] = true; });
      advanceGuess(g);
      return OK;
    }
    case 'skip': { // เจ้าของห้อง: ข้ามรอบถ้าผู้ให้คำใบ้หาย
      if (!isHost) return fail('เฉพาะเจ้าของห้อง');
      if (g.phase !== 'pick' && g.phase !== 'clue2') return fail('ใช้ได้ตอนรอคำใบ้เท่านั้น');
      log(g, `ข้ามรอบของ ${g.names[g.cue]}`, 'warn');
      goNext(g, rnd);
      return OK;
    }
    default: return fail('คำสั่งไม่ถูกต้อง');
  }
}

export function viewOf(g, pid) {
  const isCue = pid === g.cue;
  const done = g.phase === 'reveal' || g.phase === 'over';
  const marks = {};
  for (const [p, m] of Object.entries(g.marks)) {
    const showFirst = done || g.phase === 'clue2' || g.phase === 'guess2' || p === pid;
    const showSecond = done || p === pid;
    marks[p] = [showFirst ? m[0] : null, showSecond ? m[1] : null];
  }
  // ระหว่างรอบแรก คนอื่นยังไม่เห็นว่าใครวางที่ไหน แต่เห็นว่าล็อกแล้วหรือยัง (locked)
  return {
    phase: g.phase, names: g.names, order: g.order, cue: g.cue, round: g.round, totalRounds: g.totalRounds, turns: g.turns,
    score: g.score, clue1: g.phase === 'pick' ? '' : g.clue1, clue2: g.clue2, locked: g.locked, marks,
    target: done ? g.target : isCue ? g.target : null,
    cands: isCue && g.phase === 'pick' ? g.cands : null,
    result: g.result, winners: g.winners, log: g.log, fx: g.fx, you: pid,
  };
}
