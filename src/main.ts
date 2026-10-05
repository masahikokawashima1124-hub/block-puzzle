import Phaser from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1d1f2b',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  // 画面サイズが違うスマホ・PCでも、比率を保って自動で拡大縮小する
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [TitleScene, GameScene],
});

// 開発中だけ、ブラウザのコンソールからゲームを調べられるようにする
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
