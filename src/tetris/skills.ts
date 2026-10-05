// スキル（技）の一覧。レベルが learnLevel に達すると覚え、SP を cost 消費して使う。
// 効果の中身は Tetris.useSkill() に書く。

export type SkillId = 'bomb' | 'slow' | 'change' | 'gravity';

export interface SkillDef {
  id: SkillId;
  name: string;
  desc: string;
  learnLevel: number;
  cost: number;
}

export const SKILLS: SkillDef[] = [
  { id: 'bomb', name: 'ボム', desc: '一番下の2段を消す', learnLevel: 2, cost: 3 },
  { id: 'slow', name: 'スロー', desc: '15秒間 落下が半分の速さに', learnLevel: 3, cost: 2 },
  { id: 'change', name: 'チェンジ', desc: '今のブロックを棒に変える', learnLevel: 4, cost: 2 },
  { id: 'gravity', name: 'グラビティ', desc: '浮いたブロックを落として隙間を詰める', learnLevel: 5, cost: 4 },
];

export const MAX_SP = 10;
export const SLOW_DURATION = 15_000;
