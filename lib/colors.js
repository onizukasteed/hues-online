// กระดานสี 30 คอลัมน์ x 16 แถว (480 สี) สร้างจาก HSL: แถวบนสีอ่อน -> แถวล่างสีเข้ม
import { CFG } from './config.js';
export const COLS = CFG.cols, ROWS = CFG.rows, N = COLS * ROWS;
export const colorAt = (c, r) => {
  const t = r / (ROWS - 1);
  const h = (c * 12 + 2) % 360;
  const l = 91 - t * 74;
  const s = 100 * (0.3 + 0.7 * Math.sin(Math.PI * (0.13 + 0.8 * t)));
  return `hsl(${h} ${s.toFixed(0)}% ${l.toFixed(0)}%)`;
};
export const cellColor = (i) => colorAt(i % COLS, Math.floor(i / COLS));
export const cellName = (i) => 'ABCDEFGHIJKLMNOP'[Math.floor(i / COLS)] + (i % COLS + 1);
export const cdist = (a, b) => Math.max(Math.abs((a % COLS) - (b % COLS)), Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)));
export const ptsFor = (d) => (d === 0 ? 3 : d === 1 ? 2 : d === 2 ? 1 : 0);
