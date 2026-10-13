# 半導体教室 Semiconductor Room（非公式）

HTML/CSS/JavaScript だけで作った学習サイト。`src/` と `data/` から `tools/build.js` で `docs/` を生成し、GitHub Pages（main ブランチの /docs）で公開する。

## コマンド

```
npm run validate   # 問題データの検査
npm run build      # docs/ を生成（validate も自動で実行）
npm run serve      # http://localhost:8080/semicon-quiz/ で確認
```

`docs/` はビルドのたびに作り直すため、直接編集しないこと。

## 設定（config.json）

| 項目 | 内容 |
|---|---|
| baseUrl | 公開URL。独自ドメインにするときはここを変更する |
| cname | 独自ドメイン名。設定すると docs/CNAME を出力する |
| onlyReviewed | true にすると reviewed:false の問題を出題しない |
| contactFormUrl | お問い合わせ用 Googleフォームの URL |
| reportFormUrl | 誤り報告用 Googleフォームの事前入力URL。`{id}`（問題ID）と `{lang}`（言語）を埋めて開く。null ならリンクを出さない |
| adPlaceholders | true のとき広告枠の位置を点線で表示する（adsenseClient を設定すると表示しない） |
| adsenseClient | AdSense のクライアントID（`ca-pub-…`）。設定すると広告スクリプト（クイズ画面以外）と `ads.txt` を出力し、プライバシーポリシーに説明を載せる。null なら何も出さない |
| ga4Id | Google アナリティクス 4 の測定ID（`G-…`）。設定すると全ページに計測タグを出力し、プライバシーポリシーに説明を載せる。null なら何も出さない |

## PWA

ビルド時に `manifest.json`（言語ごと）、アイコン（`tools/icon.js` で生成）、`sw.js` を出力する。Service Worker はネットワークを優先し、つながらないときだけキャッシュを使う。最初の訪問で各言語のトップ・クイズ・成績ページと問題データを保存するので、オフラインでも問題を解ける。中身が変わると版が変わり、古いキャッシュは消える。

## 追加のしかた

- **分野**：`data/categories.json` に1行足し、`data/questions/{分野ID}.json` を置く（問題ごとのページ `/q/{分野ID}/{問題ID}/` も自動で生成される）
- **問題**：`{ id, question, choices, answer(0始まり), explanation, reviewed, source }`。choices の数は自由（2択・4択も可）
  - 任意：`level`（1 基礎・2 標準・3 応用。分野ページで絞り込める）、`choiceNotes`（選択肢ごとの「なぜ違うか」。choices と同じ数の配列で、補足がない選択肢は `""`）、`tags`（分野をまたぐタグの配列）
  - 英訳ファイルにも `choiceNotes` を書ける。英訳にない場合、英語版では表示しない
- **図**：`data/figures/{図ID}.svg` を置き、問題に `"figure": "{図ID}"` を書くと、解説の下に表示される（クイズ画面と問題ページ）
  - 文字は日本語で書く。英語は `data/i18n/en/figures.json` に `{ 図ID: { "元の文字": "訳" } }` で書く。訳が足りない図はその言語では表示しない（Ec や VGS など、かな・漢字を含まない文字は訳さなくてよい）
  - 色はクラスで指定する（`ln` 線、`ac` 強調線、`n` / `p` / `ox` / `metal` 塗り、`text.sm` 小さい文字 など。一覧は `style.css` の「図」）。ダークモードでも色が切り替わる
  - `id` 属性は使わない（同じページに複数の図が並ぶため）
- **言語**：`config.json` の `languages` に1行足し（先頭が既定言語）、翻訳ファイルを置く：`src/i18n/{言語}.json`（UI文言。モード名は `mode_{モードID}_label` / `_desc` / `_empty`）、`src/pages/{言語}/`、`data/i18n/{言語}/`（categories・exams・glossary・questions）。翻訳のない問題はその言語では出題しない。欠落数は `npm run validate` で表示される
- **ページ**：`src/pages/{言語}/xxx.html` を置くと `/xxx/`（英語は `/en/xxx/`）が生成される（先頭のコメントに title などを JSON で書く）
- **クイズモード**：`src/js/modes/xxx.js` を置くと自動で登録される（`category.js` を参考に）
- **広告**：`src/js/ads.js` の `slot()` を変更する。クイズ画面には読み込まれない
- **保存処理**：localStorage の読み書きは `src/js/store.js` だけで行う
