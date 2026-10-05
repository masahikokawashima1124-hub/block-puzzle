export type Matrix = number[][];

// ブロックの定義。新しい形はここに追加するだけで使えるようになる
export interface PieceDef {
  id: string;
  shape: Matrix; // 回転状態0（出現時）の形。正方形の枠で書く
  color: number;
  kicks: 'standard' | 'I' | 'none'; // 壁際で回転したときのずらし方
}

export const PIECES: Record<string, PieceDef> = {
  I: {
    id: 'I',
    color: 0x4dd0e1,
    kicks: 'I',
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  O: {
    id: 'O',
    color: 0xffd166,
    kicks: 'none',
    shape: [
      [1, 1],
      [1, 1],
    ],
  },
  T: {
    id: 'T',
    color: 0xb388ff,
    kicks: 'standard',
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  S: {
    id: 'S',
    color: 0x06d6a0,
    kicks: 'standard',
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
  },
  Z: {
    id: 'Z',
    color: 0xef476f,
    kicks: 'standard',
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  },
  J: {
    id: 'J',
    color: 0x4c6ef5,
    kicks: 'standard',
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  L: {
    id: 'L',
    color: 0xff9f43,
    kicks: 'standard',
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
};

// 最初から出てくるブロック
export const BASIC_PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export function rotateCW(m: Matrix): Matrix {
  const n = m.length;
  return m.map((_, r) => m.map((_, c) => m[n - 1 - c][r]));
}

export function rotateCCW(m: Matrix): Matrix {
  return rotateCW(rotateCW(rotateCW(m)));
}

// 壁際で回転したときの「ずらし候補」（SRS方式）。キーは「回転前→回転後」、値は [x, y]（y は下向きが正）
type KickTable = Record<string, [number, number][]>;

const flipY = (table: KickTable): KickTable =>
  Object.fromEntries(Object.entries(table).map(([k, v]) => [k, v.map(([x, y]) => [x, -y] as [number, number])]));

const KICKS_STANDARD: KickTable = flipY({
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
});

const KICKS_I: KickTable = flipY({
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
});

export function getKicks(def: PieceDef, from: number, to: number): [number, number][] {
  if (def.kicks === 'none') return [[0, 0]];
  return (def.kicks === 'I' ? KICKS_I : KICKS_STANDARD)[`${from}${to}`];
}
