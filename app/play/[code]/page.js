'use client';
import { useEffect, useRef, useState } from 'react';
import { post, usePoll } from '@/lib/client';
import * as snd from '@/lib/sound';
import { COLS, ROWS, N, cellName } from '@/lib/colors';
import { CFG } from '@/lib/config';
import Board from '@/components/Board';
import { Scores, Swatch, colorOf } from '@/components/ui';

const BG = { pick: 'clue', clue2: 'clue', guess1: 'guess', guess2: 'guess', reveal: 'reveal', over: 'over' };

export default function Play({ params }) {
  const code = params.code.toUpperCase();
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem('hc-me-' + code) || 'null'); if (s) setMe(s); } catch {} setReady(true); }, [code]);
  const { data: v, error, refresh } = usePoll(me ? `/api/room/${code}?t=${me.token}` : null, 1200);
  async function doJoin(e) {
    e.preventDefault(); setErr('');
    try { const r = await post(`/api/room/${code}/join`, { name }); const s = { pid: r.pid, token: r.token }; localStorage.setItem('hc-me-' + code, JSON.stringify(s)); setMe(s); }
    catch (x) { setErr(x.message); }
  }
  if (!ready) return null;
  if (!me) return (
    <main className="home"><h1 className="title">ห้อง {code}</h1>
      <form className="card-box" onSubmit={doJoin}><h2>ใส่ชื่อของคุณ</h2>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อ" maxLength={14} autoFocus />
        <button className="btn big" disabled={!name.trim()}>เข้าร่วม</button>{err && <p className="error">{err}</p>}</form></main>
  );
  if (error && !v) { if (/ไม่ได้อยู่ในห้อง/.test(error)) { localStorage.removeItem('hc-me-' + code); setMe(null); } return <main className="home"><p className="error">{error}</p></main>; }
  if (!v) return <main className="home"><p>กำลังโหลด…</p></main>;
  if (!v.game) return (
    <main className="lobby"><h1 className="title">ห้อง {code}</h1><p className="sub">รอเจ้าของห้องกดเริ่มเกม…</p>
      <div className="card-box"><h2>ผู้เล่น</h2>{v.lobby.map((p) => <div key={p.id} className="pl">🧑 {p.name}{p.id === me.pid ? ' (คุณ)' : ''}</div>)}</div></main>
  );
  return <Game g={v.game} code={code} me={me} refresh={refresh} />;
}

function Game({ g, code, me, refresh }) {
  const [text, setText] = useState('');
  const [pickC, setPickC] = useState(null);
  const [sel, setSel] = useState(null);
  const [zoom, setZoom] = useState(true);
  const [msg, setMsg] = useState('');
  const [sOn, setSOn] = useState(false);
  const scroller = useRef(null);
  const lastFx = useRef(null);
  const isCue = g.cue === me.pid;
  const ph = g.phase;
  useEffect(() => { if (snd.soundPref()) { const go = () => { if (snd.enable()) setSOn(true); window.removeEventListener('pointerdown', go); }; window.addEventListener('pointerdown', go); } }, []);
  useEffect(() => { document.body.dataset.phase = BG[ph]; return () => { delete document.body.dataset.phase; }; }, [ph]);
  const lastId = g.fx && g.fx.length ? g.fx[g.fx.length - 1].i : 0;
  useEffect(() => {
    if (lastFx.current === null) { lastFx.current = lastId; return; }
    g.fx.filter((f) => f.i > lastFx.current && ['bull', 'good', 'miss', 'win', 'turn', 'clue'].includes(f.k)).forEach((f, i) => setTimeout(() => snd.sfx(f.k), i * 250));
    lastFx.current = lastId;
  }, [lastId]);
  useEffect(() => { setText(''); setPickC(null); setSel(null); setMsg(''); }, [g.round]);
  useEffect(() => { setSel(null); setText(''); }, [ph]);
  // เลื่อนกระดานให้ช่องที่เลือกอยู่กลางจอ
  useEffect(() => {
    const el = scroller.current; const foc = (ph === 'reveal' || ph === 'over') ? g.target : sel; if (!el || foc == null || !zoom) return;
    const w = el.scrollWidth, h = el.scrollHeight;
    const x = ((12 + (foc % COLS) * 10 + 5) / 314) * w, y = ((12 + Math.floor(foc / COLS) * 10 + 5) / 174) * h;
    el.scrollTo({ left: x - el.clientWidth / 2, top: y - el.clientHeight / 2, behavior: 'smooth' });
  }, [sel, zoom, ph]);

  async function act(a) { setMsg(''); try { await post(`/api/room/${code}/act`, { t: me.token, a }); refresh(); } catch (e) { setMsg(e.message); } }
  const move = (dc, dr) => setSel((s) => { const b = s == null ? Math.floor((ROWS / 2) * COLS + COLS / 2) : s; const c = Math.min(COLS - 1, Math.max(0, (b % COLS) + dc)), r = Math.min(ROWS - 1, Math.max(0, Math.floor(b / COLS) + dr)); snd.sfx('tick'); return r * COLS + c; });
  const guessing = (ph === 'guess1' || ph === 'guess2') && !isCue;
  const iLocked = !!g.locked[me.pid];
  const nWait = g.order.filter((p) => p !== g.cue && !g.locked[p]).length;
  const mineMarks = g.marks[me.pid];
  const forbid = ph === 'guess2' && mineMarks ? mineMarks[0] : null;

  let panel = null;
  if (ph === 'over') {
    const rank = g.order.slice().sort((a, b) => g.score[b] - g.score[a]);
    panel = <div className="res">{g.winners.includes(me.pid) ? '🏆 คุณชนะ!' : `${g.winners.map((p) => g.names[p]).join(' และ ')} ชนะ`}<div className="hand" style={{ fontSize: '1rem' }}>{rank.map((p, i) => `${i + 1}. ${g.names[p]} ${g.score[p]}`).join(' · ')}</div></div>;
  } else if (ph === 'pick') {
    panel = isCue ? (
      <div>
        <b>คุณคือผู้ให้คำใบ้ 💡</b> <span className="hand">เลือกสีลับ 1 ใน 4 สี (ดูตำแหน่งบนกระดาน) แล้วให้คำใบ้ “คำเดียว” ห้ามบอกชื่อสีหรือพิกัด</span>
        <div className="row">{g.cands.map((c, k) => <button key={c} className={'chip' + (pickC === c ? ' on' : '')} onClick={() => { setPickC(c); setSel(c); }}><Swatch cell={c} size={34} /> {k + 1}. {cellName(c)}</button>)}</div>
        <input className="input" value={text} onChange={(e) => setText(e.target.value.replace(/\s/g, ''))} placeholder="คำใบ้ (คำเดียว)" maxLength={CFG.clue1Max} />
        <button className="btn big" disabled={pickC == null || !text.trim()} onClick={() => act({ type: 'pick', cell: pickC, text })}>ส่งคำใบ้</button>
      </div>
    ) : <div className="hand">💡 {g.names[g.cue]} กำลังเลือกสีและคิดคำใบ้…</div>;
  } else if (ph === 'clue2') {
    panel = isCue ? (
      <div>
        <b>ให้คำใบ้ที่ 2 (ไม่เกิน 2 คำ)</b> <span className="hand">ดูหมากแรกของทุกคนบนกระดาน แล้วใบ้ให้แคบลง</span>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="คำใบ้ที่ 2" maxLength={CFG.clue2Max} />
        <button className="btn big" disabled={!text.trim()} onClick={() => act({ type: 'clue2', text })}>ส่งคำใบ้ที่ 2</button>
      </div>
    ) : <div className="hand">รอ {g.names[g.cue]} ให้คำใบ้ที่ 2… ดูหมากแรกของทุกคนบนกระดาน</div>;
  } else if (guessing) {
    panel = iLocked ? (
      <div><b>วางหมากแล้ว ✅</b> <span className="hand">รออีก {nWait} คน</span>
        <button className="btn alt big" onClick={() => act({ type: 'undo' })}>↩ เปลี่ยนตำแหน่ง</button></div>
    ) : (
      <div>
        <div className="hand">{ph === 'guess1' ? 'หมากแรก' : 'หมากที่สอง (ห้ามซ้ำหมากแรก)'} · แตะบนกระดานหรือใช้ลูกศรขยับ</div>
        <div className="row" style={{ alignItems: 'center' }}>
          {sel != null ? <><Swatch cell={sel} size={44} /><b style={{ fontSize: '1.3rem' }}>{cellName(sel)}</b></> : <span className="hand">ยังไม่ได้เลือกช่อง</span>}
          <span style={{ flex: 1 }} />
          <div className="dpad">
            <button onClick={() => move(0, -1)}>▲</button><button onClick={() => move(-1, 0)}>◀</button><button onClick={() => move(0, 1)}>▼</button><button onClick={() => move(1, 0)}>▶</button>
          </div>
        </div>
        <button className="btn big" disabled={sel == null || sel === forbid} onClick={() => act({ type: 'place', cell: sel })}>📍 วางหมาก</button>
      </div>
    );
  } else if (ph === 'guess1' || ph === 'guess2') {
    panel = <div className="hand">รอทุกคนวางหมาก… อีก {nWait} คน</div>;
  } else if (ph === 'reveal') {
    const my = g.result.rows.find((r) => r.pid === me.pid);
    panel = (
      <div>
        <div className="res" style={{ fontSize: '1.6rem' }}><Swatch cell={g.target} size={36} /> {cellName(g.target)}</div>
        <div className="res" style={{ fontSize: '1.4rem', color: '#ffd166' }}>{isCue ? `คุณได้ +${g.result.cue}` : `คุณได้ +${my ? my.pts : 0}`}</div>
        {isCue && <button className="btn big" onClick={() => act({ type: 'next' })}>{g.round >= g.totalRounds ? 'ดูผลสรุป ▶' : 'รอบต่อไป ▶'}</button>}
      </div>
    );
  }
  const clueLine = g.clue1 && ph !== 'over' && ph !== 'pick' && (
    <div className="clue" style={{ fontSize: '1.6rem', padding: 2 }}>“{g.clue1}”{g.clue2 && <span style={{ color: '#ffd166' }}> + “{g.clue2}”</span>}</div>
  );
  const interactive = (guessing && !iLocked) || (ph === 'pick' && isCue);
  return (
    <div className="ph">
      <div className="bar">
        <div className="turnbox">{ph === 'over' ? 'จบเกม' : `รอบ ${g.round}/${g.totalRounds} · 💡 ${g.names[g.cue]}`}{!isCue && ph !== 'over' ? '' : ' (คุณ)'}</div>
        {msg && <div className="error">{msg}</div>}
        <div style={{ position: 'absolute', right: 6, top: 6, display: 'flex', gap: 6 }}>
          <button className="chip" onClick={() => setZoom(!zoom)}>{zoom ? '🔍−' : '🔍+'}</button>
          <button className="chip" onClick={() => { if (sOn) { snd.disable(); setSOn(false); } else if (snd.enable()) setSOn(true); }}>{sOn ? '🔊' : '🔇'}</button>
        </div>
      </div>
      {clueLine}
      <div ref={scroller} className="boardwrap" style={{ maxHeight: '48vh', overflow: 'auto' }}>
        <div style={{ width: zoom ? '240%' : '100%' }}>
          <Board marks={ph === 'guess1' ? (g.marks[me.pid] ? { [me.pid]: g.marks[me.pid] } : {}) : g.marks} order={g.order} names={g.names}
            target={ph === 'reveal' || ph === 'over' ? g.target : null} rings={ph === 'reveal' || ph === 'over'}
            sel={sel} cands={ph === 'pick' && isCue ? g.cands : null} fadeId={g.round}
            onCell={interactive ? (c) => { snd.sfx('tick'); setSel(c); if (ph === 'pick' && g.cands.includes(c)) setPickC(c); } : undefined} />
        </div>
      </div>
      <div className="panel" style={{ margin: '8px 0' }}>{panel}</div>
      <Scores g={g} />
    </div>
  );
}
