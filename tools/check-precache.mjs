/* sw.js の PRECACHE と VERSION の取りこぼしを機械で止める。

   README に書いてあるとおり、ここを忘れると壊れ方が地味で気づきにくい:
     - PRECACHE に足し忘れ → オフライン（機内モード・地下街）でそのファイルだけ落ちる
     - VERSION を上げ忘れ  → ホーム画面に追加済みの端末が古い版を表示し続ける
   どちらも「手で並べる配列」を人が覚えている前提だったので、機械に見させる。

   使い方: node tools/check-precache.mjs */

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(root, f), 'utf8');

const sw = read('sw.js');
const version = (sw.match(/var VERSION = '([^']+)'/) || [])[1];
const precache = new Set(
  (sw.split('];')[0].match(/'([^']+)'/g) || []).map(s => s.slice(1, -1))
);

const errors = [];
if (!version) errors.push('sw.js の VERSION が読めない');

/* ページ一覧は core.js の NT.PAGES が唯一の情報源。ナビに足したページを
   PRECACHE に足し忘れる、という抜けをここで拾う。 */
const window = {};
new Function('window', read('assets/core.js'))(window);
const pages = window.NT.PAGES.map(p => p.file);

for (const page of pages) {
  if (!precache.has(page)) errors.push(`${page}: NT.PAGES にあるが PRECACHE に無い`);
}

/* 各ページが読み込む同一オリジンのファイルは、すべて PRECACHE に要る。
   Google Fonts など別オリジンは対象外（sw.js の fetch ハンドラが素通しする設計で、
   足しても意味がない）。 */
for (const page of pages) {
  const html = read(page);
  const refs = [
    ...(html.match(/<script src="([^"]+)"/g) || []),
    ...(html.match(/<link[^>]+href="([^"]+)"/g) || [])
  ].map(tag => tag.match(/(?:src|href)="([^"]+)"/)[1]);

  for (const ref of refs) {
    if (/^https?:/.test(ref)) continue;
    if (!precache.has(ref)) errors.push(`${page}: ${ref} が PRECACHE に無い`);
  }
}

for (const entry of precache) {
  if (entry === './' || entry === version) continue;
  if (!existsSync(join(root, entry))) errors.push(`PRECACHE の ${entry} が存在しない`);
}

/* 中身を変えたのに VERSION を据え置くと、既にホーム画面へ追加した端末は古いままになる。

   比較元の決め方には一度失敗している。当初は origin/main / main を探すだけだったが、
   actions/checkout は既定で1コミットしか取らないため CI では origin/main が存在せず、
   **この検査は毎回「飛ばした」と出力して素通りしていた**（実際のCIログで確認）。
   守っているつもりで守れていない検査は、無い検査より悪い。

   そこで (1) ワークフローが BASE_SHA を明示的に渡し（PRなら base.sha、pushなら before）、
   (2) それでも比較元が決まらないときは、CI では黙って飛ばさず**失敗させる**。 */
function baseRev() {
  const env = (process.env.BASE_SHA || '').trim();
  /* 新しいブランチの初回 push では before が 0 埋めになる。その場合は次の候補へ */
  if (env && !/^0+$/.test(env)) {
    try {
      execSync(`git cat-file -e ${env}^{commit}`, { cwd: root, stdio: 'ignore' });
      return env;
    } catch { /* 取れていないコミットなら次の候補へ */ }
  }
  for (const ref of ['origin/main', 'main']) {
    try {
      const sha = execSync(`git rev-parse --verify ${ref}`, { cwd: root }).toString().trim();
      /* main への push では main == HEAD になり、差分が空になって意味を失う */
      const head = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
      if (sha !== head) return ref;
    } catch { /* 次を試す */ }
  }
  return null;
}

const base = baseRev();
if (base) {
  const changed = execSync(`git diff --name-only ${base}...HEAD`, { cwd: root })
    .toString().split('\n').filter(Boolean);
  const cached = changed.filter(f => precache.has(f));
  if (cached.length) {
    const baseSw = execSync(`git show ${base}:sw.js`, { cwd: root }).toString();
    const baseVersion = (baseSw.match(/var VERSION = '([^']+)'/) || [])[1];
    if (baseVersion === version) {
      errors.push(
        `キャッシュ対象の ${cached.length} 件を変更したのに VERSION が ${version} のまま。` +
        `上げないと、ホーム画面に追加済みの端末が古い版を表示し続ける（${cached.join(', ')}）`
      );
    } else {
      console.log(`note  VERSION ${baseVersion} → ${version}（変更 ${cached.length} 件）`);
    }
  } else {
    console.log('note  キャッシュ対象に変更なし');
  }
} else if (process.env.CI) {
  errors.push(
    '比較元が決まらないため VERSION を確認できなかった。CIでは飛ばさず失敗にする——' +
    'checkout に fetch-depth: 0 を付け、BASE_SHA を渡すこと'
  );
} else {
  console.log('note  手元では比較元が無いため VERSION の確認は飛ばした（CIでは失敗になる）');
}

for (const e of errors) console.error(`ERROR ${e}`);
console.log(`\nページ ${pages.length} / PRECACHE ${precache.size} 件 / エラー ${errors.length}`);
if (errors.length) process.exit(1);
console.log('PRECACHE と VERSION は揃っています。');
