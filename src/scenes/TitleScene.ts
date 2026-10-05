import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { loadBest } from '../storage';

const FONT = '"Helvetica Neue", Arial, "Hiragino Sans", "Yu Gothic", sans-serif';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    // タイトル名は仮
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 'BLOCK\nPUZZLE', {
        fontFamily: FONT,
        fontSize: '110px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.5, `BEST ${loadBest()}`, { fontFamily: FONT, fontSize: '40px', color: '#ffd166' })
      .setOrigin(0.5);

    const start = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.62, 'タップでスタート', { fontFamily: FONT, fontSize: '44px', color: '#ffffff' })
      .setOrigin(0.5);
    this.tweens.add({ targets: start, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT * 0.85,
        'PC操作：← → 移動 / ↓ 早く落とす / ↑・X 右回転 / Z 左回転\nスペース 一気に落とす / C ホールド / P 一時停止',
        { fontFamily: FONT, fontSize: '22px', color: '#8a90b0', align: 'center', lineSpacing: 8 },
      )
      .setOrigin(0.5);

    const begin = () => this.scene.start('Game');
    this.input.once('pointerdown', begin);
    this.input.keyboard?.once('keydown', begin);
  }
}
