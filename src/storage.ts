// 端末内にハイスコアを保存する（保存できない環境でも落ちないようにする）
const BEST_KEY = 'mygame.best';

export function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // 保存できなくてもゲームは続行
  }
}
