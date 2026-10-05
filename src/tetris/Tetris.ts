import { BASIC_PIECES, PIECES, getKicks, rotateCCW, rotateCW, type Matrix } from './pieces';

// ゲームのルール本体。画面表示（Phaser）には依存しない。

export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2; // 盤面の上にある見えない出現エリア
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

const LOCK_DELAY = 500; // 着地してから固定されるまでの猶予(ms)
const MAX_LOCK_RESETS = 15; // 着地後に動かして猶予を延ばせる回数
const LINE_SCORES = [0, 100, 300, 500, 800];
const LINES_PER_LEVEL = 10;

export type Cell = string | null; // ブロックのID（空なら null）

export interface ActivePiece {
  type: string;
  rotation: number; // 0..3
  matrix: Matrix;
  x: number;
  y: number;
}

export interface TetrisEvents {
  onLinesCleared?: (rows: number[]) => void;
  onLevelUp?: (level: number) => void;
  onGameOver?: () => void;
}

export class Tetris {
  grid: Cell[][];
  piece!: ActivePiece;
  queue: string[] = [];
  hold: string | null = null;
  canHold = true;
  score = 0;
  lines = 0;
  level = 1;
  elapsed = 0; // プレイ経過時間(ms)
  gameOver = false;
  softDropping = false;

  private events: TetrisEvents;
  private random: () => number;
  private pool: string[] = [...BASIC_PIECES]; // 出現するブロックの種類
  private bag: string[] = [];
  private gravityTimer = 0;
  private lockTimer = 0;
  private lockResets = 0;

  constructor(events: TetrisEvents = {}, random: () => number = Math.random) {
    this.events = events;
    this.random = random;
    this.grid = Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
    this.fillQueue();
    this.spawnNext();
  }

  // 出現するブロックの種類を追加する（次のセットから混ざる）
  addPieceTypes(ids: string[]) {
    for (const id of ids) {
      if (PIECES[id] && !this.pool.includes(id)) this.pool.push(id);
    }
  }

  // ---- 操作 ----

  move(dx: number): boolean {
    if (this.gameOver || this.collides(this.piece.matrix, this.piece.x + dx, this.piece.y)) return false;
    this.piece.x += dx;
    this.resetLockTimer();
    return true;
  }

  rotate(dir: 1 | -1): boolean {
    if (this.gameOver) return false;
    const { type, rotation, matrix, x, y } = this.piece;
    const next = (rotation + dir + 4) % 4;
    const rotated = dir === 1 ? rotateCW(matrix) : rotateCCW(matrix);
    for (const [kx, ky] of getKicks(PIECES[type], rotation, next)) {
      if (!this.collides(rotated, x + kx, y + ky)) {
        this.piece = { type, rotation: next, matrix: rotated, x: x + kx, y: y + ky };
        this.resetLockTimer();
        return true;
      }
    }
    return false;
  }

  hardDrop() {
    if (this.gameOver) return;
    let dropped = 0;
    while (this.stepDown()) dropped++;
    this.score += dropped * 2;
    this.lock();
  }

  holdPiece() {
    if (this.gameOver || !this.canHold) return;
    const current = this.piece.type;
    if (this.hold) {
      this.spawn(this.hold);
    } else {
      this.spawnNext();
    }
    this.hold = current;
    this.canHold = false;
  }

  // 毎フレーム呼ぶ。dt はミリ秒
  update(dt: number) {
    if (this.gameOver) return;
    this.elapsed += dt;
    const interval = this.softDropping ? this.gravityInterval() / 20 : this.gravityInterval();
    this.gravityTimer += dt;
    while (this.gravityTimer >= interval) {
      this.gravityTimer -= interval;
      if (this.stepDown()) {
        if (this.softDropping) this.score += 1;
      } else {
        this.gravityTimer = 0;
        break;
      }
    }

    if (this.isGrounded()) {
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY) this.lock();
    } else {
      this.lockTimer = 0;
    }
  }

  // ---- 表示用 ----

  ghostY(): number {
    let y = this.piece.y;
    while (!this.collides(this.piece.matrix, this.piece.x, y + 1)) y++;
    return y;
  }

  // ---- 内部処理 ----

  private gravityInterval(): number {
    return Math.pow(0.8 - (this.level - 1) * 0.007, this.level - 1) * 1000;
  }

  private stepDown(): boolean {
    if (this.collides(this.piece.matrix, this.piece.x, this.piece.y + 1)) return false;
    this.piece.y += 1;
    return true;
  }

  private isGrounded(): boolean {
    return this.collides(this.piece.matrix, this.piece.x, this.piece.y + 1);
  }

  private resetLockTimer() {
    if (this.lockResets < MAX_LOCK_RESETS && this.lockTimer > 0) {
      this.lockTimer = 0;
      this.lockResets++;
    }
  }

  collides(matrix: Matrix, x: number, y: number): boolean {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const gx = x + c;
        const gy = y + r;
        if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
        if (gy >= 0 && this.grid[gy][gx]) return true;
      }
    }
    return false;
  }

  private lock() {
    const { matrix, x, y, type } = this.piece;
    let visible = false;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const gy = y + r;
        if (gy >= 0) this.grid[gy][x + c] = type;
        if (gy >= HIDDEN_ROWS) visible = true;
      }
    }
    // 見える範囲より上で固定されたらゲームオーバー
    if (!visible) return this.endGame();

    this.clearLines();
    this.canHold = true;
    this.spawnNext();
  }

  private clearLines() {
    const full: number[] = [];
    this.grid.forEach((row, i) => {
      if (row.every((cell) => cell !== null)) full.push(i);
    });
    if (full.length === 0) return;

    this.grid = this.grid.filter((_, i) => !full.includes(i));
    while (this.grid.length < ROWS) this.grid.unshift(Array<Cell>(COLS).fill(null));

    this.score += (LINE_SCORES[full.length] ?? LINE_SCORES[4] * (full.length - 3)) * this.level;
    this.lines += full.length;
    this.events.onLinesCleared?.(full);

    const newLevel = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.events.onLevelUp?.(newLevel);
    }
  }

  private spawnNext() {
    this.spawn(this.queue.shift()!);
    this.fillQueue();
  }

  private spawn(type: string) {
    const matrix = PIECES[type].shape;
    this.piece = { type, rotation: 0, matrix, x: Math.floor((COLS - matrix.length) / 2), y: 0 };
    this.gravityTimer = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    if (this.collides(matrix, this.piece.x, this.piece.y)) return this.endGame();
    this.stepDown(); // 出現直後に1段下げて見える位置に出す
  }

  // 出現する種類を1セットずつシャッフルして出す（同じ形が偏らない）
  private fillQueue() {
    while (this.queue.length < 7) {
      if (this.bag.length === 0) {
        this.bag = [...this.pool];
        for (let i = this.bag.length - 1; i > 0; i--) {
          const j = Math.floor(this.random() * (i + 1));
          [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
      }
      this.queue.push(this.bag.pop()!);
    }
  }

  private endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.events.onGameOver?.();
  }
}
