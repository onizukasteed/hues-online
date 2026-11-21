'use client';
import { cellColor, cellName } from '@/lib/colors';
export const PCOL = ['#38bdf8', '#f472b6', '#facc15', '#34d399', '#c084fc', '#fb923c', '#f87171', '#a3e635', '#2dd4bf', '#e879f9'];
export const colorOf = (g, pid) => PCOL[g.order.indexOf(pid) % PCOL.length];
export function Swatch({ cell, size = 40 }) {
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: 8, border: '2px solid #fff', background: cellColor(cell), verticalAlign: 'middle' }} title={cellName(cell)} />;
}
export function Scores({ g }) {
  const rank = g.order.slice().sort((a, b) => g.score[b] - g.score[a]);
  return (
    <div className="panel">
      {rank.map((p) => (
        <div key={p} className={'sc' + (p === g.cue && g.phase !== 'over' ? ' cur' : '')}>
          <span className="dot" style={{ background: colorOf(g, p) }}>{''}</span>
          <b style={{ flex: 1 }}>{g.order.indexOf(p) + 1}. {g.names[p]}{p === g.cue && g.phase !== 'over' ? ' 💡' : ''}{(g.phase === 'guess1' || g.phase === 'guess2') && p !== g.cue ? (g.locked[p] ? ' ✅' : ' ⏳') : ''}</b>
          <b style={{ fontSize: '1.3rem' }}>{g.score[p]}</b>
        </div>
      ))}
    </div>
  );
}
export function Log({ g }) {
  return <div className="panel log">{g.log.slice().reverse().map((l) => <div key={l.i} className={l.k}>{l.m}</div>)}</div>;
}
