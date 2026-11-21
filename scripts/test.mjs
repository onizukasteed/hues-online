import assert from 'node:assert';
import { newGame, act, viewOf } from '../lib/engine.js';
import { cdist, ptsFor, N } from '../lib/colors.js';

const P = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id.toUpperCase() }));
let g = newGame(P, 2);
assert.equal(g.totalRounds, 8); assert.equal(g.cue, 'a'); assert.equal(g.cands.length, 4);
// ผู้อื่นไม่เห็นเป้าหมาย/ตัวเลือก
assert.equal(viewOf(g, 'b').cands, null); assert.equal(viewOf(g, null).target, null);
assert.ok(act(g, 'b', { type: 'pick', cell: g.cands[0], text: 'x' }).error);
assert.ok(act(g, 'a', { type: 'pick', cell: g.cands[0], text: 'สอง คำ' }).error);
assert.ok(act(g, 'a', { type: 'pick', cell: 9999, text: 'x' }).error);
const T = g.cands[1];
assert.ok(act(g, 'a', { type: 'pick', cell: T, text: 'ทะเล' }).ok);
assert.equal(g.phase, 'guess1'); assert.equal(viewOf(g, 'a').target, T); assert.equal(viewOf(g, 'b').target, null);
assert.ok(act(g, 'a', { type: 'place', cell: 5 }).error); // cue วางไม่ได้
const near = T % 30 < 28 ? T + 1 : T - 1;
assert.ok(act(g, 'b', { type: 'place', cell: T }).ok);
assert.ok(act(g, 'b', { type: 'place', cell: 7 }).error); // วางแล้ว
assert.ok(act(g, 'b', { type: 'undo' }).ok); assert.ok(act(g, 'b', { type: 'place', cell: near }).ok);
// ยังไม่เห็นหมากคนอื่นระหว่างรอบแรก
act(g, 'c', { type: 'place', cell: (T + 60) % N });
assert.equal(viewOf(g, 'd').marks.b[0], null);
act(g, 'd', { type: 'place', cell: (T + 61) % N });
assert.equal(g.phase, 'clue2');
assert.equal(viewOf(g, 'd').marks.b[0], near); // เปิดหมากแรกให้ทุกคนเห็นแล้ว
assert.ok(act(g, 'a', { type: 'clue2', text: 'สาม คำ นะ' }).error);
assert.ok(act(g, 'a', { type: 'clue2', text: 'น้ำ ลึก' }).ok);
assert.equal(g.phase, 'guess2');
assert.ok(act(g, 'b', { type: 'place', cell: near }).error); // ซ้ำหมากแรก
assert.equal(viewOf(g, 'c').marks.b[1], null);
act(g, 'b', { type: 'place', cell: T });
act(g, 'c', { type: 'place', cell: T + 30 < N ? T + 30 : T - 30 });
assert.equal(g.phase, 'guess2');
assert.ok(act(g, null, { type: 'force' }, true).ok); // d ไม่วางหมากสอง
assert.equal(g.phase, 'reveal');
const rb = g.result.rows.find((r) => r.pid === 'b'), rc = g.result.rows.find((r) => r.pid === 'c'), rd = g.result.rows.find((r) => r.pid === 'd');
assert.equal(rb.pts, 2 + 3); assert.equal(rc.pts, ptsFor(cdist((T + 60) % N, T)) + 2); assert.equal(rd.d[1], null);
// ผู้ให้คำใบ้ได้ 1 ต่อหมากในกรอบ 3x3 (b: 2 หมาก + c: 1 หมากที่ติดกัน)
assert.equal(g.result.cue, 3); assert.equal(g.score.a, 3);
assert.ok(act(g, 'b', { type: 'next' }).error);
assert.ok(act(g, 'a', { type: 'next' }).ok); assert.equal(g.cue, 'b'); assert.equal(g.round, 2);
// ข้ามรอบ
assert.ok(act(g, null, { type: 'skip' }, true).ok); assert.equal(g.cue, 'c');
// เล่นจนจบ
let guard = 0;
while (g.phase !== 'over' && guard++ < 100) {
  const cue = g.cue; const others = g.order.filter((p) => p !== cue);
  act(g, cue, { type: 'pick', cell: g.cands[0], text: 'ก' });
  others.forEach((p) => act(g, p, { type: 'place', cell: 10 }));
  act(g, cue, { type: 'clue2', text: 'ข ค' });
  others.forEach((p) => act(g, p, { type: 'place', cell: 11 }));
  act(g, cue, { type: 'next' });
}
assert.equal(g.phase, 'over'); assert.ok(g.winners.length >= 1);
// 3 คน = 3 รอบต่อคน
assert.equal(newGame(P.slice(0, 3)).turns, 3);
console.log('hues engine OK · rounds', g.round, 'winners', g.winners);
