'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { post, usePoll } from '@/lib/client';
import * as snd from '@/lib/sound';
import { cellName } from '@/lib/colors';
import { turnsFor } from '@/lib/config';
import Board from '@/components/Board';
import { Scores, Log, Swatch, colorOf } from '@/components/ui';

const BG = { pick: 'clue', clue2: 'clue', guess1: 'guess', guess2: 'guess', reveal: 'reveal', over: 'over' };

export default function TV({ params }) {
  const code = params.code.toUpperCase();
  const [host, setHost] = useState(null);
  const [qr, setQr] = useState('');
  const [msg, setMsg] = useState('');
  const [turns, setTurns] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const lastFx = useRef(null);
  useEffect(() => {
    setHost(localStorage.getItem('hc-host-' + code) || '');
    QRCode.toDataURL(`${location.origin}/play/${code}`, { margin: 1, width: 360 }).then(setQr).catch(() => {});
    if (snd.soundPref()) { const go = () => { if (snd.enable({ music: true })) setSoundOn(true); window.removeEventListener('pointerdown', go); }; window.addEventListener('pointerdown', go); }
  }, [code]);
  const { data: v, error, refresh } = usePoll(host === null ? null : `/api/room/${code}?t=${host}`, 1200);
  const g = v && v.game;
  const lastId = g && g.fx.length ? g.fx[g.fx.length - 1].i : 0;
  useEffect(() => {
    if (!g) return;
    if (lastFx.current === null) { lastFx.current = lastId; return; }
    g.fx.filter((f) => f.i > lastFx.current).forEach((f, i) => { const rv = ['bull', 'good', 'miss'].includes(f.k); setTimeout(() => { if (rv) snd.sfx('whoosh'); setTimeout(() => snd.sfx(f.k), rv ? 450 : 0); }, i * 300); });
    lastFx.current = lastId;
  }, [lastId]);
  useEffect(() => {
    snd.setMode(g && (g.phase === 'guess1' || g.phase === 'guess2') ? 1 : 0);
    document.body.dataset.phase = g ? BG[g.phase] : 'lobby';
    return () => { delete document.body.dataset.phase; };
  }, [g && g.phase]);

  async function act(a) { setMsg(''); try { await post(`/api/room/${code}/act`, { t: host, a }); refresh(); } catch (e) { setMsg(e.message); } }
  const mute = <button className="btn alt tvmute" onClick={() => { if (soundOn) { snd.disable(); setSoundOn(false); } else if (snd.enable({ music: true })) setSoundOn(true); }}>{soundOn ? '🔊 เสียงเปิด' : '🔇 เปิดเสียง'}</button>;

  if (error && !v) return <main className="home"><p className="error">{error === 'NO_REDIS' ? 'ยังไม่ได้เชื่อม Redis' : error}</p></main>;
  if (!v) return <main className="home"><p>กำลังโหลด…</p></main>;
  if (!v.host) return <main className="home"><p className="error">หน้านี้ใช้ได้เฉพาะเครื่องที่สร้างห้อง</p></main>;

  if (!g) {
    const n = v.lobby.length;
    const tt = turns || turnsFor(Math.max(n, 3));
    return (
      <main className="lobby">
        <p className="sub">เข้าร่วมที่ หรือสแกน QR</p>
        <div className="big-code">{code}</div>
        {qr && <img src={qr} alt="QR" width="240" height="240" style={{ borderRadius: 12, background: '#fff' }} />}
        <div className="card-box">
          <h2>ผู้เล่น ({n}/10)</h2>
          {v.lobby.map((p, i) => <div key={p.id} className="pl"><span className="dot" style={{ background: ['#38bdf8', '#f472b6', '#facc15', '#34d399', '#c084fc', '#fb923c', '#f87171', '#a3e635', '#2dd4bf', '#e879f9'][i % 10] }} /> {i + 1}. {p.name}</div>)}
          {!n && <p className="sub">รอเพื่อน ๆ เข้าร่วม…</p>}
        </div>
        <div className="sub">แต่ละคนได้เป็นผู้ให้คำใบ้กี่ครั้ง?</div>
        <div className="row" style={{ justifyContent: 'center' }}>
          {[1, 2, 3].map((k) => <button key={k} className={'chip' + (tt === k ? ' on' : '')} onClick={() => setTurns(k)}>{k} ครั้ง ({Math.max(n, 3) * k} รอบ)</button>)}
        </div>
        <button className="btn big" disabled={n < 3} onClick={() => act({ type: 'start', turns: tt })}>{n < 3 ? 'ต้องมีอย่างน้อย 3 คน' : 'เริ่มเกม'}</button>
        {msg && <p className="error">{msg}</p>}
        {mute}
      </main>
    );
  }
  const cue = g.names[g.cue];
  const ph = g.phase;
  const waiting = g.order.filter((p) => p !== g.cue && !g.locked[p]).map((p) => g.names[p]);
  const marks = ph === 'guess1' ? {} : g.marks;
  const winnerNames = g.winners.map((p) => g.names[p]).join(' และ ');
  return (
    <div className="tvg">
      <div className="main">
        <div className="panel" style={{ textAlign: 'center', marginBottom: 6, padding: '6px 10px' }}>
          <div className="turnbox">
            {ph === 'over' ? '🏆 จบเกม' : `รอบ ${g.round}/${g.totalRounds} · 💡 ผู้ให้คำใบ้: `}{ph !== 'over' && <b style={{ color: colorOf(g, g.cue) }}>{cue}</b>}
          </div>
        </div>
        <div style={{ width: 'min(100%, max(420px, calc((100vh - 290px) * 1.8)))', margin: '0 auto' }}>
        <Board marks={marks} order={g.order} names={g.names} target={ph === 'reveal' || ph === 'over' ? g.target : null} rings={ph === 'reveal' || ph === 'over'} fadeId={g.round} />
        </div>
        <div className="clue" style={{ minHeight: '1.3em' }}>
          {ph === 'pick' && <span style={{ fontSize: '.6em', color: '#ffd166' }}>💡 {cue} กำลังเลือกสีลับและคิดคำใบ้…</span>}
          {ph !== 'pick' && <span>“{g.clue1}”{g.clue2 && <span style={{ color: '#ffd166' }}> + “{g.clue2}”</span>}</span>}
        </div>
        {(ph === 'guess1' || ph === 'guess2') && <div className="res" style={{ fontSize: '1.2rem', color: '#ffd166' }}>{ph === 'guess1' ? 'วางหมากแรก' : 'วางหมากที่สอง'}บนมือถือ · รอ: {waiting.join(', ') || '—'}</div>}
        {ph === 'clue2' && <div className="res" style={{ fontSize: '1.2rem', color: '#ffd166' }}>หมากแรกของทุกคนขึ้นกระดานแล้ว · {cue} กำลังให้คำใบ้ที่ 2 (ไม่เกิน 2 คำ)</div>}
        {ph === 'reveal' && (
          <div>
            <div className="res" style={{ fontSize: '1.5rem' }}><Swatch cell={g.target} size={34} /> เป้าหมายคือ {cellName(g.target)} · 💡 {cue} +{g.result.cue}</div>
            <div className="row" style={{ justifyContent: 'center' }}>
              {g.result.rows.map((r) => <span key={r.pid} className="chip" style={{ borderColor: colorOf(g, r.pid) }}>{g.names[r.pid]} +{r.pts}</span>)}
            </div>
            <div style={{ textAlign: 'center', margin: 6 }}><button className="btn big" style={{ maxWidth: 360 }} onClick={() => act({ type: 'next' })}>{g.round >= g.totalRounds ? 'ดูผลสรุป ▶' : 'รอบต่อไป ▶'}</button></div>
          </div>
        )}
        {ph === 'over' && (
          <div style={{ textAlign: 'center' }}>
            <div className="res">🏆 {winnerNames} ชนะ!</div>
            <button className="btn big" style={{ maxWidth: 360, margin: 10 }} onClick={() => act({ type: 'reset' })}>เล่นอีกรอบ (กลับล็อบบี้)</button>
          </div>
        )}
        <div className="row" style={{ justifyContent: 'center' }}>
          {(ph === 'guess1' || ph === 'guess2') && <button className="chip" onClick={() => act({ type: 'force' })}>⏭ ข้ามคนที่ยังไม่วาง</button>}
          {(ph === 'pick' || ph === 'clue2') && <button className="chip" onClick={() => act({ type: 'skip' })}>⏭ ข้ามรอบนี้</button>}
        </div>
        {msg && <p className="error" style={{ textAlign: 'center' }}>{msg}</p>}
      </div>
      <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Scores g={g} />
        <div className="panel hand">หมากกลม = หมากแรก · หมากข้าวหลามตัด = หมากที่สอง<br />ตรงเป๊ะ 3 · ติดกัน 2 · ห่าง 1 ช่อง 1 · ผู้ให้คำใบ้ได้ 1 แต้มต่อหมากที่อยู่ในกรอบ 3×3</div>
        <Log g={g} />
      </div>
      {mute}
    </div>
  );
}
