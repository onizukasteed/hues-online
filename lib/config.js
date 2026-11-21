export const CFG = { cols: 30, rows: 16, minPlayers: 3, maxPlayers: 10, clue1Max: 24, clue2Max: 34 };
// จำนวนรอบที่ทุกคนได้เป็นผู้ให้คำใบ้ (กติกาเดิม: 3 คน = 3 รอบ, ที่เหลือ 2 รอบ)
export const turnsFor = (n) => (n <= 3 ? 3 : n <= 6 ? 2 : 1);
