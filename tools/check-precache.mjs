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

/* 中身を変えたのに VERSION を据え置くと、既にホーム画面へ追加した端末は
   古いままになる。比較元が分かるときだけ見る（浅いクローンでは黙って飛ばす）。 */
function baseRef() {
  for (const ref of ['origin/main', 'main']) {
    try {
      execSync(`git rev-parse --verify ${ref}`, { cwd: root, stdio: 'ignore' });
      return ref;
    } catch { /* 次を試す */ }
  }
  return null;
}
const base = baseRef();
if (base) {
  try {
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
      }
    }
  } catch {
    console.log('note  比較元と差分が取れなかったため VERSION の確認は飛ばした');
  }
} else {
  console.log('note  比較元が見つからないため VERSION の確認は飛ばした');
}

for (const e of errors) console.error(`ERROR ${e}`);
console.log(`\nページ ${pages.length} / PRECACHE ${precache.size} 件 / エラー ${errors.length}`);
if (errors.length) process.exit(1);
console.log('PRECACHE と VERSION は揃っています。');
