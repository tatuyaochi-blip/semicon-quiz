// 問題データの検査。単体実行: node tools/validate.js
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const readJSON = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

export function validate() {
  const errors = [];
  let total = 0, unreviewed = 0;
  const exams = readJSON('data/exams.json');
  const categories = readJSON('data/categories.json');

  const catIds = new Set();
  for (const c of categories) {
    for (const k of ['id', 'exam', 'group', 'name', 'description', 'intro']) {
      if (!c[k]) errors.push(`categories.json: ${c.id ?? '?'} に ${k} がありません`);
    }
    if (catIds.has(c.id)) errors.push(`categories.json: 分野IDが重複しています: ${c.id}`);
    catIds.add(c.id);
    const exam = exams.find(e => e.id === c.exam);
    if (!exam) errors.push(`categories.json: ${c.id} の exam "${c.exam}" が exams.json にありません`);
    else if (!exam.groups.some(g => g.id === c.group)) errors.push(`categories.json: ${c.id} の group "${c.group}" が exams.json にありません`);
  }

  const qIds = new Map();
  const dir = path.join(root, 'data/questions');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const cat = f.slice(0, -5);
    if (!catIds.has(cat)) errors.push(`${f}: 分野 "${cat}" が categories.json にありません`);
    let qs;
    try { qs = readJSON(`data/questions/${f}`); } catch (e) { errors.push(`${f}: JSONの書式エラー ${e.message}`); continue; }

    qs.forEach((q, n) => {
      const where = `${f} [${n}] ${q.id ?? ''}`;
      for (const k of ['id', 'question', 'explanation', 'source']) {
        if (typeof q[k] !== 'string' || !q[k]) errors.push(`${where}: ${k} がありません`);
      }
      if (typeof q.reviewed !== 'boolean') errors.push(`${where}: reviewed は true / false で指定してください`);
      if (!Array.isArray(q.choices) || q.choices.length < 2) errors.push(`${where}: choices は2つ以上必要です`);
      else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) {
        errors.push(`${where}: answer は 0〜${q.choices.length - 1} の整数にしてください（現在: ${q.answer}）`);
      }
      if (qIds.has(q.id)) errors.push(`${where}: IDが ${qIds.get(q.id)} と重複しています`);
      else qIds.set(q.id, f);
      total++;
      if (!q.reviewed) unreviewed++;
    });
  }
  return { errors, total, unreviewed };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { errors, total, unreviewed } = validate();
  if (errors.length) {
    console.error(errors.join('\n'));
    console.error(`\nNG: ${errors.length} 件のエラー`);
    process.exit(1);
  }
  console.log(`OK: 問題 ${total} 問（未確認 ${unreviewed} 問）`);
}
