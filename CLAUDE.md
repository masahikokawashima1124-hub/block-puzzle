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
