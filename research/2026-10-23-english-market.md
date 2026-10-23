# 英語圏の検索をどう攻めるか(調査メモ)

- 作成: 2026-10-23(探す係)
- 使ったデータ: Search Console の書き出し(過去3か月・〜10-21。上位クエリ1,000件、上位ページ1,000件、国)。サイトが Google に出始めたのは 10-15 ごろなので、**実際には約7日分**
- 検索結果(SERP)の調査: 調査用ツールの Web 検索(米国向け)で29語。**Google の画面そのものではない**ため、AI による概要(AI Overview)や「他の人はこちらも質問」が出ているかは確かめられていない。順位の目安として使う
- 英語ページの中身: docs/en は作る係のビルドの途中で消えていて読めなかった。代わりに、ページの元データ(data/i18n/en/glossary.json・compare.json)と、ページを作るコード(tools/build.js)からタイトル・説明文・構成を読んだ

## 1. 結論(先に)

1. **英語の「大きな一般語」(dry etching・ICP・CMOS・FPGA など)は、いま中身を直しても上がらない。** 1ページ目は Wikipedia・IEEE・大学・機器メーカーで占められている。こちらの解説(約500〜650語・4節・FAQ 3問)は中身としては足りていて、差は**サイトの信頼(被リンク)と年齢**。追いかけない
2. **「英語の細かい語で5〜15位」の多くは、じつは英語ページではない。** tddb(4.2位)・atpg・dibl・false sharing・foup・nf3・sih4・fabless は、台湾・韓国・フランス・ドイツの人がアルファベットで調べ、繁体字・韓国語・仏語・独語のページが出ている。英語ページだけで見ると、tddb は23位、foup は18位、fabless は56位
3. **それでも英語ページのクリック率は低い。** 同じ作りの用語ページで、10位以内のクリック率は繁体字 2.4%(3,106表示で75クリック)に対し、英語 0.63%(959表示で6クリック)。理由の候補は3つある: ① 語の意味が別の分野にとられている(aba problem は自閉症の ABA 療法、mobile ions は化学の授業、global shutter はカメラ、ICP は分析化学)、② 英語の検索結果には AI による概要などの欄が多い(**未確認**)、③ Wikipedia がほぼ必ず上にある。②は Google の画面を見ないと確かめられない
4. **英語圏で勝ちやすいのは「論文・特許・掲示板しか出ていない、細かい技術用語」。** transition frequency・step coverage・GIDL・punch-through がそう。ここでは、解説の形になったページがほとんどない
5. 国別では、米国(49.7位)・英国(57.7位)より、インド(25.9位)・バングラデシュ(21.6位)・パキスタン(26.2位)・シンガポール(20.5位)・カナダ(26.7位)のほうが順位がよい。**英語圏の中で最初に届きやすいのは南アジアの学生**の可能性がある(国の数字には他の言語のページも入るので、確かめが必要)

## 2. 英語の検索語を、調べる目的で分ける

上位クエリ1,000件のうち、アルファベットだけの検索語(仏・独・蘭語を除く)は678語・6,465表示で、全体の77%。

| 目的 | 語数 | 表示 | 割合 | クリック | 平均順位 | 受けるページ |
|---|---|---|---|---|---|---|
| 語だけ(暗に「〇〇とは」) | 474 | 5,046 | 78% | 23 | 44.9 | 用語 /term/ |
| └ そのうち15位以内 | 154 | 1,575 | | 20 | | (多くは繁体字・韓国語などのページ) |
| └ 40位より下 | 248 | 2,878 | | 3 | | 一般語(用語) |
| 意味を聞く(what is・meaning・stand for) | 78 | 508 | 8% | 1 | 48.5 | 用語 |
| 製品・業者・買い物(equipment・services・wafers・camera) | 57 | 493 | 8% | 1 | 67.4 | なし(分野 /c/ に少し) |
| 比べる(vs・difference・A and B) | 43 | 272 | 4% | 1 | 40.9 | 比較 /compare/ |
| しくみ・工程(how・process・types of) | 14 | 79 | 1% | 0 | 65.5 | 用語の解説の節 |
| 計算・数値(wafer diameter・two's complement・Black's equation) | 9 | 56 | 1% | 1 | 44.1 | 計算ツール /tools/ |
| 試験・面接(interview・quiz) | 0 | 0 | 0% | — | — | /interview-questions/・問題 /q/ |
| サイト名など | 3 | 11 | 0% | 1 | 35.5 | トップ・about |

ページの種類ごと(英語、上位1,000ページの中): 用語 321ページ・9,036表示・43.6位・17クリック/比較 33・1,051・33.4位・1/問題 69・982・32.4位・4/分野 22・662・46.9位・1/計算ツール 2・24・13.9位・1。

- 比較ページの中では、技術の比較(rie-vs-icp-vs-ale 29.7位、euv-vs-duv 20位、キャッシュの3方式 18.5位、bga-vs-qfp-vs-qfn 13.8位、MRAM などの4種 7.6位)が、一般向けの比較(ssd-vs-hdd 43.6位、sem-vs-tem 47.4位)より上にいる
- 検索語にある比較(static vs dynamic power、jfet/bjt vs mosfet、vhdl vs verilog、lpddr vs ddr)は、もうほとんど比較ページがある
- 計算ツールと面接の質問集は、英語の検索にまだほとんど出ていない(表示はツール2ページで計24回、面接の質問集は0回)

## 3. 1ページ目に出ているサイト(29語)

表の「当サイト」は、Search Console の検索語の平均順位。( )の中は、その語で実際に出ているページ。

| 検索語 | 当サイト | 上位のサイト(上から) | 種類 | 上位にあって当サイトにないもの |
|---|---|---|---|---|
| dry etching | 72.7 | Wikipedia、IEEE、wevolver、xometry、universitywafer | 百科事典・業者の解説 | 信頼、図、ウェットとの比較記事 |
| inductively coupled plasma | 73.2 | Wikipedia ×2、IUPAC、Linde、分析会社 | 百科事典・分析化学 | **目的が違う**(分光分析の ICP-MS/OES。当サイトはエッチング用のプラズマ源) |
| atomic layer etching | 64.3 | Wikipedia、コロラド大、TU/e、SemiEngineering | 大学・研究・業界誌 | 論文の出典、研究の新しさ |
| ellipsometry | 73.8 | Wikipedia、IEEE、NIH、テュービンゲン大、機器業者 | 百科事典・大学 | 原理の図、測定例 |
| electrostatic discharge | 76.8 | Wikipedia、IEEE ×2、Lenze、Farnell、Georgia Tech | 百科事典・部品業者 | 対象が広い(安全・火災も)。信頼 |
| wire bonding | 78.6 | Wikipedia、ANFF、Sierra Circuits、AllPCB | 百科事典・装置/受託 | 写真、業者としての実績 |
| global shutter | 79 | camerajabber、Digital Camera World、Adorama、DPReview、Andor | カメラ雑誌・販売店 | **目的が違う**(写真・カメラ) |
| fpga | 73.5 | Arm、IEEE、Wikipedia、JLCPCB、Supermicro | 大手メーカー | ブランドの信頼 |
| uart | 85 | itwissen、O'Reilly、Rohde & Schwarz、Microchip の資料 | メーカーの資料・技術書 | 波形の図、データシート |
| nand flash | 70 | Alibaba(買い物)、IBM、TechTarget、Electronic Design | IT 大手・業界誌・買い物 | 信頼。買い物の目的も混ざる |
| automatic test equipment | 83.7 | Wikipedia、IEEE、Synopsys、Trenton Systems | 百科事典・業者 | 業者の製品情報 |
| multiplexer | 76.4 | Wikipedia、RS Online、大学の講義、Naukri | 百科事典・講義・教育 | 真理値表と回路図、動かせる図 |
| cmos | 69.2 | Wikipedia、IEEE ×2、IONOS、Lenovo、careers360 | 百科事典・PC 会社 | **目的が混ざる**(PC の CMOS 電池・BIOS) |
| sem vs tem | 48.9 | Lab Manager、Technology Networks、Thermo Fisher、JEOL、The Scientist | 機器メーカー・科学誌 | 実際の顕微鏡写真、メーカーの信頼 |
| ssd vs hdd | 36.9 | Which?、TechRadar、TechAdvisor、IONOS、Lenovo | 一般向け IT 誌 | **目的が違う**(何を買うか) |
| spi vs i2c vs uart | 85.3 | LinkedIn、Total Phase、Wevolver、Mischianti、Altium | 業者のブログ・個人の解説 | 配線図・波形図、ロジアナの例 |
| semiconductor cleanroom | 83.1 | imec、九州大、Waferworld、ASU の指針 | 研究機関・大学・業者 | 研究機関の信頼、写真 |
| cmos vs ttl | 10.2 | components101、CircuitDigest、Zbotic、Arduino フォーラム、RS | 電子工作の解説・掲示板 | ほぼ同じ形。**勝てる範囲** |
| aba problem | 8.1 | ABA 療法の記事、植物ホルモン、GitHub(並行処理) | 別の分野が中心 | **意味が違う人が多い**(計算機の話は少数) |
| mobile ions meaning | 7.5 | 化学の授業(GCSE)、arXiv、careers360 | 学校の化学 | **意味が違う**(当サイトはゲート酸化膜の汚染) |
| bss section | 11.0 | GNU binutils の資料、IAR の資料、OSDev フォーラム、Arm のフォーラム | 公式の資料・掲示板 | 公式の資料としての信頼 |
| prescaler | 10.9 | Wikipedia、DBpedia、Microchip の資料、Mouser(買い物) | 百科事典・メーカー | ほぼ同等。設定の計算例 |
| transition frequency transistor | 8.8 | 特許 ×2、arXiv、大学の研究室、掲示板(physicsforums・edaboard) | 特許・論文・掲示板 | **解説のページがほぼない → 勝てる** |
| step coverage | 7.1 | 特許 ×2、Cambridge、ECS の論文、Fraunhofer | 特許・論文 | **同上。勝てる** |
| gidl | 9.4 | arXiv、IEICE、特許、EPFL、KAIST | 論文・特許 | **同上**(英語ページは10.8位) |
| punch through (mosfet) | 7.1 | 特許 ×2、台湾の大学、EPFL | 特許・論文 | **同上** |
| tddb | 4.2 | SourceForge、PyPI、Wikipedia(曖昧さ回避) | 意味が混ざる | (出ているのは主に繁体字ページ。英語は23位) |
| atpg | 6.5 | Wikipedia、特許、arXiv、AnySilicon、Electronic Design | 百科事典・論文 | (出ているのは仏語・繁体字のページ) |
| copy on write | 8.5 | Wikipedia、StarWind、Computer Hope、GeeksforGeeks、個人ブログ | 百科事典・IT 解説 | GeeksforGeeks と競う。コード例 |
| false sharing | 9.5 | Wikipedia、Linux カーネルの資料、Intel の資料、Microsoft のブログ | 百科事典・公式の資料 | (出ているのは独語ページ) |
| vlsi interview questions | (データなし) | Glassdoor、Futurense、UPES、Naukri、Scribd | 求人・インドの教育サイト | 当サイトの /interview-questions/ はまだ出ていない |

読み取り:
- 40位より下の一般語で上にいるのは、**ほぼすべて信頼の高い組織**(Wikipedia・IEEE・大学・大手メーカー)。中身の量では負けていない
- 29語のうち7語(ICP・global shutter・ssd vs hdd・cmos・aba problem・mobile ions・ESD の一部)は、**検索する人の目的が当サイトの解説と違う**。このような語は、順位が上がってもクリックは増えにくい
- 5〜15位の英語ページで勝てそうなのは、**上位に特許・論文・掲示板しかない語**。ここでは、ちゃんとした解説ページが少ない

## 4. 英語ページの検索結果での見え方

- タイトル: 用語ページ1,348語のうち、個別のタイトルがあるのは61語。残りは決まった形 **「What is {term}? Meaning explained」**。説明文は解説の初めの約150字に「Includes n practice questions.」を足したもの
  - 個別のタイトルがある語(例「Transition Frequency (fT) of a Transistor Explained」「Step Coverage in Thin-Film Deposition: PVD vs. CVD vs. ALD」「ABA Problem in Lock-Free Programming: Cause and Fixes」)は、上位のサイトより具体的で、意味の取り違えも防いでいる。**見え方は上位のサイトより良い**
  - 決まった形のタイトル(ICP・dry etching・CMOS・FPGA・ellipsometry など)は Wikipedia と同じ「〇〇とは」の形。違いが出ない。ただ、この語のグループはそもそも信頼の差で負けているので、タイトルを変えても大きくは変わらないとみる
- 本文: 定義 → 解説4節(各100語ほど)→ 問題 → FAQ 3問 → 関係する比較・用語。約500〜650語。上位の Wikipedia(数千語・図・出典)と比べると短く、**図が少ない**(SVG の図は全部で45枚)。**出典の欄・書き手・更新日がない**。構造化データは DefinedTerm と FAQPage で、書き手は組織
- 英語の用語ページには「Japanese name: …」の行がある。日本語からの訳だと分かる。悪くはないが、英語の読み手には意味の薄い行
- 比較の英語タイトルは、162件中63件が65字を超え、一番長いものは136字(EDX vs SIMS)。検索結果では途中で切れる
- 10〜25位で表示が多いのに、個別のタイトルがない英語の用語: bit-line(120表示・13.8位)、lvs(62・18.2位)、idm(57・8.1位)、body-diode(56・10.1位)、kgd(42・14.7位)、flat-band-voltage、opc、inversion-layer、frame-pointer、feram、scan-test、locos など約45語

## 5. データは足りているか

**今決められること(根拠あり)**
- 一般語(40位より下)を中身の書き直しで追わない → 上位がすべて信頼の高い組織で、中身の量では負けていないため(3章)
- 意味の違う語(ICP の分析化学、カメラの global shutter、PC の CMOS、SSD の買い物)には合わせない → 当サイトの目的(半導体・計算機を学ぶ)から外れるため
- 英語の努力は、上位に特許・論文・掲示板しかない細かい技術語と、技術の比較に向ける → 英語ページがもう5〜15位にいて、競争が弱いため
- 「英語の細かい語で上位」という見方は直す。その一部は他の言語のページで、英語の成果ではない(1章の2)

**まだ決められないこと**
- 英語のクリック率が低い主な理由(意味の違い/AI による概要/Wikipedia)
- 英語ページが Google にどれだけ登録されているか(10-22 時点では、サイト全体でサイトマップ3.6万件のうち、Google が見つけたのは約6千件)
- 英語圏で、南アジアの学生(試験・面接)を主な読み手にすべきか

**判断を変えうる追加のデータ**(見る係が運営者の Chrome で取れるもの)
1. **Search Console の検索パフォーマンス: ページを「/en/ を含む」に絞った検索語の一覧(28日)と、国を米国・インドに絞った表**。検索語とページの組み合わせが分かり、英語ページの本当の順位とクリック率が出る。→ 10位以内で1,000表示以上あってもクリック率が1%未満のままなら、検索結果での見え方の問題とみて、タイトルを試す
2. **ページのインデックス登録を sitemaps/en.xml で絞った表**(登録済み/検出のみ/クロール済みで未登録)。→ 登録が半分に満たなければ、中身より先に、登録(内部リンク・薄いページの扱い)を直す
3. **リンクのレポート**(リンク元のサイトと、リンクされたページの上位)。→ リンク元が数サイトしかなければ「一般語は信頼で負けている」が確かになり、一般語は数か月追わない
4. **Google の実際の画面**(英語・米国の設定で10語ほど。例: transition frequency、step coverage、gidl、dry etching、cmos vs ttl、bss section)。AI による概要・「他の人はこちらも質問」・動画の欄が出るかを記録する。→ AI による概要がほぼ全部の語に出ているなら、クリックを追うより「AI の概要に引用されること」を目標にする
5. **GA4 で英語の訪問の質**(平均エンゲージメント時間、用語ページから quiz_start に進む割合、国別)。→ 時間が長く、クイズに進む人が多ければ、中身は合っている
6. **4〜6週間後に同じ書き出しをもう一度取る**。7日分では、新しいサイトの順位はまだ動く

## 6. 英語圏でやること(効果と手間の順)

1. **追加のデータを取る(5章の1〜4)** — 手間は小さく、コードは変えない。英語のクリック率が低い理由と、登録の状況で次の手が変わるため、最初にやる
2. **10〜25位で個別のタイトルがない英語の用語(約45語)に、タイトルと説明文を書く** — 手間は小〜中。根拠: 10-21 に書き直した47語は、多くが5〜15位にいる(transition-frequency 10.0位、punch-through 8.3位、bss-section 10.8位)。上位のサイトが特許・論文の語では、具体的なタイトルの差が出やすい。表示の多い順に bit-line・lvs・idm・body-diode・kgd・flat-band-voltage・opc・inversion-layer から。意味の取り違えが起きやすい語は、分野をタイトルに入れる
3. **英語の比較ページのタイトルを65字以内に縮める(63件)** — 手間は小。根拠: 長いと検索結果で切れる。比較は、英語の種類の中で順位が一番良い(33.4位)
4. **「勝てる」英語の用語ページに図か計算例を1つ足す**(transition frequency の fT と電流の関係、step coverage の断面、GIDL・punch-through のバンド図、prescaler の分周の計算など) — 手間は中。根拠: 上位の解説には図があり、当サイトは図が少ない。一般語ではなく、5〜15位の語から始める
5. **用語ページに出典(一次資料2〜3件)の欄をつくる** — 手間は中(データの形を変える)。根拠: 技術語の上位は論文・IEEE・大学で、出典を示すと信頼の差が少し縮まる。品質の指針(一次資料を使う)とも合う。まず英語の上位50語で試す
6. **被リンクを増やす(運営者が行う)** — 手間は中、効果は大きいが遅い。根拠: 一般語の上位はすべて信頼で勝っている。動かせる図・計算ツール・面接の質問集を、大学の講義の参考資料や技術の集まり(Reddit の r/chipdesign・r/ECE など)で、宣伝ではなく役に立つ資料として紹介する。結果はリンクのレポートで見る
7. **南アジアの学生向けの入口(要データ)** — 手間は大。インドなどの順位が米国より20位以上良いこと、VLSI 面接の上位がインドの教育サイトであることが根拠の候補。5章の1で、インドで出ている語が面接・試験寄りだと確かめてから、/interview-questions/ の英語の見直しや、試験の範囲に合わせた入口を検討する

## 7. やらないこと

- 一般語(ICP・dry etching・CMOS・FPGA・UART など)の解説を、Wikipedia に対抗して長く書き直すこと。信頼の差で負けているので、手間に見合わない
- 意味の違う語に合わせたページ(カメラの global shutter、分析用の ICP、SSD の買い方、PC の CMOS 電池)
- 7日分のデータで、英語のタイトルの形を一斉に変えること(繁体字のときと同じ理由。順位の良いページまで崩れるおそれがある)
- 表示を増やすために、英語の問題ページや薄いページを増やすこと(問題ページは1ページあたりの表示が用語の約20分の1)
- リンクの購入や、同じ宣伝をあちこちに貼ること
- アルファベットの検索語の順位を、そのまま「英語ページの成果」として扱うこと(ページの言語を必ず確かめる)

## 補足(作業の記録)

- 検索語の分け方は、語の形による自動の分類で、少しずれがある(例: interrupt handler が「製品」に入っている)。割合は目安
- 調査中、docs/ の言語ごとのフォルダ(en・zh-hant など)がビルドの途中で消えていた(OPERATIONS.md の 10-21 の記録と同じ状態)。作る係は、commit の前にビルドが終わっているかを確かめる
