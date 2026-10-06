# My Game

一般配布を前提にしたゲームアプリのプロジェクト。

## 技術構成
- **Phaser 4**（2Dゲームエンジン）+ **TypeScript** + **Vite**（開発サーバー/ビルド）
- **Capacitor 8**：同じコードを iOS / Android アプリに変換する
- 画面の基準サイズは 720x1280（縦長）。`src/config.ts` で変更する。Scale.FIT で自動拡縮。

## フォルダ
- `src/main.ts` … ゲーム全体の設定、使うシーンの登録
- `src/scenes/` … 画面ごとのコード（Title, Game …）。新しい画面はここに追加し main.ts に登録
- `public/assets/` … 画像・音声。コードからは `assets/xxx.png` で読み込む

## コマンド
- `npm run dev` … 開発サーバー（http://localhost:5173）
- `npm run build` … `dist/` に公開用ファイルを出力（型チェック込み）
- `npm run deploy` … テスト → ビルド → GitHub Pages に公開（gh-pages ブランチへ送る。反映まで1〜2分）
- `npx cap sync` … ビルド結果をスマホアプリ側にコピー（android/ios 追加後）

## 配布のルート
- ブラウザ版：**公開中** https://masahikokawashima1124-hub.github.io/block-puzzle/ （リポジトリ masahikokawashima1124-hub/block-puzzle は公開設定）。itch.io にも `dist/` の zip で出せる
- Android：Android Studio + `npx cap add android`（Google Play 登録料 $25）
- iOS：Mac + Xcode が必須（Apple Developer $99/年）
- PC（Steam）：Electron 等でラップ

## 注意
- プロジェクトのパスに日本語が含まれる。Android ビルドで問題が出たら英語パスへ移すか `android/gradle.properties` に `android.overridePathCheck=true`。
- 正式公開前に `capacitor.config.ts` の appId（現在 com.example.mygame）を自分のものに変える。一度ストアに出すと変更不可。
- 素材（画像・音・フォント）は商用利用可のライセンスのみ使う。

## ゲーム内容（ブロックパズル）
- 土台は落ち物パズル（10x20、7種＋7個ずつシャッフル、SRS回転、ホールド、ゴースト）。
- ルールは `src/tetris/Tetris.ts`（Phaser 非依存・テストあり `npm test`）、表示と操作は `src/scenes/GameScene.ts`。
- ブロックの形は `src/tetris/pieces.ts` の PIECES に足し、`Tetris.addPieceTypes()` で出現させる。
- 「テトリス」は商標なので、名前・ロゴ・公式風の見た目は使わない（タイトルは仮で BLOCK PUZZLE）。

## 独自要素
- **スキル**：`src/tetris/skills.ts` に一覧（習得レベル・消費SP）。効果は `Tetris.useSkill()`。SPはライン1本で+1（最大10）。
- **形が増える**：`src/tetris/pieces.ts` の PIECE_STAGES（プレイ時間で追加）。登場時は NEXT に割り込む。
- 開発中はブラウザのコンソールで `window.game` からゲームを操作できる（公開版には含まれない）。

## 今後の予定
- 2人対戦：まず1台で対戦 → 楽しければ友達とオンライン対戦
