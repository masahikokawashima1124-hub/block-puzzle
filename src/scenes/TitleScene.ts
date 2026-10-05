import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.4, 'MY GAME', {
        fontSize: '96px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const start = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.6, 'タップでスタート', {
        fontSize: '40px',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    this.tweens.add({ targets: start, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    this.input.once('pointerdown', () => this.scene.start('Game'));
  }
}
