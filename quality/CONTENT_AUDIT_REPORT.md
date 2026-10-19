# 問題・解説の全体監査(2026-10-19)

## 対象と方法

- **対象:** 全55分野・2,750問。日本語の原文(`data/questions/`)と英語訳(`data/i18n/en/questions/`)を照合しました。
- **点検した人:** AI エージェント17体が、1体あたり3〜4分野を受け持ちました。指示は [CONTENT_QUALITY_GUIDELINES.md](CONTENT_QUALITY_GUIDELINES.md) の基準と同じです。
  - 正解はただ1つか。
  - 数値・単位・式・計算は合っているか(計算はすべて再計算)。
  - 条件が抜けていないか、古い情報はないか。
  - 解説・各選択肢の補足・正解の三つが矛盾していないか。
  - 英訳の意味は日本語と同じか。
- **確認した人:** 保守担当(Claude)が57件すべての指摘と根拠を読み、技術的に正しいと判断したものだけを反映しました。
  - いくつかは自分で計算し直して確かめました(例: SiO2 の分子密度 2.2×10²² cm⁻³ と比 0.44、64÷4=16)。
- **機械的な検査:** 新しく作った `tools/check-content.js` で、全言語の数値の整合を検査しました。
- **限界:** これは AI による点検です。人間の専門家によるレビューではありません。問題データの `reviewed` は、すべて `false` のままにしています。

## 結果の概要

| 項目 | 件数 |
|---|---|
| 点検した問題 | 2,750 問(全問) |
| 正解の設定ミス・正解が2つ以上・正解なし(critical) | **0 件** |
| 事実・数値・式の誤り、または英訳で意味が変わっていた(major) | 12 件 |
| 条件の抜け・言い過ぎ・古い情報(minor) | 45 件 |
| 重点15項目の検証による修正 | 7 問(詳細は [TECHNICAL_AUDIT.md](TECHNICAL_AUDIT.md)) |
| 訳の数値の書き方の誤り(機械的な検査で発見) | 6 問(仏・独。「1,280 g」が 1.28 g と読める、など) |
| 不自然な日本語の書き直し | 1 問(performance-016、「1000百万命令」を MIPS に) |
| **修正した問題の合計** | **71 問**(`data/audit-log.json` に記録) |
| 正解の番号を変えた問題 | 0 問 |

日本語を直した 61 問は、英語・繁体字・韓国語・ドイツ語・オランダ語・フランス語の訳も合わせて直しました。訳の追従は `tools/i18n-stale.js` で確認しています。英訳だけが誤っていた 4 問(ehs-042、mems-sensor-022、eda-032、interconnect-046)は、英訳だけを直しました。

## 主な誤り(major)

- **hdl-verification-027:** Verilog の符号付き比較について、解説の直し方が誤っていました。`8'd1` は符号なしの定数なので、比較全体が符号なしのままです。正しくは `8'sd1` も使う必要があります。
- **image-sensor-048:** 光子伝達曲線の式で、変換係数 K の向きが逆でした(分散 = K × 平均)。
- **analog-029:** 利得余裕の定義で、測る周波数を取り違えていました(英訳は正しかった)。
- **deposition-013:** 「0.25〜65 nm 世代」は「0.25 µm〜65 nm 世代」の単位の誤りでした。
- **memory-hierarchy-004:** 誤りの選択肢の由来を説明する計算が合っていませんでした(64÷4=16 で、32 にはならない)。
- **emerging-memory-020:** PCM の抵抗ドリフトを「時間の対数に比例」と書いていましたが、正しくは時間のべき乗です。
- **lithography-012:** 露光装置のステージの加速度が、実際より約1桁小さく書かれていました。
- **wafer-009:** (100) 面の界面準位が少ない理由の説明が逆でした(正しくは、単位面積あたりの結合手の密度)。
- **os-hardware-003:** 誤りの選択肢が「特権モードのまま」となっていて、補足・英訳と矛盾していました。
- **finfet-049:** 原子1層分の厚さの違いによるしきい値電圧の変化を、5 nm で数十 mV と過大に書いていました。
- **ehs-042(英訳):** 化管法(PRTR 法)を、化審法の英語名で訳していました。
- **mems-sensor-022(英訳):** 「十数 ms」を「数十 ms」と訳していました。

## 修正した全問題(監査の指摘分)

「問題点」の欄は、監査時の記録(英語)をそのまま載せています。正解の番号は、どの問題でも変えていません。

| 問題ID | 重大度 | 確信度 | 修正した項目 | 問題点(監査時の記録) |
|---|---|---|---|---|
| analog-029 | major | high | explanation | JA definition of gain margin is wrong: it says gain margin is taken at the frequency where loop gain is 1, whereas it is the amount by which loop gain is below 1 (0 dB) at the frequency where phase lag reaches 180°. The EN text states it correctly, so JA and EN also disagree. |
| deposition-013 | major | high | explanation | Unit error in JA: "0.25〜65 nm世代" states a 0.25 nm generation; it should be 0.25 µm. EN correctly says "0.25 µm to 65 nm", so JA and EN disagree. |
| ehs-042 | major | high | en.explanation | EN says PRTR is 'under the Chemical Substances Control Law'. The JA says 化管法 (the PRTR Law, Act on Confirmation of Release Amounts of Specific Chemical Substances in the Environment and Promotion of Improvements to the Management Thereof). 'Chemical Substances Control Law' is the usual English name of a different law, 化審法 (CSCL), so the EN text names the wrong law. |
| emerging-memory-020 | major | high | explanation | JA explanation says the resistance rises 'proportional to the logarithm of time' but then gives the power law R ∝ t^ν; these contradict (power law means log R is linear in log t). The EN text correctly says 'as a power of time', so JA and EN also disagree. |
| finfet-049 | major | medium | en.explanation, explanation | Overstates the quantum-confinement Vth sensitivity: at ~5 nm body thickness a one-monolayer (0.3 nm) change shifts the lowest subband by only a few meV (well below 'tens of mV'); tens of mV per monolayer occurs only at ~2-3 nm and below. |
| hdl-verification-027 | major | high | en.explanation, explanation | The explanation's fix is wrong for this code: it says declaring the signals 'wire signed [7:0]' makes the comparison give 0, but the other operand is 8'd1, a sized literal that is unsigned, so the expression stays unsigned and gt remains 1. It also refers to 'a and b' although the code has no b. The EN explanation repeats the wrong fix. |
| image-sensor-048 | major | high | en.explanation, explanation | PTC relation is written as variance = mean × (1/K) while K is defined as output per electron (DN/e-). With K in DN/e-, variance(DN²) = K × mean(DN); the stated formula would give 1/K from the slope, contradicting the definition. |
| lithography-012 | major | high | en.explanation, explanation | Stage acceleration stated as 'a few m/s²' (数m/s²). Modern scanner stages accelerate an order of magnitude faster: tens of m/s² (several g) for the wafer stage, and more for the reticle stage. |
| memory-hierarchy-004 | major | high | en.explanation, explanation | Explanation says the distractor 32 is 'the line size 64 divided by the number of ways', but 64 ÷ 4 = 16, not 32. The EN explanation has the same wrong arithmetic. |
| mems-sensor-022 | major | medium | en.explanation | EN changes the stated deployment-decision time: JA says 十数ms (roughly 10-20 ms), EN says 'within a few tens of milliseconds' (20-50 ms). |
| os-hardware-003 | major | high | choices | Distractor 0 says the branch happens '特権モードのまま' (staying in privileged mode), but the code runs in user mode; its own choiceNote says 'ユーザモードのまま分岐はせず' and the EN says 'staying in the same mode'. JA choice contradicts its note and the EN meaning differs. |
| wafer-009 | major | medium | en.explanation, explanation | The reason given, '(100) has fewer bonds per surface atom', is wrong: a bulk-terminated (100) surface atom has two dangling bonds versus one on (111). The textbook argument is that (100) has the lowest density of available bonds per unit area, hence lower Dit. |
| adc-dac-030 | minor | high | explanation | JA explanation says Nyquist-rate ADCs sample at 'about twice the Nyquist frequency'. With the site's own definition (Nyquist frequency = fs/2, see adc-dac-002/008) this is a tautology true of every ADC; the intended meaning (as in the EN text) is about twice the signal bandwidth. |
| advanced-packaging-040 | minor | medium | en.explanation, explanation | Claims HBM per-pin speed is lower than DDR. True for HBM/HBM2 vs DDR4, but HBM3 (6.4 Gb/s) is on par with DDR5 (4.8-6.4 Gb/s at the time) and HBM3E (~9.2-9.8 Gb/s) exceeds mainstream DDR5. The meaningful contrast is with GDDR (16-32+ Gb/s). |
| cmp-cleaning-001 | minor | medium | explanation | JA says CMP 'can eliminate steps of tens of nm across the wafer' (understates what CMP removes and differs from EN, which says topography is reduced to within tens of nm). |
| compound-019 | minor | medium | en.explanation, explanation | States multi-junction cells achieve >40% efficiency without the condition; >40% is reached only under concentrated sunlight (one-sun records are ~39%, space InGaP/GaAs/Ge cells ~30% AM0). |
| compound-050 | minor | medium | en.explanation, explanation | Says GaAsP red LEDs were 'put into practical use' (実用化) in 1962; Holonyak demonstrated the first visible GaAsP LED in 1962, but commercial products appeared around 1968. |
| computer-arithmetic-038 | minor | medium | explanation | JA 'およそ3分の2ずつ減らしていきます' most naturally reads as 'decrease by about two-thirds per level' (leaving 1/3), which is wrong: a 3:2 carry-save level leaves about 2/3 of the operands. EN correctly says 'cutting the count by about a third per level', so JA and EN differ. |
| computer-arithmetic-043 | minor | medium | en.explanation, explanation | Says the result of right-shifting a negative signed integer in C 'was left to the implementation' (past tense; EN 'historically'), implying this has changed. In C it is still implementation-defined, including C23, which mandated two's complement but kept this rule. Only C++20 made it an arithmetic shift. |
| dram-002 | minor | medium | en.explanation, explanation | '規格では通常64 ms以内に全行を一巡' is presented as the general rule; DDR5 and LPDDR4/5 use a 32 ms refresh window in the normal temperature range. |
| dram-007 | minor | medium | en.explanation, explanation | Says one row activation reads 'several KB' into the sense amplifiers. Per DRAM chip the page (row) size is 1-2 KB (DDR4/DDR5 x4/x8: 1 KB, x16: 2 KB); 'several KB' (~8 KB) only applies to a whole 64-bit rank. It is also inconsistent with the preceding 'thousands of cells per word line' (thousands of bits ~ 1 KB). |
| dram-036 | minor | medium | en.explanation, explanation | States that DDR-family DRAMs refresh all rows within 64 ms; true for DDR3/DDR4, but DDR5 (tREFI 3.9 us x 8192 REF) and LPDDR4/5 use a ~32 ms window in the normal temperature range. Answer (64 ms is closest) is unaffected. |
| dram-038 | minor | medium | choices, en.choices, explanation | JA choice and explanation say burst data is transferred 'クロックごとに' (once per clock), but DDR transfers on both clock edges (BL8 takes 4 clocks); this contradicts dram-006. EN explanation already says 'one per clock edge', so JA and EN also differ. |
| dram-047 | minor | high | en.explanation, explanation | Implies the prefetch doubled every generation up to DDR4 (DDR 2n, DDR2 4n, ... DDR4 8n). DDR3 already used 8n prefetch; DDR4 kept 8n and raised speed with bank groups instead, so the 'doubled each generation' claim is wrong for DDR3->DDR4. |
| eda-032 | minor | medium | en.explanation | EN says 'Siemens EDA in Germany (formerly Mentor Graphics)', implying the EDA business is based in Germany; the JA says it is the EDA division of the German company Siemens. Siemens EDA itself is headquartered in Wilsonville, Oregon, USA. |
| emerging-memory-006 | minor | medium | en.explanation, explanation | States the DRAM/NAND cost-per-bit gap is about 10x; in recent years it has been several tens of times. |
| emerging-memory-009 | minor | medium | en.explanation, explanation | Gives the reset pulse width as 'tens to hundreds of ns', the same range emerging-memory-039 gives for set while saying set is slower than reset. Reset pulses are typically short (~10-50 ns); hundreds of ns is the set regime. |
| etching-032 | minor | medium | en.explanation, explanation | States etch-tool plasmas have an ionization fraction of about 0.01% or less. That holds for typical CCP, but high-density ICP plasmas (10^11-10^12 cm^-3 at ~1 Pa, as stated in etching-015) are ~0.04-0.4% ionized, so the figure is too low as a general statement and conflicts with etching-015. |
| finfet-030 | minor | medium | en.explanation, explanation | 'CFETもこの一種です' presents CFET as unconditionally a form of sequential monolithic 3D. The main CFET approach (monolithic CFET) builds both n and p devices from one Si/SiGe stack in one flow and does not build a second tier on top. Only sequential CFET fits the definition given in the explanation. |
| gpu-programming-014 | minor | medium | en.explanation, explanation | Claims the strided a[i*32] access moves "tens of times" more data than a[i]. On current NVIDIA GPUs global memory is transferred in 32-byte sectors, so each thread pulls one 32-byte sector: 32x32 B = 1024 B vs 128 B, i.e. 8x. The 32x figure only holds for 128-byte transaction granularity. |
| hw-security-031 | minor | medium | en.explanation, explanation | The explanation says, without qualification, that processing a chip to read a PUF value changes the variation itself. That is a design goal of some PUFs, such as coating PUFs or PUFs with a tamper-sensitive layer, but not a general property. Researchers have read out and even cloned SRAM PUF start-up values by semi-invasive methods (photonic emission analysis plus FIB edits). (EN: same claim.) |
| image-sensor-039 | minor | medium | en.explanation, explanation | Calls the CCD blooming streak 'smear'. Smear is a distinct CCD artifact (light/charge leaking into the vertical transfer register during readout) that occurs even without pixel saturation; blooming in CCDs spreads along the column, but it is not called smear. |
| image-sensor-041 | minor | medium | choiceNotes, en.choiceNotes | Note for choice 0 claims visible light is not used to measure object temperature at all; optical/radiation pyrometers measure hot objects (roughly >700 °C) using visible/near-IR light. It is only true for room-temperature thermography. |
| interconnect-046 | minor | medium | en.choices | EN choices 0 and 1 say 'which lowers resistance' where JA says 耐性が下がる (electromigration robustness decreases). In a wiring context 'lowers resistance' reads as lower electrical resistance, which reverses the intended (negative) meaning; choice 2 'improves resistance' is similarly ambiguous. |
| ion-implant-018 | minor | medium | en.explanation, explanation | Says resist must be "several times" the ion range (Rp + several ΔRp). The usual masking criterion is thickness >= Rp + m·ΔRp evaluated in the resist (m about 3-5); requiring several times that is not necessary and misstates the rule. |
| ion-implant-047 | minor | medium | choiceNotes, en.choiceNotes | Note for choice 2 ("電気抵抗と磁気抵抗") reads "抵抗の種類ではありません" / EN "These are not kinds of resistance", which literally says electrical resistance and magnetoresistance are not kinds of resistance (false). Intended meaning is that ion energy loss is not described by them. |
| linker-loader-005 | minor | high | en.explanation, explanation | For a C program, the explanation says a difference in arguments can turn the call into a different symbol name. C does not mangle names, so an argument/signature mismatch does not change the symbol (it links, with undefined behavior); only C++ name mangling does that. EN repeats it ('signature mismatch'). |
| lithography-001 | minor | high | en.explanation, explanation | R from the Rayleigh formula with k1=0.27 is a half-pitch (≈39 nm), but the text says 'pitches finer than this need multiple patterning or EUV', which implies a ~39 nm pitch limit. The single-exposure pitch limit is ~77–80 nm, as lithography-005 itself states ('ピッチ約80 nm'). |
| logic-038 | minor | medium | en.explanation, explanation | States that a JK flip-flop with J and K tied to 1 'is' a T flip-flop. A T flip-flop has a T input (T=0 hold, T=1 toggle) and is obtained by tying J and K together as the T input; fixing both at 1 only gives the always-toggle case. logic-039 itself uses 'T flip-flop (T = 1)', i.e. treats T as an input. |
| memory-hierarchy-027 | minor | medium | choiceNotes, en.choiceNotes, en.explanation, explanation | The explanation says the 4 MB distractor comes from 'swapping the number of pages and the page size', but swapping them (4 × 64 KB) still gives 256 KB, so the stated derivation is wrong. EN says only 'a miscalculation', so the JA and EN also disagree. |
| mems-sensor-047 | minor | medium | en.explanation, explanation | The slope −1/2 for angle random walk holds on an Allan DEVIATION log-log plot; the explanation attributes it to the Allan variance plot (where the slope would be −1). |
| multicore-sync-024 | minor | medium | en.explanation, explanation | States as a general fact that deadlocked threads stop without using the CPU. That holds only for blocking (sleeping) locks; threads deadlocked on spinlocks keep spinning and consume 100% CPU. |
| oxidation-002 | minor | medium | en.explanation, explanation | The stated SiO2 molecular density (2.3e22 cm^-3) does not reproduce the stated ratio 0.44: 2.3/5.0 = 0.46. The textbook value giving 0.44 is 2.2e22 cm^-3. |
| oxidation-017 | minor | medium | en.explanation, explanation | Says MOSFETs became practical ('実用化') around 1960. The MOSFET was demonstrated in 1959-60 (Atalla & Kahng), but practical/commercial MOS ICs came in the mid-1960s after the sodium instability problem was solved (which oxidation-018 itself describes as the 1960s obstacle). |
| physics-025 | minor | medium | en.explanation, explanation | States that 1–10 Ω·cm p-type wafers correspond to boron 'in the 10^15 cm^-3 range' (10¹⁵ cm⁻³ 台). By the standard resistivity–doping conversion (Irvin curves / ASTM F723), 10 Ω·cm p-type ≈ 1.3×10^15 cm^-3 but 1 Ω·cm p-type ≈ 1.5×10^16 cm^-3, so the span is 10^15–10^16 cm^-3. |
| pn-junction-002 | minor | medium | en.explanation, explanation | 'W ∝ √(Vbi+V), e.g. quadrupling the voltage roughly doubles the width' only holds when V >> Vbi; the condition is not stated (e.g. 1 V→4 V with Vbi=0.7 V gives only ×1.66). |
| pn-junction-005 | minor | medium | en.explanation, explanation | 'SiC diodes about 1-1.5 V' is the value for SiC Schottky barrier diodes; a SiC PN-junction diode turns on at about 2.5-3 V. Placed right after 'wider-bandgap materials need more', it reads as the SiC PN junction value and contradicts the bandgap trend just stated. |
| pn-junction-006 | minor | medium | en.explanation, explanation | The 'doubles about every 10 °C' rule is stated for the reverse saturation current Is, but it applies to the practical (generation-dominated) reverse leakage; the ideal diffusion saturation current Is (∝ ni²) roughly doubles every ~5 °C. |
| pn-junction-045 | minor | low | en.explanation, explanation | 'About 2 kV HBM is the common target' is somewhat outdated: since JEDEC JEP155 (Industry Council on ESD Target Levels) 1 kV HBM (500 V for advanced/high-speed I/O) is the accepted safe target; 2 kV is the legacy figure. |
| power-010 | minor | low | en.explanation, explanation | Defines wide-bandgap as 'roughly 3 eV or more'; common usage sets the threshold around 2 eV or above (GaP 2.26 eV, ZnSe 2.7 eV are usually called wide-gap). |
| process-materials-037 | minor | medium | explanation | JA says novolac strongly absorbs light 'KrFより短い波長' (shorter than KrF), which literally excludes 248 nm and so does not explain why it was replaced at KrF; EN correctly says 'KrF and shorter'. |
| sram-flash-008 | minor | medium | explanation | Block described as 'several hundred pages' while also stated as several to tens of MB with ~16 KB pages; tens of MB needs 1000+ pages (current 3D TLC blocks have roughly 1,000-2,000+ pages). |
| sram-flash-017 | minor | medium | explanation | '1ページ数万セル' understates the cells programmed in parallel: a ~16 KB page (stated elsewhere in this category) is ~131k cells plus spare, i.e. over 100k. |
| sram-flash-043 | minor | medium | explanation | Same as sram-flash-008: 'block = several hundred pages' understates modern 3D NAND blocks (1000+ pages of ~16 KB). |
| wafer-007 | minor | high | en.explanation, explanation | Wafer makers ship finished wafers in FOSBs (front-opening shipping boxes, SEMI M31), not FOUPs, which are in-fab process carriers. The EN text says 'FOSBs or FOUPs', so JA and EN also differ. |
| wafer-010 | minor | high | en.explanation, explanation | p-type 1–10 Ω·cm corresponds to boron ~1.3e15–1.5e16 cm⁻³, not only the 10¹⁵ range (1 Ω·cm is ~1.5e16). |
| wafer-038 | minor | medium | en.explanation, explanation | Multicrystalline (cast) silicon remained the majority of PV production until about 2016–2017; monocrystalline overtook it around 2018. 'Mainstream until the early 2010s' is inaccurate. |

このほかの修正の内訳は、`data/audit-log.json` にすべて記録しています。
- 15項目の検証による修正: automotive-009、automotive-046、photonics-044、sta-cdc-027、sta-cdc-034、datasheet-045、datasheet-046。
- 訳の数値の書き方の修正: wafer-037(仏)、oxidation-032(仏)、ion-implant-048(独)、cpu-032(仏)、analog-038(独)、memory-hierarchy-042(仏)。
- 日本語の書き直し: performance-016。

## 点検しなかった範囲

- 繁体字・韓国語・ドイツ語・オランダ語・フランス語の訳の**意味**は点検していません。点検したのは数値の整合だけです(機械的な検査)。
- 用語集の解説、比較ページ、計算ツールのページ文は、この監査の対象外です。
- 監査役が「境界的で、誤りとまでは言えない」として報告しなかった記述は、[UNVERIFIED_CLAIMS.md](UNVERIFIED_CLAIMS.md) に載せています。
