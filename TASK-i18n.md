# 多言語追加の進み具合 (繁体字 zh-hant → 韓国語 ko → ドイツ語 de)

作業手順: config.json の languages に追加 → UI・ページ・分野・区分・用語集・比較・図・コース → 問題(分野ごと)。
補助スクリプトは一時ディレクトリ(scratchpad)にあるが、無ければ data/questions と data/i18n/en を参照して作り直す。

## zh-hant
- 仕組み・UI・ページ・分野・区分・用語集(864)・比較(49)・図・コース: 完了
- 問題: 一部のみ。`npm run validate` の [zh-hant] 問題の欠落数が残り。data/i18n/zh-hant/questions/ に無い分野から続ける。
## ko / de
- 未着手
