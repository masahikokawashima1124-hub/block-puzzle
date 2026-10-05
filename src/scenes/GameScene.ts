import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { loadBest, saveBest } from '../storage';
import { PIECES } from '../tetris/pieces';
import { MAX_SP, SKILLS, type SkillDef, type SkillId } from '../tetris/skills';
import { COLS, HIDDEN_ROWS, Tetris, VISIBLE_ROWS } from '../tetris/Tetris';

// ---- レイアウト（基準 720x1280） ----
const CELL = 48;
const BOARD_X = 24;
const BOARD_Y = 110;
const BOARD_W = COLS * CELL;
const BOARD_H = VISIBLE_ROWS * CELL;
const PANEL_X = BOARD_X + BOARD_W + 20;
const PANEL_W = GAME_WIDTH - PANEL_X - 20;
const PREVIEW_CELL = 26;
const BUTTON_Y = 1180;
const BUTTON_H = 150;

const HOLD_BOX = { y: BOARD_Y, h: 140 };
const NEXT_BOX = { y: 270, h: 360 };
const NEXT_COUNT = 3;
const SP_Y = NEXT_BOX.y + NEXT_BOX.h + 16;
const SKILL_Y = SP_Y + 64;
const SKILL_H = 80;
const SKILL_GAP = 13;

// 押しっぱなしで連続移動するときの間隔(ms)
const DAS = 170; // 連続移動が始まるまで
const ARR = 50; // 連続移動の間隔

const FONT = '"Helvetica Neue", Arial, "Hiragino Sans", "Yu Gothic", sans-serif';
const COLOR_FRAME = 0x3a3f58;
const COLOR_BG = 0x14161f;

type Action = 'left' | 'right' | 'down' | 'rotateCW' | 'rotateCCW' | 'hardDrop' | 'hold';

export class GameScene extends Phaser.Scene {
  private tetris!: Tetris;
  private boardGfx!: Phaser.GameObjects.Graphics;
  private previewGfx!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private spGfx!: Phaser.GameObjects.Graphics;
  private spText!: Phaser.GameObjects.Text;
  private slowText!: Phaser.GameObjects.Text;
  private skillSlots: { skill: SkillDef; bg: Phaser.GameObjects.Rectangle; name: Phaser.GameObjects.Text; sub: Phaser.GameObjects.Text }[] = [];
  private nextPopupAt = 0;
  private overlay?: Phaser.GameObjects.Container;
  private paused = false;
  private best = 0;
  private repeat: Partial<Record<'left' | 'right', number>> = {}; // 次に連続移動するまでの残り時間

  constructor() {
    super('Game');
  }

  create() {
    this.paused = false;
    this.overlay = undefined;
    this.repeat = {};
    this.skillSlots = [];
    this.nextPopupAt = 0;
    this.best = loadBest();
    this.tetris = new Tetris({
      onLinesCleared: (rows) => this.onLinesCleared(rows),
      onLevelUp: (level) => this.popupText(`LEVEL ${level}`, '#ffd166'),
      onGameOver: () => this.showGameOver(),
      onSkillLearned: (skill) => this.popupText(`スキル習得！\n${skill.name}`, '#7cf5ff', 44),
      onSkillUsed: (id) => this.onSkillUsed(id),
      onNewPieces: () => {
        this.popupText('新ブロック登場！', '#f78fb3', 52);
        this.cameras.main.flash(200, 247, 143, 179);
      },
    });

    this.input.addPointer(2); // 2本指の同時押しに対応
    this.drawFrame();
    this.boardGfx = this.add.graphics();
    this.previewGfx = this.add.graphics();
    this.createTexts();
    this.createButtons();
    this.createSkillPanel();
    this.setupKeyboard();

    // アプリ切替やタブ移動で自動的に一時停止
    const onBlur = () => this.setPaused(true);
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.game.events.on(Phaser.Core.Events.HIDDEN, onBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
      this.game.events.off(Phaser.Core.Events.HIDDEN, onBlur);
    });
  }

  update(_time: number, delta: number) {
    if (!this.paused && !this.tetris.gameOver) {
      this.updateRepeat(delta);
      this.tetris.update(delta);
    }
    this.render();
  }

  // ---- 入力 ----

  private press(action: Action) {
    if (this.paused || this.tetris.gameOver) return;
    const t = this.tetris;
    switch (action) {
      case 'left':
      case 'right':
        t.move(action === 'left' ? -1 : 1);
        this.repeat = { [action]: DAS }; // 後から押した方向を優先
        break;
      case 'down':
        t.softDropping = true;
        break;
      case 'rotateCW':
        t.rotate(1);
        break;
      case 'rotateCCW':
        t.rotate(-1);
        break;
      case 'hardDrop':
        t.hardDrop();
        break;
      case 'hold':
        t.holdPiece();
        break;
    }
  }

  private release(action: Action) {
    if (action === 'left' || action === 'right') delete this.repeat[action];
    if (action === 'down') this.tetris.softDropping = false;
  }

  private updateRepeat(delta: number) {
    for (const dir of ['left', 'right'] as const) {
      let remaining = this.repeat[dir];
      if (remaining === undefined) continue;
      remaining -= delta;
      while (remaining <= 0) {
        this.tetris.move(dir === 'left' ? -1 : 1);
        remaining += ARR;
      }
      this.repeat[dir] = remaining;
    }
  }

  private setupKeyboard() {
    const kb = this.input.keyboard;
    if (!kb) return;
    const map: Record<string, Action> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowDown: 'down',
      ArrowUp: 'rotateCW',
      KeyX: 'rotateCW',
      KeyZ: 'rotateCCW',
      Space: 'hardDrop',
      KeyC: 'hold',
      ShiftLeft: 'hold',
    };
    kb.addCapture('LEFT,RIGHT,UP,DOWN,SPACE');
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyP' || e.code === 'Escape') return this.setPaused(!this.paused);
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (digit) return this.useSkill(SKILLS[Number(digit[1]) - 1]?.id);
      const action = map[e.code];
      if (action) this.press(action);
    });
    kb.on('keyup', (e: KeyboardEvent) => {
      const action = map[e.code];
      if (action) this.release(action);
    });
  }

  private createButtons() {
    const buttons: { label: string; action: Action }[] = [
      { label: '◀', action: 'left' },
      { label: '▼', action: 'down' },
      { label: '▶', action: 'right' },
      { label: '↺', action: 'rotateCCW' },
      { label: '↻', action: 'rotateCW' },
      { label: 'DROP', action: 'hardDrop' },
    ];
    const gap = 8;
    const w = (GAME_WIDTH - 32 - gap * (buttons.length - 1)) / buttons.length;
    buttons.forEach((b, i) => {
      const x = 16 + w / 2 + i * (w + gap);
      this.makeButton(x, BUTTON_Y, w, BUTTON_H, b.label, () => this.press(b.action), () => this.release(b.action));
    });

    // HOLD 枠をタップでホールド
    const holdZone = this.add
      .zone(PANEL_X + PANEL_W / 2, HOLD_BOX.y + HOLD_BOX.h / 2, PANEL_W, HOLD_BOX.h)
      .setInteractive();
    holdZone.on('pointerdown', () => this.press('hold'));

    // 一時停止ボタン
    this.makeButton(GAME_WIDTH - 60, 55, 72, 72, 'II', () => this.setPaused(true));
  }

  private makeButton(x: number, y: number, w: number, h: number, label: string, onDown: () => void, onUp?: () => void) {
    const bg = this.add.rectangle(x, y, w, h, 0x2b2f42).setStrokeStyle(3, COLOR_FRAME).setInteractive();
    this.add
      .text(x, y, label, { fontFamily: FONT, fontSize: label.length > 2 ? '30px' : '48px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    const up = () => {
      bg.setFillStyle(0x2b2f42);
      onUp?.();
    };
    bg.on('pointerdown', () => {
      bg.setFillStyle(0x4a5070);
      onDown();
    });
    bg.on('pointerup', up);
    bg.on('pointerout', up);
  }

  // ---- 表示 ----

  private drawFrame() {
    const g = this.add.graphics();
    // 盤面
    g.fillStyle(COLOR_BG).fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
    g.lineStyle(1, 0xffffff, 0.05);
    for (let c = 1; c < COLS; c++) g.lineBetween(BOARD_X + c * CELL, BOARD_Y, BOARD_X + c * CELL, BOARD_Y + BOARD_H);
    for (let r = 1; r < VISIBLE_ROWS; r++) g.lineBetween(BOARD_X, BOARD_Y + r * CELL, BOARD_X + BOARD_W, BOARD_Y + r * CELL);
    g.lineStyle(4, COLOR_FRAME).strokeRect(BOARD_X - 2, BOARD_Y - 2, BOARD_W + 4, BOARD_H + 4);
    // 右側の枠
    for (const box of [HOLD_BOX, NEXT_BOX]) {
      g.fillStyle(COLOR_BG).fillRect(PANEL_X, box.y, PANEL_W, box.h);
      g.lineStyle(3, COLOR_FRAME).strokeRect(PANEL_X, box.y, PANEL_W, box.h);
    }
    const label = (y: number, text: string) =>
      this.add.text(PANEL_X + 10, y + 6, text, { fontFamily: FONT, fontSize: '22px', color: '#8a90b0', fontStyle: 'bold' });
    label(HOLD_BOX.y, 'HOLD');
    label(NEXT_BOX.y, 'NEXT');
  }

  private createTexts() {
    const style = { fontFamily: FONT, color: '#ffffff', fontStyle: 'bold' };
    this.add.text(BOARD_X, 18, 'SCORE', { ...style, fontSize: '20px', color: '#8a90b0' });
    this.scoreText = this.add.text(BOARD_X, 42, '0', { ...style, fontSize: '44px' });
    this.add.text(210, 18, 'BEST', { ...style, fontSize: '20px', color: '#8a90b0' });
    this.bestText = this.add.text(210, 42, String(this.best), { ...style, fontSize: '44px', color: '#ffd166' });
    this.add.text(395, 18, 'LV', { ...style, fontSize: '20px', color: '#8a90b0' });
    this.levelText = this.add.text(395, 42, '1', { ...style, fontSize: '44px' });
    this.add.text(480, 18, 'LINES', { ...style, fontSize: '20px', color: '#8a90b0' });
    this.linesText = this.add.text(480, 42, '0', { ...style, fontSize: '44px' });

    this.slowText = this.add
      .text(BOARD_X + BOARD_W / 2, BOARD_Y + 30, '', { ...style, fontSize: '30px', color: '#7cf5ff', stroke: '#000000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private render() {
    const t = this.tetris;
    const g = this.boardGfx;
    g.clear();

    // 積まれたブロック
    for (let r = HIDDEN_ROWS; r < t.grid.length; r++) {
      for (let c = 0; c < COLS; c++) {
        const id = t.grid[r][c];
        if (id) this.drawCell(g, BOARD_X + c * CELL, BOARD_Y + (r - HIDDEN_ROWS) * CELL, CELL, PIECES[id].color);
      }
    }

    if (!t.gameOver) {
      const { matrix, x, y, type } = t.piece;
      const color = PIECES[type].color;
      const ghostY = t.ghostY();
      matrix.forEach((row, r) =>
        row.forEach((v, c) => {
          if (!v) return;
          const px = BOARD_X + (x + c) * CELL;
          // 落下予定位置（ゴースト）
          if (ghostY + r >= HIDDEN_ROWS) {
            g.lineStyle(3, color, 0.5).strokeRect(px + 3, BOARD_Y + (ghostY + r - HIDDEN_ROWS) * CELL + 3, CELL - 6, CELL - 6);
          }
          if (y + r >= HIDDEN_ROWS) this.drawCell(g, px, BOARD_Y + (y + r - HIDDEN_ROWS) * CELL, CELL, color);
        }),
      );
    }

    // HOLD / NEXT
    const p = this.previewGfx;
    p.clear();
    const cx = PANEL_X + PANEL_W / 2;
    if (t.hold) this.drawPreview(t.hold, cx, HOLD_BOX.y + 80, t.canHold ? 1 : 0.3);
    t.queue.slice(0, NEXT_COUNT).forEach((id, i) => this.drawPreview(id, cx, NEXT_BOX.y + 90 + i * 100, 1));

    this.scoreText.setText(String(t.score));
    this.levelText.setText(String(t.level));
    this.linesText.setText(String(t.lines));
    if (t.score > this.best) this.bestText.setText(String(t.score));
    this.slowText.setText(t.isSlowed() ? `SLOW ${Math.ceil((t.slowUntil - t.elapsed) / 1000)}` : '');
    this.renderSkillPanel();
  }

  // ---- スキル ----

  private createSkillPanel() {
    const style = { fontFamily: FONT, fontStyle: 'bold' };
    this.add.text(PANEL_X, SP_Y, 'SP', { ...style, fontSize: '22px', color: '#8a90b0' });
    this.spText = this.add.text(PANEL_X + PANEL_W, SP_Y, '', { ...style, fontSize: '22px', color: '#7cf5ff' }).setOrigin(1, 0);
    this.spGfx = this.add.graphics();

    SKILLS.forEach((skill, i) => {
      const y = SKILL_Y + i * (SKILL_H + SKILL_GAP) + SKILL_H / 2;
      const bg = this.add.rectangle(PANEL_X + PANEL_W / 2, y, PANEL_W, SKILL_H, 0x2b2f42).setStrokeStyle(3, COLOR_FRAME).setInteractive();
      const name = this.add.text(PANEL_X + 12, y - 30, '', { ...style, fontSize: '28px', color: '#ffffff' });
      const sub = this.add.text(PANEL_X + 12, y + 6, '', { ...style, fontSize: '20px', color: '#8a90b0' });
      bg.on('pointerdown', () => this.useSkill(skill.id));
      this.skillSlots.push({ skill, bg, name, sub });
    });
  }

  private renderSkillPanel() {
    const t = this.tetris;
    const g = this.spGfx;
    const barY = SP_Y + 30;
    g.clear();
    g.fillStyle(COLOR_BG).fillRect(PANEL_X, barY, PANEL_W, 20);
    g.fillStyle(0x7cf5ff).fillRect(PANEL_X, barY, (PANEL_W * t.sp) / MAX_SP, 20);
    g.lineStyle(2, COLOR_FRAME).strokeRect(PANEL_X, barY, PANEL_W, 20);
    this.spText.setText(`${t.sp}/${MAX_SP}`);

    for (const { skill, bg, name, sub } of this.skillSlots) {
      const learned = skill.learnLevel <= t.level;
      const usable = t.canUseSkill(skill.id);
      name.setText(learned ? skill.name : '？？？').setColor(usable ? '#ffffff' : '#5a6080');
      sub.setText(learned ? `SP ${skill.cost}` : `Lv${skill.learnLevel}で習得`).setColor(usable ? '#7cf5ff' : '#5a6080');
      bg.setFillStyle(usable ? 0x34406a : 0x1f2230).setStrokeStyle(3, usable ? 0x7cf5ff : COLOR_FRAME);
    }
  }

  private useSkill(id: SkillId | undefined) {
    if (!id || this.paused || this.tetris.gameOver) return;
    this.tetris.useSkill(id);
  }

  private onSkillUsed(id: SkillId) {
    const skill = SKILLS.find((s) => s.id === id)!;
    this.popupText(skill.name, '#7cf5ff', 60);
    if (id === 'bomb') {
      const flash = this.add.rectangle(BOARD_X + BOARD_W / 2, BOARD_Y + BOARD_H - CELL, BOARD_W, CELL * 2, 0xffa94d, 0.9);
      this.tweens.add({ targets: flash, alpha: 0, scaleY: 1.6, duration: 350, onComplete: () => flash.destroy() });
      this.cameras.main.shake(200, 0.01);
    } else if (id === 'gravity') {
      this.cameras.main.shake(250, 0.006);
    } else {
      this.cameras.main.flash(150, 124, 245, 255);
    }
  }

  private drawCell(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number, alpha = 1) {
    g.fillStyle(color, alpha).fillRect(x + 1, y + 1, size - 2, size - 2);
    g.fillStyle(0xffffff, 0.25 * alpha).fillRect(x + 1, y + 1, size - 2, Math.round(size * 0.18));
    g.fillStyle(0x000000, 0.2 * alpha).fillRect(x + 1, y + size - 1 - Math.round(size * 0.12), size - 2, Math.round(size * 0.12));
  }

  // ブロックの形を枠の中央に小さく描く
  private drawPreview(id: string, cx: number, cy: number, alpha: number) {
    const { shape, color } = PIECES[id];
    const cells: [number, number][] = [];
    shape.forEach((row, r) => row.forEach((v, c) => v && cells.push([c, r])));
    const minX = Math.min(...cells.map(([c]) => c));
    const maxX = Math.max(...cells.map(([c]) => c));
    const minY = Math.min(...cells.map(([, r]) => r));
    const maxY = Math.max(...cells.map(([, r]) => r));
    const ox = cx - ((maxX - minX + 1) * PREVIEW_CELL) / 2;
    const oy = cy - ((maxY - minY + 1) * PREVIEW_CELL) / 2;
    for (const [c, r] of cells) {
      this.drawCell(this.previewGfx, ox + (c - minX) * PREVIEW_CELL, oy + (r - minY) * PREVIEW_CELL, PREVIEW_CELL, color, alpha);
    }
  }

  // ---- 演出 ----

  private onLinesCleared(rows: number[]) {
    for (const r of rows) {
      if (r < HIDDEN_ROWS) continue;
      const flash = this.add.rectangle(BOARD_X + BOARD_W / 2, BOARD_Y + (r - HIDDEN_ROWS) * CELL + CELL / 2, BOARD_W, CELL, 0xffffff, 0.9);
      this.tweens.add({ targets: flash, alpha: 0, scaleY: 0.2, duration: 250, onComplete: () => flash.destroy() });
    }
    const labels = ['', '', 'DOUBLE', 'TRIPLE', '4 LINES!'];
    const label = labels[rows.length] ?? `${rows.length} LINES!`;
    if (label) this.popupText(label, '#ffffff');
    if (rows.length >= 4) this.cameras.main.shake(150, 0.006);
  }

  // 演出テキスト。重なる場合は少しずらして順番に出す
  private popupText(text: string, color: string, fontSize = 64) {
    const now = this.time.now;
    const delay = Math.max(0, this.nextPopupAt - now);
    this.nextPopupAt = now + delay + 450;
    this.time.delayedCall(delay, () => this.showPopup(text, color, fontSize));
  }

  private showPopup(text: string, color: string, fontSize: number) {
    const t = this.add
      .text(BOARD_X + BOARD_W / 2, BOARD_Y + BOARD_H * 0.4, text, {
        fontFamily: FONT,
        fontSize: `${fontSize}px`,
        fontStyle: 'bold',
        color,
        align: 'center',
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({ targets: t, y: t.y - 80, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  // ---- 一時停止・ゲームオーバー ----

  private setPaused(paused: boolean) {
    if (this.tetris.gameOver || paused === this.paused) return;
    this.paused = paused;
    this.repeat = {};
    this.tetris.softDropping = false;
    if (paused) {
      this.showOverlay('PAUSE', 'タップで再開', () => this.setPaused(false));
    } else {
      this.overlay?.destroy();
      this.overlay = undefined;
    }
  }

  private showGameOver() {
    const t = this.tetris;
    const isBest = t.score > this.best;
    if (isBest) saveBest(t.score);
    const sub = `SCORE ${t.score}${isBest ? '\n★ ハイスコア更新！' : ''}\n\nタップでリトライ`;
    this.time.delayedCall(600, () => this.showOverlay('GAME OVER', sub, () => this.scene.restart()));
  }

  private showOverlay(title: string, sub: string, onTap: () => void) {
    const bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setInteractive();
    const titleText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.38, title, { fontFamily: FONT, fontSize: '88px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    const subText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.52, sub, { fontFamily: FONT, fontSize: '40px', color: '#ffd166', align: 'center' })
      .setOrigin(0.5);
    this.overlay = this.add.container(0, 0, [bg, titleText, subText]).setDepth(100);
    bg.once('pointerdown', onTap);
  }
}
