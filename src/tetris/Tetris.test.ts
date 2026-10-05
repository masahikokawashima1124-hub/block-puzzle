import { describe, expect, it } from 'vitest';
import { BASIC_PIECES, PIECES } from './pieces';
import { COLS, ROWS, Tetris } from './Tetris';

const setPiece = (t: Tetris, type: string, x: number, y: number) => {
  t.piece = { type, rotation: 0, matrix: PIECES[type].shape, x, y };
};

describe('Tetris', () => {
  it('最初の7個に基本の7種類が1つずつ出る', () => {
    const t = new Tetris();
    const first7 = [t.piece.type, ...t.queue.slice(0, 6)];
    expect([...first7].sort()).toEqual([...BASIC_PIECES].sort());
  });

  it('横一列がそろうと消えて得点が入る', () => {
    const t = new Tetris();
    for (let c = 4; c < COLS; c++) t.grid[ROWS - 1][c] = 'O';
    setPiece(t, 'I', 0, 5); // 横向きの I を左端に
    t.hardDrop();
    expect(t.lines).toBe(1);
    expect(t.grid[ROWS - 1].every((cell) => cell === null)).toBe(true);
    expect(t.score).toBeGreaterThanOrEqual(100);
  });

  it('壁際で回転すると内側にずれて回転できる', () => {
    const t = new Tetris();
    setPiece(t, 'T', 0, 5);
    t.rotate(1); // 縦向きにする
    while (t.move(-1)); // 左の壁まで寄せる
    expect(t.rotate(1)).toBe(true);
    expect(t.piece.x).toBeGreaterThanOrEqual(0);
  });

  it('ホールドは1回の落下につき1回だけ', () => {
    const t = new Tetris();
    const first = t.piece.type;
    t.holdPiece();
    expect(t.hold).toBe(first);
    const current = t.piece.type;
    t.holdPiece();
    expect(t.piece.type).toBe(current);
  });

  it('5ライン消すとレベルが上がる', () => {
    const levels: number[] = [];
    const t = new Tetris({ onLevelUp: (l) => levels.push(l) });
    for (let i = 0; i < 5; i++) {
      for (let c = 4; c < COLS; c++) t.grid[ROWS - 1][c] = 'O';
      setPiece(t, 'I', 0, 5);
      t.hardDrop();
    }
    expect(t.level).toBe(2);
    expect(levels).toEqual([2]);
  });

  it('ラインを消すとSPがたまる', () => {
    const t = new Tetris();
    for (let c = 4; c < COLS; c++) t.grid[ROWS - 1][c] = 'O';
    setPiece(t, 'I', 0, 5);
    t.hardDrop();
    expect(t.sp).toBe(1);
  });

  it('レベル2でボムを覚え、SPを使って下2段を消せる', () => {
    const learned: string[] = [];
    const t = new Tetris({ onSkillLearned: (s) => learned.push(s.id) });
    expect(t.useSkill('bomb')).toBe(false); // まだ覚えていない
    t.lines = 4;
    for (let c = 4; c < COLS; c++) t.grid[ROWS - 1][c] = 'O';
    setPiece(t, 'I', 0, 5);
    t.hardDrop(); // 5ライン目でレベル2
    expect(learned).toEqual(['bomb']);
    t.sp = 3;
    t.grid[ROWS - 1][0] = 'O';
    t.grid[ROWS - 2][0] = 'O';
    t.grid[ROWS - 3][0] = 'T';
    expect(t.useSkill('bomb')).toBe(true);
    expect(t.sp).toBe(0);
    expect(t.grid[ROWS - 1][0]).toBe('T'); // 3段目が一番下まで落ちてくる
  });

  it('グラビティで浮いたブロックが下に詰まる', () => {
    const t = new Tetris();
    t.level = 5;
    t.sp = 4;
    t.grid[ROWS - 5][3] = 'Z';
    expect(t.useSkill('gravity')).toBe(true);
    expect(t.grid[ROWS - 1][3]).toBe('Z');
    expect(t.grid[ROWS - 5][3]).toBe(null);
  });

  it('1分経つと新しいブロックが追加される', () => {
    const added: string[][] = [];
    const t = new Tetris({ onNewPieces: (ids) => added.push(ids) });
    t.update(59_000);
    expect(added).toEqual([]);
    t.update(1_000);
    expect(added).toEqual([['I3', 'U']]);
    expect(t.queue.slice(1, 3)).toEqual(['I3', 'U']); // すぐ NEXT に並ぶ
  });

  it('上まで積み上がるとゲームオーバー', () => {
    let over = false;
    const t = new Tetris({ onGameOver: () => (over = true) });
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (c !== 0) t.grid[r][c] = 'O';
    t.hardDrop();
    expect(over).toBe(true);
  });
});
