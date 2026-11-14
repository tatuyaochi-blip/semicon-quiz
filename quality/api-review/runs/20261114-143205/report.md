# API 点検の結果 20261114-143205

この一覧は点検者(Claude API)の指摘の**候補**です。反映する前に1件ずつ確かめ、見送ったものは理由を quality/audit.md に残します。

- モデル: claude-opus-5-5(effort: high)、元のコミット: 72c5119ac83566b39910f2e41b3e2b2fe9e5e152
- 対象: articles、点検した項目: 82 / 依頼 82(7 分野)
- 実費: $9.08(見積もりの目安 $9.51、上限の計算 $32.57)
- 指摘: 299 件(P0 2、P1 26、P2 271)

## computer-basics

### how-computers-calculate-with-0-and-1 [P1 / calculation / 確度 high] en・body
> about 18.45 quintillion (18.45 × 1018)

- 問題: 10の18乗の上付き文字が失われ、「18.45 × 1018」(約18,690)と読める誤った数値になっている。正しくは 2⁶⁴ ≈ 1.845 × 10¹⁹ = 18.45 × 10¹⁸。この括弧書きは日本語版にない追加でもある。
- 案: about 18.45 quintillion (18.45 × 10¹⁸)

### how-computers-calculate-with-0-and-1 [P2 / translation / 確度 high] zh-hant・sources
> (講義ノート。2進数・2の補数・あふれ)

- 問題: 繁体字版の出典の欄の補足が日本語のまま残っている(講義ノート、2の補数、あふれ、1セルあたりのビット数 など)。
- 案: (課程講義筆記：二進位、二補數、溢位)のように、各出典の補足を繁體中文（台灣用語）に翻譯。

### how-computers-calculate-with-0-and-1 [P2 / other / 確度 medium / 要出典] zh-hant・sources
> 在替全世界文字編號的Unicode中，「中」是20013號。

- 問題: 繁体字版では例を「あ」から「中」(U+4E2D=20013、UTF-8で3バイト。値は正しい)に差し替えているが、出典の欄は Hiragana(U+3040〜U+309F)のコード表のままで、「中」の番号を裏付けていない。
- 案: 出典に The Unicode Standard: CJK Unified Ideographs (U+4E00–U+9FFF) 的碼表を追加するか、本文の例を日本語版と同じ「あ」(12354號)にそろえる。

### how-cpu-cache-works [P2 / translation / 確度 high] en・body
> The effective access time formula used in many IT certification exams works this way

- 問題: 日本語は「基本情報技術者試験では」と試験を特定しています。英訳は「多くのIT資格試験」に広げており、日本語にない主張になっています。
- 案: Japan's Fundamental Information Technology Engineer Examination calls this average the "effective access time" and uses this formula:

### how-cpu-cache-works [P2 / translation / 確度 high] zh-hant・body
> 資訊類考試常用的有效存取時間公式如下。

- 問題: 日本語は基本情報技術者試験に限った説明です。訳では「資訊類考試」全般に広げています。
- 案: 日本的基本資訊技術人員考試把這個平均稱為「有效存取時間」，用下面的公式求得。

### how-cpu-cache-works [P2 / terminology / 確度 high] zh-hant・body
> 這稱為{{term:セットアソシアティブ方式|集合關聯}}方式（也稱組相聯）

- 問題: 用語集の繁体字の項目名は「組相聯快取」と「全相聯快取」です。本文では「集合關聯」「完全關聯方式」を主に使っています。同じ記事の中の「直接映射、組相聯、全相聯的差異」とも呼び方がそろっていません。
- 案: 這稱為{{term:セットアソシアティブ方式|組相聯}}方式。図と本文の「集合關聯」を「組相聯」に、「完全關聯方式」を「全相聯方式」に統一する。

### how-cpu-cache-works [P2 / overgeneralization / 確度 medium] ja・description
> メモリのデータを64バイトずつ写しておき

- 問題: 説明文では、ラインの大きさを64バイトと言い切っています。本文では「x86や多くのArmでは64バイト、AppleのMシリーズではmacOSが128バイトと報告」と条件を付けており、説明文と本文が食い違います。en・zh-hant の説明文も同じです。
- 案: メモリのデータを、多くのCPUでは64バイトずつまとめて写しておき

### how-cpu-cache-works [P2 / overgeneralization / 確度 medium] ja・body
> キャッシュメモリは、CPUと同じチップの上に置いた、小さくて速い記憶場所です。

- 問題: 冒頭の文と説明文で、キャッシュを「CPUと同じチップの上」にあるものと定義しています。本文の後半では「ふつう」と和らげており、9800X3Dのように別のチップを重ねる例も挙げています。冒頭の定義はこれと食い違います。用語集の説明文も「CPUの近くに置く」です。
- 案: キャッシュメモリは、CPUのすぐ近く(今はふつう同じチップの上)に置いた、小さくて速い記憶場所です。

### how-cpu-cache-works [P2 / terminology / 確度 medium] zh-hant・body
> 寫入配置與不寫入配置的差異

- 問題: 用語集では、読み込まずに下の階層へ直接書く方式を「非寫入配置」と呼んでいます。本文の「不寫入配置」と呼び方が違います。
- 案: 寫入配置與非寫入配置的差異

### how-cpu-cache-works [P2 / overgeneralization / 確度 low / 要出典] ja・body
> AppleのMシリーズでは、macOSが128バイトと報告します

- 問題: 出典の Go のコミットが裏付けているのは Apple M1 の値だけです。本文ではMシリーズ全体に広げています。M2 以降も同じ値かは、出典で確かめる必要があります。
- 案: Apple M1 では、macOSが128バイトと報告します(出典で確認できた範囲)

### what-is-a-cpu [P2 / translation / 確度 medium] en・description
> A CPU fetches a program's instructions one by one and runs billions of them a second.

- 問題: 英語の説明文は日本語の説明文と内容が違う。日本語にない「1秒に数十億個」が足され、日本語にある「計算や比較をくり返す」が落ちている。本文にはある内容なので誤りではないが、言語間で説明文がずれている。
- 案: A CPU (central processing unit) fetches a program's instructions one by one and repeats calculations and comparisons. What clock speed and core count mean, CPU vs. GPU, and x86 vs. Arm, explained simply.

### what-is-a-logic-gate [P1 / translation / 確度 high] zh-hant・sources
> (2017年春): 3.2 CMOS Gates(CMOSでのゲートの作り方)

- 問題: 繁体字版の出典の欄で、日本語の注記が訳されずに残っています。例は「CMOSでのゲートの作り方」「2入力NANDゲート4個入りのIC」「論理をすべて1種類の単純なICで作った理由」などです。
- 案: 注記を繁體中文に訳す。例:「(2017年春季): 3.2 CMOS Gates(以CMOS製作邏輯閘的方法)」「SN74HC00(內含4個2輸入NAND閘的IC)產品頁面」「SNx4HC00 … 資料手冊(SCLS181；輸入與輸出的電壓範圍、傳播延遲)」。

### what-is-a-logic-gate [P2 / overgeneralization / 確度 medium] all・body
> 通るゲートの数がいちばん多く、遅れがいちばん大きい道筋が、クロックをどこまで速くできるかを決めます。

- 問題: クリティカルパスを決めるのは遅れの合計です。ゲートの段数ではありません。段数が少なくても、配線やゲートの遅れが大きい道筋がいちばん遅いことがあります。この書き方では「段数が最多の道＝クリティカルパス」と誤解されやすいです。en・zh-hant も同じ書き方です。
- 案: 「遅れの合計がいちばん大きい道筋(多くはゲートの段数が多い道筋)が、クロックをどこまで速くできるかを決めます。」とし、en・zh-hant も同じように直す。

### what-is-an-asic [P1 / terminology / 確度 medium] zh-hant・title
> ASIC是什麼？特定應用積體電路與CPU、FPGA的差異

- 問題: 用語集の zh-hant の項目名は「ASIC(特殊應用積體電路)」なのに、題・説明文・本文では「特定應用積體電路」を主に使い、本文では「特殊應用積體電路」を別訳として扱っている。台湾では「特殊應用積體電路」が一般的な訳で、用語集とも食い違う。
- 案: 題を「ASIC是什麼？特殊應用積體電路與CPU、FPGA的差異」とし、説明文も「ASIC（特殊應用積體電路）」に、本文を「中文稱為「特殊應用積體電路」，也譯作「特定應用積體電路」」に改める。

### what-is-an-asic [P2 / overclaim / 確度 medium] en・description
> why it pays off only in volume, how it is made, and ASIC vs FPGA

- 問題: 日本語の説明文は「大量に作るほど得になる」なのに、英訳は「only in volume(大量のときだけ)」と言い切りを強めている。日本語にある ASSP との違いも訳で落ちている。
- 案: Learn why it beats a CPU on speed and power, why it pays off more the more you make, how it is made, and how it differs from FPGAs and ASSPs.

### what-is-an-asic [P2 / translation / 確度 low] all・body
> NREを30億円、1個を作る費用を500円とします。

- 問題: 仮の計算例の金額が、en では $30 million・$5、zh-hant では新台幣6億元・100元と、言語ごとに別の数値になっている。各言語の検算は合っている(約30万円/800円、約$3,000/$8、約6萬/160元)が、サイトの基準「訳では数値・単位を変えない」に反する。意図した現地化かどうかの確認が必要。
- 案: 意図した現地化なら qa-ignore 等に理由を残す。そうでなければ、全言語で同じ通貨・数値(例: 30億円・500円)にそろえる。

### what-is-an-asic [P2 / missing-condition / 確度 low / 要出典] ja・sources
> Canaan社は、2013年1月にASICを使った採掘機を出荷し、それが世界で最初だったと説明しています。

- 問題: 本文の「2013年1月」と「世界で最初」は、出典欄の注記(2013年に最初の出荷をAvalonの名前で行った)には書かれていない。「最初の出荷」が同社の最初なのか世界初なのかも読み分けられない。出典(Company Profile)には日付・確認時点も書かれていない。Form 20-F などで月と「world's first」の記述を確かめる必要がある。
- 案: 出典の注記を「2013年1月、創業チームが世界で最初のASICを使った採掘機をAvalonの名前で出荷したとする同社の説明(確認日: 20xx年xx月)」のように、本文の主張と合わせて書く。確認できなければ本文の「1月」「世界で最初」を外す。

### what-is-an-fpga [P2 / missing-condition / 確度 high] all・body
> 面積 約35倍、遅れ 約3〜4倍、動的な電力 約14倍

- 問題: 「数字で見る」の表では、35倍・14倍が「LUTとフリップフロップだけで作った場合」の値だという条件が抜けている。この表だけを読むと、一般的な差のように読める。ハードブロックを使うと、面積は約18倍まで縮む。
- 案: 「面積 約35倍(LUTとフリップフロップだけの場合。ハードブロックを使うと約18倍)」のように条件を添える。en・zh-hant も同様に直す。

### what-is-an-fpga [P2 / translation / 確度 high] zh-hant・body
> 這種能用設定改變連接的繞線，稱為可程式化繞線。

- 問題: 日本語の原文にない文(用語の定義)が、繁体字の訳だけに足されている。
- 案: この文を削除する。必要なら、まず日本語の原文に加え、全言語をそろえる。

### what-is-an-fpga [P2 / overgeneralization / 確度 medium] all・description
> 作ったあとで中の論理回路を何度でも組み替えられるチップです

- 問題: 説明文と本文の冒頭が、FPGA全体を「何度でも」組み替えられると言い切っている。本文の後半では、一度しか書き込めないアンチヒューズ方式の製品があると書いており、説明文と食い違う。フラッシュ型の製品には書き換え回数の上限もある。
- 案: 「作ったあとで中の論理回路を組み替えられるチップです(多くの製品は何度でも書き換え可能)」のように限定する。en・zh-hant の description と本文の冒頭も同じように直す。

### what-is-an-fpga [P2 / missing-condition / 確度 medium / 要出典] all・body
> 1台あたりの処理量が95%増えています

- 問題: Catapult の論文の95%は、遅延(レイテンシ)の条件をそろえたうえでの、順位づけの処理量の向上だったと記憶している。条件を書かないと、単純に処理量が倍近くになったように読める。論文の要旨で条件を確かめれば決着する。
- 案: 「同じ程度の遅延のまま、1台あたりの順位づけの処理量が95%増えています」のように条件を加える(論文で確認したうえで)。

### what-is-an-fpga [P2 / overclaim / 確度 low] all・body
> ASICなら2点を最短の配線で結べますが

- 問題: ASICの配線も、混み具合や配線層の制約を受ける。必ず最短で結べるわけではないので、言い過ぎに読める。
- 案: 「ASICなら2点を必要な分だけの短い配線で直接結べますが」のように和らげる。en・zh-hant も同様に直す。

### what-is-an-npu [P2 / missing-condition / 確度 medium] all・body
> 文章を作るAIは、1語(正確にはトークン)を作るたびに、ほぼすべての重みを読み出します。

- 問題: この見積もりは、1トークンずつ生成するデコードの段階で、バッチが1、すべての重みを使う密なモデルの場合に限って成り立つ。入力をまとめて処理するプリフィルや、バッチを大きくした場合は、1回の読み出しで多くのトークンを計算するので、演算律速に近づく。この条件が書かれていないため、「文章のAIは常にメモリ律速」と一般化して読まれるおそれがある。
- 案: 「1人分の文章を1語ずつ作る段階(デコード、バッチ1)では、1語を作るたびにほぼすべての重みを読み出します」のように条件を足す。訳(en・zh-hant)にも同じ条件を入れる。

### what-is-an-npu [P2 / terminology / 確度 medium] en・body
> 32-bit decimal multiply

- 問題: 日本語の「小数」(浮動小数点数)を decimal と訳している。英語の decimal は10進数(10進浮動小数点など)を連想させ、FP32 が2進の浮動小数点であることと食い違う。表の「32-bit decimal」、本文の「numbers with a decimal point」「16-bit decimal numbers」も同じ。
- 案: "32-bit floating-point multiply" / "32-bit floating-point numbers (FP32)" / "16-bit floating-point numbers (FP16)" に統一する。

### what-is-an-npu [P2 / terminology / 確度 medium] zh-hant・body
> 32位元小數乘法

- 問題: 台湾の用語では、FP32・FP16 は一般に「浮點數」と呼ぶ。「小數」だと10進の小数のように読める。
- 案: 「32位元浮點數乘法」「16位元浮點數（FP16）」のように「浮點數」に統一する(初出に「有小數點的數」と補足してもよい)。

### what-is-an-npu [P2 / terminology / 確度 medium] zh-hant・body
> （精確來說是token）

- 問題: 用語集の zh-hant(KVキャッシュ・プリフィルなど)では token を「詞元」と訳しているのに、ここでは英語の token のまま書いており、サイト内の訳語がそろっていない。
- 案: 「（精確來說是詞元，token）」とする。

### what-is-an-npu [P2 / other / 確度 low / 要出典] all・sources
> サービスを提供する側の計算の費用が減る

- 問題: 本文では「Googleの開発者向けの資料が挙げる主な利点」として4つを並べているが、出典の欄の Gemini Nano の要約には、データを外に送らない・オフライン・待ち時間なしの3点しかなく、費用の点が裏付けられていない。Android Developers の Gemini Nano のページに費用の利点が書かれているかを確かめれば決着する。
- 案: ページに費用の記述があれば、出典の要約に「提供側の費用」を足す。なければ、この項目を削るか、Googleの資料が挙げた利点とは分けて書く。

### what-is-risc-v [P1 / overclaim / 確度 medium] all・body
> 実際は、基本の命令しか使わないソフトなら動きますが

- 問題: 「基本の命令だけなら、どのRISC-VのCPUでも動く」と読める。実際は、RV32I向けの機械語はRV64IのCPUでそのまま動くとは限らない(同じ符号でも演算の幅が違う)。レジスタが16本のRV32E向けとの違いもある。誤解を正す段落なのに、別の誤解を生む。
- 案: 「同じ基本(例: RV32I どうし)の命令だけを使うソフトなら動きますが、32ビットと64ビットの基本は別物で、拡張を使うソフトは…」のように、基本の種類がそろう条件を足す(en・zh-hant も同様)。

### what-is-risc-v [P2 / overgeneralization / 確度 high] all・body
> 拡張には、アルファベット1文字の名前がついています。

- 問題: 1文字の名前を持つのはM・A・F・D・C・Vなどの代表的な拡張だけ。ビット操作(Zba・Zbbなど)や暗号(Zk*)のように、多くの拡張は複数文字の名前を持つ。図の説明でもこれらの拡張に触れているので、本文と食い違う。
- 案: 「代表的な拡張には、アルファベット1文字の名前がついています(Zbaのような長い名前の拡張もあります)。」とする。en: "The main extensions are named with a single letter (others have longer names such as Zba)." zh-hant:「代表性的擴充以一個英文字母命名（也有像Zba這樣較長名稱的擴充）。」

### what-is-risc-v [P2 / overgeneralization / 確度 medium / 要出典] all・figure
> 基本: RV32I または RV64I / 基本の命令セット(下)はどのRISC-VのCPUにもあり

- 問題: 基本の命令セットにはRV32I・RV64Iのほかに、組み込み向けのRV32E(RV64E)やRV128Iもある。図と説明をあわせると「どのCPUもRV32IかRV64Iを持つ」と読めるが、RV32Eだけを持つ小さなマイコンもある。仕様書の基本の一覧で確かめれば決着する。
- 案: 説明を「基本の命令セット(下)は、どのRISC-VのCPUにも1つあります(ほかにレジスタを減らしたRV32Eなどもあります)」のように直す。

### why-gpus-for-ai [P0 / calculation / 確度 high] ja・body
> 規格の数字(1秒に4,800回、1回に8バイト)から、1枚で1秒に38.4GB

- 問題: DDR5-4800の転送回数は1秒に4,800回ではなく、約48億回(4,800百万回、4800 MT/s)です。書かれた数字どおりに掛けると4,800×8=38,400バイトで、38.4GBになりません。結果の38.4GBは正しいのに、根拠の桁が100万倍ずれています。
- 案: 規格の数字(1秒に48億回(4,800百万回)、1回に8バイト)から、1枚で1秒に38.4GB

### why-gpus-for-ai [P0 / calculation / 確度 high] zh-hant・body
> 從規格的數字（每秒4,800次，每次8位元組），1條是每秒38.4GB

- 問題: 日本語と同じ誤りです。4800 MT/sは1秒に48億回で、4,800回ではありません。書かれた数字では38.4GBになりません(英語版は「4,800 million」で正しい)。
- 案: 從規格的數字（每秒48億次（4,800百萬次），每次8位元組），1條是每秒38.4GB

### why-gpus-for-ai [P1 / inconsistency / 確度 medium] ja・body
> ## 学習と推論: 計算の量はけた違い

- 問題: 見出しは学習と推論の計算量が桁違いだと読めます。しかし本文では、1語あたりの学習の計算は推論の約3倍としています。3倍は桁違いではないので、見出しと本文が食い違い、誤解を招きます。
- 案: ## 学習と推論: どちらも計算の量は膨大

### why-gpus-for-ai [P1 / inconsistency / 確度 medium] zh-hant・body
> ## 訓練與推論：計算量相差好幾個數量級

- 問題: 「好幾個數量級の差」と、日本語よりさらに強く言い切っています。本文の「1語あたり約3倍」と矛盾します。英語版の見出しは「a huge amount of math」で、意味も一致していません。
- 案: ## 訓練與推論：計算量都非常龐大

### why-gpus-for-ai [P2 / translation / 確度 medium] zh-hant・body
> 所以排出大量計算電路同時進行，效率最好。

- 問題: 日本語の「効率的です」が、訳で「効率が最も良い」という最上級に強められています。
- 案: 所以排出大量計算電路同時進行，效率較高。

### why-gpus-for-ai [P2 / other / 確度 medium / 要出典] all・sources
> NVIDIA: H100 GPU(製品ページ・仕様)

- 問題: H100の帯域3.35TB/s、16ビットで約1,000兆回、FP32で約67兆回などの製品の性能を、日付のない製品ページで裏付けています。仕様のページは版によって変わることがあるため、いつ確認したかが分かりません。
- 案: 出典に閲覧日、または仕様書(データシート)の版・日付を書き添える。例: 「NVIDIA H100 Tensor Core GPU データシート(20xx年x月閲覧)」

### why-gpus-for-ai [P2 / overgeneralization / 確度 low] ja・body
> NPUは推論に絞り、少ない電力で動くように作られているので

- 問題: NPUがすべて推論専用だと言い切っています。スマホやパソコンのNPUは一般に推論が中心ですが、学習の一部に対応する製品もあるため、「一般に」などの限定が必要です。
- 案: スマホなどのNPUは一般に推論に絞り、少ない電力で動くように作られているので

## everyday-chips

### chips-inside-a-smartphone [P2 / overgeneralization / 確度 medium] all・body
> 電波を強める増幅器はガリウムヒ素、フィルタは圧電の材料と

- 問題: 前の節では「GaAsのチップが多く使われています」としていたのに、ここでは増幅器はGaAsと言い切っている。出典の要旨は「6GHz以下の携帯端末の電力増幅器の主力」で、すべてではない(CMOSやSiGeの増幅器もある)。節どうしで食い違い、言い過ぎになっている。
- 案: 「電波を強める増幅器には多くの場合ガリウムヒ素、フィルタには圧電の材料と」のように「多くの場合」を足す。en: "The amplifier that strengthens radio waves often uses gallium arsenide..."、zh-hant: 「增強電波的放大器多半用砷化鎵」。

### chips-inside-a-smartphone [P2 / missing-condition / 確度 medium / 要出典] all・body
> 高い周波数で、大きな出力を効率よく出しやすいからです(2026年の国際学会IMSの発表要旨による)

- 問題: 出典の欄の要約は「GaAs HBTは6GHz以下の携帯端末の電力増幅器の主力」で、本文では「6GHz以下」の条件が落ちている。また、理由(高周波で大出力を効率よく)がこの要旨に書かれているかは出典の欄から確かめられない。出典の欄には要旨の題・著者もなく、どの資料か特定できない。
- 案: 本文に「6GHz以下の携帯電話の電波では」と条件を足す。出典の欄に要旨の題と著者を書き、理由の記述がその要旨にあるかを確かめる。なければ理由は別の出典で裏付けるか、断定を弱める。

### chips-inside-a-smartphone [P2 / other / 確度 low / 要出典] all・body
> 使い分けの境目は資料によって幅があり、1.5〜2.5GHzほどです。

- 問題: 出典の欄(Wiley)の値はSAWが約600MHz〜2GHz、BAWが約1.5〜6GHzで、重なりは1.5〜2GHz。「2.5GHz」を裏付ける資料が出典の欄にない。
- 案: 出典どおり「1.5〜2GHzほど」とするか、2.5GHzの根拠となる資料を出典の欄に足す。

### chips-inside-an-electric-car [P2 / missing-condition / 確度 medium] all・body
> アクセルを戻すと、ブレーキを踏まなくても、すっと速度が落ちます。

- 問題: 回生の強さは車種や運転モードで変わります。回生を弱める設定や、惰性で走る(コースティング)設定の車もあるため、すべてのEVでアクセルを戻すと必ず強く減速するように読めます。後半の「アクセルを戻すだけで止まれる場面が多い」も同じで、ワンペダルのモードが前提であることが書かれていません。
- 案: 「多くのEVでは、アクセルを戻すと…速度が落ちます(回生の強さは車種や設定で変わります)」のように条件を足す。誤解の項も「ワンペダルなど回生を強くする設定では」と添える。

### chips-inside-an-electric-car [P2 / desc-mismatch / 確度 medium] all・body
> スイッチを入り切りする電極(ゲート)を、大きめの電流で素早く操作する必要があるからです。

- 問題: 用語集のゲートドライバの説明は「適切な電圧と十分な電流で駆動」です。本文は電流だけを理由に挙げています。実際には、マイコンの出力(3.3 Vなど)ではゲートに必要な電圧(IGBTやSiCでは十数ボルト、負の電圧も使う)が足りないことも、ゲートドライバが要る大きな理由です。
- 案: 「ゲートを、マイコンより高い電圧と大きめの電流で素早く操作する必要があるからです」とする(en・zh-hant も同様に電圧を足す)。

### chips-inside-an-electric-car [P2 / translation / 確度 medium] en・body
> Most EV batteries are in the 400-volt class

- 問題: 日本語は「多くのEV」で、過半数とまでは言っていません。英語の "Most" は主張を強めています。
- 案: Many EV batteries are in the 400-volt class (Bosch's glossary).

### chips-inside-an-electric-car [P2 / missing-condition / 確度 low / 要出典] all・body
> 多くのEVの電池は、400ボルト級です(Boschの用語解説)。

- 問題: 800 V化が進んでいるため、この割合は時期で変わる内容です。いつの時点の話かが書かれておらず、出典の欄の Bosch の用語解説にも日付がありません。出典でこの記述が裏付けられているか、何年時点かを確かめる必要があります。
- 案: 「執筆時点(20xx年)で、多くのEVの電池は400ボルト級です」のように時期を書き、出典に確認日を足す。

### chips-inside-an-electric-car [P2 / inconsistency / 確度 low] all・body
> 1台に1,300個使うEVを100万台作ると

- 問題: リンク先の用語「ゼロディフェクト」の説明文は「1台に数千個の半導体」です。本文の約1,300個(P3の分析)と桁の印象が食い違います。数え方の違い(受動部品やセンサを含むかなど)によるものなら、どちらかに注記が必要です。
- 案: 用語集の説明文を「1台に千個を超える半導体」のようにそろえるか、本文に「数え方で数千個とする推定もある」と添える。

### how-ac-adapters-work [P2 / missing-condition / 確度 medium] all・body
> 入力が100ボルトでも240ボルトでも同じ出力が出るのも、この調整のおかげです。

- 問題: 同じ出力になるのは、入力の範囲が100〜240 Vに対応した設計(部品の耐圧など)の製品だけです。フィードバックがあればどの充電器でも240 Vで使える、と誤解されるおそれがあります。直前で変圧器式を海外で使う危険を書いているので、この条件は特に必要です。
- 案: 「入力100〜240 V対応と表示された充電器なら、入力が100ボルトでも240ボルトでも同じ出力が出ます。これもこの調整のおかげです(対応する入力の範囲はラベルで確かめましょう)。」(en・zh-hant も同様に条件を足す)

### how-ac-adapters-work [P2 / translation / 確度 medium] en・description
> switches it on and off tens of thousands of times a second, and uses a small transformer to make 5 V.

- 問題: 日本語の説明文にある「以上」が落ちています。また、日本語の説明文の後半(小さく軽くなった理由・効率と熱・安全のための絶縁を解説する)が英語では省かれ、言語間で内容がそろっていません。
- 案: "A charger turns AC from the outlet into DC, switches it on and off tens of thousands of times a second or more, and uses a small transformer to make 5 V or other voltages. Learn why chargers became smaller and lighter than old heavy boxes, along with efficiency, heat and isolation for safety."

### how-ac-adapters-work [P2 / overclaim / 確度 low / 要出典] all・body
> EUでは2028年12月から、より厳しい新しい規則に替わります(EU規則2025/2052)。

- 問題: 出典の欄の 2025/2052 の注記には「2028年12月14日から適用され、2019/1782を置き換える」としか書かれていません。「より厳しい」の裏付けがありません。2025/2052 の Annex で、無負荷時の電力や効率の値が 2019/1782 より厳しいかどうかを確かめる必要があります。
- 案: 「EUでは2028年12月から、新しい規則に替わります(EU規則2025/2052)。」とする。または、厳しくなる具体的な値を出典で確かめて書き、出典の欄の注記にもその値を足す。

### how-ac-adapters-work [P2 / factual / 確度 low] ja・body
> 変圧器の芯に、いつも電流を流しているからです。

- 問題: いつも流れているのは一次側の巻線の電流(励磁電流)です。この電流で芯と巻線に損失が出て温まります。「芯に電流を流す」という言い方では、芯が電線のように電流の通り道になっていると誤解されるおそれがあります。
- 案: 「何もつながなくても変圧器の一次側のコイルに電流が流れ続け、芯と線で熱が出るからです。」

### how-ac-adapters-work [P2 / missing-condition / 確度 low / 要出典] all・body
> 今の充電器の効率は、昔よりずっと高くなりました。

- 問題: 今の充電器の効率の目安(90%前後)を裏付ける出典が、出典の欄にありません。よくある誤解の節の「効率が90%を超えても」も、典型的な値のように読めます。時期と根拠(例: DOE Level VI の平均効率の基準や製品の資料)を確かめる必要があります。
- 案: 出典(例: DOE Level VI の平均効率の要件)を出典の欄に足し、「例えば、効率90%の充電器で…」のように、仮の値であることがわかる書き方にそろえる。

### how-chips-are-cooled [P2 / overgeneralization / 確度 medium] all・body
> 熱はチップから金属のふた、ヒートシンク、空気や液体へと順に受け渡され

- 問題: 冒頭と description では、熱は必ず金属のふた(ヒートスプレッダ)を通るように書かれている。実際には、ノートPCのCPU、GPU、スマホのSoCなど、ふたのない「むき出しのダイ」に冷却器を直接当てる構成が多い。本文の例はデスクトップCPUなので、ほかの機器にも当てはまると誤解させるおそれがある。
- 案: 「熱はチップから(デスクトップのCPUなどでは金属のふたを経て)ヒートシンク、空気や液体へと順に受け渡され」とし、熱の通り道の節に「ノートパソコンやGPUでは、ふたがなく、ダイに直接冷却器を当てるものも多くあります」と一文を足す。en・zh-hant にも同じ条件を入れる。

### how-chips-are-cooled [P2 / other / 確度 low / 要出典] all・sources
> 2022年のRTX 4090は450ワットでした

- 問題: RTX 4090 の発売年(2022年)を裏付ける出典がない。出典の欄の「Compare GeForce Graphics Cards」の説明には、450 W の値しか書かれていない。発売年は時期の情報なので、出典で確かめられるようにしたい。
- 案: RTX 4090 の発売年が書かれた NVIDIA の資料(製品ページや発表記事)を出典に加える。または出典の説明に「2022年10月発売」と書き、その記述を確かめる。

### how-displays-work [P2 / translation / 確度 high] en・body
> A person with a visual acuity of 1.0 (often written 20/20)

- 問題: 日本語にない補足「20/20」が英語訳だけに足されています。換算としてはおおむね正しいものの、訳で主張を足さないという基準に反します。
- 案: Keep it only if the Japanese is updated to match (e.g., 「視力1.0(英語圏の20/20にほぼ相当)」); otherwise remove "(often written 20/20)".

### how-displays-work [P2 / overgeneralization / 確度 medium] all・body
> 赤・緑・青は、それぞれ別の材料で光らせます。

- 問題: スマホの有機ELには当てはまりますが、すべての有機ELではありません。有機ELテレビには、白く光る有機ELにカラーフィルタを重ねる方式や、青い有機ELと量子ドットで色を変える方式もあります。記事は有機ELテレビにも触れているので、どの有機ELにも当てはまると読めます。
- 案: ja: 「スマホの有機ELでは、赤・緑・青をそれぞれ別の材料で光らせるのがふつうです(テレビには、白や青の光をフィルタなどで色に変える方式もあります)。」 en/zh-hant も同じ条件を足す。

### how-displays-work [P2 / other / 確度 low / 要出典] all・sources
> LTPOは、画素の切り替えにLTPS、駆動に酸化物(IGZO)のTFTを組み合わせる

- 問題: 出典の要約で、LTPS と酸化物の TFT の役割の分け方が、一般的な説明と逆になっている可能性があります。一般的な説明では、電荷を保つスイッチに酸化物(漏れが少ない)、駆動に LTPS(移動度が高い)を使います。本文は役割を特定していないので本文の誤りではありませんが、出典の要約を誤って読む人がいるかもしれません。iFixit の記事の原文と、Apple の特許などの一次資料を照合すれば決着します。
- 案: 出典の原文を確かめて、要約を直す。確かめられない場合は、要約を「LTPSと酸化物(IGZO)のTFTを組み合わせる」にとどめる。

### how-dram-works [P2 / missing-condition / 確度 medium] all・body
> MicronのDDR4のチップの例では、1つの行は8,192ビット(1KB)あります

- 問題: 出典では、ページ1KBは8Gbのx8品の値です。x16品ではページが2KBになります。本文では、データ幅の条件(x8)が書かれていません。
- 案: 「MicronのDDR4の8Gb・x8のチップの例では、1つの行は8,192ビット(1KB)あります」とする(en・zh-hantも同様に直す)。

### how-dram-works [P2 / inconsistency / 確度 medium] ja・body
> 同じ行を何度も開くと、隣の行の中身が変わる現象

- 問題: 用語集の説明文は「短時間に何度も活性化すると」としています。本文はこの条件を落とし、「変わる」と言い切っています。これでは、必ず中身が変わるように読めます。
- 案: 「同じ行を短時間に何度も開くと、隣の行の中身が変わることがある現象」とする(zh-hantも同様に直す)。

### how-dram-works [P2 / overclaim / 確度 medium] all・body
> (DRAMのセルの正式な呼び名)

- 問題: 1T1Cは、DRAMのセルの型の一つを指す名前です。DRAMのセル全般の「正式な呼び名」ではありません。本文でも、Intel 1103は3トランジスタのセルだと説明しています。
- 案: 「(今のDRAMで使われる、トランジスタ1個とコンデンサ1個のセルの呼び名)」とする。

### how-dram-works [P2 / factual / 確度 low / 要出典] all・body
> 速さは、それぞれの規格が最初に決めた範囲です

- 問題: DDR4の「1,600〜3,200MT/s」を「規格が最初に決めた範囲」としていますが、2012年のJEDECの発表では3.2GT/sは「当初の最大の目標」とされていました。最初の版(JESD79-4)で定められた速度区分が2,400MT/sまでで、3,200MT/sは後の改訂で加わった可能性があります。JESD79-4の初版と改訂版の速度区分を確かめれば決着します。
- 案: DDR4の欄を「1,600〜3,200MT/s(3,200は当初の目標で、後の改訂で規定)」のようにするか、注記を「速さは、各規格が発表時に示した範囲です」に改める。

### how-gps-works [P2 / overgeneralization / 確度 high] all・body
> GPSの民間向けの電波では、1,023けたの符号を、1000分の1秒ごとに繰り返します。

- 問題: 1,023チップ・1 msの符号はL1 C/Aの値です。民間向けの信号にはL2C・L5・L1Cもあり、たとえばL5の符号は10,230チップです。L5は記事の後半にも出てきます。このままでは、すべての民間信号に当てはまるように読めます。直前の「地上で受ける強さの最低値 −128.5 dBm」も、出典ではL1 C/Aの値です。
- 案: 「昔から使われている民間向けの電波(L1 C/A)では、1,023けたの符号を…」とする。受信電力の文も「L1 C/Aの電波について、GPSの仕様で決められた…」と信号の種類を明記する(en・zh-hant も同様に直す)。

### how-gps-works [P2 / overclaim / 確度 medium] en・body
> Your location reaches other people or companies only when an app sends it over the mobile network or Wi-Fi.

- 問題: 日本語にない「only」が足されています。また、OSの位置情報サービスは、Wi-Fiや基地局を使った測位のためにデータを送ることがあります。アプリが送るときだけに限ると、言い過ぎです。
- 案: Your location reaches other people or companies when an app (or the phone's location service) sends it over the mobile network or Wi-Fi.

### how-gps-works [P2 / terminology / 確度 medium] zh-hant・body
> 周圍Wi-Fi主機和行動電話基地台的位置資料

- 問題: 「Wi-Fi主機」は台湾の一般的な用語ではありません。用語集の Wi-Fi の項目では「存取點」を使っており、表記がそろっていません。後ろの「收得到哪些主機的電波」も同じです。
- 案: 「周圍Wi-Fi存取點和行動電話基地台的位置資料」「收得到哪些存取點的電波」とする。

### how-gps-works [P2 / other / 確度 low] en・body
> or 10−16 watts

- 問題: 上付き文字が失われて、「10−16」と表示されている可能性があります。そうだと、10の−16乗ではなく引き算や範囲に読めます。表にある「About 10−16 watts」、zh-hant の「10−16瓦」も同じです。実際のページで上付き文字が表示されているかを確かめれば決着します。
- 案: 上付きの表示を確かめる。表示されない場合は「10^-16 watts」とするか、「a ten-quadrillionth of a watt」のように言葉で書く。

### how-image-sensors-work [P1 / factual / 確度 medium] all・body
> 裏面照射型では、薄くしたチップを支える板を、裏から貼り合わせます。

- 問題: この記事では「裏」を光が入る側と定義しています。しかし実際の支えの板は、配線のある側(元の表側)に貼ります。光の入る側に板を貼るように読め、図の並び(受光部/配線/支えの板)とも食い違います。英語「bonded to the back」、繁体字「從背面貼上」も同じです。
- 案: 裏面照射型では、薄くしたチップを支えるため、配線のある側(元の表側)に支えの板を貼り合わせます。

### how-image-sensors-work [P2 / desc-mismatch / 確度 medium] ja・description
> 数千万個の小さな受光部(画素)で光を電子に変え

- 問題: 本文は「数百万〜数千万個」と書いていますが、説明文は「数千万個」と言い切っています。本文で挙げた防犯カメラや車載カメラには数百万画素のものも多く、説明文と本文が合いません。繁体字の説明文「數千萬個」も同じです。
- 案: 数百万〜数千万個の小さな受光部(画素)で光を電子に変え

### how-image-sensors-work [P2 / other / 確度 low / 要出典] ja・sources
> 前に紹介した裏面照射型と積層型は、どちらもソニーが世界で初めて量産しました

- 問題: 「世界で初めて量産」という主張について、出典欄の注記に裏付けの記述がありません(Origin の注記は「2009年に量産」だけです)。同じ時期に他社も裏面照射型を出荷しているため、同社の資料に「世界初」の記載があるかを確かめる必要があります。
- 案: 出典の注記に「世界初の量産」と書かれている箇所を加える。確認できない場合は「同社は〜を世界で初めて量産したとしています」と、同社の主張であることがわかる書き方にとどめる。

### how-leds-work [P2 / translation / 確度 high] zh-hant・body
> （droop，也常稱為效率衰減）

- 問題: 日本語の元の文にない別名の説明が、訳にだけ足されています。この別名が台湾で一般的かどうかも、確かめられていません。
- 案: 括弧書きを削除し、「這稱為{{term:効率ドループ|效率下垂}}。」とする。

### how-leds-work [P2 / missing-condition / 確度 medium] ja・body
> LEDの白い光の効率の理論上の上限を325 lm/Wとしています

- 問題: 出典の欄では、325 lm/W は「色を混ぜる方式」の理論上の上限です。主流の蛍光体方式の上限は、実用上 255 lm/W と書かれています。本文は方式の条件を落とし、325 lm/W を白色LED全体の上限のように書いています。結論の「半分以上が熱」は、どちらの値を使っても成り立ちます。
- 案: 「DOEの2020年の資料は、色を混ぜる方式の白い光の効率の理論上の上限を325 lm/W(主流の蛍光体方式では実用上255 lm/W)としています。」のように方式を明記する。en・zh-hant も同様に直す。

### how-leds-work [P2 / overclaim / 確度 medium] all・description
> シリコンでは光らない理由

- 問題: 本文には「光はごくわずかしか出ません」とあり、シリコンもわずかには光ります。説明文(en の "why silicon can't glow"、zh-hant の「矽不會發光」を含む)は、まったく光らないと言い切っています。
- 案: ja「シリコンではほとんど光らない理由」、en "why silicon barely glows"、zh-hant「矽幾乎不發光的原因」

### how-lithium-ion-batteries-work [P2 / missing-condition / 確度 medium] ja・body
> 2026年4月24日からは、機内に持ち込めるモバイルバッテリーは1人2個まで(1個160 Wh以下)です(国土交通省)。

- 問題: これは日本(国土交通省)のルールです。しかし日本語の本文には「日本の」という範囲が書かれておらず、どの国の便でも同じルールだと読めます。en と zh-hant は「In Japan, for example」「以日本為例」と範囲を補っていて、さらに zh-hant には「其他國家和地區的規定可能不同」という一文があり、言語の間で条件がそろっていません。
- 案: 「日本では、2026年4月24日から…(国土交通省)。国や地域によってルールは異なり、変わることもあるので、乗る前に航空会社の案内を確かめてください。」のように、日本の規則であることを明記する。

### how-lithium-ion-batteries-work [P2 / overgeneralization / 確度 medium] all・description
> リチウムイオンが黒鉛の負極と金属酸化物の正極の間を行き来して

- 問題: 本文は「黒鉛などの負極」「金属酸化物などの正極」と書き、リン酸鉄リチウムやチタン酸リチウムにも触れています。これに対して説明文は、材料を黒鉛と金属酸化物に言い切っており、本文と食い違います。en・zh-hant の説明文も同じ言い切りです。
- 案: ja: 「黒鉛などの負極と金属酸化物などの正極の間を」/ en: 「between electrodes such as graphite and metal oxides」/ zh-hant: 「在石墨等負極與金屬氧化物等正極之間」

### how-lithium-ion-batteries-work [P2 / other / 確度 low / 要出典] all・body
> iPhone 15のシリーズは1,000回のあとも、容量の80 %を保つ設計です

- 問題: 時期で変わる製品の情報です。記憶では、Apple の現行の説明は「iPhone 15 以降」としている可能性があります。もしそうなら、本文と「数字で見る」の表の書き方では、1,000回が iPhone 15 だけのように読めます。Apple Support の現行のページで、対象の機種の書き方と、確認した日を確かめる必要があります。
- 案: Apple の現行のページを確認したうえで、必要なら「iPhone 15以降(2026年◯月時点のAppleの説明)」のように、対象の機種と確認した時点を書く。

### how-nfc-and-contactless-cards-work [P2 / other / 確度 medium] ja・body
> 似たしくみのQRコードは、紙に刷るだけで作れます。

- 問題: QRコードはカメラで読む光学的な符号で、NFCとはしくみが違う。「似たしくみ」は、同じ原理で動くという誤解を招く。英語版は「does a similar job」(似た役割)で、日本語と意味がずれている。
- 案: 「似た役目をするQRコードは、紙に刷るだけで作れます。」とし、繁体字も「功能相似」のままで日本語に合わせる。

### how-nfc-and-contactless-cards-work [P2 / inconsistency / 確度 low] ja・body
> 数センチより離すと動かないのは

- 問題: 用語集のNFCの説明文は「数cm〜10 cm程度」の距離としている。本文と説明文は「数センチ」としか書いておらず、上限の目安が用語集と少し食い違う。どちらに合わせるかは、読み取り機の出力やアンテナの大きさで距離が変わることを資料で確かめて決める。
- 案: 「読み取り機やカードによって違いますが、目安として数センチ(長くても10 cm程度)より離すと動かないのは」のように、用語集と範囲をそろえる。

### how-noise-cancelling-works [P1 / missing-condition / 確度 medium / 要出典] all・body
> ANC向けチップの遅れの例(ADAU1787) | 5マイクロ秒(音が約1.7 mm進む時間)

- 問題: 出典では、5 µs は DSP の計算を飛ばす設定で、768 kHz のときの値です。表ではこの条件が落ちています。そのため、逆の波を計算する処理も含めて 5 µs で終わるように読めます。本文には「計算を省いた設定では」とありますが、768 kHz の条件は本文にもありません。計算を含む経路の遅れがどれくらいかは、データシートで確かめる必要があります。
- 案: 表を「ANC向けチップの最短の遅れの例(ADAU1787、DSPの計算を省いた設定・768 kHz) | 5マイクロ秒」とし、本文にも 768 kHz の条件を足す。en・zh-hant も同じように直す。

### how-noise-cancelling-works [P2 / other / 確度 medium] ja・body
> 耳への負担は「音の大きさ × 聞いた時間」で積み重なります

- 問題: 本文では「音の大きさ」を dB の目盛りとして説明しています。このため、dB の値に時間を掛けると読まれるおそれがあります。積み重なるのは音の強さ(エネルギー)と時間の積で、すぐ後の「強さが2倍(+3 dB)なら時間は半分」もこの考え方です。また、WHO の目安は A 特性の 80 dB(A) ですが、その条件が本文で落ちています。
- 案: 「耳への負担は『音の強さ × 聞いた時間』で積み重なります」とし、目安を「平均して約80 dB(A)」と書く。

### how-noise-cancelling-works [P2 / overgeneralization / 確度 low / 要出典] all・body
> 逆の波を作る計算でよく使われるのは、マイクから届いた直近のいくつかの数字に、それぞれ重みを掛けて足し合わせる方法です。この計算方法をFIRフィルタと呼びます。

- 問題: 出典は MathWorks の FxLMS(適応 FIR)の例だけです。実際の ANC 用チップの低遅延の経路では、IIR(バイクワッド)のフィルタも多く使われているはずです(例: ADAU1787 の FastDSP)。FIR が「よく使われる」と一般化してよいか、出典で確かめる必要があります。
- 案: 「逆の波を作る計算の例として、…FIRフィルタがあります(製品によっては IIR フィルタも使います)」のように、例であることがわかる書き方にする。

### how-power-banks-work [P2 / inconsistency / 確度 medium] all・body
> このように、回路が待っているだけで使う電流を{{term:静止電流}}と呼びます。

- 問題: 用語集の説明文では、静止電流は「負荷へ流す電流とは別に、ICの内部の回路で消費する電流」と定義されています。動作中にも流れる電流で、待機時の消費を左右するという位置づけです。本文の「待っているだけで使う電流」は、待機中だけの電流のように読めるため、用語集の定義とずれています。
- 案: 「このように、回路が負荷へ流す電流とは別に、自分自身の動作のために使う電流を{{term:静止電流}}と呼び、待っている間の電池の減りを左右します。」

### how-power-banks-work [P2 / missing-condition / 確度 low] all・body
> 出す電圧の幅が広いときや、いろいろな電圧で充電されるときに便利です。

- 問題: この記事のセルは1本(約3.7 V)が前提です。その場合、USBの充電入力(5〜20 V)はどれもセルより高いので、充電には降圧だけで足ります。昇降圧が必要になるのは、セルを直列につないで電池の電圧が入力や出力の範囲の中に入る構成(例: 2直列で約7.4 V)です。条件が書かれていないため、1セルでも昇降圧が要ると誤解されるおそれがあります。PMP40441/BQ25713が何直列の構成を想定しているかを確かめれば決着します。
- 案: 「セルを何本か直列につないだ製品などで、電池の電圧が出したい電圧や充電に使う電圧の上下をまたぐときに便利です。」のように、条件を書き足す。

### how-smartwatches-measure-heart-rate [P2 / missing-condition / 確度 medium / 要出典] ja・body
> 針を刺さずに単体で血糖値を測れるとするスマートウォッチや指輪を、FDAは1つも認めていません。

- 問題: 規制当局の認可の状況は時期で変わるのに、現在形で言い切っています。出典は2024年2月21日の安全情報なので、その時点の状況です。最新の状況は未確認です。
- 案: 「2024年2月の時点で、針を刺さずに単体で血糖値を測れるとするスマートウォッチや指輪を、FDAは1つも認めていませんでした。」とする(en・zh-hant も同様に時点を入れる)。

### how-smartwatches-measure-heart-rate [P2 / translation / 確度 medium] en・description
> Why green light, how motion is removed, and more.

- 問題: 日本語の説明文にある「数字がずれる理由、心電図・血中酸素との違い、中のチップ」が英語では「and more」にまとめられ、内容が落ちています。言語間で説明文の情報量が一致していません。
- 案: Why green light, how motion is removed, why readings drift, how ECG and blood oxygen differ, and the chips inside.

### how-smartwatches-measure-heart-rate [P2 / overclaim / 確度 low / 要出典] ja・body
> Apple・Fitbit・Garminはどれも、正しく測るための工夫として、まず着け方を挙げています。

- 問題: 「まず(最初に)」挙げているという順序は、出典の欄の要約からは裏付けられません。たとえば Fitbit Help の要約では、体の個人差が最初にあります。各社の資料で着け方が最初に書かれているかを確かめれば決着します。
- 案: 「Apple・Fitbit・Garminはどれも、正しく測るための工夫として着け方を挙げています。」

### how-solar-cells-work [P2 / terminology / 確度 medium] zh-hant・body
> 德國弗勞恩霍夫研究所

- 問題: 「弗勞恩霍夫」は中国大陸で使われる音訳です。台湾では「夫朗和斐」(夫朗和斐研究院、夫朗和斐太陽能系統研究所)が一般的です。記事中の複数の箇所で使われています。
- 案: 台湾の表記に合わせて「德國夫朗和斐研究院(Fraunhofer)」とし、記事中の「弗勞恩霍夫研究所」をすべてそろえる。

### how-solar-cells-work [P2 / overgeneralization / 確度 low] all・body
> 中身は、性質の違う2種類の半導体を広い面積で接した「PN接合」です。

- 問題: 太陽電池すべてがPN接合だと読めます。記事後半のペロブスカイト型は、多くがn-i-p構造で、電荷を選んで通す層で電子と正孔を分けます。ヘテロ接合型のシリコンも単純なPN接合ではありません。結晶シリコンの典型例として述べていることを明示しないと、一般化になります。説明文の「太陽電池は大きなPN接合です」も同じです。
- 案: 「よく使われる結晶シリコンの太陽電池の中身は、…『PN接合』です(材料によっては別の構造で分けるものもあります)」のように、対象を限定する。

### how-solar-cells-work [P2 / overclaim / 確度 low / 要出典] all・body
> 製品にするのは、これからです。

- 問題: ペロブスカイトとシリコンを重ねたタンデム型は、2024年に一部の企業(Oxford PVなど)が少量の商用出荷を始めたと報じられています。「これから」と言い切ると不正確になるおそれがあります。出荷の報道を出典で確かめれば決着します。
- 案: 「大量生産の製品として広まるのは、これからです」など、量産・普及の段階に限定した書き方にする(en・zh-hant も同様)。

### how-solar-cells-work [P2 / overgeneralization / 確度 low] all・body
> そこでパワコンは、電圧を少しずつ変えては電力が増えたかを確かめ、山の頂上を探し続けます。

- 問題: 山登り法(P&O)は代表的な方式の一つで、すべてのパワコンがこの方式を使うわけではありません(インクリメンタルコンダクタンス法など、別の方式もあります)。
- 案: 「多くのパワコンは、たとえば電圧を少しずつ変えては…」のように、代表例であることを示す。

### how-ssds-and-flash-memory-work [P1 / factual / 確度 medium] all・body
> SSDの基板でいちばん数が多い部品は、データを覚えるチップです。

- 問題: 一般的なSSDの基板には、コンデンサや抵抗などの小さな受動部品が数十個以上載っています。NANDのパッケージは1〜数個のことが多いので、「いちばん数が多い部品」とは言えません。en（the most common part）とzh-hant（數量最多的零件）も同じ誤りです。
- 案: ja: 「SSDの基板で、面積の多くを占める主役の部品は、データを覚えるチップです。」 en: "The main part on an SSD's circuit board, taking up much of its area, is the chip that stores data." zh-hant: 「SSD的電路板上，占了大部分面積的主要零件，是記住資料的晶片。」

### how-ssds-and-flash-memory-work [P2 / missing-condition / 確度 medium / 要出典] all・body
> 2026年時点で、四日市(三重県)と北上(岩手県)の工場で作っています。

- 問題: 出典はキオクシアの2023年2月のニュースリリースです。これだけでは「2026年時点」の操業状況を裏付けられません。en・zh-hantも同じく「2026年時点」と書いています。
- 案: 2026年時点の公式資料（キオクシアの会社概要・拠点の案内など）を出典に足すか、「2023年の発表では」のように出典の時期に合わせて書く。

### how-ssds-and-flash-memory-work [P2 / overgeneralization / 確度 low] all・body
> そこでOSは、削除した場所を「もう使わない」とSSDに知らせます。この知らせをTRIMと呼び

- 問題: TRIMはATA（SATA）のコマンドの名前です。NVMeでは、同じ働きをDataset Managementの Deallocate と呼びます。また、OSやファイルシステムの設定によっては送られません。本文では、どの方式でも常にTRIMが送られるように読めます。
- 案: 「対応するOSは、削除した場所を…SSDに知らせます。この知らせをTRIMと呼びます(SATAの名前。NVMeでは Deallocate と呼ぶ同じ働きの命令があります)。」

### how-touchscreens-work [P2 / overclaim / 確度 medium] ja・body
> 指が何本あっても、値の下がった交差点が、それぞれの位置を示します。

- 問題: 実際のコントローラには同時に扱える点の数に上限があります(本文の例でも最大10本)。また、指どうしが電極の間隔より近いと1点に融合します。「何本あっても」「何本の指でも」は言い過ぎです。見出しの「何本の指でも見分けられる理由」も同じで、en(many fingers)・zh-hant(好幾根手指)より強い言い方になっています。
- 案: 見出しを「しくみ2: 複数の指を見分けられる理由」とし、本文を「指が複数あっても、値の下がった交差点がそれぞれの位置を示します(同時に扱える数はコントローラの設計で決まり、指どうしが近すぎると分けにくくなります)。」とする。

### how-touchscreens-work [P2 / missing-condition / 確度 medium] ja・body
> ゲームモードでは、絵を1回描き直すあいだに、タッチを2回調べる計算になります。

- 問題: リフレッシュレートは48〜120Hzで変わります。「2回」になるのは120Hzで描き直しているときだけで、その条件が書かれていません。低いリフレッシュレートなら回数はもっと多くなります。
- 案: 「ゲームモードで画面を120回/秒で描き直しているときは、絵を1回描き直すあいだに、タッチを2回(240÷120)調べる計算になります。」とする。en・zh-hant も同様に条件を足す。

### how-touchscreens-work [P2 / inconsistency / 確度 medium] all・body
> {{term:静電容量検出}}(静電容量の変化から動きや位置を知る方式)

- 問題: 用語集の説明文は「可動電極と固定電極の間の静電容量の変化から、変位や圧力などを検出する方式。MEMSセンサーで広く使われる」で、MEMSの可動電極が前提です。タッチパネルには可動電極がありません。そのため、この用語ページに進んだ学習者は、タッチパネルも可動電極で検出していると誤解するおそれがあります。本文の補足「位置を知る方式」も、用語集の説明文と合いません。
- 案: リンクの補足を「MEMSセンサで、動く電極との間の静電容量の変化から変位を知る方式。タッチパネルとは電極が動く点が違う」とする。または、用語集の説明文を、タッチパネルも含む一般的な定義に広げる。

### how-wireless-charging-works [P2 / missing-condition / 確度 medium / 要出典] all・sources
> 2020年10月、アップルはiPhone 12で、MagSafe(マグセーフ)を始めました。

- 問題: 本文の「2020年10月」「発売当時のMagSafeの充電器は最大15ワット」の根拠として載っているアップルの出典は、2021年4月の発表(紫色のiPhone 12)です。iPhone 12とMagSafeを発表した2020年10月の資料が出典欄にないため、年月と「発売当時」の値を出典で確かめられません。
- 案: 2020年10月のアップルの発表(iPhone 12・MagSafeの発表資料)を出典に加える。加えられない場合は、本文を「2021年4月時点のアップルの発表では、MagSafeの充電器は最大15ワット」のように、出典の時点に合わせて書く。

### how-wireless-charging-works [P2 / factual / 確度 medium] all・body
> アップルは、ワイヤレスで充電している間は医療機器から30 cm以上離すよう案内しています。

- 問題: 出典欄の要約では、30 cm(ふだんは15 cm)は「医療機器のメーカーの多く」の勧めを、アップルが紹介したものです。本文と「数字で見る」の表では、アップル自身の基準のように読めます。ふだんの目安の15 cmも書かれていません。
- 案: 「アップルの案内によると、医療機器のメーカーの多くは、ふだんは15 cm以上、ワイヤレスで充電しているときは30 cm以上離すよう勧めています。」と直す。表の「(アップル)」も「(医療機器メーカーの目安。アップルの案内)」とする。

### how-wireless-charging-works [P2 / translation / 確度 medium] en・figure
> Phone coil / ↓ / Phone coil

- 問題: 日本語の図では2つ目のラベルが「スマホ」なのに、英語では「Phone coil」が2回続きます。日本語の図と対応していません。
- 案: Change the second label to "Phone" to match the Japanese figure (Phone coil / ↓ / Phone / ↓).

### how-wireless-charging-works [P2 / overclaim / 確度 low] all・body
> ある周波数(1秒に向きが往復する回数)でだけ強く応える回路ができます。

- 問題: コイルとコンデンサの共振回路は、共振周波数の付近で強く応えます。応える幅は回路の鋭さ(Q値)で決まります。「その周波数でだけ」と言い切ると、ほかの周波数ではまったく応えないと誤解されるおそれがあります。本文の後半でも、送る周波数の「近く」で共振させると書いています。
- 案: 「ある周波数(1秒に向きが往復する回数)の近くで、とくに強く応える回路ができます。」とする。英語・繁体字も「only at one frequency」「只在某個頻率」を「most strongly near one frequency」「在某個頻率附近特別強烈反應」に直す。

### how-wireless-charging-works [P2 / overgeneralization / 確度 low] all・body
> WPCの規格の名前がQi(チー)です。

- 問題: WPCには、Qi以外の規格(台所の家電向けのKiなど)もあります。この書き方では、WPCの規格はQiだけだと読めます。WPCの規格の一覧を確かめれば決着します。
- 案: 「WPCが定める、スマホなどの小さな機器向けの規格の名前がQi(チー)です。」とする。

### memory-vs-storage [P2 / translation / 確度 high] zh-hant・sources
> (講義資料。記憶階層の各段の読み出し時間の目安)

- 問題: 繁体字版の出典の欄で、各出典の注記が日本語のまま訳されていない(英語版は訳されている)。繁体字の読者には注記が読めない。
- 案: (講義資料。記憶體階層各層讀取時間的參考值) のように、各出典の注記を繁體中文(台灣用語)に翻譯。

### memory-vs-storage [P2 / translation / 確度 medium] en・description
> How each chip works, and why you need both.

- 問題: 日本語の説明文にある「速さの差」「容量の数え方」(256GBが少なく表示される理由)が英語の説明文から抜けており、本文の内容とも一部合っていない。
- 案: RAM is fast working space that empties when the power is off; storage (an SSD or flash) keeps photos and apps even without power. How each chip works, how big the speed gap is, and why "256 GB" shows up as less.

### what-is-a-microcontroller [P2 / terminology / 確度 high] zh-hant・body
> 稱為脈寬調變（{{term:PWM(パルス幅変調)|PWM}}）

- 問題: 用語集の zh-hant の項目名は「PWM（脈衝寬度調變）」です。本文の「脈寬調變」と表記がそろっていません。
- 案: 稱為脈衝寬度調變（{{term:PWM(パルス幅変調)|PWM}}）。

### what-is-a-microcontroller [P2 / overclaim / 確度 medium] all・body
> ## 決まった時間を必ず守る

- 問題: 見出しは、マイコンがいつも期限を守るように読めます。本文は「大事な場合があります」と限定しており、見出しと合っていません。期限を守れるかは設計しだいで、マイコンなら自動で守れるわけではありません。
- 案: ja: 「## 決まった時間を守る(リアルタイム)」/ en: "## Meeting deadlines (real-time)" / zh-hant: 「## 守住固定的時間（即時）」

### what-is-a-microcontroller [P2 / missing-condition / 確度 medium / 要出典] all・body
> スマホのSoCは「3nm」「2nm」のような最先端の世代で作られます。

- 問題: スマホのSoCの製造世代は時期によって変わる情報です。それなのに時点が書かれておらず、出典の欄にも裏付けがありません。2nmのスマホ用SoCがどの時点で量産されているかは、確かめないと決められません。
- 案: 「2025年時点で、スマホのSoCは3nm前後の最先端の世代で作られ、2nmへの移行が始まっています」のように時点を書き、出典を足す。

### what-is-a-microcontroller [P2 / overclaim / 確度 low / 要出典] all・body
> 2020〜2022年に車の生産が止まった理由の1つにもなりました

- 問題: 出典の欄に、半導体不足と車の生産の関係を裏付ける資料がありません。また「生産が止まった」は、減産や一部工場の停止より強い言い方に読めます。
- 案: 「2020〜2022年に車の減産や一部の工場の停止が起きた理由の1つ」とし、出典を足す。

### what-is-a-microcontroller [P2 / translation / 確度 low] en・body
> How it meets fixed deadlines, and how it runs for years on a battery

- 問題: 日本語は「電池で長く動くための工夫」で、「何年も」とは言っていません。英訳では「for years」が足され、見出しも「Years on a battery」になっています。動く年数は平均の電流しだいで、本文の計算でも約3か月の場合があります。
- 案: "How it meets fixed deadlines, and how it runs a long time on a battery" / heading: "## Long battery life: asleep most of the time"

### what-is-a-power-semiconductor [P2 / terminology / 確度 medium] zh-hant・body
> {{term:IGBT|IGBT}}（絕緣閘雙極電晶體）

- 問題: 用語集の zh-hant の説明は IGBT を「絕緣閘極雙載子電晶體」としているのに、本文の言い換えは「絕緣閘雙極電晶體」になっている。サイト内で訳語がそろっていない。
- 案: {{term:IGBT|IGBT}}（絕緣閘極雙載子電晶體）

### what-is-a-power-semiconductor [P2 / translation / 確度 low / 要出典] zh-hant・body
> 是100多伏特的交流電（台灣是110伏特，日本是100伏特）

- 問題: 日本語は「日本の家のコンセントは100ボルト」とだけ書いている。訳では台湾の電圧という主張が足されているが、出典欄に裏付けがない。台湾の公称電圧(110 V)を資料で確かめたうえで残すか、日本語に合わせるかを決める必要がある。
- 案: 以日本為例，家用插座送來的是100伏特的交流電（台灣的家用電壓若要補充，請附上出處）。

### what-is-a-power-semiconductor [P2 / missing-condition / 確度 low / 要出典] all・body
> シリコンのIGBTの代わりに使われ始めています

- 問題: 採用の広がりは時期によって変わる内容だが、「いつの時点か」が書かれておらず、出典欄にも裏付けになる資料がない。
- 案: 「2020年代に入って、電気自動車のインバータなどでシリコンのIGBTの代わりに使われ始めています」のように時点を書き、採用例の出典を加える。

### what-is-a-power-semiconductor [P2 / translation / 確度 low] en・figure
> the thick layer of a power device is many times thicker than a computing transistor

- 問題: 日本語の「けた違いに厚い」(桁が違うほど厚い)が、英語では「many times」に弱まっている。zh-hant は「好幾個數量級」になっており、3言語で程度がそろっていない。
- 案: in reality, the thick layer of a power device is orders of magnitude thicker than a computing transistor.

### what-is-a-semiconductor-laser [P2 / translation / 確度 high] en・description
> How it differs from an LED, and why fiber uses 1550 nm.

- 問題: 日本語の説明文は「光り始める条件」と「1310nmと1550nmが使われる理由」を挙げているが、英訳では光り始める条件が抜け、波長も1550 nmだけになっている。本文は1310 nmも扱っているため、本文とも合わない。
- 案: How it differs from an LED, what makes it start lasing, and why fiber uses 1310 nm and 1550 nm.

### what-is-a-semiconductor-laser [P2 / missing-condition / 確度 medium] all・body
> シリコンは通信用の赤外線をよく通し、光の通り道や光のシャッター、受光部をチップの上に作れます

- 問題: 本文は直前で「シリコンは1310 nmや1550 nmの光をほとんど吸い込まない」と説明している。一方で、シリコンのチップ上に受光部を作れるとも書いており、シリコン自体がその光を受けられるように読める。実際のシリコンフォトニクスでは、通信波長の受光部に一般にゲルマニウムを載せて使う。この材料の条件が書かれていない。
- 案: 受光部について「(受光部には一般にシリコンの上に育てたゲルマニウムを使います)」のように材料を補う。英語・繁体字にも同じ補足を入れる。

### what-is-a-semiconductor-laser [P2 / inconsistency / 確度 low / 要出典] all・body
> 大手メーカーの製品の上限値は、1 kmあたり0.18〜0.22デシベルほどです(2024年時点)

- 問題: 出典の欄では、0.18 dB/kmはファイバ単体(Corning、2024年2月版)の値で、0.22 dB/kmはケーブルにしたとき(Prysmian、版の日付なし)の値。条件の違う値を一つの範囲にまとめている。また、Prysmianの資料の時点が出典の欄に書かれておらず、「2024年時点」の裏付けとして足りない。
- 案: 「ファイバ単体で0.18、ケーブルにした状態で0.22デシベルほど」と条件を分けて書く。Prysmianの資料の版・日付を出典の欄に加える。

### what-is-an-analog-chip [P2 / translation / 確度 high] zh-hant・sources
> IEC 60908:1999 Audio recording - Compact disc digital audio system(CDの規格。2チャンネル、16ビット、44.1kHz)

- 問題: 繁体字版の出典の欄で、補足の説明が日本語のまま残っている。英語版では訳してあり、言語の間でそろっていない。
- 案: 各出典の補足を繁體中文に訳す(例:「CD規格。2聲道、16位元、44.1kHz」)。

### what-is-an-analog-chip [P2 / translation / 確度 high] zh-hant・body
> dBm換算工具

- 問題: 日本語は「dB・dBmの換算ツール」で、繁体字訳では dB が落ちている。
- 案: 「dB、dBm換算工具」とする。

### what-is-an-analog-chip [P2 / inconsistency / 確度 medium] all・body
> 出力の一部を入力に戻すようにつなぎます。

- 問題: 用語集の説明文では、負帰還は「出力の一部を入力に逆の極性で戻すこと」とされている。本文は極性の条件を書いていないので、正帰還と区別がつかない。
- 案: 「出力の一部を、入力の変化を打ち消す向き(オペアンプの反転入力)に戻すようにつなぎます。」とする。en・zh-hant も同様に直す。

### what-is-an-analog-chip [P2 / inconsistency / 確度 medium] all・figure
> 目盛りの数字は1つおきに書いている

- 問題: 図の目盛りは 7・5・3・1・0 で、0 と 1 が並んでいる。そのため「1つおき」という説明と合わない。
- 案: 「目盛りの数字は奇数の段と0だけを書いている」とする。または、図の目盛りを 0・2・4・6 などにそろえる。

### what-is-an-analog-chip [P2 / factual / 確度 low / 要出典] all・body
> 最初に広く使われたアナログのICは、1964年のオペアンプ「μA702」です。

- 問題: 出典の欄には「1965年のμA709」も挙がっている。広く普及した最初の製品をμA702とするか、翌年のμA709とするかは、資料によって書き方が分かれる可能性がある。計算機歴史博物館の該当ページで、どちらを「広く使われた最初のもの」としているかを確かめれば決着する。
- 案: 出典の本文を確認したうえで、例えば「1964年にフェアチャイルド社がオペアンプ「μA702」を出し、翌1965年の「μA709」とともにアナログICが広く使われるようになりました(計算機歴史博物館による)。」とする。

### what-is-an-inverter [P2 / translation / 確度 medium] en・description
> How fast switching sets motor speed in air conditioners and EVs

- 問題: 「fast switching(速いスイッチング)がモーターの速さを決める」と読めるため、スイッチの切り替え回数(搬送波の周波数)が高いほどモーターが速く回る、という誤解を招くおそれがある。本文では、速さを決めるのは出力する交流の周波数であり、日本語の説明文も「モーターの速さを変えるしくみ」とだけ書いている。
- 案: How an inverter changes motor speed in air conditioners and EVs by setting the output frequency, and why it saves energy.

### what-is-an-inverter [P2 / missing-condition / 確度 low / 要出典] ja・body
> インバーターのない機種より、消費電力を50%以上減らせる、というのが同社の説明です。

- 問題: 出典の欄では「50%以上」は東洋経済の記事が伝える数値で、インバーター付きのエアコン全般とインバーターなしの比較として書かれている。本文ではCOP28で紹介した高効率の機種そのものの値のように読める。また、どの運転条件での比較かが書かれていない。元の記事で、対象(全般か特定の機種か)と比較の条件を確かめると決着する。
- 案: ダイキンによると、インバーター付きのエアコンは、インバーターのないエアコンに比べて50%以上の省エネが可能だといいます(比較の条件は同社の説明による)。

### what-is-gallium-nitride [P1 / desc-mismatch / 確度 high] all・body
> シリコンより段差が大きい材料を、{{term:ワイドバンドギャップ半導体}}と呼びます。

- 問題: 用語集では「シリコンより大幅に大きい(おおむね2 eV以上)」と定義している。本文の書き方では、GaAs(約1.42 eV)のようにシリコンより少し大きいだけの材料も含まれてしまう。en・zh-hant も同じ書き方。
- 案: シリコンより段差がずっと大きい(目安としておおむね2 eV以上の)材料を、ワイドバンドギャップ半導体と呼びます。(en: Materials with a much larger step than silicon (roughly 2 eV or more) are called wide-bandgap semiconductors. / zh: 台階比矽大得多(大致在 2 eV 以上)的材料,稱為寬能隙半導體。)

### what-is-gallium-nitride [P1 / translation / 確度 medium] zh-hant・body
> 移動的難易度只有電子的數十分之一以下

- 問題: 日本語は「動きやすさ(移動度)が電子の数十分の1以下」。zh の「難易度」は「難しさ」と読めるため、正孔のほうが動きやすいという逆の意味に取られるおそれがある。
- 案: 電洞的遷移率只有電子的數十分之一以下。

### what-is-gallium-nitride [P2 / missing-condition / 確度 medium] all・body
> 約1,500〜2,000 cm²/(V·s) | シリコンの電子は約1,400

- 問題: 本文では「混ぜ物の少ないシリコン」「室温」という条件が付いているが、「数字で見る」の表では落ちている。トランジスタのチャネルのシリコンの電子もこの値で動くと誤解されるおそれがある。
- 案: 「シリコンの電子は約1,400(室温、混ぜ物の少ない結晶)」と条件を付ける。en・zh-hant も同じように直す。

### what-is-gallium-nitride [P2 / other / 確度 medium / 要出典] all・sources
> Y. Cao ほか(D. Jena 研究室)AlN/GaN の2DEGの電子の移動度の論文(2008年。室温で約1,600 cm²/(V·s))

- 問題: 論文名・誌名・巻号がなく、出典をたどれない。また、これは AlN/GaN の値であり、本文の AlGaN/GaN の範囲「1,500〜2,000」の上限 2,000 を直接裏付ける出典が見当たらない。Mishra の論文の該当する値を確かめれば決着する。
- 案: 論文の題・誌名・巻・ページを書く。1,500〜2,000 の範囲を裏付ける箇所(Mishra 2002 の値など)を出典の注記に明記する。

### what-is-gallium-nitride [P2 / missing-condition / 確度 medium / 要出典] all・body
> 部品1個で比べると、シリコンのトランジスタのほうが今も安いのがふつうです。

- 問題: 価格の比較は時期で変わる内容だが、いつの時点の話かが書かれておらず、出典の欄にも裏付けがない。
- 案: 「2026年時点で」のように時期を書き、価格の比較の出典を足す。出典が見つからない場合は、「一般に」と弱めて書く。

### what-is-gallium-nitride [P2 / translation / 確度 medium] zh-hant・sources
> 東芝デバイス&ストレージ: よくあるご質問(SiC SBD)物性定数の表(絶縁破壊電界はSi 3.0×10⁵ V/cm、GaN 3.3×10⁶ V/cm。バンドギャップ)

- 問題: zh-hant の出典の欄が日本語の注記のまま。en では注記が訳されているため、言語間で扱いがそろっていない。
- 案: en と同じように、各出典の注記を繁體中文に訳す。日本語の資料には「(日文)」と添える。

### what-is-mems [P1 / translation / 確度 high] zh-hant・body
> 通常也只有幾µm（幾千分之一 mm）以下

- 問題: 「幾千分之一 mm」は「数千分の1 mm」という意味になり、値が桁違いになる。日本語の「1000分の数 mm」(例: 3 µm = 3/1000 mm)と一致しない。
- 案: 通常也只有幾µm（千分之幾 mm）以下

### what-is-mems [P2 / terminology / 確度 medium] zh-hant・description
> 手機的加速度計與陀螺儀

- 問題: 用語集の zh-hant の項目名は「加速度感測器」なのに、説明文・本文・表では主に「加速度計」を使っている。用語集の名前とそろっていない。
- 案: 「加速度感測器」に統一する(初出だけ「加速度感測器（也稱加速度計）」とする)。例: 手機的加速度感測器與陀螺儀

### what-is-mems [P2 / overclaim / 確度 medium / 要出典] all・body
> 最大で約200万個の鏡を並べた部品と紹介しています

- 問題: 「最大約200万個」は ASME の資料が書かれた時点の値。その後の製品(映画館向けの4K品など)では、鏡の数がこれより多いものがあるとみられる。時点が書かれていないため、今も最大が約200万個だと誤解されるおそれがある。最新の TI の製品資料で確かめる必要がある。
- 案: 「ASMEは、(当時の製品で)約200万個の鏡を並べた部品と紹介しています。今の製品には、これより多くの鏡を持つものもあります。」のように時点を補う

### what-is-mems [P2 / other / 確度 low / 要出典] all・sources
> 米国のノウルズは2000年代の初めにMEMSマイクを売り出しました

- 問題: 発売時期「2000年代の初め」は、出典の欄の説明(2006年の論文の題と開催地のみ)では裏付けられていない。論文の本文に発売年が書かれているかを確かめる必要がある。
- 案: 出典の欄の Loeppert の論文の説明に、発売時期の記述(例: 何年に量産・発売)を、確認したうえで追記する。確認できなければ、本文の時期の記述を削る

### what-is-silicon-carbide [P2 / translation / 確度 high] zh-hant・body
> 也稱為物理氣相傳輸法（PVT）

- 問題: 日本語の原文にない別名(PVT)が、訳だけに足されています。内容は正しいものの、言語間で記述がそろいません。
- 案: 刪除「也稱為物理氣相傳輸法（PVT）」，或在日文與英文中也加入同樣的說明。

### what-is-silicon-carbide [P2 / overclaim / 確度 medium] all・body
> SiCだけで作ったインバータを受注したと発表しました

- 問題: 出典は「フルSiCパワーモジュール」を使ったインバータです。フルSiCは、モジュール内のトランジスタとダイオードの両方がSiCという意味です。インバータ全体がSiCだけでできているように読めます。en・zh-hant も同じ言い方です。
- 案: ja: 「トランジスタとダイオードの両方にSiCを使ったモジュール(フルSiC)のインバータを受注したと発表しました」 / en: "inverters using full-SiC power modules (both transistors and diodes made of SiC)" / zh-hant: 「使用全SiC功率模組(電晶體與二極體都用SiC)的逆變器」

### what-is-silicon-carbide [P2 / other / 確度 low / 要出典] all・body
> (2026年に生産開始の予定)

- 問題: 2024年5月時点の予定を、2026年時点の記事でそのまま書いています。生産が始まったのか、遅れているのかが分かりません。ST の最新の発表で現状を確かめる必要があります。
- 案: 「(2024年5月の発表では、2026年に生産開始の予定)」のように、いつの時点の予定かを書く。または最新の状況に更新する。

### what-is-silicon-carbide [P2 / other / 確度 low / 要出典] all・sources
> 2026年1月には、Wolfspeedが直径300ミリの単結晶のウエハを作ったと発表しました

- 問題: 本文は「2026年1月」と月まで書いていますが、出典の欄には「2026年」としか書かれていません。発表の月を出典で確かめる必要があります。
- 案: 出典の欄に発表日を追記する(例: 「2026年1月○日」)。確かめられない場合は、本文を「2026年」にとどめる。

### what-is-usb [P2 / translation / 確度 high] en・description
> USB-C is only the plug shape: speed (USB 2.0 to USB4) and power (USB PD) come from separate standards.

- 問題: 日本語の説明文の最後の文「ケーブルで差が出る理由も解説します」が、英語の説明文に入っていません。
- 案: USB is a shared standard for connecting devices. USB-C is only the plug shape: speed (USB 2.0 to USB4) and power (USB PD) come from separate standards. We also explain why cables make a difference.

### what-is-usb [P2 / translation / 確度 high] en・body
> Why a USB-C cable can charge a laptop but sometimes cannot show video

- 問題: 日本語は「充電はできても映像が出ないことがある理由」で、ノートパソコンには限っていません。英訳で「a laptop」が足されています。
- 案: Why a USB-C cable can charge but sometimes cannot show video

### what-is-usb [P2 / overclaim / 確度 medium] all・body
> 受ける側は、2本の電圧の「差」だけを見て、0か1かを決めます。

- 問題: USB 2.0(特にLow/Full-Speed)は、パケットの終わり(EOP)やリセットで2本とも低い状態(SE0)を使います。このときは差ではなく各線の電圧も見ています。「だけ」と言い切ると誤解を招きます。データのビットを差動で判定するという主旨は正しいです。
- 案: 受ける側は、主に2本の電圧の「差」を見て、0か1かを決めます。(en: The receiver mainly looks at the "difference" between the two voltages… / zh-hant: 接收端主要看2條線電壓的「差」…)

### what-is-usb [P2 / missing-condition / 確度 medium] all・body
> 2024年12月28日から、EUで売る機器の充電口は、USB-Cでなければなりません。

- 問題: 指令(EU)2022/2380の対象は、一覧にある種類の機器のうち、有線で充電できるものです。その日以降に市場に出す製品に適用されます。「EUで売る機器」とだけ書くと、無線だけで充電する機器や一覧にない機器も含まれるように読めます。
- 案: 2024年12月28日から、EUで新たに売る対象の機器のうち、ケーブルで充電するものは、充電口がUSB-Cでなければなりません。

### what-is-usb [P2 / missing-condition / 確度 low] all・body
> 約2分50秒 / 8秒

- 問題: 10 GB を10^9バイトとすると、80×10^9 b ÷ 480×10^6 b/s ≒ 166.7秒(約2分47秒)、10 Gb/sでは8秒になり、表の値と合います。2^30バイトとすると約179秒(約3分)になります。本文には「1バイト=8ビット」とだけあり、GBの定義が書かれていないため、値の根拠をたどれません。
- 案: 注記を「10 GB(10×10^9バイト)のファイルを、1バイトを8ビットとして計算した…」とし、必要なら「約2分47秒」と書く。

## foundations

### ac-vs-dc-and-impedance [P2 / terminology / 確度 medium] zh-hant・body
> 這稱為諧振（也叫共振，就是前一張圖中「諧振」的點）

- 問題: 用語集の項目「共振回路」の zh-hant の名前は「共振電路」で、共振に「共振」を使っている。記事は題・説明文・本文・図で「諧振」を主に使っており、用語集とそろっていない。
- 案: 本文・図・description の「諧振」を「共振」にそろえる(例:「這稱為共振（就是前一張圖中「共振」的點）」)。

### ac-vs-dc-and-impedance [P2 / missing-condition / 確度 medium] all・body
> 0から1の間の値で、ずれがなければ1です。

- 問題: 「ずれがなければ1」は、電圧と電流がどちらも正弦波のときだけ成り立つ。すぐ後で、電流の波形がゆがむと力率が下がると書いており、条件が抜けたままでは食い違って読める。用語集の説明文も「正弦波なら」という条件を付けている。
- 案: 「0から1の間の値で、電圧と電流がどちらも正弦波なら、ずれがないとき1です。」とし、en・zh-hant も同じ条件を足す。

### ac-vs-dc-and-impedance [P2 / other / 確度 low / 要出典] all・sources
> 526.5〜1606.5キロヘルツの範囲を使います(2026年時点、総務省)

- 問題: 本文で「2026年時点」と時期を書いているが、出典の欄の総務省 関東総合通信局の資料には、確認した時期や掲載日が書かれていない。本文の時期の根拠を出典の欄から追えない。
- 案: 出典の欄に、総務省の資料を確認した日付(例: 2026年○月確認)を書き足す。確認できないときは、本文の「2026年時点」を出典の確認日に合わせて直す。

### arrhenius-equation-in-chips [P1 / translation / 確度 high] zh-hant・sources
> NIST: Fundamental Physical Constants, CODATA 2018 wall chart(ボルツマン定数 8.617 333 262×10⁻⁵ eV/K)

- 問題: 繁体字版の出典欄で、括弧内の補足が日本語のまま残っている。対象はボルツマン定数・JEP122H・DS4432・AEDR-98xx・Dunham・MRS・NPTEL・Frostburg の各項目。
- 案: 括弧内を繁體中文に訳す。例:「(波茲曼常數 8.617 333 262×10⁻⁵ eV/K)」「(2016年版。各失效機制的活化能與模型)」「(失效機制或其活化能不明時使用0.7 eV的例子)」「(「每10 °C變2倍」是經驗法則而非定律)」。

### arrhenius-equation-in-chips [P2 / terminology / 確度 medium] zh-hant・body
> 整體的故障率，要把各原因的故障率相加來估算

- 問題: 用語集(FIT・バスタブ曲線・MTTF)の繁体字では「失效率」「失效」を使っているが、本文では「故障率」「故障機制」と書いている。サイト内の訳語がそろっていない。
- 案: 「故障率」を「失效率」に、「故障機制」を「失效機制」にそろえる。例:「整體的失效率，要把各原因的失效率相加來估算」「（失效率隨時間的變化）」。

### arrhenius-equation-in-chips [P2 / missing-condition / 確度 low] all・figure
> 例えば0.7 eVの山なら、実際の割合は数億〜数百億個に1個ほど。

- 問題: この割合は温度で大きく変わるが、図の説明に温度が書かれていない。55〜125 ℃なら約7億〜560億個に1個で、記述と合う。一方、25 ℃では exp(−0.7/0.0257) で約6600億個に1個となり、範囲から外れる。
- 案: 「例えば0.7 eVの山なら、55〜125 ℃での実際の割合は数億〜数百億個に1個ほど。」のように温度の範囲を書き足す。en・zh-hant にも同じ条件を加える。

### decibels-in-electronics [P1 / overgeneralization / 確度 high] all・body
> 電圧のdBだけ「20倍」の式を使う理由と、−3 dBの意味

- 問題: 「電圧のdBだけ」と言い切っているが、20倍の式は電流・音圧など2乗が電力に比例する量すべてに使う。本文の音のdBの節でも「音圧のdBも20倍の式」と書いており、記事の中で食い違っている。en「voltage alone」、zh「只有電壓的dB」も同じ。
- 案: ja: 電圧のdBで「20倍」の式を使う理由(音圧など、2乗が電力に比例する量も同じ)と、−3 dBの意味 / en: Why voltage (and other quantities whose square is proportional to power) uses a "20 times" formula, and what −3 dB means / zh-hant: 電壓等（平方與功率成正比的量）的dB要用「20倍」式子的理由，以及−3 dB的意思

### decibels-in-electronics [P2 / missing-condition / 確度 medium] all・body
> 0 dBm(1 mW)の信号を2つ合わせると、2 mWで約3 dBmです。

- 問題: 電力がそのまま足し合わさるのは、2つの信号に相関がない(雑音どうしや周波数の違う信号など)場合。同じ周波数で同位相の信号なら電圧が足されて約6 dBm、逆位相なら打ち消し合うこともあり、条件が書かれていない。
- 案: ja: 例えば互いに関係のない(相関のない)0 dBm(1 mW)の信号を2つ合わせると、電力が足されて2 mWで約3 dBmです。 / en: For example, combining two unrelated (uncorrelated) 0 dBm (1 mW) signals adds their powers to 2 mW, about 3 dBm. / zh-hant: 例如把兩個彼此無關（不相關）的0 dBm（1 mW）訊號合起來，功率相加是2 mW，約3 dBm。

### decibels-in-electronics [P2 / desc-mismatch / 確度 medium] ja・description
> 2つの量の比を「10を何回掛けたか」の10倍で表す書き方

- 問題: 説明文では任意の「量」の比を10倍と書いているが、本文では10倍は電力の比で、電圧は20倍としている。説明文だけ読むと電圧にも10倍を使うと誤解しうる。zh-hant の説明文も同じ。
- 案: ja: デシベル(dB)は、2つの電力の比を「10を何回掛けたか」の10倍で表す書き方です。 / zh-hant: 分貝（dB）是把兩個功率的比，用「10乘了幾次」的10倍來表示的寫法。

### decibels-in-electronics [P2 / terminology / 確度 medium] zh-hant・body
> 這個比稱為訊噪比（SNR）

- 問題: 用語集(夏農定理・雜訊指數)では S/N を「訊雜比」と訳しており、本文の「訊噪比」とサイト内でそろっていない。台湾では「訊雜比」が一般的。
- 案: 把本文中的「訊噪比」統一改為「訊雜比」（含標題「原理7：雜訊與訊雜比」）。

### diffusion-in-semiconductor-processing [P2 / translation / 確度 high] en・body
> This first step is called predeposition.

- 問題: 日本語の本文にない「前の段階をプレデポジションと呼ぶ」という説明が、英語と繁体字(「這一步稱為預沉積」)にだけ足されています。内容は正しいものの、言語間で説明がそろっていません。
- 案: 日本語にも「この最初の工程をプレデポジションと呼びます」を足して3言語をそろえる。あるいは en・zh-hant からこの文を削る。

### diffusion-in-semiconductor-processing [P2 / missing-condition / 確度 medium] all・body
> 実際は、温度を100 ℃上げると拡散係数が約10倍になり

- 問題: 「約10倍」が成り立つのは1000→1100 ℃付近だけです。本文でも900→1000 ℃では15〜17倍としています。条件のない言い切りになっていて、どの温度でも約10倍だと誤解させます。
- 案: 「実際は、1000 ℃前後で温度を100 ℃上げると、拡散係数は約10倍(それより低い温度ではさらに大きな倍率)になり」とする。en・zh-hant も同様に「around 1,000 °C」「在1000 ℃附近」を足す。

### diffusion-in-semiconductor-processing [P2 / other / 確度 medium] all・body
> ウエハの表側だけが熱くなるのは、このためです(接合温度の計算ツール)

- 問題: ミリ秒アニールでの熱の広がりを説明している箇所に、素子の動作時の接合温度(Tj)を計算するツールへのリンクがあります。内容が合わない導線になっています。熱の拡散長を試せるツールでないなら、学習者を混乱させます。リンク先のツールの中身を確認すれば決着します。
- 案: リンクを外すか、熱の広がり・熱拡散率に関係するページへのリンクに替える。en・zh-hant も同様に直す。

### fermi-dirac-and-boltzmann-in-semiconductors [P2 / overclaim / 確度 medium] all・body
> フェルミ準位からkTの3倍以上離れた席(上ならほぼ空、下ならほぼ満員)でだけ使えます。

- 問題: しくみ4では3kTを「目安」(差が5%以下になる境目)として説明しているのに、誤解の節では「でだけ使えます」と厳密な境界のように言い切っている。2kT程度でも、精度を割り切って使う場面はある。本文の中で食い違っている。en(works only for)とzh-hant(只有…才能使用)も同じ。
- 案: 「フェルミ準位からkTの3倍以上離れた席(上ならほぼ空、下ならほぼ満員)なら、よい近似として使えます(3kTは誤差5%以下の目安)。」/ en: "It is a good approximation for states at least about 3kT from the Fermi level (the rule of thumb for an error of 5% or less)." / zh-hant:「在離費米能階約kT的3倍以上的座位，是很好的近似（3kT是誤差在5%以下的大約標準）。」

### fermi-dirac-and-boltzmann-in-semiconductors [P2 / desc-mismatch / 確度 medium] all・body
> フェルミ準位が帯の近くや中に入ります。そこでは近似が使えず、フェルミ分布のまま扱います。このような半導体を{{term:縮退半導体}}と呼びます。

- 問題: 本文は、フェルミ準位が帯の「近く」(3kT以内)にある場合も縮退半導体に含めている。一方、用語集の説明文は「伝導帯や価電子帯の中に入り込んだ」場合に限っている。どちらの定義も教科書で使われるが、リンク先の説明文と食い違う。
- 案: 本文を「フェルミ準位が帯の端から3kT以内や帯の中に入ったものを、縮退半導体と呼びます」とする。あわせて用語集の説明文にも「帯の端の近く(3kT以内)」を加え、両者をそろえる。

### fermi-dirac-and-boltzmann-in-semiconductors [P2 / terminology / 確度 medium] en・body
> This number is called the {{term:真性キャリア密度|intrinsic carrier concentration}}, written ni.

- 問題: 用語集の英語の項目名は「Intrinsic carrier density」なのに、英訳の本文と数字の表では「intrinsic carrier concentration」を使っている。同じ記事の「Learn more」では「intrinsic carrier density calculator」と書いており、記事の中でも訳語がそろっていない。
- 案: Use "intrinsic carrier density" consistently (term link display, Key numbers table, Learn more), matching the glossary entry.

### fermi-dirac-and-boltzmann-in-semiconductors [P2 / overclaim / 確度 low] all・body
> そのためチップの設計では、高温での漏れ電流を必ず見積もります。

- 問題: 設計の慣習を「必ず」と言い切っている。定義や物理法則で成り立つことではないため、基準の「必ず」の使い方に当たる。en(always estimate)とzh-hant(一定會估算)も同じ。
- 案: 「そのためチップの設計では、一般に高温での漏れ電流を見積もります。」/ en: "So chip designers usually estimate leakage current at high temperature." / zh-hant:「所以在設計晶片時，一般會估算高溫下的漏電流。」

### fermi-dirac-and-boltzmann-in-semiconductors [P2 / other / 確度 low] all・body
> 最近の精密な見積もりは約1.0×10¹⁰や9.65×10⁹です。

- 問題: 出典に挙げた見直し(Altermatt ら)は2003年で、1.0×10¹⁰ も1990年代初めの値とされる。「最近」は時期によって意味が変わり、いつの時点かが書かれていない。
- 案: 「1990〜2000年代の精密な見積もりでは、約1.0×10¹⁰や9.65×10⁹(Altermatt ら、2003年)です。」のように時期を明記する。en・zh-hantも同様に直す。

### linear-algebra-for-ai-chips [P1 / translation / 確度 high] en・description
> and see why AI waits on memory

- 問題: 日本語の「バッチ1の推論が」という条件が落ち、「AI はメモリを待つ」と一般化している。また、「大きな行列の積は計算の上限で走る」という対の内容と、量子化への言及も抜けている。
- 案: Divide by bytes moved for arithmetic intensity, and see why batch-1 token-by-token inference waits on memory while large matrix multiplies run at the compute limit: roofline, quantization, systolic arrays.

### linear-algebra-for-ai-chips [P1 / overgeneralization / 確度 medium] all・description
> バッチ1の推論がメモリ待ちになり

- 問題: バッチ1でも、長い入力をまとめて処理するプリフィルは行列×行列になり、演算律速になりやすい(用語集の「プリフィル」の説明と食い違う)。畳み込みの層も同じ。メモリ待ちになりやすいのは、1トークンずつの生成(デコード)や全結合層の行列×ベクトルの場合。本文の「この記事でわかること」の「1人分ずつの推論がメモリ待ちになり」も同じ。zh-hant の説明文と本文も同じ問題がある。
- 案: 「バッチ1で1語ずつ生成する推論(行列×ベクトル)がメモリ待ちになりやすく」のように、条件を付ける。

### linear-algebra-for-ai-chips [P2 / translation / 確度 high] en・body
> One student's scores in History, Math and English

- 問題: 日本語は「国語」(国語の科目)で、「歴史」ではない。
- 案: One student's scores in Japanese, Math and English (80, 60, 70)

### linear-algebra-for-ai-chips [P2 / translation / 確度 high] zh-hant・sources
> (2mnk の数え方、演算強度、行列×ベクトルはメモリ律速)

- 問題: 繁体字版の出典の欄で、括弧の中の注記が日本語のまま訳されていない(すべての出典で同じ)。
- 案: （2mnk 的算法、運算強度、矩陣×向量為記憶體受限）のように、各注記を繁體中文に訳す。

### linear-algebra-for-ai-chips [P2 / factual / 確度 medium] all・body
> 0の多い表を省く工夫を使った値もある

- 問題: H100の仕様の疎の値は、4つの重みのうち2つが0という決まった形(2:4の構造化スパース)で、0との掛け算を省く場合の値。「0の多い表を省く」と書くと、表をまるごと飛ばすように誤解されるおそれがある。en の "skips tables full of zeros" と zh-hant の「省略大量0」も同じ。
- 案: 「重みの4つに2つを0にした場合(2:4の構造化スパース)に、0との掛け算を省いて数えた値もある」のように書き、{{term:構造化スパース}}へリンクする。

### quantum-tunneling-in-chips [P2 / overgeneralization / 確度 medium] all・body
> {{term:オーミック接触}}も、不純物を多く入れて壁を薄くし、トンネル効果で電流を通しています

- 問題: オーミック接触のすべてがトンネル効果で成り立つように読めます。シリコンの金属コンタクトでは高濃度ドープによるトンネルが一般的です。ただし、障壁が低い組み合わせで熱電子放出によってオーミックになる場合もあり、言い切りは広すぎます。
- 案: シリコンの{{term:オーミック接触}}の多くも、不純物を多く入れて壁を薄くし、トンネル効果で電流を通しています(en: Many ohmic contacts to silicon also work by tunneling… / zh-hant: 矽的許多歐姆接觸也是…)

### quantum-tunneling-in-chips [P2 / missing-condition / 確度 medium] all・body
> そのため室温では、電流を10倍にするのに、ゲートの電圧が少なくとも約60 mV要ります。

- 問題: 約60 mV/桁の下限が成り立つのは、しきい値より低い電圧の領域(サブスレッショルド領域)の電流です。この条件が書かれていないため、オンのときの電流にも当てはまるように読めます。
- 案: そのため室温では、しきい値より低い電圧の領域(サブスレッショルド領域)で電流を10倍にするのに、ゲートの電圧が少なくとも約60 mV要ります。

### quantum-tunneling-in-chips [P2 / other / 確度 low / 要出典] all・sources
> ただ、流せる電流が小さいことが大きな課題で、2020年代も研究の段階です。

- 問題: 「2020年代も研究段階」は時期によって変わる主張です。しかし TFET の出典は2011年の Nature 論文だけで、2020年代の状況を裏付けていません。同じく「2020年代の先端のトランジスタでも、この組み合わせ(High-k/メタルゲート)が使われています」も、出典は2007年の資料だけです。2020年代の総説やメーカー資料で確かめれば決着します。
- 案: 2020年代の状況を示す出典(TFET の近年の総説、先端プロセスの High-k/メタルゲート採用を示す資料)を追加し、「20xx年時点で」と時点を明記する。

### rc-time-constant-in-chips [P2 / missing-condition / 確度 medium / 要出典] ja・body
> 先端のチップの配線は10層以上に重なっていて

- 問題: 配線の層数は製品と世代で変わる情報です。いつの時点のどのチップの話かが書かれておらず、出典の欄にも裏付けがありません。
- 案: 「2020年代の先端のロジックチップでは、配線は10層以上に重なることが多く」のように時期を書き、層数を示す資料(メーカーの技術発表など)を出典に足す。

### rc-time-constant-in-chips [P2 / translation / 確度 medium] en・body
> This is called a distributed RC line.

- 問題: 日本語の本文にない用語の説明が、英語の訳に足されています。「Adding them is called repeater insertion.」も同じです。繁体字の「這稱為分佈式RC線路」も同じく足されています。内容は誤りではありませんが、言語の間で内容がそろっていません。
- 案: 日本語の本文に「これを分布RC線路と呼びます」「リピータを入れることを、リピータ挿入と呼びます」を足して、3つの言語をそろえる。または、英語と繁体字の訳からこれらの文を外す。

### rc-time-constant-in-chips [P2 / missing-condition / 確度 low / 要出典] ja・body
> 2000年前後から使われ始め、炭素を含む酸化膜ではkは3前後です

- 問題: 出典(Grill 2015)が示すのは「k = 3のSiCOHは90 nm世代から」で、「2000年前後」という年は出典の欄で裏付けられていません。2000年前後に先に使われたのはフッ素を含む酸化膜(FSG、kは約3.6)だと考えられますが、記憶に基づくため未確認です。90 nm世代の量産開始年と、FSGの導入時期を資料で確かめれば決着します。
- 案: 「2000年代の初めから使われ始め、90 nm世代からは炭素を含む酸化膜(kは3前後)が製品に使われました」のように世代と結び付け、年の根拠になる資料を出典に足す。

### what-is-a-capacitor [P2 / missing-condition / 確度 low] all・body
> 材料を替えて容量を稼ぐ考え方は、チップの中でも使われています。2007年のIntelを皮切りに

- 問題: High-k膜を採用した主な目的が書かれていません。目的は、膜を物理的に厚く保ってトンネル電流(漏れ電流)を抑えながら、薄いSiO2と同じ程度の容量を得ることでした。今の書き方だと、単に容量を増やすために材料を替えたと読める可能性があります。Intelの発表資料(2007-01-27)で、目的が漏れ電流の抑制と書かれているかを確かめれば決着します。
- 案: 「材料を替えて容量を保つ考え方は、チップの中でも使われています。2007年のIntelを皮切りに、先端のチップではゲートの下の膜が誘電率の高い材料に替わりました。膜を厚くして漏れる電流を抑えながら、必要な容量を確保するためです」のように、漏れ電流を抑える目的を一言足す(en・zh-hant も同じように直す)。

### what-is-a-resistor [P2 / translation / 確度 medium] en・figure
> as set by the international IEC standard and Japan's JIS standard

- 問題: 日本語の図の説明は「日本の規格で決められた図記号」だけです。英訳には IEC 規格という主張が足されていて、出典の欄にも IEC 規格はありません。JIS C 0617 は IEC 60617 に基づくので内容は正しいと考えられますが、原文と意味が違います。
- 案: The rectangle is the resistor symbol set by Japan's standard (JIS). ※IEC にも触れるなら、日本語の本文と出典の欄にも足す。

### what-is-a-resistor [P2 / translation / 確度 medium] zh-hant・figure
> 日本JIS標準與國際IEC標準所規定的圖形符號

- 問題: 英訳と同じく、日本語にない「国際IEC規格」が足されています。
- 案: 方框是電阻的符號（日本標準所規定的圖形符號）。

### what-is-a-resistor [P2 / terminology / 確度 medium] all・body
> この残る抵抗を{{term:オン抵抗}}と呼びます

- 問題: 本文は、チップの中の論理回路のトランジスタの残る抵抗を「オン抵抗」と呼び、用語ページへリンクしています。一方、用語集の説明文は「パワー半導体がオンのときの…抵抗」で、パワー半導体に限った定義です。リンク先を読んだ学習者が、話の対象のずれに戸惑います。
- 案: 用語集の説明文を「トランジスタ(とくにパワー半導体)がオンのときの、電流が流れる経路の抵抗」のように広げる。または本文に「パワー半導体ではとくに重要な値で」と一言添える。

### what-is-a-resistor [P2 / overclaim / 確度 low] all・body
> いちばん多い仕事は、流れる電流をちょうどよい大きさに抑えることです

- 問題: 「いちばん多い」は根拠のない最上級の言い切りです。抵抗器はプルアップ・分圧・終端などにも多く使われ、電流の制限が最多だという裏付けは出典の欄にありません。根拠となる統計があれば決着します。
- 案: 代表的な仕事の一つは、流れる電流をちょうどよい大きさに抑えることです。(en: One of its typical jobs is… / zh-hant: 它的代表性工作之一，是…)

### what-is-an-op-amp [P1 / translation / 確度 high] zh-hant・sources
> Texas Instruments: LM741 Operational Amplifier データシート(SNOSC25D。帰還なしの倍率は代表値200 V/mV

- 問題: 繁体字の出典の欄が日本語のまま(「データシート」「帰還なしの倍率は代表値」など)で、訳されていない。
- 案: Texas Instruments: LM741 Operational Amplifier 資料手冊(SNOSC25D。不加回授時的倍率典型值 200 V/mV、25 ℃ 時最小 50 V/mV……)のように、全項目を繁體中文に訳す。

### what-is-an-op-amp [P2 / missing-condition / 確度 medium] ja・body
> LM741を±15 Vの電源で使うと、出力は約±14 Vまでしか出せません。

- 問題: ±14 Vはデータシートの代表値で、負荷10 kΩ以上という条件付き(出典の欄にはある)。本文では条件が落ちている。スルーレート0.5 V/µsも代表値であることが書かれていない(本文・数字の表とも)。
- 案: 「出力は代表値で約±14 V(負荷10 kΩ以上)までです」「LM741では代表値0.5 V/µs」と条件を書く。en・zh-hantも同様に直す。

### what-is-an-op-amp [P2 / inconsistency / 確度 medium] ja・body
> 1つめの約束が使えるのは、負帰還をかけて、出力が電源の範囲の中にあるときだけです。

- 問題: 「よくある誤解」では成り立つ条件に「信号が速すぎないとき」も入っているが、ここでは「だけ」と言い切ったうえで、その条件が抜けている。二か所の条件が食い違う。
- 案: 「負帰還をかけて、出力が電源の範囲の中にあり、信号が速すぎない(倍率と速さの限界の内側にある)ときだけです」とそろえる。en・zh-hantも同様。

### what-is-an-op-amp [P2 / overclaim / 確度 medium] ja・body
> 2つの入力の電圧はまったく違います。

- 問題: 帰還なし・飽和時でも、入力の差がわずかなことは多い(本文自身が「入力の差がわずかでも張りつく」と書いている)。「まったく違う」と言い切るのは言い過ぎ。enは「can be at very different voltages」と弱めており、ja・zh-hant(完全不同)と意味がずれている。
- 案: 「2つの入力の電圧は等しくなるとは限らず、大きく違うこともあります」とする。zh-hantは「2個輸入的電壓不一定相等，也可能相差很大」。

### what-is-an-op-amp [P2 / overclaim / 確度 low / 要出典] ja・body
> 25 ℃で保証される最小値は5万倍で、温度が変わればさらに下がります。

- 問題: データシートでは、温度範囲全体での保証最小値が25 ℃のときより低く定められている(LM741では25 V/mVと記憶しているが要確認)。ただし、温度が変われば必ず倍率が下がるわけではない。出典の欄にも、温度範囲での値が書かれていない。
- 案: 「温度範囲全体では、保証される最小値はさらに低くなります」とし、温度範囲での最小値を出典の欄に加える。

## how-chips-are-made

### how-chips-are-made [P2 / inconsistency / 確度 medium / 要出典] all・body
> 「膜をつける・光で模様を写す・削る」を数十回くり返し

- 問題: 冒頭・説明文・「よくある誤解」では「数十回」と書く一方、本文後半と「数字で見る」では、ASMLの説明として模様を写す作業が「100回以上」とある。どちらが一般的な値で、どちらが最先端のチップの値かが冒頭では示されていない。初学者は回数を取り違えやすい。なお、「数字で見る」の「最先端のチップを作り上げるまでに」という限定が、ASMLの出典の記述と合っているかも確認が必要。
- 案: 冒頭を「数十回から、最先端のチップでは100回以上くり返し」のように書き、説明文・誤解の節の「数十回」も同じ範囲の書き方にそろえる。en・zh-hant も同様に直す。

### how-chips-are-made [P2 / missing-condition / 確度 low] all・body
> ガラスの板に、光をさえぎる膜で回路の模様が描かれています。

- 問題: 透過型マスクの説明だけになっている。用語集の説明文にあるとおり、EUVでは反射型のマスクを使う。この記事は「もっと詳しく学ぶ」でEUV露光の解説へ案内しているため、すべてのマスクが透過型だと受け取られるおそれがある。
- 案: 「ガラスの板に、光をさえぎる膜で回路の模様が描かれています(EUV露光では、光を反射させる型のマスクを使います)。」のように補う。

### how-chips-are-tested [P2 / translation / 確度 medium] en・body
> Careers: testing and yield each have their own specialists, called test engineers and yield engineers.

- 問題: 日本語は、テストエンジニア・歩留まりエンジニアの仕事を記事「半導体業界にはどんな仕事がある?」で紹介すると案内している。英語ではこの記事への案内が落ちていて、意味の違う文になっている。英語版にその記事がない場合は、意図的に省いた可能性もある。
- 案: Careers: the work of test engineers and yield engineers is introduced in "What Jobs Are There in the Semiconductor Industry?"

### how-chips-are-tested [P2 / translation / 確度 medium] zh-hant・body
> 從工作的角度了解：測試和良率各有專門的人員，稱為測試工程師和良率工程師。

- 問題: 英語と同じく、日本語にある関連記事への案内が繁体字で落ちている。
- 案: 從工作的角度了解：測試工程師和良率工程師的工作，在「半導體產業有哪些工作？」中介紹。

### how-chips-are-tested [P2 / translation / 確度 medium] en・body
> Chips tend to fail soon after they are first used.

- 問題: 日本語は「故障は使い始めてすぐの時期に起こりやすい」(故障が起きる時期の傾向)という意味。英語は「チップはすぐ壊れがちだ」(多くのチップが早く壊れる)とも読めて、誤解を招く。
- 案: Chip failures tend to occur soon after the chips are first put into use.

### how-chips-are-tested [P2 / overgeneralization / 確度 low / 要出典] all・body
> 回路を1回だけ動かし、結果を出口から順に取り出して

- 問題: 縮退故障のスキャンテストでは、取り込みのクロックは1回が基本。一方、速さを確かめる遷移遅延のテストでは、送り出しと取り込みの2回のクロックを使うのが一般的なので、「1回だけ」は言い切りすぎの可能性がある。図の「② 回路を1回だけ動かす」も同じ。DFT の教科書(例: NYCU の Ch.8)で、at-speed スキャンの手順を確かめれば決着する。
- 案: 回路を少しだけ(多くは1回)動かし、結果を出口から順に取り出して

### how-electron-microscopes-work [P2 / overgeneralization / 確度 medium] all・body
> FIBは、ガリウムという金属のイオンを細く絞って当て

- 問題: ガリウムのイオンを使うFIBが一般的だが、キセノンなどのプラズマFIBもある。「FIBは、ガリウムを使う」と言い切ると、FIBの定義のように読める。
- 案: 「多くのFIBは、ガリウムという金属のイオンを細く絞って当て、…」(en: "Most FIBs focus a narrow beam of gallium ions…"、zh-hant: 「多數FIB是把鎵離子聚焦得很細來照射…」)

### how-electron-microscopes-work [P2 / inconsistency / 確度 medium] all・body
> SEMは、電子のビームを、幅数nmの小さな点に絞ります。

- 問題: ビームの点を「幅数nm」としているが、同じ節で「高性能な装置では、1nm以下の細かさまで見分けられます」と書いている。数nmの点で1nm以下が見分けられる理由が書かれておらず、読む人が混乱しやすい。高性能なSEMでは、点の幅が1nm以下まで絞られる。
- 案: 「SEMは、電子のビームを、幅数nm以下(高性能な装置では1nm以下)の小さな点に絞ります。」とし、en・zh-hant も同じように直す。

### how-electron-microscopes-work [P2 / overclaim / 確度 low / 要出典] all・body
> 収差を補正した最高性能のTEMでは、0.05nmの細かさが確かめられています。

- 問題: 出典は2008年の発表(TEAM 0.5)で、その時点の最高の値である。図の説明(「TEMは収差を補正した最高性能の装置の値」)も合わせて、今も最高の値のように読める。2008年より後に、電子線タイコグラフィなどで0.05nmより細かい分解能が報告されている可能性がある。最新の記録を出典で確かめる必要がある。
- 案: 「2008年に発表された、収差を補正したTEMでは、0.05nmの細かさが確かめられています。」とし、図の説明も「(TEMは2008年に発表された、収差を補正した装置の値)」とする。en・zh-hant も同じように直す。

### what-is-a-cleanroom [P1 / overclaim / 確度 medium] all・body
> 外の空気より1万倍以上きれいな空気を、一年中休まず作り続けています。

- 問題: 1万倍は、外気をクラス9の上限、部屋をクラス5とした場合の比です。本文は外気について「多いとクラス9」としており、人が働く部屋は「ゆるい基準」だとも書いています。そのため、クリーンルームの空気が一般に外気の1万倍以上きれいだとは言えず、本文の前の説明と食い違います。
- 案: 「ISOクラス5の部屋なら、汚れた都市の外気(クラス9相当)と比べて、0.5 µm以上の粒の上限が1万分の1です」のように、条件を付けて書く。

### what-is-a-cleanroom [P2 / terminology / 確度 high] zh-hant・body
> {{term:HEPAフィルタ|高效率空氣微粒過濾器（HEPA）}}

- 問題: 用語集の zh-hant の用語名は「HEPA濾網」「ULPA濾網」「氣態分子汙染(AMC)」ですが、本文では「高效率空氣微粒過濾器（HEPA）」「超高效率過濾器（ULPA）」「氣態分子汙染物（AMC）」と別の名前で表示しています。
- 案: 用語集の名前に合わせ、{{term:HEPAフィルタ|HEPA濾網}}、{{term:ULPAフィルタ|ULPA濾網}}、{{term:分子状汚染(AMC)|氣態分子汙染（AMC）}}とする。

### what-is-a-cleanroom [P2 / missing-condition / 確度 medium] all・body
> | 9 | — | 3,520万個 | 都市の外気に近い

- 問題: 本文では「都市の外気は、多いとクラス9に当たる」と条件付きで書いています。一方、表と「数字で見る」では「都市の外気に近い」と言い切っており、「多いと(汚れた場合)」という条件が落ちています。
- 案: 「汚れた都市の外気に相当」など、条件を残した表現にする(en・zh-hant も同様)。

### what-is-a-cleanroom [P2 / overgeneralization / 確度 medium / 要出典] all・body
> フィルターを通したきれいな空気は、天井に並べたフィルターから、まっすぐ下へ向けて流します。

- 問題: 天井全面から床下へ流す一方向流は、主に高い清浄度(ISOクラス5前後より厳しいもの)で使う方式です。清浄度のゆるい部屋では、非一方向流(乱流方式)や、穴のない床も一般的です。後の節で「人が働く部屋は基準がゆるい」と書いているので、すべてのクリーンルームがこの方式だと読める書き方は誤解を招きます。
- 案: 「特にきれいさが求められる部屋では」など、方式を使う条件を加える。ゆるいクラスの部屋では別の流し方もあることを一言添える。

### what-is-a-cleanroom [P2 / other / 確度 medium] ja・body
> 米国などの規格では、試す粒の大きさや割合が少し違います。通り抜けるのは、100万個に5個以下です。

- 問題: 「100万個に5個以下」はJISの99.9995%に当たる値です。ところが米国などの規格の文のすぐ後に置かれているため、規格によらない値のように読めます。英語版は「Under the JIS definition」と条件を補っています。zh-hant も日本語と同じ並びです。
- 案: 「JISの定義では、通り抜けるのは100万個に5個以下です。」と書き、米国などの規格の文の前に置く(zh-hant も同様)。

### what-is-a-cleanroom [P2 / translation / 確度 medium] zh-hant・body
> 穿過的不到3個

- 問題: 日本語は「3個以下」(≦3)ですが、訳は「不到3個」(<3)で、境界の扱いが変わっています。ULPAの「不到5個」も同じです。
- 案: 「穿過的最多3個」「每100萬個最多5個」とする。

### what-is-a-cleanroom [P2 / inconsistency / 確度 low] all・body
> 風の速さの目安は、秒速0.3〜0.5 mほどです。

- 問題: 出典の欄(PACE)の目安は0.2〜0.5 m/sで、本文の範囲と一致しません。本文の範囲を狭くした根拠が出典にありません。
- 案: 出典に合わせて「秒速0.2〜0.5 mほど」とし、計算例も「6〜15秒」に直す。または、0.3〜0.5 m/sを裏付ける出典を加える。

### what-is-a-cleanroom [P2 / other / 確度 low / 要出典] all・body
> 最先端のものでは100回以上くり返して作ります

- 問題: 最先端チップの露光の回数(マスクの枚数)は、製品と時期で変わる数値です。出典の欄に裏付けがなく、いつの時点の話かも書かれていません。業界資料で確かめる必要があります。
- 案: 露光の回数(マスク枚数)を示す出典を加え、「20xx年時点の最先端のロジックでは」のように時期を書く。

### what-is-a-printed-circuit-board [P2 / terminology / 確度 medium] zh-hant・body
> 這種方法稱為{{term:リフローはんだ付け|迴焊}}（也寫作回焊）

- 問題: 用語集の zh-hant の項目名は「回焊焊接」。本文と説明文は「迴焊」を主な名前にしていて、項目名とそろっていない。台湾では「迴焊」「回焊」のどちらも使われるが、サイトの基準では、用語集に項目がある概念はその項目名を使う。
- 案: 這種方法稱為{{term:リフローはんだ付け|回焊焊接}}（簡稱回焊，也寫作迴焊）。說明文和其他段落的「迴焊」也一併改為「回焊」。

### what-is-a-silicon-wafer [P1 / translation / 確度 high] en・body
> A small number of specialist companies make most of the world's wafers.

- 問題: 日本語は「日本はウエハを作る会社が強い国として知られる」という文。英訳ではこの内容が落ち、「少数の専門企業が世界のウエハの大半を作る」という、日本語にない市場集中の主張が足されている。出典の裏付けもない。
- 案: Japan is also known for its strong wafer makers. Two of the five main makers are Japanese (they are listed near the end).

### what-is-a-silicon-wafer [P2 / translation / 確度 high] zh-hant・body
> 台灣的環球晶圓也名列其中

- 問題: 日本語の原文にない記述が、訳だけに足されている。
- 案: 刪除「台灣的環球晶圓也名列其中」，與日文一致：全球主要的晶圓製造商中，有2家是日本公司（後半會介紹）。

### what-is-a-silicon-wafer [P2 / translation / 確度 high] en・description
> holds hundreds of chips

- 問題: 日本語の説明文は「数百〜数千個」。英訳では「数千」が落ちていて、本文の「Hundreds to thousands」とも合わない。
- 案: A silicon wafer is a polished disc of single-crystal silicon on which hundreds to thousands of chips are built.

### what-is-a-silicon-wafer [P2 / missing-condition / 確度 high] all・body
> 外周に小さなV字の切り欠きを入れます。結晶の並びの向きを示す目印で、ノッチと呼びます。

- 問題: 用語集の説明文では、ノッチは200 mm以上のウエハで使い、それより小さいウエハではオリエンテーションフラットを使うとしている。本文には直径の条件がなく、どのウエハにもノッチを入れるように読める。
- 案: 外周に小さなV字の切り欠きを入れます(200 mm以上のウエハの場合。小さいウエハでは外周の一部を直線に削ったオリエンテーションフラットを使います)。

### what-is-a-silicon-wafer [P2 / overgeneralization / 確度 medium] all・body
> この板の上で、チップを数百〜数千個まとめて作ります。

- 問題: 1枚から取れるチップの数は、チップの大きさで大きく変わる。300 mmのウエハでも、大きなチップなら数十個、小さなチップなら数万個になる。「数百〜数千個」と言い切ると、範囲が決まっているように読める。
- 案: この板の上で、チップを(大きさによって数十〜数万個、多くは数百〜数千個)まとめて作ります。

### what-is-a-silicon-wafer [P2 / overgeneralization / 確度 medium] all・body
> 大手は11個の「イレブンナイン」が標準。2026年の報道

- 問題: 本文では「国内の大手メーカー(1社の報道)が当然の水準としている」と書いている。一方、数字の表では「大手は11個が標準」となっており、業界の大手全体の標準のように広げて書いている。英語の表も「major makers」と複数形になっている。
- 案: 国内の大手メーカーは11個の「イレブンナイン」を当然の水準とする。2026年の報道 / en: a major Japanese maker treats 11 nines as the expected level; news report, 2026

### what-is-a-silicon-wafer [P2 / translation / 確度 medium] en・body
> this growth method is the best way to make large, high-quality single crystals

- 問題: 日本語は「この育て方が向いている」。英語は「the best way」と強く言い切っており、繁体字の「最合適」も同じ。日本語より強い主張になっている。
- 案: Even so, this growth method is well suited to making large, high-quality single crystals.

### what-is-a-silicon-wafer [P2 / other / 確度 low / 要出典] all・sources
> 2026年の時点でも、量産で使う最大のウエハは300 mmです。

- 問題: 「2026年時点」の状況を述べているが、出典の欄で450 mmに触れているのは2017年の記事だけ。2026年時点の状況を裏付ける出典がない。
- 案: 2026年時点の状況を示す資料(SEMIの報告など)を出典に加える。加えられない場合は「2017年の報道の時点で」など、出典の時点に合わせた書き方にする。

### what-is-chip-packaging [P2 / translation / 確度 high] zh-hant・body
> 用這種膜的基板，業界也常稱為「ABF載板」

- 問題: 日本語の原文にない説明が訳に足されている。
- 案: 「這種膜廣泛使用的是味之素開發的ABF。」で文を終え、追加の文を削除する(または日本語・英語にも同じ内容を足す)。

### what-is-chip-packaging [P2 / inconsistency / 確度 medium / 要出典] ja・sources
> CoWoS の生産能力を1年で2倍以上に

- 問題: 本文の「翌年もさらに2倍以上にする考え」が、日本語と繁体字の出典メモで裏付けられていない。英語の出典メモには「aiming to double again」があり、言語の間で出典メモの範囲が違う。The Register の記事に翌年の計画が書かれているかを確かめれば決着する。
- 案: 出典メモを「2024-07-18。CoWoS の生産能力を1年で2倍以上にし、翌年もさらに2倍以上にする計画」とし、繁体字も同じ内容にそろえる(記事で確認できた場合)。

### what-is-chip-packaging [P2 / terminology / 確度 medium] zh-hant・body
> 這項作業稱為{{term:ダイボンディング|黏晶}}，也叫晶粒接合。

- 問題: 用語集の繁体字の項目名は「晶粒接合」だが、本文のリンク表示と図(④ 黏晶)では「黏晶」を主な名前にしている。サイト内の用語の統一の基準に合わない。
- 案: 「這項作業稱為{{term:ダイボンディング|晶粒接合}}，也叫黏晶。」とし、図の「④ 黏晶」も「④ 晶粒接合」にそろえる。

### what-is-chip-packaging [P2 / missing-condition / 確度 medium] all・body
> このとき250 ℃前後まで温まり

- 問題: 245〜260 ℃前後のピーク温度は鉛フリーはんだの場合の値。J-STD-020 では、すずと鉛のはんだの分類温度はもっと低い(220〜235 ℃程度)。条件が書かれておらず、どのはんだでも250 ℃と読める。数字で見る表の「245〜260 ℃」も同様。
- 案: 「鉛を含まないはんだでは、このとき250 ℃前後まで温まり」とし、表の説明にも「鉛フリーはんだの場合」を足す(en: "with lead-free solder"、zh-hant: 「使用無鉛焊料時」)。

### what-is-chip-packaging [P2 / overgeneralization / 確度 low] all・body
> 線の太さは、およそ15〜50 µmです

- 問題: 15〜50 µm は IC 向けの金・銅のワイヤの範囲。パワー半導体ではアルミの太い線(数百µm)も使うので、すべてのワイヤボンディングに当てはまるように読める。出典は特定のメーカーの金・銅線の製品紹介。
- 案: 「ICでよく使う金や銅の線の太さは、およそ15〜50 µmです(大電流のパワー半導体では、もっと太いアルミの線も使います)」のように条件を付ける。

### what-is-chip-packaging [P2 / overgeneralization / 確度 low] all・body
> 1つのパッケージに複数のチップを入れ、1つの部品のように働かせる技術が広がっています。これをまとめて、先端パッケージと呼びます。

- 問題: 先端パッケージは、一般に1つのチップのファンアウト型WLP(本文で紹介した A10 の InFO など)や細かいフリップチップも含む呼び方。複数のチップを入れるものだけが先端パッケージだと読める。冒頭の「複数のチップを1つに包む「先端パッケージ」」も同様。業界の資料(Yole など)での先端パッケージの範囲を確かめれば決着する。
- 案: 「ファンアウト型WLPなど、細かい配線や接続を使うパッケージを先端パッケージと呼びます。中でも、1つのパッケージに複数のチップを入れる技術が広がっています。」のように、複数のチップを入れるものを代表例として書く。

### what-is-cmp [P2 / overgeneralization / 確度 medium] all・body
> 凹凸が残ると次の層の模様を写すときにピントが合わないので、層を重ねるたびに行います。

- 問題: 実際の工程では、膜をつけるたびに毎回CMPを行うわけではありません。CMPを行うのは、STI・コンタクト/ビア・各配線層など平坦化が必要な層です。冒頭と「身近なところでは」の段落(「層を重ねるたびに表面を磨いて平らに戻します」)は「毎回」と読めます。後半の誤解の節では「何度も」と書いていて、こちらが正確です。en・zh-hant も同じ言い方です。
- 案: ja: 「…ピントが合わないので、平らさが必要な層を作るたびに何度も行います。」/ en: "So CMP is done many times, whenever a layer needs to be flat." / zh-hant: 「所以在需要平坦的層，每次都要做CMP，整個過程要做很多次。」

### what-is-cmp [P2 / missing-condition / 確度 medium / 要出典] all・body
> CMPの装置の主なメーカーは、米国のアプライド・マテリアルズと、日本の荏原製作所です。

- 問題: 「主なメーカー」は、市場シェアにもとづく時期で変わる主張です。出典の欄には各社の製品・沿革の資料しかなく、シェアを裏付けるものがありません。何年時点の話かも書かれていません。
- 案: ja: 「20xx年時点で、CMP装置の主なメーカーは…(出典: 市場調査資料)」のように時期と出典を加える。en: "As of 20xx, the main makers of CMP tools are…" / zh-hant: 「截至20xx年，CMP設備的主要廠商是…」

### what-is-etching [P2 / overclaim / 確度 medium / 要出典] all・body
> ラムリサーチは2024年7月、深さが幅の50倍を超える穴を、上から下までほぼ同じ太さで削れると発表しました。

- 問題: 出典の欄では、「深さが幅の50倍超」はラムリサーチ自身の主張ではなく、発表文に引用された調査会社の評とされている。本文と「数字で見る」の表(同社の発表)は、これをラムリサーチの主張として書いている。発表文の中で誰の言葉かを確かめる必要がある。
- 案: 「ラムリサーチは2024年7月、深さ最大10 µmの穴を、上下の太さの差0.1%未満で削れると発表しました(発表に引用された調査会社の評では、深さが幅の50倍を超える穴)。」のように書き分け、表の「(同社の発表)」も「(同社の発表に引用された調査会社の評)」に改める。

### what-is-etching [P2 / inconsistency / 確度 medium] all・body
> 薬液は、膜にふれた所ならどこでも同じように溶かします。下へ進むのと同じ速さで、横にも削れていきます。

- 問題: 薬液すべてが等方的に溶かすと言い切っている。しかし同じ記事の「よくある誤解」では、結晶の向きで溶ける速さが違う薬液(角ばった形に削れる)を挙げており、記事の中で食い違っている。
- 案: 「多くの薬液は、酸化膜のような膜にふれた所ならどこでも同じように溶かします。」のように「多くの」「酸化膜のような膜では」といった条件を付ける。

### what-is-etching [P2 / translation / 確度 medium] en・body
> A depth of 5–6 µm is less than a tenth of the width of a hair (about 0.09 mm).

- 問題: 日本語は「十数分の1」(90 µm ÷ 5〜6 µm ≒ 15〜18)だが、英訳は「10分の1未満」となっていて、意味の細かさが日本語とそろっていない。
- 案: A depth of 5–6 µm is roughly one fifteenth of the width of a hair (about 0.09 mm).

### what-is-etching [P2 / missing-condition / 確度 low / 要出典] all・body
> その層を上から下まで貫く穴をあけ、穴に沿ってデータを覚える小さな部品(セル)を作ります。

- 問題: 層数の多い3D NANDでは、層を何段(デッキ)かに分けて、段ごとに穴をあけてつなぐ製品が多いとされる。そのため「何百層を1度に貫く穴をあける」と受け取られるおそれがある。各社の製品で段の数を確かめれば決着する。
- 案: 「その層を上から下まで貫く穴をあけ(層が多い製品では、何段かに分けてあけてつなぐこともあります)、…」と補う。

### what-is-euv-lithography [P2 / missing-condition / 確度 medium / 要出典] all・body
> 2024年に出荷が始まった装置(NXE:3800E)では、1時間に最大220枚です

- 問題: 露光装置のスループット(枚/時)は、ふつうある露光量(ドーズ、mJ/cm²)を前提にした値です。その条件が書かれていません。本文の後半では、光を多く当てるとスループットが下がると説明しています。そのため条件がないと、どの条件でも220枚と読まれるおそれがあります。年次報告に前提の露光量が書かれているかを確かめる必要があります。
- 案: 「…1時間に最大220枚です(ASMLが公表する、ある露光量での値。2024年の年次報告)」のように、前提の露光量または『決まった条件での最大値』であることを添える。en・zh-hant も同様に直す。

### what-is-euv-lithography [P2 / factual / 確度 low / 要出典] all・body
> 2024年に出荷が始まった装置(NXE:3800E)

- 問題: 出典には「1時間に最大220枚」と、ラピダスへの搬入(2024-12)は書かれています。しかし、NXE:3800Eの出荷が始まった年は、出典の欄からは確かめられません。最初の出荷は2023年末とする情報もある可能性があります。ASMLの四半期の発表か年次報告で、最初の出荷の時期を確かめる必要があります。
- 案: 出荷が始まった時期を出典で確かめ、その出典を出典の欄に加える。確かめられない場合は「2024年の年次報告で紹介されている装置(NXE:3800E)」のように、年を断定しない書き方にする。

### what-is-ion-implantation [P2 / missing-condition / 確度 medium / 要出典] all・body
> 高性能なスマホのチップには、トランジスタという小さなスイッチが100億個以上入っています

- 問題: 製品の世代で変わる数値なのに、時点(何年ごろの製品か)が書かれていない。出典の欄にも、これを裏付ける資料がない。
- 案: 「2020年代の高性能なスマホのチップには、100億個以上入っているものがあります」のように時点と範囲を書き、メーカーの発表などの出典を出典の欄に足す(en・zh-hant も同様に直す)。

### what-is-ion-implantation [P2 / translation / 確度 medium] en・description
> implanter stages, how dose and depth are set, resist masks, damage, anneal and channeling.

- 問題: 日本語の説明文は最後に「装置の種類」を挙げ、チャネリングは挙げていない。英語ではチャネリングが足され、装置の種類が落ちていて、説明文の内容が日本語とそろっていない。
- 案: How ion implantation fires dopants like boron into silicon: implanter stages, how dose and depth are set, resist masks, damage and annealing, and the types of implanters.

### what-is-photolithography [P2 / inconsistency / 確度 medium] ja・body
> チップができるまでに何十回もくり返され

- 問題: 冒頭では「何十回」とある。一方、後の段落と「数字で見る」の表では、ASMLの説明として「100回以上」とあり、回数が食い違って見える。さらに、まとめの「1枚のウエハに約100回」は1層あたりのショット数を指す。2つの「100回」の意味が違うため、混同を招く。
- 案: 冒頭を「チップができるまでに何十回から100回以上もくり返され」とする。まとめは「1層ごとに1枚のウエハへ約100回(ショット)」と書き、何の回数かを明示する。

### what-is-photolithography [P2 / overgeneralization / 確度 medium] ja・body
> 1回に写す範囲には、チップ1個から数個分の模様がまるごと入ります

- 問題: 26 mm × 33 mmの範囲には、小さいチップなら数十個以上入ることもある。「1個から数個」と言い切ると誤解を招く。
- 案: 「1回に写す範囲には、チップの大きさに応じて1個から数十個分の模様がまるごと入ります」とする。

### what-is-photolithography [P2 / missing-condition / 確度 medium] ja・body
> 材料は約152 mm角の石英ガラスの板で、光をさえぎる膜で模様が描かれています

- 問題: EUV用のマスクは反射型で、低熱膨張の基板の上の多層膜と吸収膜で模様をつくる。光を通す石英に遮光膜、という説明は当てはまらない。用語集の説明文にはEUVの例外が書かれているのに、本文では落ちている。
- 案: 「(DUVなどの場合)…光をさえぎる膜で模様が描かれています。EUVでは光を反射する型のマスクを使います」と条件を足す。

### what-is-photolithography [P2 / translation / 確度 medium] en・description
> usually shrinking the mask to 1/4

- 問題: 縮めるのはマスクそのものではなく、マスクの模様(を投影した像)。日本語の「原版の回路の模様を縮めて写す」と意味がずれている。
- 案: usually shrinking the mask pattern to 1/4

### what-is-photolithography [P2 / overclaim / 確度 low] ja・body
> EUVの装置はとても高価なので、粗い層には使いません

- 問題: 費用の面から一般にそうする、という慣行を、例外のない言い切りで書いている。
- 案: 「EUVの装置はとても高価なので、一般に粗い層には使いません」とする。

### what-is-plasma [P2 / overclaim / 確度 medium] all・body
> 工場のプラズマは電子だけが勢いよく動き、ガスは室温に近いので

- 問題: 「電子だけが勢いよく動き」と言い切っています。後のシースの節では、イオンが数十〜数百 V で加速されてウエハに当たると説明しており、矛盾して読めます。熱いのが電子だけなのは、プラズマの本体の中での話です。
- 案: 「工場のプラズマの中では、熱いのは電子だけで、ガスは室温に近いので」のように、プラズマの本体の中での話であることと、熱(温度)の話であることを明示する。en・zh-hant の冒頭と「電気の力で加速された電子だけが勢いをため込み」の箇所も同じように直す。

### what-is-plasma [P2 / overgeneralization / 確度 medium] all・body
> プラズマは空気を抜いた容器の中で、電気をかけている間だけ保たれ、電気を止めればすぐに消えます。

- 問題: 主語が「プラズマ」一般になっていて、言い切りが強すぎます。冒頭で例に挙げた雷・オーロラ・太陽は容器の中のプラズマではありません。大気圧プラズマを使う装置もあります。工場の低い圧力のプラズマに限った話です。zh-hant の「電漿只在…」も同じです。
- 案: 「工場で加工に使うプラズマは、空気を抜いた容器の中で、電気をかけている間だけ保たれ…」と、対象を限る。zh-hant も「工廠加工用的電漿只在…」とする。

### what-is-plasma [P2 / inconsistency / 確度 medium] all・body
> そのため底は速く、横はゆっくりしか削れず、縦にまっすぐな溝や穴ができます。方向によって削れる速さが違うこの削り方を、{{term:異方性エッチング}}と呼びます。

- 問題: 本文は異方性エッチングを「方向によって削れる速さが違う」と正しく説明しています。一方、用語集の説明文は「特定の方向にだけエッチングが進む」と「だけ」で言い切っていて、本文と食い違います。
- 案: 用語集の説明文を「方向によってエッチングの速さが異なり、主に垂直方向に速く進む性質」のように直し、本文とそろえる(en・zh-hant の desc も同様)。

### what-is-plasma [P2 / other / 確度 low] ja・body
> 高周波とは、向きが1秒間に何百万回も入れ替わる電気のことです。多くの装置は、工業・科学・医療用に割り当てられた13.56 MHz(1秒間に1,356万回)

- 問題: 直前で高周波を「向きが入れ替わる回数」で説明しているため、「1,356万回」が向きの入れ替わりの回数と読めます。向きの反転は1周期に2回あるので、反転の回数は約2,712万回です。1,356万回は周期(往復)の回数です。en は「cycles」なので問題ありません。
- 案: 「13.56 MHz(1秒間に1,356万回の往復)」のように、周期の数であることを示す。zh-hant は「每秒往返1,356萬次」とする。

### what-is-plasma [P2 / inconsistency / 確度 low / 要出典] all・body
> 約10倍 | イオンとラジカルを同時に当てたとき、別々のときの合計と比べた削れる速さ(1979年の実験)

- 問題: 本文では、この実験を「フッ素を出すガスとイオンを同時に当てた」と書いています。一方、数字の表では「イオンとラジカル」と書いていて、言い方がずれています。Coburn と Winters の実験は、XeF2 のガスと Ar イオンのビームを使ったもので、プラズマのラジカルではなかったと記憶しています。原論文で、使った粒と約10倍という比を確かめる必要があります。
- 案: 表を「フッ素を出すガスとイオンを同時に当てたとき、別々のときの合計と比べた削れる速さ(1979年の実験)」とし、本文とそろえる。

### what-is-plasma [P2 / missing-condition / 確度 low / 要出典] all・sources
> 中の圧力は、削る装置ならおよそ0.1〜数十 Pa(パスカル)です。

- 問題: エッチング装置の圧力の範囲(0.1〜数十 Pa)と、イオンの加速電圧(数十〜数百 V)は、出典の欄のどの資料に基づくかがわかりません。どちらも装置の方式(CCP・ICP)で大きく変わる値です。
- 案: 出典の欄に、これらの値を確かめた資料を追加し、方式による違い(例: ICP は低め、CCP は高め)を一言添える。資料が見つからない場合は「目安」と明記する。

### what-is-thin-film-deposition [P2 / overgeneralization / 確度 medium] all・body
> PVDは、化学反応を使わずに、材料の原子をそのまま運んで積もらせる方法です。

- 問題: PVDを「化学反応を使わない」と言い切っている。用語集の「反応性スパッタリング」は、窒素などの反応性ガスと反応させてTiNなどの膜をつくるPVDとして説明しており、食い違う。本文で触れる銅の拡散を防ぐ膜(TaN・TiNなど)も、この方法でつけることが多い。
- 案: PVDは、基本的には化学反応を使わずに、材料の原子をそのまま運んで積もらせる方法です(窒素などと反応させて窒化物の膜をつくる反応性スパッタリングもあります)。

### what-is-thin-film-deposition [P2 / translation / 確度 medium] en・body
> In {{term:CVD|CVD}}, source gases react chemically above the wafer.

- 問題: 「above the wafer」は、ウエハの上の空間(気相)で反応するように読める。次の段落の「The reaction happens mostly on the hot surface of the wafer」と食い違い、日本語の「ウエハの上で」の意味(表面で)からもずれる。
- 案: In CVD, source gases react chemically on the wafer.

### what-is-thin-film-deposition [P2 / terminology / 確度 medium] zh-hant・body
> 這種空隙稱為孔洞（void）

- 問題: 同じ記事の中で「孔洞」を、穴(hole)の意味(「深溝槽和孔洞」)にも、ボイド(void)の意味にも使っており、紛らわしい。用語集のHDP-CVDの説明文では、ボイドを「空洞」と訳している。
- 案: 這樣內部就會留下空洞，造成導線變細或斷線。這種空洞稱為void。

### what-is-thin-film-deposition [P2 / translation / 確度 low / 要出典] en・body
> Finland's Tuomo Suntola and a co-inventor filed a patent

- 問題: 日本語は「スントラら」で、共同発明者が1人とは書いていない。en と zh-hant は「共同発明者1人」と具体的に足している。出典の欄には、発明者の人数を裏付けるものが見当たらない。
- 案: In 1974, Tuomo Suntola and his colleagues in Finland filed a patent(zh-hant: 芬蘭的 Tuomo Suntola 等人在1974年申請專利)

### what-is-thin-film-deposition [P2 / other / 確度 low / 要出典] all・sources
> こうした極薄の膜を、そろった厚さでつけるのにALDが使われます。

- 問題: High-kのゲート絶縁膜をALDでつけるという主張を裏付ける出典が、出典の欄にない。挙がっているIntelの資料は、材料をハフニウム系に替えたことの裏付けにとどまる。成膜方法まで書いているかは未確認。
- 案: High-k膜の成膜にALDを使うことを示す資料(教科書・論文・メーカーの技術文書)を出典に加える。加えられない場合は「ALDがよく使われます」と書き、何の資料に基づくかを明記する。

## industry-news

### jobs-in-the-semiconductor-industry [P2 / overgeneralization / 確度 medium] ja・body
> 何十億個ものトランジスタを、人の手で1個ずつ描くことはできないからです。

- 問題: 「何十億個」は大規模なデジタルチップの話です。マイコンやアナログのチップでは、トランジスタはずっと少ない数です。また、同じ記事で紹介するアナログ・RF設計では、トランジスタを1個ずつ手で配置・描画するレイアウトが今も一般的です。このため「チップの設計は手で描けない」という一般化は誤解を招きます。
- 案: 「大規模なデジタルのチップには何十億個ものトランジスタがあり、人の手で1個ずつ描くことはできないからです(アナログ回路などでは、今も人がレイアウトを細かく描く部分があります)。」

### jobs-in-the-semiconductor-industry [P2 / inconsistency / 確度 low / 要出典] ja・sources
> 10年で4万人採用目指す、半導体メーカー8社が若手人材を熱望(2022年11月。CEATEC 2022でJEITAと共同出展した国内の半導体メーカー8社)

- 問題: 本文は内閣府の報告を引き、「9社で約4万3千人」と書いています。一方、出典の欄の EE Times の記事は「8社で4万人」です。本文で使っていない別の数値が出典に並ぶため、読者がどちらの値が正しいか迷います。2つが別の時点の試算なのか(社数や人数が改められたのか)を、JEITA の元の発表で確かめる必要があります。
- 案: EE Times の出典が本文で使われていないなら削除する。残す場合は注記を加える。注記の案:「2022年時点の8社・4万人の試算。本文の9社・4万3千人は内閣府(2024年)が紹介した値」。

### semiconductor-manufacturing-equipment [P2 / translation / 確度 high] en・body
> Manufacturing equipment is known as a field where Japanese companies are strong. Below are share estimates that each company has published itself.

- 問題: 日本語にある「国全体のシェアの数字と、その変化は「半導体業界にはどんな仕事がある?」で紹介しています」の一文が英訳で抜けている。各社の自社推計と国全体のシェアは別の数字だという区別と、関連記事への導線が失われる。繁体字訳も同じく抜けている。
- 案: Manufacturing equipment is known as a field where Japanese companies are strong. Country-level share figures and how they have changed are covered in "What Jobs Are There in the Semiconductor Industry?" Below are share estimates that each company has published itself.

### semiconductor-manufacturing-equipment [P2 / translation / 確度 high] zh-hant・body
> 半導體設備是公認日本企業擅長的領域。這裡列出各公司自行公布的市占率估計。

- 問題: 日本語の「国全体のシェアの数字と、その変化は「半導体業界にはどんな仕事がある?」で紹介しています」が繁体字訳で抜けている。各社の自社推計と国全体のシェアの区別と、関連記事への導線がなくなる。
- 案: 半導體設備是公認日本企業擅長的領域。整個國家的市占率數字及其變化，請見「半導體產業有哪些工作？」。這裡列出各公司自行公布的市占率估計。

### what-is-a-chiplet [P2 / overclaim / 確度 medium / 要出典] all・body
> スマホの中心のチップは、2026年時点でも多くが1つのチップで作られています。

- 問題: 時点を書いた市場・製品の状況の主張ですが、出典の欄にこれを裏付ける資料がありません。
- 案: スマホ向けSoCの構成を示す資料(各社の製品資料や分析記事)を出典に加える。見つからなければ「一般に」と書いて時点の断定を避ける。

### what-is-a-chiplet [P2 / inconsistency / 確度 medium] all・body
> はんだを使わず、銅の電極どうしを直接くっつける方法があります。

- 問題: 用語集の説明文は「銅の電極と絶縁膜の面どうしを直接接合」としていますが、本文は銅の電極だけを挙げています。絶縁膜も接合する点(「ハイブリッド」の由来)が抜けているため、用語ページとの食い違いが生じます。
- 案: 「はんだを使わず、銅の電極と、そのまわりの絶縁膜の面どうしを直接くっつける方法があります。」(en・zh-hant も同様に、絶縁膜も接合することを足す)

### what-is-a-chiplet [P2 / overclaim / 確度 low] all・body
> 内側のダイの熱は、ほかのダイを通らないと外へ逃げられません。

- 問題: 積層では、熱の一部はバンプやパッケージ基板を通って下側にも逃げます。「通らないと逃げられない」と言い切ると、熱の逃げ道が1つしかないかのように受け取られます。放熱器の側へ逃げる主な経路については正しい説明です。
- 案: 「内側のダイの熱は、放熱器のある側へ逃げるとき、ほかのダイを通る必要があります。」

### what-is-a-foundry [P2 / terminology / 確度 medium] zh-hant・body
> 美國的格芯（GlobalFoundries）在2018年宣布

- 問題: 「格芯」は中国大陸で使われる社名の表記です。台湾の報道や業界では「格羅方德」が一般的で、台湾の用語にそろっていません。表の「格芯（GlobalFoundries，美國）」も同じです。
- 案: 美國的格羅方德（GlobalFoundries）在2018年宣布…／表中改為「格羅方德（GlobalFoundries，美國）」

### what-is-a-foundry [P2 / translation / 確度 medium] en・body
> so its machines never sit idle

- 問題: 日本語は「機械を休ませずに使えます」で、遊ばせにくいという程度の意味です。英訳の「never」は言い切りが強すぎます。本文のほかの箇所や図の説明でも、ファウンドリにも空きが出る時期があると書いており、それと食い違います。
- 案: so it can keep its machines busy

### what-is-a-foundry [P2 / missing-condition / 確度 low / 要出典] all・sources
> ラピダスの量産開始の目標(2026年時点) | 2027年

- 問題: 表では「2026年時点」の目標としています。しかし、量産目標2027年を裏付ける出典は2024年(KIZUNA)と2025年7月(Rapidus発表)のものだけです。2026年時点でも目標が変わっていないことを示す出典がありません。2026年の発表で目標が維持されているかを確かめれば決着します。
- 案: 2026年のラピダスの発表などを出典に加えるか、表の条件を「(2025年7月の発表時点)」に直す。en・zh-hant も同じように直す。

### what-is-a-quantum-computer [P1 / translation / 確度 medium] en・body
> take a supercomputer 1025 years

- 問題: 日本語と出典は「10の25乗年」です。英訳では「1025 years」となっており、約1,000年と読めてしまいます。末尾の「Willow's "1025 years"」も同じです。上付き文字が抜けた可能性があります。
- 案: Write "10^25 years" (or 10<sup>25</sup> years) in both places: the opening headline quote and "Willow's '10^25 years'".

### what-is-a-quantum-computer [P1 / inconsistency / 確度 medium / 要出典] all・body
> 2026年時点の装置は、数でも誤りの少なさでも、まだ及びません。

- 問題: 同じ記事の表では、Heliosの2量子ビット操作の誤りが約0.08%で、見積もりが仮定する0.1%より少なくなっています。このため、「誤りの少なさでも及ばない」と言い切ると表と食い違います。Gidneyの見積もりは、すべての操作(測定などを含む)の誤り率0.1%と、超伝導方式の速い周期を仮定しているはずです。この仮定を論文で確かめれば決着します。
- 案: 「2026年時点の装置は、量子ビットの数がまだ大きく足りません。誤りについても、2量子ビット操作だけでなく測定などを含むすべての操作で0.1%程度にし、その状態で大規模に動かすことは、まだ実現していません。」のように、条件を付けて書く。

### what-is-a-quantum-computer [P2 / terminology / 確度 medium] zh-hant・body
> 某個界線（閾值）

- 問題: 用語集の「量子錯誤更正」「表面碼」の説明文では「門檻值」を使っています。本文の「閾值」は中国大陸寄りの表記で、サイト内の用語がそろっていません。
- 案: 某個界線（門檻值）

### what-is-a-quantum-computer [P2 / other / 確度 low] all・body
> {{term:重ね合わせ}}

- 問題: 用語集での項目名は「量子重ね合わせ」です。リンクの印の用語「重ね合わせ」と一致しないため、リンク切れの可能性があります。別名として登録されているかを確かめれば決着します。
- 案: {{term:量子重ね合わせ|重ね合わせ}} にする(en・zh-hant も同じ用語キーに変える)。

### what-is-a-quantum-computer [P2 / overclaim / 確度 low / 要出典] all・body
> グローバーの手順の平方根の程度の高速化しか効きません

- 問題: 一般的な共通鍵暗号については、知られている最良の量子攻撃がグローバー程度だ、という理解が主流です。ただ、「しか効きません」は証明された事実のように読めます。特定の構成には量子攻撃の研究もあるため、断定を弱めるべきか確認が必要です。
- 案: 「知られている量子の攻撃は、一般にグローバーの手順による平方根の程度の高速化にとどまると考えられています。」

### what-is-a-semiconductor-fab [P2 / translation / 確度 high] en・description
> how long it takes to build, and why governments subsidize it.

- 問題: 日本語の説明文にある「自動搬送」と「熊本の地下水の取り組み」が、英語の説明文で落ちています。
- 案: What a chip fab does, why most of its cost is equipment, why it uses so much water and power, how long it takes from construction to volume production, how wafers are moved automatically, why governments subsidize fabs, and how Kumamoto protects its groundwater.

### what-is-a-semiconductor-fab [P2 / overgeneralization / 確度 medium] all・body
> 1枚のウエハに数十〜数千個のチップを並べ

- 問題: 300 mmウエハの面積は約70,700 mm²です。2 mm角ほどの小さなチップ(小型のアナログIC・ディスクリート・マイコンなど)なら、1枚に1万個を超えて載ります。「数千個まで」と読めるので、上限を小さく見せています。en・zh-hantも同じです。
- 案: 1枚のウエハに、チップの大きさによって数十〜数万個のチップを並べ(en: dozens to tens of thousands of chips, depending on chip size / zh-hant: 依晶片大小，數十到數萬顆晶片)

### what-is-a-semiconductor-fab [P2 / other / 確度 low / 要出典] all・body
> 三重県と岩手県のキオクシアの工場にも、国の助成が決まっています

- 問題: 出典の欄で裏付けがあるのは、四日市(三重)の認定(2022-07-26)だけです。岩手(北上)の工場への助成の認定は、出典の注にも表にも出てきません。経済産業省の認定の一覧で、北上の工場の認定の日付と金額を確かめれば決着します。
- 案: 経済産業省の一覧で北上の工場の認定を確かめ、出典の注に追記する。確かめられない場合は「三重県のキオクシアの工場」までにとどめる。

### what-is-a-semiconductor-fab [P2 / other / 確度 low / 要出典] all・body
> 2022年4月の計画の1日1万2,000 m³から

- 問題: 出典(熊本県 2023-10-03)の注は「当初計画の日量1万2,000 m³」だけで、「2022年4月」という時期はありません。2022年4月は着工の月です。計画の時期を取り違えているおそれがあります。県の資料で、当初計画の時期を確かめれば決着します。
- 案: 当初の計画の1日1万2,000 m³から、約29%減らしています。(en: the original plan / zh-hant: 原計畫)

### what-is-a-semiconductor-fab [P2 / missing-condition / 確度 low / 要出典] all・body
> 県は2023年9月に指針を改め、新たに地下水をくみ上げる会社などに

- 問題: 出典の注は「指針の改正で1割から10割へ」だけで、「2023年9月」という改正の時期が書かれていません。また、この指針が対象とする地域(重点地域など)や採取者の範囲が書かれていません。熊本県の指針の改正の告示で、施行の日と対象の範囲を確かめれば決着します。
- 案: 出典で改正の時期と対象(例: 熊本地域の重点地域で新たに一定規模以上の地下水を採取する事業者)を確かめ、本文と出典の注に書き足す。

### what-is-hbm [P2 / overgeneralization / 確度 medium] all・body
> HBMは、AIの計算に使うGPUのための、特別なメモリです。

- 問題: HBMの定義が「AI用GPUの隣に置くメモリ」に限られています。実際には、AI向けの専用チップ(ASIC)、HPC向けのCPU、FPGAなどでも使われます。冒頭の定義や説明文(description)でも「AI用のGPUのすぐ隣」と書いており、GPU専用のメモリだと誤解させるおそれがあります。用語集のHBMの説明文はGPUに限っていません。
- 案: 「HBMは、主にAI用のGPUなど、大量のデータを扱うプロセッサのための特別なメモリです(AI向けの専用チップや一部のCPUにも使われます)。」のように直す。冒頭と description の「AI用のGPUのすぐ隣」も「GPUなどのプロセッサのすぐ隣」に直す。en・zh-hant も同様に直す。

### what-is-hbm [P2 / other / 確度 low / 要出典] all・sources
> HBM | 2013年10月 規格 | 1Gb/s | 128GB/s

- 問題: 表に最初のHBMの規格の時期を「2013年10月」と書いていますが、出典の欄には「2013年」とあるだけで、月を裏付ける資料がありません。決着させるには、JEDECのJESD235の発行時期(2013年10月とされる)を確認できる資料を出典の欄に足す必要があります。
- 案: JESD235の発行月を確かめた資料を出典の欄に足す。確かめられない場合は「2013年 規格」とする。

### what-is-moores-law [P2 / missing-condition / 確度 medium / 要出典] all・body
> いまのスマホのチップには、トランジスタが数十億〜数百億個入っています。

- 問題: 「いま」のスマホ用チップのトランジスタ数は、時期で変わる製品の数値です。それなのに、出典の欄に裏付けがなく、何年の時点かも書かれていません。また「数百億」は、2023年ごろの代表的なスマホ用SoC(百数十億〜200億個程度)より多めに読めます。en の "tens of billions" とは幅が少しずれています。メーカーの発表で、どの製品の値かを確かめる必要があります。
- 案: 「2023年時点のスマホのチップには、トランジスタが数十億〜百数十億個入っています(例: ○○、メーカー発表)。」のように、時点と例を書き、出典を足す。

### what-is-moores-law [P2 / inconsistency / 確度 medium] all・body
> 4004は約0.75 MHz(1秒に約75万回)でした。

- 問題: 出典の欄(The Register)にある値は 740 kHz です。本文の 0.75 MHz・75万回は、出典の値と少しずれています。比の「約5,000倍」は、どちらの値で計算しても成り立ちます(3.8 GHz ÷ 0.74 MHz ≒ 5,100)。
- 案: 「4004は約0.74 MHz(1秒に約74万回)でした。」とし、「数字で見る」の表と en・zh-hant も同じ値にそろえる。

### what-is-moores-law [P2 / other / 確度 low / 要出典] all・sources
> 直径300 mmのウエハでの量産は、2001年ごろに始まりました

- 問題: 年の主張ですが、出典の欄に対応する資料がありません。リンク先の記事「シリコンウエハとは?」に出典があるかどうかを確かめれば決着します。
- 案: 300 mm ウエハの量産開始を示す資料(メーカーの発表など)を出典の欄に足すか、リンク先の記事の出典を参照すると明記する。

### what-is-silicon-photonics [P2 / other / 確度 high] en・figure
> Electrical0s and 1s

- 問題: 図の中の文字で、Electrical と 0s の間の空白が抜けている。
- 案: Electrical 0s and 1s

### what-is-silicon-photonics [P2 / overclaim / 確度 medium] all・body
> 光の源だけは、シリコンで作れません。

- 問題: 「作れません」と言い切っているが、シリコンのラマンレーザーなどの研究例はある。用語集の説明も「発光しにくい」で、本文と強さが食い違う。
- 案: 「光の源は、シリコンでは実用的に作るのが難しいのです。」(en: "The light source is hard to make practically from silicon." / zh-hant: 「光源很難用矽實際做出來。」)

### what-is-silicon-photonics [P2 / desc-mismatch / 確度 medium] all・body
> 輪を1周する長さが波長のちょうど整数倍になる色の光だけが

- 問題: 共振の条件は、物理的な長さではなく一周の光学的な長さ(屈折率×長さ)が波長の整数倍になること。用語集の説明と食い違い、真空中の波長と物理長で考える誤解を招く。後の「屈折率を変えると色がずれる」の説明ともつながらない。
- 案: 「輪を1周する光学的な長さ(屈折率×長さ)が波長のちょうど整数倍になる色の光だけが」

### what-is-silicon-photonics [P2 / inconsistency / 確度 medium] all・body
> 変調器は長さ数 mmと、トランジスタよりずっと大きいからです。

- 問題: 本文の前半では、リング型の変調器は直径10〜数十 µmと説明している。変調器がすべて数 mmであるかのような言い方になっていて、前半と食い違う。
- 案: 「マッハツェンダー型の変調器は長さ数 mm、小さなリング型でも直径10 µmほどと、」

### what-is-silicon-photonics [P2 / translation / 確度 medium] zh-hant・figure
> 上圖是沿著光前進的方向橫切的截面。

- 問題: 「沿著…方向」は光の進む向きに沿って縦に切った断面と読める。実際は光の進む向きに垂直な輪切りの断面(英訳も cut across)。
- 案: 「上圖是與光前進方向垂直、橫切開來的截面。」

### what-is-silicon-photonics [P2 / factual / 確度 low / 要出典] all・body
> 実際は、CPOの製品は2024年ごろから出始めたところです。

- 問題: 2024年以前にも、25.6 Tb/s級のCPOスイッチの発表や試験的な導入があった可能性がある。この時期の主張を裏付ける出典がない。Broadcom の過去の CPO 製品(Humboldt など)の出荷時期を確認すれば決着する。
- 案: 「CPOの製品が顧客に届き始めたのは、2024年前後のことです(Broadcom の発表による)。」のように、出典に合わせて時期をぼかすか出典を足す。

### what-is-silicon-photonics [P2 / factual / 確度 low / 要出典] all・body
> 直径10〜数十 µmの小さな輪の導波路を置きます。

- 問題: 直径10 µmより小さい(半径数 µm以下の)リングも報告されており、下限が言い切りになっている可能性がある。この範囲を裏付ける出典が出典の欄にない(Bogaerts 2012 などで確認が必要)。
- 案: 「直径数 µm〜数十 µmほどの小さな輪の導波路」とし、出典で範囲を確かめる。

### what-is-silicon-photonics [P2 / terminology / 確度 low] zh-hant・body
> {{term:導波路|光波導}}

- 問題: 用語集の zh-hant の項目名は「波導」だが、本文では「光波導」を使っている。サイト内の訳語をそろえる基準に照らして確認が必要。
- 案: 用語集の項目名「波導」に合わせるか、用語集側を「光波導」にそろえる。

### why-the-chip-shortage-happened [P2 / translation / 確度 medium] en・description
> Why cars were hit hardest, and the bullwhip effect.

- 問題: 日本語の説明文にある「収まり方と各国の政策を解説します」が英語の説明文から抜けている。本文には該当する節があるので、言語間で説明文の範囲がそろっていない。
- 案: The 2020–2022 chip shortage came from a demand surge, slow-to-grow fabs, disasters and panic ordering. Why cars were hit hardest, the bullwhip effect, how it eased, and government policies.

### why-the-chip-shortage-happened [P2 / translation / 確度 low] zh-hant・body
> （也常被稱為「缺晶潮」）

- 問題: 日本語の原文にない補足が繁体字の訳にだけ足されている。別名の紹介で、内容の誤りではない。ただし、原文と訳の内容をそろえる基準からは外れる。
- 案: 刪除「（也常被稱為「缺晶潮」）」，或在日文原文中也加入相同的補充說明。

## it-security-life

### how-fingerprint-and-face-unlock-work [P1 / overgeneralization / 確度 low / 要出典] all・body
> 比べる作業とデータの保管は、チップの中の守られた区画で行い、写真や特徴のデータは外に出しません。

- 問題: すべてのスマホの生体認証に当てはまるように書いている。Androidでは、隔離された環境で処理する要件はクラス2・3(安全な処理経路を持つもの)が対象で、クラス1(コンビニエンス)の前面カメラの顔認証にも同じ要件がかかるかは確かめが要る。後の「Androidの公式の資料も…定めています」も、どのクラスへの要件かが書かれていない。Android CDD 7.3.10 と AOSP の Biometrics のページで、要件がかかるクラスを確かめれば決着する。
- 案: 「多くのスマホ(iPhoneや、Androidの強いクラスの生体認証など)では、比べる作業とデータの保管をチップの中の守られた区画で行い…」のように対象を限る。Androidの段落にも、どのクラスへの要件かを書き足す。

### how-fingerprint-and-face-unlock-work [P2 / missing-condition / 確度 medium] all・body
> Appleは、双子やよく似たきょうだい、13歳未満の子どもでは、この確率が高くなると注意しています。

- 問題: 直前の「Appleの値」はTouch IDとFace IDの両方を指している。そのため、この注意がTouch IDにも当てはまるように読める。双子や13歳未満の子どもについての注意は、Face IDの説明(About Face ID advanced technology)にあるもの。
- 案: 「Face IDについてAppleは、双子やよく似たきょうだい、13歳未満の子どもでは、この確率が高くなると注意しています。」とする(en・zh-hant も同様に Face ID に限る)。

### how-fingerprint-and-face-unlock-work [P2 / inconsistency / 確度 low] all・body
> 他人を通す確率はゼロではないため、PINやパスコードと組み合わせて使います。

- 問題: 冒頭では、PINが要る理由を「他人を通す確率がゼロではないから」と書いている。一方、本文の「それでもPINやパスコードが必要な理由」が挙げる理由は、使えない場面がある・データの暗号化・取りかえがきかない、の3つで、冒頭の理由は入っていない。PINを組み合わせる理由を誤って理解させるおそれがある。
- 案: 「生体認証が使えない場面やデータの暗号化のために、PINやパスコードと組み合わせて使います。また、他人を通す確率もゼロではありません。」のように、本文の理由と合わせる。

### what-is-a-data-center [P2 / inconsistency / 確度 medium / 要出典] all・body
> 回答した施設の平均は2024年が1.56、2025年が1.54でした

- 問題: 出典の欄では、2024年の1.56は「回答者の最大の施設」の平均、2025年の1.54は地域別レポート(Field report 183)の「回答した施設」の平均です。集計の対象と資料が違う2つの値を、同じ指標の推移(表の「1.56 → 1.54」)として並べています。2つの集計の定義が同じかどうかを、原資料で確かめる必要があります。
- 案: 定義が違う場合は「2024年の調査では回答者の最大の施設の平均が1.56、2025年の地域別の集計では回答した施設の平均が1.54」のように対象を書き分ける。表の補足にも同じ注記を付ける。

### what-is-a-data-center [P2 / other / 確度 low / 要出典] all・body
> 古い建物が多く、気候によっては冷房を減らしにくいためと、同社は説明しています

- 問題: PUEが横ばいである理由を Uptime Institute の説明として書いていますが、出典の欄の注記はこの理由を裏付けていません。2025年の調査の本文に同じ趣旨の説明があるかを確かめる必要があります。
- 案: 出典の注記に、理由の説明が載っている箇所を書き足す。確かめられない場合は、「同社は説明しています」を削るか「未確認」として扱う。

### what-is-a-data-center [P2 / other / 確度 low / 要出典] all・body
> IEAもこうした供給の制約が当面の伸びを抑えると述べています

- 問題: IEAの2026年4月の報告にこの見方が書かれていることを、出典の欄の注記は示していません。時期で変わる見通しの主張なので、出典で裏付ける必要があります。
- 案: 出典の注記に「供給の制約(半導体・送電網など)が伸びを抑えるとの指摘」を書き足す。確認できない場合は、文を削るか書き方を弱める。

### what-is-a-data-center [P2 / overgeneralization / 確度 low] all・body
> 電源や冷房が互いに独立した建物のまとまりを、{{term:アベイラビリティゾーン}}と呼びます

- 問題: 「アベイラビリティゾーン」は主にAWSなど一部の事業者が使う呼び名で、事業者によっては「ゾーン」など別の名前を使います。クラウド全般に共通の用語のように読めます。
- 案: 「…建物のまとまりを、AWSなどでは{{term:アベイラビリティゾーン}}と呼びます」のように、事業者による呼び名であることを添える。英語・繁体字の訳も同じように直す。

## semicon-basics

### how-to-start-learning-semiconductors [P1 / translation / 確度 high] en・body
> If you just joined a chip company: semiconductors → transistors → how chips are made.

- 問題: 日本語は「半導体の会社に入った人」の近道の最後に「業界の仕事」がありますが、英語では抜けています。ステップ4の「続けて読む」にある「半導体業界にはどんな仕事がある?」も英語にありません。英語版に該当する記事がないなら、日本語との違いを意図したものか確かめる必要があります。
- 案: If you just joined a chip company: semiconductors → transistors → how chips are made → jobs in the chip industry. (Also add "What Jobs Are There in the Semiconductor Industry?" to Step 4 "Read next", if the English article exists.)

### how-to-start-learning-semiconductors [P1 / translation / 確度 high] zh-hant・body
> 剛進半導體公司的人：半導體→電晶體→晶片的製造方法。

- 問題: 日本語にある近道の最後の「業界の仕事」が繁体字では抜けています。ステップ4の「続けて読む」にある「半導体業界にはどんな仕事がある?」も繁体字にありません。繁体字版に該当する記事があるか確かめる必要があります。
- 案: 剛進半導體公司的人：半導體→電晶體→晶片的製造方法→半導體產業的工作。(若有對應文章，也在步驟4「接著讀」加入「半導體產業有哪些工作？」)

### what-does-2nm-mean [P2 / translation / 確度 high] en・description
> Why the numbers drifted from real sizes, what really shrinks, and what GAA is.

- 問題: 英語の説明文には、日本語にある「会社ごとに比べられない理由」が入っていません。
- 案: "2nm" and "3nm" name chip process nodes, not a size inside the chip. Why the numbers drifted from real sizes, what really shrinks, why companies' numbers can't be compared, and what GAA is.

### what-does-2nm-mean [P2 / overclaim / 確度 medium] all・body
> これを{{term:FinFET}}と呼びます。インテルが2011年に発表し、22nm世代で初めて量産に使いました。

- 問題: 「インテルが2011年に発表し」は、インテルがFinFETを発明したと読めます。FinFETの構造は1990年代末に大学などで提案されていました。インテルが2011年に発表したのは、自社の22nm世代の量産に使うことです。
- 案: インテルが2011年に22nm世代での採用を発表し、この世代で初めて量産に使いました(構造そのものは1990年代末に提案されていました)。

### what-does-2nm-mean [P2 / overclaim / 確度 medium] all・body
> いちばん細かい模様には、波長13.5nmの光を使う{{term:EUV露光}}が必要で

- 問題: 「必要」と言い切っていますが、DUV光と多重パターニングを組み合わせて細かい模様を作る例もあります(TSMCの初期の7nm世代、インテルの10nm世代など)。条件を書かないと、例外がないと誤解されます。
- 案: いま最先端の世代のいちばん細かい模様には、一般に、波長13.5nmの光を使う{{term:EUV露光}}が使われます。

### what-does-2nm-mean [P2 / inconsistency / 確度 medium] all・body
> 1nmより小さい名前も使えます。TSMCは2024年、2nm世代より後の世代を「A16」(1.6nm級)と名づけて発表しました。

- 問題: 「1nmより小さい名前も使えます」の例としてA16(1.6nm級)を挙げていますが、1.6nmは1nmより大きく、例が主張を支えていません。
- 案: 名前の数字は寸法ではないので、オングストロームを使った名前で、さらに小さい数字にしていくこともできます。たとえばTSMCは2024年、2nm世代より後の世代を「A16」(1.6nm級)と名づけて発表しました。

### what-does-2nm-mean [P2 / terminology / 確度 medium] ja・body
> 配線の間隔: いちばん細い金属の配線どうしの間隔(メタルピッチ)

- 問題: 記事の前半では、ピッチを「線1本+すき間1つ」と定義しています。ところがここでは、ピッチを「配線どうしの間隔」と呼んでいます。これでは「すき間の幅」と読まれやすく、36nmや54nmがすき間の幅だと誤解されるおそれがあります。
- 案: 配線の間隔: いちばん細い金属の配線が並ぶくり返しの幅(線1本+すき間1つ。メタルピッチ)

### what-is-a-diode [P2 / terminology / 確度 high] zh-hant・body
> 這一層稱為{{term:空乏層|空乏區}}

- 問題: 用語集の zh-hant の項目名は「空乏層」ですが、本文と図では「空乏區」を使っています。最後の段落の「PN接面空乏層寬度計算器」では「空乏層」になっていて、記事の中でも表記がそろっていません。
- 案: 這一層稱為{{term:空乏層}}。(本文・圖中的「空乏區」都統一為「空乏層」)

### what-is-a-diode [P2 / translation / 確度 medium] en・description
> why silicon needs about 0.6–0.7 V, breakdown, rectifiers, Zener diodes and LEDs

- 問題: 「needs」は、0.6〜0.7 V を超えないと流れないしきい値のように読めます。本文が「突然流れ出す境目ではない」と説明している内容と食い違います。また、日本語の説明文にある「回路の保護」と「太陽電池」が抜け、日本語にない Zener diodes が入っています。
- 案: A diode lets current flow easily one way only. How the PN junction works, what the figure of about 0.6–0.7 V for silicon means, breakdown, rectification and circuit protection, and how diodes relate to LEDs and solar cells.

### what-is-a-diode [P2 / overgeneralization / 確度 medium] all・body
> ダイオードを4個、ひし形に組み合わせると、逆向きの半分も向きを折り返して通せます。…これを全波整流と呼びます。

- 問題: 全波整流がブリッジ(ダイオード4個)だけを指すように読めます。中点タップ付きの変圧器とダイオード2個でも全波整流になるため、言い過ぎです。
- 案: 「ダイオードを4個ひし形に組み合わせる方法(ブリッジ)では、…。このように両方の半分を同じ向きにそろえることを全波整流と呼びます(変圧器と2個のダイオードで行う方法もあります)。」

### what-is-a-semiconductor [P2 / translation / 確度 high] en・description
> can be changed hugely by tiny impurities, voltage or light

- 問題: 日本語の説明文にある「温度」が英訳で落ちています。「金属と絶縁体の中間にある」と「身近な使われ方」も訳されていません。本文では4つの方法(不純物・電圧・光・温度)を挙げており、英訳の説明文は本文とも合いません。
- 案: A semiconductor conducts between metals and insulators, and its conductivity can be changed hugely by tiny impurities, voltage, light or temperature. Why silicon is used, n-type and p-type, and everyday uses explained.

### what-is-a-semiconductor [P2 / overgeneralization / 確度 medium] all・body
> トランジスタというスイッチは、このしくみを使っています。

- 問題: 薄い絶縁膜ごしに電圧をかけて通り道を作るしくみは、電界効果トランジスタ(MOSFET)のものです。トランジスタ全般の説明として書かれています。同じ記事で触れている1947年の点接触トランジスタやバイポーラトランジスタは、このしくみではありません。後半の「電圧という小さな信号で電流のオン・オフを切り替える」も同じく一般化しています。
- 案: 「いまのチップで主に使われるトランジスタ(MOSFET)は、このしくみを使っています。」のように、種類を限定する。

### what-is-a-semiconductor [P2 / other / 確度 medium / 要出典] all・sources
> 300 mm | 量産で使われる最も大きなウエハの直径

- 問題: 「量産で最大のウエハ」は時期によって変わる情報です。いつの時点の話かが書かれておらず、出典の欄にもこれを裏付ける資料がありません。
- 案: 「2026年時点で、量産で使われる最も大きなウエハの直径」と時点を書き、ウエハ寸法の出典(SEMI 規格やメーカー資料など)を出典の欄に加える。

### what-is-a-transistor [P1 / other / 確度 low] all・body
> 約1.3×1022個

- 問題: 指数の上付きが消えて「1.3×1022」と読める可能性があります。その場合は約1429という別の数になります。直後の「1兆個の130億倍」(1.3×10^22)とも食い違います。元データと表示で、22 が上付きになっているかを確かめる必要があります。
- 案: 約1.3×10²²個(上付き文字か <sup>22</sup> で表記する。en・zh-hant も同様)

### what-is-a-transistor [P2 / translation / 確度 low] en・title
> What Is a Transistor? How a Transistor Works as a Switch

- 問題: 英語の題には、日本語の題にある「スマホに100億個以上」の要素がありません。英語の説明文も、日本語の説明文にある「0と1の計算とのつながり」を落としています。言語間で内容の示し方が一致していません。検索向けに意図して変えたのであれば問題ありません。
- 案: What Is a Transistor? The Tiny Switch Found 10+ Billion Times in a Phone Chip / description: ...why CMOS saves power, how switches lead to computing with 0 and 1, and a short history.

### what-is-an-integrated-circuit [P1 / inconsistency / 確度 high] all・body
> 部品の数が毎年約2倍に増えているという、のちの{{term:ムーアの法則}}も、同じ論文の指摘です。

- 問題: 用語集の説明文ではムーアの法則を「約2年ごとに倍増」としている。本文は「毎年約2倍」をムーアの法則そのものとして書いている。1965年の論文は毎年2倍と述べ、1975年に約2年ごとへ見直された。この経緯が書かれていないため、本文と用語集が食い違って見える。en・zh-hant も同じ。
- 案: 「部品の数が毎年約2倍に増えている、という指摘もこの論文にあります。ムーアはのちに(1975年)これを約2年ごとに倍増と見直し、{{term:ムーアの法則}}として知られるようになりました。」(en・zh-hant も同じ趣旨に直す)

### what-is-an-integrated-circuit [P2 / translation / 確度 high] zh-hant・body
> IC誕生之前，最大的煩惱是零件的數量。

- 問題: 日本語は「大きな悩み」(大きな悩みの一つ)で、en も "a big headache"。繁体字だけが「最大的」(いちばんの悩み)と強く言い切っている。
- 案: 「IC誕生之前，一大煩惱是零件的數量。」

### what-is-an-integrated-circuit [P2 / translation / 確度 high] zh-hant・sources
> 立命館大学 藤野研究室: 集積回路設計入門(講義資料。SSI〜ULSIの素子数の区分の例)

- 問題: 繁体字版の出典欄で、補足の説明(括弧内など)が日本語のまま残っている。en では訳されている。ほかの出典(ENIAC、WSTS、LGA1700 など)の補足も同じ。
- 案: 補足を繁体字に訳す。例:「立命館大學 藤野研究室：集積回路設計入門(日文講義資料。SSI～ULSI元件數量分級的例子)」

### what-is-an-integrated-circuit [P2 / factual / 確度 medium / 要出典] ja・body
> カメラのイメージセンサのようなセンサや、光を扱う部品は、ICとは別に数えます。

- 問題: WSTS の分類では、イメージセンサ(CCD・CMOS)は「センサ」ではなく「光半導体(オプトエレクトロニクス)」に入るとされる。ICと別に数えるという結論は正しいが、イメージセンサをセンサの例に挙げると分類を誤解させるおそれがある。WSTS Product Classification 2018 で、イメージセンサがどの区分に入るかを確かめれば決着する。
- 案: 「圧力センサなどのセンサや、カメラのイメージセンサのような光を扱う部品(光半導体)は、ICとは別に数えます。」

### what-is-an-integrated-circuit [P2 / translation / 確度 medium] en・description
> Why it mattered, chip vs. die vs. LSI vs. SoC, and the main types of IC.

- 問題: 日本語の説明文にある「パッケージ」と「設計の流れ」が en の説明文から落ちており、記事の内容と比べて情報が欠けている。
- 案: "...chip vs. die vs. LSI vs. SoC vs. package, the main types of IC, and how ICs are designed."

### what-is-cmos [P2 / translation / 確度 high] zh-hant・body
> 只是兩者的英文都叫inverter

- 問題: 日本語の原文にない説明が、訳で足されている。内容自体は正しいが、言語間で中身がずれている。
- 案: 刪除「只是兩者的英文都叫inverter」，或在日文原文中加入同樣的說明後再同步各語言。

### what-is-cmos [P2 / missing-condition / 確度 medium] ja・body
> どちらか一方が必ずオフになるので

- 問題: 冒頭では条件なしに「必ずオフ」と言い切っている。一方、後の「切り替わる一瞬だけ、両方が入る」では、切り替えの途中に両方がオンになると説明しており、食い違って読める。用語集の説明文も「定常状態で」と条件を付けている。
- 案: 「入力が0か1に定まっている間は、どちらか一方がオフになるので」のように、成り立つ条件を書く(en・zh-hant も同様に直す)。

### what-is-cmos [P2 / overgeneralization / 確度 low / 要出典] ja・body
> 光を電気に変える画素と読み出す回路を、同じ技術で1つのチップにまとめています

- 問題: 近年の多くのCMOSイメージセンサーは積層型で、画素の層と回路の層を別々のウェハに作って貼り合わせる。そのため「1つのチップにまとめる」と言い切るのは、一部の製品にしか当てはまらないおそれがある。積層型センサーの構造を説明したメーカーの資料で確かめれば決着する。
- 案: 「画素と読み出しの回路を、同じCMOSの技術で作り、1つの部品にまとめられます(画素と回路を別の層に作って重ねる製品もあります)」のように弱める。
