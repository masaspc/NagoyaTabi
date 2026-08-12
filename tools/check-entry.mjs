/* 入場方法の記入もれを機械で止める。人にチェックさせない。

   2026-08-12 の失敗:
   ポケモンセンターナゴヤは混雑期に当日整理券制で、公式サイトで7月に告知されていた。
   こちらは営業時間だけを見て「開店に行けば入れる」と組み、8/11に入れず、8/12の午前へ
   回し、ポケモンセンターへ2回行くことになって徳川美術館は訪問できないまま終わった。

   最初の再発防止は「出発前に確認する」チェック項目だった。それは弱い——人は忘れるし、
   忘れたことに気づけない。だから確認を人の記憶から外し、ここで落とす。

   行程（data/trip.data.js）が指す名所すべてに、入場方法が根拠つきで書かれていなければ
   終了コード1で失敗する。CI（.github/workflows/check.yml）が push と PR で走らせる。

   使い方: node tools/check-entry.mjs */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* data/*.js はブラウザ用に window へ生やす形なので、window を用意して評価する。
   ビルドが無いリポジトリなので、読み込みもこの方式に合わせる。 */
const window = {};
for (const f of ['data/spots.data.js', 'data/trip.data.js']) {
  new Function('window', readFileSync(join(root, f), 'utf8'))(window);
}
const NT = window.NT;

const KINDS = ['free', 'queue', 'ticket', 'lottery', 'reserve', 'timed'];
/* 「何を見て判断したか」。official-site（店舗情報ページ）だけでは、整理券のような
   期間限定の告知は拾えない。だから official-news を別の値として持つ。 */
const VIA = ['official-news', 'official-site', 'phone', 'onsite'];
/* 確認が古すぎると意味がない。整理券の告知は旅の直前に出る（今回は7月に8月分）。
   旅の開始から数えてこの日数より前の確認は、確認していないのと同じ扱いにする。 */
const MAX_AGE_DAYS = 30;

const errors = [];
const warnings = [];

/* 行程が実際に指す名所だけを対象にする。代替（雨・猛暑・行列の差し替え先）も
   その日に行く可能性がある以上、同じ厳しさで見る。 */
const referenced = new Map();
for (const plan of NT.plans) {
  for (const day of plan.days) {
    for (const item of day.items) {
      const add = (id, why) => { if (id && !referenced.has(id)) referenced.set(id, why); };
      add(item.spotId, `${plan.id} ${day.date} ${item.time}`);
      for (const alt of Object.values(item.alts || {})) {
        add(alt.spotId, `${plan.id} ${day.date} ${item.time} の代替`);
      }
    }
  }
}

const tripStart = NT.plans
  .flatMap(p => p.days.map(d => d.date))
  .sort()[0];

function daysBefore(dateISO, baseISO) {
  return Math.round((new Date(baseISO) - new Date(dateISO)) / 86400000);
}

for (const [id, where] of referenced) {
  const spot = NT.spots.find(s => s.id === id);
  if (!spot) { errors.push(`${id}: 行程が参照しているが名所データに無い（${where}）`); continue; }

  const e = spot.entry;
  const at = `${spot.name}（${id}）`;

  if (!e) {
    errors.push(`${at}: entry が無い。営業時間だけでなく「どうやって入るか」を、` +
      `公式サイトのお知らせを読んだうえで書くこと（${where}）`);
    continue;
  }
  if (!KINDS.includes(e.kind)) {
    errors.push(`${at}: entry.kind が ${JSON.stringify(e.kind)}。${KINDS.join(' / ')} のいずれかにする`);
  }
  if (!VIA.includes(e.checkedVia)) {
    errors.push(`${at}: entry.checkedVia が ${JSON.stringify(e.checkedVia)}。` +
      `${VIA.join(' / ')} のいずれかで、実際に見たものを書く`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.checkedOn || '')) {
    errors.push(`${at}: entry.checkedOn が無い（YYYY-MM-DD）`);
  } else {
    const age = daysBefore(e.checkedOn, tripStart);
    if (age > MAX_AGE_DAYS) {
      errors.push(`${at}: 確認が ${e.checkedOn}（旅の${age}日前）で古い。` +
        `${MAX_AGE_DAYS}日以内に確認し直すこと——整理券や抽選の告知は旅の直前に出る`);
    }
  }
  /* 自由入場でないなら、根拠を残す。あとで「本当にそうだったか」を辿れないと、
     次に組む人がまた一から調べ直すことになる。 */
  if (e.kind && e.kind !== 'free' && !e.url && !spot.tel && !spot.official) {
    errors.push(`${at}: ${e.kind} なのに根拠が無い。entry.url か spot.tel か spot.official を入れる`);
  }
  /* 店舗情報ページしか見ていない状態で「事前手配が要る」種別を書いているのは、
     たいてい期間限定の告知を読んでいない。落としはしないが指摘する。 */
  if (['ticket', 'lottery', 'reserve', 'timed'].includes(e.kind) && e.checkedVia !== 'official-news') {
    warnings.push(`${at}: ${e.kind} だが checkedVia が ${e.checkedVia}。` +
      `対象日や配布時刻は公式の「お知らせ」に出るので、そちらも読むこと`);
  }
  if ((e.note || '').includes('未確認')) {
    warnings.push(`${at}: note に未確認が残っている —— ${e.note}`);
  }
}

for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);

console.log(`\n対象 ${referenced.size} 件 / エラー ${errors.length} / 警告 ${warnings.length}`);
if (errors.length) {
  console.error('\n入場方法の記入もれがあります。営業時間のページではなく、公式サイトの' +
    '「お知らせ」を読んでから書いてください。');
  process.exit(1);
}
console.log('入場方法はすべて根拠つきで記入されています。');
