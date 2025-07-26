# 音声文字起こしツール

リアルタイムで音声を文字に変換するWebアプリケーション。Web Speech APIを使用し、ブラウザ上で完結する無料の文字起こしツールです。

## 🌟 特徴

- **リアルタイム文字起こし**: 話した内容が即座にテキストに変換されます
- **完全無料**: インストール不要、アカウント登録不要
- **プライバシー重視**: 音声データはブラウザ内で処理され、外部に送信されません
- **多機能エクスポート**: TXT、DOCX、PDF、JSON、Markdown形式に対応
- **AI連携**: ChatGPTやGemini用のMarkdown形式でエクスポート可能
- **高度な編集機能**: 検索・置換、元に戻す/やり直し機能
- **ダークモード対応**: 目に優しい暗いテーマを選択可能

## 🚀 デモ

[オンラインデモ](https://your-demo-url.com) （※デプロイ後にURLを更新してください）

## 💻 動作環境

### 対応ブラウザ
- ✅ Google Chrome (推奨) - バージョン25以上
- ✅ Microsoft Edge - バージョン79以上
- ✅ Safari - バージョン14.1以上
- ✅ Opera - バージョン27以上
- ❌ Firefox - 音声認識APIに非対応

### 必要な環境
- インターネット接続（音声認識処理のため）
- マイクへのアクセス許可
- HTTPS環境（ローカル開発時はlocalhostでも可）

## 🛠️ インストールと使用方法

### 方法1: 直接使用
1. すべてのファイルをダウンロード
2. `index.html`をブラウザで開く
3. マイクアクセスを許可して使用開始

### 方法2: ローカルサーバーで実行
```bash
# Python 3を使用する場合
python -m http.server 8000

# Node.jsを使用する場合
npx http-server
```

### 方法3: GitHub Pagesでホスティング
1. このリポジトリをフォーク
2. Settings > Pages でGitHub Pagesを有効化
3. ソースをmainブランチのルートディレクトリに設定

## 📋 使い方

### 基本的な使い方
1. 録音ボタン（青い大きなボタン）をクリック
2. ブラウザがマイクへのアクセスを求めたら「許可」をクリック
3. 話し始めると、リアルタイムで文字が表示されます
4. 録音停止ボタン（赤いボタン）をクリックして終了

### キーボードショートカット
- `Space`: 録音開始/停止
- `Ctrl + F`: 検索・置換
- `Ctrl + Z`: 元に戻す
- `Ctrl + Y`: やり直す
- `Ctrl + S`: TXTファイルとして保存
- `Ctrl + N`: 新規セッション
- `?`: ヘルプ表示

## ⚙️ 主な機能

### 音声認識機能
- 日本語に最適化された高精度な認識
- リアルタイムでの中間結果表示
- 60秒制限の自動回避（自動再開機能）
- ノイズレベルの監視と警告

### テキスト編集機能
- 録音後の手動編集
- 検索・置換機能
- 元に戻す/やり直し（最大50回）
- よく使う単語の辞書登録

### エクスポート機能
- **TXT**: シンプルなテキストファイル
- **DOCX**: Microsoft Word形式
- **PDF**: 印刷用PDF形式
- **JSON**: タイムスタンプ付き詳細データ
- **Markdown**: AI（ChatGPT/Gemini）向け形式

### その他の機能
- セッション管理（複数の録音を分けて管理）
- 自動保存（ローカルストレージ）
- ダークモード
- フォントサイズ調整（14px〜24px）
- 句読点の自動挿入

## 🔧 技術仕様

### 使用技術
- HTML5
- CSS3（レスポンシブデザイン）
- Vanilla JavaScript（フレームワーク不使用）
- Web Speech API
- MediaStream API
- LocalStorage API

### 外部ライブラリ（CDN経由）
- [docx](https://github.com/dolanmiu/docx) - DOCX生成
- [jsPDF](https://github.com/parallax/jsPDF) - PDF生成
- [FileSaver.js](https://github.com/eligrey/FileSaver.js) - ファイル保存
- Google Fonts (Noto Sans JP)
- Material Icons

## 📁 ファイル構成

```
gijiroku/
├── index.html          # メインアプリケーション
├── styles.css          # スタイルシート
├── script.js           # JavaScriptロジック
├── guide.html          # 使い方ガイド
├── favicon.svg         # ファビコン
├── README.md           # このファイル
├── requirements.md     # 要件定義書
├── design.md          # デザイン仕様書
└── development-tasks.md # 開発タスクリスト
```

## 🔒 セキュリティとプライバシー

- 音声データはブラウザ内でのみ処理され、外部サーバーには送信されません
- 音声認識処理はブラウザベンダー（Google/Apple/Microsoft）のサーバーで行われます
- ローカルストレージのデータは暗号化されていません
- Content Security Policy (CSP) による保護
- XSS対策実装済み

## ⚠️ 制限事項

- 音声認識にはインターネット接続が必要
- 約60秒で自動的に一時停止（自動再開機能あり）
- ブラウザのメモリ制限により、長時間の録音には制限あり
- 専門用語や固有名詞の認識精度は低い場合があります

## 🐛 既知の問題

- Firefoxでは音声認識機能が利用できません
- 一部のAndroidデバイスで音声認識が不安定な場合があります
- Safari on iOSでは、バックグラウンドでの録音が停止します

## 🤝 貢献方法

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- Web Speech APIを提供しているブラウザベンダー
- 使用しているオープンソースライブラリの開発者
- フィードバックを提供してくれたすべてのユーザー

## 📞 お問い合わせ

バグ報告や機能リクエストは、[Issues](https://github.com/yourusername/gijiroku/issues)ページからお願いします。

---

Made with ❤️ by [Your Name]