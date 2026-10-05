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
- `npx cap sync` … ビルド結果をスマホアプリ側にコピー（android/ios 追加後）

## 配布のルート
- ブラウザ版：`dist/` を itch.io / GitHub Pages 等にアップ
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

## 今後入れたい要素
1. レベルが上がるとスキル（技）を覚える … `onLevelUp` から差し込む
2. 時間が経つと落ちてくるブロックの形の種類が増える … `elapsed` と `addPieceTypes()` を使う
3. 2人対戦（方式は検討中）
