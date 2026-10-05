import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

// 動作確認用のサンプル：タップした場所にボールが移動する
export class GameScene extends Phaser.Scene {
  private ball!: Phaser.GameObjects.Arc;
  private score = 0;
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    this.score = 0;
    this.scoreText = this.add.text(32, 32, 'SCORE: 0', { fontSize: '36px', color: '#ffffff' });

    this.ball = this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 40, 0x06d6a0);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.tweens.add({ targets: this.ball, x: pointer.x, y: pointer.y, duration: 250, ease: 'Quad.easeOut' });
      this.score += 1;
      this.scoreText.setText(`SCORE: ${this.score}`);
    });
  }
}
