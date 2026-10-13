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
| adPlaceholders | true のとき広告枠の位置を点線で表示する |

## 追加のしかた

- **分野**：`data/categories.json` に1行足し、`data/questions/{分野ID}.json` を置く（問題ごとのページ `/q/{分野ID}/{問題ID}/` も自動で生成される）
- **問題**：`{ id, question, choices, answer(0始まり), explanation, reviewed, source }`。choices の数は自由（2択・4択も可）
- **ページ**：`src/pages/xxx.html` を置くと `/xxx/` が生成される（先頭のコメントに title などを JSON で書く）
- **クイズモード**：`src/js/modes/xxx.js` を置くと自動で登録される（`category.js` を参考に）
- **広告**：`src/js/ads.js` の `slot()` を変更する。クイズ画面には読み込まれない
- **保存処理**：localStorage の読み書きは `src/js/store.js` だけで行う
