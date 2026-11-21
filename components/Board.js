'use client';
import { useRef } from 'react';
import { COLS, ROWS, colorAt, cellName } from '@/lib/colors';
import { PCOL } from '@/components/ui';

const U = 10, ML = 12, MT = 12;
export const VBW = ML + COLS * U + 2, VBH = MT + ROWS * U + 2;
const cx = (i) => ML + (i % COLS) * U + U / 2;
const cy = (i) => MT + Math.floor(i / COLS) * U + U / 2;
const CELLS = Array.from({ length: COLS * ROWS }, (_, i) => i);

// กระดานสี: marks = {pid:[หมาก1,หมาก2]}, target = ช่องเป้าหมาย, rings = วาดกรอบคะแนนรอบเป้าหมาย
export default function Board({ marks = {}, order = [], names = {}, target = null, rings = false, sel = null, cands = null, onCell, fadeId }) {
  const ref = useRef(null);
  function click(e) {
    if (!onCell) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * VBW, y = ((e.clientY - r.top) / r.height) * VBH;
    const c = Math.floor((x - ML) / U), rr = Math.floor((y - MT) / U);
    if (c >= 0 && c < COLS && rr >= 0 && rr < ROWS) onCell(rr * COLS + c);
  }
  const idxOf = (p) => order.indexOf(p);
  const flat = [];
  Object.entries(marks).forEach(([p, m]) => m.forEach((c, k) => { if (c != null) flat.push({ p, k, c, ox: 0 }); }));
  const byCell = {};
  flat.forEach((f) => { (byCell[f.c] = byCell[f.c] || []).push(f); });
  Object.values(byCell).forEach((arr) => arr.forEach((f, j) => { f.ox = (j - (arr.length - 1) / 2) * 4.6; }));
  return (
    <svg ref={ref} viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: '100%', display: 'block', touchAction: onCell ? 'manipulation' : 'auto', cursor: onCell ? 'crosshair' : 'default' }} onClick={click}>
      <rect x={ML - 1} y={MT - 1} width={COLS * U + 2} height={ROWS * U + 2} rx="2" fill="#000" />
      {CELLS.map((i) => <rect key={i} x={ML + (i % COLS) * U} y={MT + Math.floor(i / COLS) * U} width={U} height={U} fill={colorAt(i % COLS, Math.floor(i / COLS))} stroke="#0003" strokeWidth="0.15" />)}
      {Array.from({ length: COLS }, (_, c) => <text key={'c' + c} x={ML + c * U + U / 2} y={MT - 3} fontSize="4.2" textAnchor="middle" fill="#cfe6ff">{c + 1}</text>)}
      {Array.from({ length: ROWS }, (_, r) => <text key={'r' + r} x={ML - 4} y={MT + r * U + U / 2 + 1.6} fontSize="4.6" textAnchor="middle" fill="#cfe6ff">{'ABCDEFGHIJKLMNOP'[r]}</text>)}
      {target != null && rings && (
        <g key={'ring' + fadeId} className="ringg">
          <RingBox t={target} k={2} w="1.1" c="#fff" d="3 1.5" />
          <RingBox t={target} k={1} w="1.6" c="#fff" />
        </g>
      )}
      {cands && cands.map((c, k) => (
        <g key={'cd' + c}>
          <rect x={cx(c) - U / 2} y={cy(c) - U / 2} width={U} height={U} fill="none" stroke="#fff" strokeWidth="1.4" />
          <circle cx={cx(c)} cy={cy(c)} r="3.4" fill="#000a" stroke="#fff" strokeWidth=".7" />
          <text x={cx(c)} y={cy(c) + 1.7} fontSize="5" textAnchor="middle" fill="#fff" fontWeight="800">{k + 1}</text>
        </g>
      ))}
      {flat.map(({ p, k, c, ox }) => (
        <g key={p + k} transform={`translate(${ox} 0)`}>
          <g className="pop" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            {k === 0
              ? <circle cx={cx(c)} cy={cy(c)} r="3.8" fill={PCOL[idxOf(p) % PCOL.length]} stroke="#fff" strokeWidth=".9" />
              : <rect x={cx(c) - 3.4} y={cy(c) - 3.4} width="6.8" height="6.8" rx="1" transform={`rotate(45 ${cx(c)} ${cy(c)})`} fill={PCOL[idxOf(p) % PCOL.length]} stroke="#fff" strokeWidth=".9" />}
            <circle cx={cx(c)} cy={cy(c)} r="3.8" fill="none" stroke="#000" strokeWidth=".25" />
            <text x={cx(c)} y={cy(c) + 1.5} fontSize="4.2" textAnchor="middle" fill="#111" fontWeight="800">{idxOf(p) + 1}</text>
          </g>
        </g>
      ))}
      {target != null && (
        <g key={'t' + fadeId + (rings ? 'r' : '')} className={rings ? 'star' : ''}>
          <rect x={cx(target) - U / 2} y={cy(target) - U / 2} width={U} height={U} fill="none" stroke="#fff" strokeWidth="1.2" />
          <rect x={cx(target) - U / 2 - .8} y={cy(target) - U / 2 - .8} width={U + 1.6} height={U + 1.6} fill="none" stroke="#000" strokeWidth=".8" />
          <text x={cx(target)} y={cy(target) + 2.4} fontSize="7" textAnchor="middle" fill="#fff" stroke="#000" strokeWidth=".5" paintOrder="stroke">★</text>
        </g>
      )}
      {sel != null && (
        <g>
          <rect x={cx(sel) - U / 2 - 1} y={cy(sel) - U / 2 - 1} width={U + 2} height={U + 2} fill="none" stroke="#000" strokeWidth="2.2" />
          <rect x={cx(sel) - U / 2 - 1} y={cy(sel) - U / 2 - 1} width={U + 2} height={U + 2} fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="2.2 1.4" />
        </g>
      )}
    </svg>
  );
}
function RingBox({ t, k, w, c, d }) {
  const col = t % COLS, row = Math.floor(t / COLS);
  const x0 = Math.max(0, col - k), x1 = Math.min(COLS - 1, col + k), y0 = Math.max(0, row - k), y1 = Math.min(ROWS - 1, row + k);
  return <rect x={ML + x0 * U} y={MT + y0 * U} width={(x1 - x0 + 1) * U} height={(y1 - y0 + 1) * U} fill="none" stroke={c} strokeWidth={w} strokeDasharray={d} />;
}
