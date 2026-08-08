# 名古屋旅ガイドサイト Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2026年8月11-12日の名古屋旅で現地から開き、予定が崩れてもその場で判断を差し替えられる静的サイトを GitHub Pages に公開する。

**Architecture:** ビルド工程を持たない静的サイト。4枚のHTMLが `data/*.data.js` を素朴な `<script src>` で読み、単一のグローバル `window.NT` からデータを取る。ページ固有のJSは `NT` を読んで描画するだけで、データの取得方法を知らない。外部ライブラリとCDNを一切使わず、QRコード生成と地下鉄マップも自前実装する。

**Tech Stack:** 素のHTML / CSS / ES2020相当のJavaScript（モジュールなし）、localStorage、IndexedDB、Service Worker、Canvas、SVG。テストランナーは置かず、ブラウザでの手動確認を検証手段とする。

## Global Constraints

以下は全タスクの要件に暗黙に含まれる。

- **ESモジュールを使わない。** `<script src>` とグローバル `window.NT` のみ。`import` / `export` / `type="module"` を書かない。`file://` で直接開いても動くこと。
- **外部ネットワーク依存をゼロにする。** CDN、外部API、Webフォントの実行時取得、地図タイル、天気APIを使わない。フォントは `font-family` にシステムフォントのフォールバックを必ず併記する。
- **パスはすべて相対パス。** ルート相対（`/assets/...`）を書かない。`https://<user>.github.io/NagoyaTabi/` でも `file://` でも同じHTMLが動くこと。
- **時刻は必ず `NT.now()` を経由する。** `new Date()` を各機能で直に呼ばない。デモ時刻の上書きを全機能に効かせるため。
- **営業時間を断定しない。** `unverified: true` のレコードは画面に「要確認」バッジと電話番号を出す。「×」と書かない。
- **幅375pxで横スクロールを発生させない。** 表など幅が必要な要素は、その要素自身を `overflow-x:auto` で囲む。
- 色トークン: 六浄緑 `#1D5C55` / 深緑 `#0D2B28` / 中緑 `#2E7A70` / 金 `#C79A3C` / 淡金 `#E4C177` / 味噌 `#6B3226` / 紙 `#EAEDE6` / 明紙 `#F5F7F2` / 墨 `#1E2523` / 灰 `#6E7873` / 罫 `#C6CDC5`
- 書体: 見出し `"Shippori Mincho B1", serif` / 本文 `"Zen Kaku Gothic New", system-ui, sans-serif` / 数値 `"Space Mono", ui-monospace, monospace`
- localStorage のキーは全て `nt:` 接頭辞。`nt:theme` `nt:plan` `nt:situation` `nt:clock` `nt:progress` `nt:checks` `nt:visited` `nt:omiyage` `nt:trivia`
- 検証は各タスク末尾の手動確認手順で行う。自動テストは書かない。

---

## File Structure

| ファイル | 責務 |
|---|---|
| `index.html` | 行程ページの骨格 |
| `spots.html` | 名所図鑑ページの骨格 |
| `gourmet.html` | 名物図鑑ページの骨格 |
| `tips.html` | 実用メモページの骨格 |
| `assets/style.css` | 色・書体トークン、共通コンポーネント、夜モード、印刷 |
| `assets/core.js` | `NT.now()`、ストレージ、DOM補助、ナビ、テーマ、スワイプ |
| `data/spots.data.js` | 名所 約30件 |
| `data/foods.data.js` | 名物 約20品 |
| `data/trip.data.js` | 行程 プランA / プランB |
| `data/transit.data.js` | 移動区間 約15本 |
| `data/trivia.data.js` | 豆知識カード 約40枚 |
| `data/omiyage.data.js` | 土産候補 約10品 |
| `assets/itinerary.js` | 行程描画・プラン切替・今ここ追尾・遅延リカバリ・状況切替 |
| `assets/spotlist.js` | 名所描画・エリアフィルタ・GPS距離ソート・訪問済み |
| `assets/gourmetlist.js` | 名物描画・制覇チェック・写真とメモ・五食メーター |
| `assets/tipspage.js` | 営業時間表・移動早見表・土産リスト |
| `assets/subwaymap.js` | SVG地下鉄マップ |
| `assets/triviagacha.js` | 豆知識ガチャ |
| `assets/qr.js` | QRコード生成 |
| `assets/summary.js` | 旅サマリー画像生成 |
| `manifest.webmanifest` | ホーム画面に追加 |
| `sw.js` | precache と cache-first |

---

## Task 一覧と依存

| # | タスク | 依存 |
|---|---|---|
| 1 | 土台（`style.css` + `core.js` + 4ページの骨格） | — |
| 2 | 名所データ 30件 | 1 |
| 3 | 行程データ プランA / B | 2 |
| 4 | 行程ページ 描画とプラン切替 | 3 |
| 5 | 今ここ追尾とデモ時刻 | 4 |
| 6 | 遅延リカバリ | 5 |
| 7 | 状況切替（雨・猛暑・行列） | 4 |
| 8 | 名所ページ（フィルタ・GPS・訪問済み） | 2 |
| 9 | 名物データ 20品と名物ページ | 1 |
| 10 | 五食メーターと写真つき記録 | 9 |
| 11 | 移動データと実用メモページ（営業時間表・移動早見表） | 2, 9 |
| 12 | 土産リスト | 11 |
| 13 | 地下鉄SVGマップ | 2 |
| 14 | 豆知識ガチャ | 2 |
| 15 | QRコード生成 | 11 |
| 16 | 旅サマリー画像 | 10 |
| 17 | 夜モードとスワイプ遷移 | 1 |
| 18 | 印刷レイアウト | 4, 11 |
| 19 | PWA（manifest と sw.js） | 全て |
| 20 | 通し確認と公開 | 19 |

Task 5→6 と 9→10 と 11→12 は前提が強いので順に実施する。それ以外は依存が満たされていれば並行可。

---

### Task 1: 土台（共通CSS・共通JS・4ページの骨格）

**Files:**
- Create: `assets/style.css`
- Create: `assets/core.js`
- Create: `index.html`, `spots.html`, `gourmet.html`, `tips.html`
- Create: `.gitignore`

**Interfaces:**
- Consumes: なし
- Produces: グローバル `NT` オブジェクト。以降の全タスクが使う。
  - `NT.now() -> Date` — 時刻源。`nt:clock` に ISO 文字列があればそれを返す
  - `NT.setClock(iso|null) -> void` — デモ時刻を設定、`null` で解除
  - `NT.get(key, fallback) -> any` — `nt:` 接頭辞つき localStorage 読み込み、JSON パース失敗時は fallback
  - `NT.set(key, value) -> void` — 同 書き込み
  - `NT.el(tag, attrs, children) -> HTMLElement` — 要素生成。`attrs.class` / `attrs.text` / `attrs.html` を特別扱い
  - `NT.$(sel, root) -> HTMLElement|null`、`NT.$$(sel, root) -> HTMLElement[]`
  - `NT.PAGES -> [{file, label}]` — ナビとスワイプ順の単一の情報源
  - `NT.mountNav(currentFile) -> void` — `header[data-nav]` にナビとテーマトグルを描く
  - `NT.fmtTime(date) -> 'HH:MM'`、`NT.parseHM('HH:MM', dateStr) -> Date`
  - HTML の各ページは `<main data-page="...">` を持つ

- [ ] **Step 1: `.gitignore` を作る**

```
.DS_Store
```

- [ ] **Step 2: `assets/core.js` を書く**

```js
/* 共通基盤。すべてのページが最初に読む。 */
(function (w) {
  var NT = (w.NT = w.NT || {});

  /* ---- ストレージ ---- */
  NT.get = function (key, fallback) {
    try {
      var raw = localStorage.getItem('nt:' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  };
  NT.set = function (key, value) {
    try {
      localStorage.setItem('nt:' + key, JSON.stringify(value));
    } catch (e) {
      /* 容量超過やプライベートモードでは黙って諦める。表示は壊さない。 */
    }
  };

  /* ---- 時刻源。デモ時刻を全機能に効かせるため、直に new Date() を呼ばせない ---- */
  NT.now = function () {
    var iso = NT.get('clock', null);
    return iso ? new Date(iso) : new Date();
  };
  NT.setClock = function (iso) {
    if (iso) NT.set('clock', iso);
    else localStorage.removeItem('nt:clock');
  };
  NT.isClockFaked = function () {
    return !!NT.get('clock', null);
  };
  NT.fmtTime = function (d) {
    var h = ('0' + d.getHours()).slice(-2), m = ('0' + d.getMinutes()).slice(-2);
    return h + ':' + m;
  };
  /* 'HH:MM' と 'YYYY-MM-DD' から Date を作る */
  NT.parseHM = function (hm, dateStr) {
    var p = hm.split(':'), d = dateStr.split('-');
    return new Date(+d[0], +d[1] - 1, +d[2], +p[0], +p[1], 0, 0);
  };

  /* ---- DOM ---- */
  NT.$ = function (sel, root) { return (root || document).querySelector(sel); };
  NT.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };
  NT.el = function (tag, attrs, children) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  };

  /* ---- ページ定義。ナビとスワイプ順の単一の情報源 ---- */
  NT.PAGES = [
    { file: 'index.html', label: '行程' },
    { file: 'spots.html', label: '名所' },
    { file: 'gourmet.html', label: '名物' },
    { file: 'tips.html', label: 'メモ' }
  ];

  /* ---- テーマ。auto / light / dark の3状態を回す ---- */
  var THEMES = ['auto', 'light', 'dark'];
  NT.applyTheme = function () {
    var t = NT.get('theme', 'auto');
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    return t;
  };
  NT.cycleTheme = function () {
    var t = NT.get('theme', 'auto');
    NT.set('theme', THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]);
    return NT.applyTheme();
  };

  /* ---- ナビ ---- */
  NT.mountNav = function (currentFile) {
    var host = NT.$('header[data-nav]');
    if (!host) return;
    var label = { auto: '端末設定', light: '昼', dark: '夜' };
    var btn = NT.el('button', {
      class: 'theme-toggle', type: 'button',
      'aria-label': '表示テーマを切り替える',
      text: '◐ ' + label[NT.applyTheme()],
      onclick: function () { btn.textContent = '◐ ' + label[NT.cycleTheme()]; }
    });
    host.appendChild(NT.el('nav', { class: 'nav', 'aria-label': 'ページ切り替え' },
      NT.PAGES.map(function (p) {
        return NT.el('a', {
          href: p.file, text: p.label,
          class: p.file === currentFile ? 'on' : null,
          'aria-current': p.file === currentFile ? 'page' : null
        });
      }).concat([btn])
    ));
  };

  /* ---- 空状態や失敗理由の1行表示。無言で失敗させないため ---- */
  NT.notice = function (host, text, kind) {
    host.appendChild(NT.el('p', { class: 'notice' + (kind ? ' ' + kind : ''), text: text }));
  };
})(window);
```

- [ ] **Step 3: `assets/style.css` を書く**

トークンは素の `:root` に完全な昼パレットを置き、夜は `@media (prefers-color-scheme: dark)` を
`:root:not([data-theme="light"])` で守り、`:root[data-theme="dark"]` で手動指定を勝たせる。
どの色も media / `[data-theme]` の中だけで初出させない。

```css
:root{
  --rokusho:#1D5C55; --rokusho-deep:#0D2B28; --rokusho-mid:#2E7A70;
  --kin:#C79A3C; --kin-light:#E4C177; --miso:#6B3226;
  --paper:#EAEDE6; --paper-hi:#F5F7F2; --sumi:#1E2523;
  --gray:#6E7873; --rule:#C6CDC5;
  --bg:var(--paper); --card:var(--paper-hi); --fg:var(--sumi);
  --head-bg:var(--rokusho-deep); --head-fg:#EDF2EE; --head-sub:#9FB6B1;
  --accent:var(--rokusho); --shadow:0 1px 2px rgba(30,37,35,.06);
}
:root:not([data-theme="light"]){
  @media (prefers-color-scheme: dark){
    --bg:#121817; --card:#1A2220; --fg:#E4EAE7;
    --paper-hi:#1A2220; --sumi:#E4EAE7; --gray:#93A19C; --rule:#33403C;
    --rokusho:#4E9C91; --rokusho-mid:#5FAFA3; --kin:#D9B25E; --miso:#B8705C;
    --head-bg:#0B1413; --head-fg:#E4EAE7; --head-sub:#8FA8A3;
    --accent:#5FAFA3; --shadow:none;
  }
}
:root[data-theme="dark"]{
  --bg:#121817; --card:#1A2220; --fg:#E4EAE7;
  --paper-hi:#1A2220; --sumi:#E4EAE7; --gray:#93A19C; --rule:#33403C;
  --rokusho:#4E9C91; --rokusho-mid:#5FAFA3; --kin:#D9B25E; --miso:#B8705C;
  --head-bg:#0B1413; --head-fg:#E4EAE7; --head-sub:#8FA8A3;
  --accent:#5FAFA3; --shadow:none;
}

*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);
  font-family:"Zen Kaku Gothic New",system-ui,-apple-system,sans-serif;
  font-size:15px;line-height:1.75;overflow-x:hidden}
h1,h2,h3{font-family:"Shippori Mincho B1",serif;font-weight:700;letter-spacing:.02em;margin:0}
a{color:var(--accent)}
.wrap{max-width:920px;margin:0 auto;padding:0 18px}
.mono{font-family:"Space Mono",ui-monospace,monospace}

header[data-nav]{background:var(--head-bg);color:var(--head-fg);
  border-bottom:3px solid var(--kin);position:sticky;top:0;z-index:20}
.nav{max-width:920px;margin:0 auto;padding:0 18px;display:flex;align-items:center;gap:4px}
.nav a{flex:1;text-align:center;padding:13px 4px;color:var(--head-sub);
  text-decoration:none;font-size:14px;font-weight:500;
  border-bottom:2px solid transparent;min-height:44px}
.nav a.on{color:#fff;border-bottom-color:var(--kin);font-weight:700}
.theme-toggle{background:none;border:1px solid rgba(199,154,60,.45);color:var(--kin-light);
  font-size:11px;padding:7px 9px;border-radius:2px;cursor:pointer;
  font-family:"Space Mono",ui-monospace,monospace;white-space:nowrap;min-height:34px}

.page-head{background:var(--head-bg);color:var(--head-fg);padding:26px 0 24px}
.page-head .eyebrow{font-family:"Space Mono",ui-monospace,monospace;font-size:10.5px;
  letter-spacing:.24em;color:var(--kin-light);text-transform:uppercase;margin-bottom:10px}
.page-head h1{font-size:clamp(23px,6vw,36px);line-height:1.3;color:#fff}
.page-head .sub{display:block;font-size:13px;font-weight:400;color:var(--head-sub);margin-top:10px;
  font-family:"Zen Kaku Gothic New",system-ui,sans-serif}

section{padding:30px 0}
.sec-head{display:flex;align-items:baseline;gap:12px;margin-bottom:18px;
  border-bottom:1px solid var(--rule);padding-bottom:10px}
.sec-head h2{font-size:20px}
.sec-head .no{font-family:"Space Mono",ui-monospace,monospace;font-size:10.5px;
  letter-spacing:.2em;color:var(--gray)}

.card{background:var(--card);border:1px solid var(--rule);border-radius:3px;
  padding:15px 17px;margin-bottom:12px;box-shadow:var(--shadow)}
.badge{display:inline-block;font-size:10.5px;letter-spacing:.06em;font-weight:700;
  padding:2px 7px;border-radius:2px;vertical-align:1px;white-space:nowrap}
.badge.indoor{background:var(--rokusho);color:#fff}
.badge.shade{background:var(--rokusho-mid);color:#fff}
.badge.warn{background:var(--miso);color:#fff}
.badge.kin{background:var(--kin);color:#231A08}
.notice{font-size:12.5px;color:var(--gray);margin:8px 0 0}
.notice.warn{color:var(--miso);font-weight:500}

.btnrow{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px}
.btn{background:var(--card);border:1px solid var(--rule);color:var(--fg);
  font-size:13px;padding:9px 13px;border-radius:2px;cursor:pointer;min-height:40px;
  font-family:inherit}
.btn.on{background:var(--rokusho);border-color:var(--rokusho);color:#fff;font-weight:700}
.btn:disabled{opacity:.5;cursor:default}

.table-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;
  border:1px solid var(--rule);border-radius:3px;background:var(--card)}
table{border-collapse:collapse;width:100%;min-width:560px;font-size:13px}
th,td{padding:11px 13px;text-align:left;border-bottom:1px solid var(--rule);vertical-align:top}
thead th{background:var(--rokusho-deep);color:#fff;
  font-family:"Shippori Mincho B1",serif;font-size:13.5px;position:sticky;top:0}
tbody th{font-weight:700;font-size:13px;white-space:nowrap;background:var(--paper-hi)}

footer{background:var(--head-bg);color:var(--head-sub);padding:24px 0;font-size:12.5px;margin-top:20px}

@media (prefers-reduced-motion:no-preference){
  .card{animation:rise .35s ease both}
  @keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
}
```

- [ ] **Step 4: 4枚のHTMLを書く**

4枚とも同じ骨格にする。`index.html` の例（他3枚は `data-page`、`<title>`、`page-head` の中身、
末尾で読む JS ファイルだけを差し替える）。`data/*.data.js` はこの時点では未作成なので、
Task 1 では読み込まない。Task 2 以降で該当タスクが `<script>` 行を足す。

```html
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>行程｜名古屋 王道 2026.8.11-12</title>
<meta name="theme-color" content="#0D2B28">
<link rel="manifest" href="manifest.webmanifest">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<header data-nav></header>
<main data-page="itinerary">
  <div class="page-head"><div class="wrap">
    <div class="eyebrow">plan / 2026.08.11 tue - 08.12 wed</div>
    <h1>名古屋 王道、五食で組む。
      <span class="sub">東京 10:12 発 のぞみ ／ 11:48 名古屋着 ／ 復路 14:49 発</span></h1>
  </div></div>
  <div class="wrap" id="itinerary-root"></div>
</main>
<footer><div class="wrap">
  営業時間は 2026-08-08 時点の確認。「要確認」の店は出発前に電話で確かめてください。
</div></footer>
<script src="assets/core.js"></script>
<script>NT.mountNav('index.html');</script>
</body>
</html>
```

他3枚のヘッダ内容:

| ファイル | `data-page` | `<title>` | h1 | sub | 描画先 id |
|---|---|---|---|---|---|
| `spots.html` | `spots` | `名所｜名古屋 王道 2026.8.11-12` | 観光名所 図鑑 | 確定行程の10箇所と、動線上の代替20箇所 | `spots-root` |
| `gourmet.html` | `gourmet` | `名物｜名古屋 王道 2026.8.11-12` | 名古屋名物 図鑑 | 何がどう名古屋なのか。五食の枠と制覇状況 | `gourmet-root` |
| `tips.html` | `tips` | `メモ｜名古屋 王道 2026.8.11-12` | 実用メモ | 営業時間・移動・土産・暑さ対策 | `tips-root` |

`manifest.webmanifest` は Task 19 で作る。Task 1 の時点では 404 になるが、
`<link rel="manifest">` の 404 は表示を壊さないので先に書いておいてよい。

- [ ] **Step 5: 手動確認**

```bash
open index.html
```

確認すること:
1. コンソールにエラーが出ない
2. ヘッダに「行程 / 名所 / 名物 / メモ」と `◐ 端末設定` が並び、「行程」に金色の下線が付く
3. リンクで4ページを行き来でき、各ページで現在地の下線が移る
4. `◐` を押すごとに `端末設定 → 昼 → 夜 → 端末設定` と回り、夜で背景が暗くなる
5. リロードしてもテーマ選択が残る
6. 開発者ツールで幅375pxにして横スクロールバーが出ない
7. コンソールで `NT.setClock('2026-08-11T15:24:00'); NT.fmtTime(NT.now())` が `'15:24'` を返す。
   続けて `NT.setClock(null); NT.isClockFaked()` が `false` を返す

- [ ] **Step 6: コミット**

```bash
git add .gitignore assets/core.js assets/style.css index.html spots.html gourmet.html tips.html
git commit -m "feat: 4ページの骨格と共通基盤を追加

NT.now() を唯一の時刻源にして、デモ時刻の上書きを全機能へ効かせる。
テーマは auto/light/dark の3状態で、色は素の :root に完全な昼パレットを置き
夜は media と data-theme の両方で上書きする。"
```

---

### Task 2: 名所データ 30件

**Files:**
- Create: `data/spots.data.js`
- Modify: `spots.html`（`<script src="data/spots.data.js">` を `core.js` の後に足す）

**Interfaces:**
- Consumes: `NT`（Task 1）
- Produces: `NT.spots -> Spot[]`、`NT.spotById(id) -> Spot|undefined`、`NT.AREAS -> string[]`
  - `Spot = { id, name, area, category, indoor:bool, shade:bool, station, walk, hours, closed,
    fee, stay:number, lat, lng, map, official, trivia:string[], tips:string[],
    verifiedOn:string, unverified:bool, tel? }`
  - `stay` は分。`lat`/`lng` は Task 8 の距離計算が使う。
  - `NT.AREAS = ['名古屋駅','栄・大須','熱田','名古屋城','覚王山・東部','その他']`

- [ ] **Step 1: `data/spots.data.js` を書く**

先頭は共通のひな型。全30件がこの形に従う。

```js
(function (w) {
  var NT = (w.NT = w.NT || {});
  NT.AREAS = ['名古屋駅', '栄・大須', '熱田', '名古屋城', '覚王山・東部', 'その他'];

  NT.spots = [
    /* ===== 確定行程の箇所。trivia と tips を厚く ===== */
    { id:'kanou', name:'味処 叶', area:'栄・大須', category:'食事',
      indoor:true, shade:true,
      station:'地下鉄 栄駅', walk:'徒歩3分（矢場町駅 徒歩6分）',
      hours:'11:00-14:30 / 17:00-20:30',
      closed:'月・火（祝日の場合は次の日が定休日）',
      fee:'元祖味噌カツ丼 1,800円前後', stay:60,
      lat:35.1667, lng:136.9075, tel:'052-241-3471',
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('味処 叶 名古屋市中区栄3-4-110'),
      official:'https://www.misokatu-kanou.com/',
      trivia:[
        '創業昭和24年。味噌カツ発祥を名乗る店のひとつ',
        '揚げたカツに味噌だれをかけるのではなく、味噌で煮込むのが元祖の作り方。だから重さが出ない',
        '半熟玉子とねぎを足した状態が地元の定番',
        '支店を持たず1店舗のみ。名古屋を離れると食べられない'
      ],
      tips:[
        '定休は月・火だが「祝日の場合は次の日が定休日」。8/11は山の日なので営業し、振替で8/12が休みになる可能性が高い',
        '昼の部は14:30まで。小さい店なので開店前後に着くのが安全',
        '公式サイトに営業カレンダーがある。出発前に052-241-3471で確認するのが確実'
      ],
      verifiedOn:'2026-08-08', unverified:true },
    /* …以降29件を同じ形で… */
  ];

  NT.spotById = function (id) {
    for (var i = 0; i < NT.spots.length; i++) if (NT.spots[i].id === id) return NT.spots[i];
    return undefined;
  };
})(window);
```

収録する30件の id と要点。`trivia` は確定行程分（★）が4〜5本、代替分が2〜3本。

**★確定行程（10件）**

| id | name | area | 押さえる要点 |
|---|---|---|---|
| `kanou` | 味処 叶 | 栄・大須 | 上記のとおり |
| `atsuta` | 熱田神宮 | 熱田 | 三種の神器の草薙剣を祀る。信長が桶狭間の戦勝で奉納した信長塀。「こころの小径」は9:00-16:00のみ通行可。境内は樹齢1000年超の大楠で木陰が濃く真夏でも歩ける。きよめ餅が門前名物。境内24時間・宝物館9:00-16:30 |
| `pokecen` | ポケモンセンターナゴヤ | 栄・大須 | 名古屋PARCO 西館?→**東館2F**、矢場町駅4番出口 徒歩1分、10:00-21:00。しゃちほこピカチュウはここ限定。祝日の昼過ぎは入場制限が出ることがある |
| `osu` | 大須商店街 | 栄・大須 | 全蓋アーケードで日陰。大須観音は真言宗、徳川家康が岐阜から移築させた。1200点超の店が並び、電気街と古着とグルメが混在。上前津・大須観音・矢場町のいずれからも歩ける |
| `nagoyajo` | 名古屋城 | 名古屋城 | 夏まつり8/8-16は9:00-20:30（閉門21:00）。**本丸御殿・西南隅櫓・西の丸御蔵城宝館の最終入場は16時**。天守は耐震性の問題で内部非公開。金鯱は北が雌・南が雄で鱗の数が違う。8/11は大盆踊り18:00-20:00、大道芸16:00-20:30、鯱食堂16:00-20:30、城子屋「名古屋城と怪異」18:00-19:30 |
| `shachihoko-shokudo` | 鯱食堂 | 名古屋城 | 夏まつり期間の城内飲食ブース。16:00-20:30。かき氷・ビール・屋台グルメ。城の外の金シャチ横丁まで出なくて済む |
| `gomitori` | 伍味酉 本店 | 栄・大須 | 17:00-05:00（料理L.O. 04:00）年中無休。純系名古屋コーチンの串焼き、贅沢親子丼、味噌おでん。骨董で埋まった内装。盆踊りが20:00に終わってからでも余裕で間に合う |
| `tokugawa` | 徳川美術館 | 覚王山・東部 | 10:00-17:00（入館16:30）月曜休館、一般2,000円。尾張徳川家の大名道具1万点余。国宝「源氏物語絵巻」は原本非公開で複製展示が基本。2026/7/25-9/27は夏季特別展「武芸 サムライ・アスリート」。隣接の徳川園は別料金。屋内なので猛暑日の逃げ場 |
| `maruya-esca` | まるや本店 名駅店 | 名古屋駅 | 名古屋駅太閤通口地下街エスカ。年中無休で駅直結、復路14:49発の日に確実。備長炭で焼く関西風の地焼き |
| `sumiyoshi` | 住よし | 名古屋駅 | 新幹線ホーム上の立ち食いきしめん。改札を出ずに食べられる。だしは濃口で花かつおが大量に乗る。3〜5分で出る |

**代替・周辺（20件）**

| id | name | area | 要点 |
|---|---|---|---|
| `houraiken-jingu` | あつた蓬莱軒 神宮店 | 熱田 | 11:30-14:30L.O./16:30-20:30。定休 火・第2第4月（祝日は営業、振替休あり）→8/12は振替休の恐れ。`unverified:true` |
| `houraiken-honten` | あつた蓬莱軒 本店 | 熱田 | 定休 **水**・第2第4木 →8/12は定休。ひつまぶしの登録商標を持つ |
| `houraiken-matsuzakaya` | あつた蓬莱軒 松坂屋店 | 栄・大須 | 矢場町。土日祝は11:00-20:30通し営業でL.O.の崖がない。定休 火（祝日は営業、振替休あり）。`unverified:true` |
| `yabaton` | 矢場とん 矢場町本店 | 栄・大須 | わらじとんかつ。味噌だれは甘め。年中無休 |
| `suzuya` | すゞ家 | 栄・大須 | 大須の老舗。味噌カツと味噌串カツ。街歩きの動線上で軽く寄れる |
| `tonpachi` | とん八 | その他 | JR鶴舞駅 徒歩7分。カツ全体を覆うドロドロ系。動線から外れる |
| `sekaino-yamachan` | 世界の山ちゃん 本店 | 栄・大須 | 幻の手羽先。こしょうが強い。深夜まで |
| `furaibou` | 風来坊 栄店 | 栄・大須 | 手羽先唐揚げの元祖を名乗る。甘辛のたれ |
| `yamamotoya` | 山本屋総本家 | 栄・大須 | 味噌煮込みうどん。芯が残る固さが仕様。蓋を取り皿にする |
| `misen` | 味仙 今池本店 | 覚王山・東部 | 台湾ラーメンの発祥。台湾に台湾ラーメンは無い。辛さは注文時に調整可 |
| `yoshikawa` | ヨコイ 住吉店 | 栄・大須 | あんかけスパの元祖。極太麺と黒胡椒の効いたソース |
| `kissa-tanaka` | コンパル 大須本店 | 栄・大須 | 老舗喫茶。えびフライサンドが名物。モーニングと小倉トースト |
| `konparu-meieki` | コンパル メイチカ店 | 名古屋駅 | 名古屋駅地下メイチカ。8:00から。Day2朝の第一候補 |
| `kissa-mountain` | 喫茶マウンテン | その他 | 甘口抹茶スパで知られる。名古屋大学近く。動線から大きく外れる |
| `oasis21` | オアシス21 | 栄・大須 | 栄の「水の宇宙船」。地下街と直結し猛暑と雨の逃げ場。屋上の水盤は無料 |
| `sunshine-sakae` | サンシャインサカエ | 栄・大須 | 観覧車Sky-Boat。SKE48劇場が入る |
| `noritake` | ノリタケの森 | 名古屋駅 | 名古屋駅から徒歩15分。陶磁器の産業遺産。赤レンガ工場と絵付け体験。屋内 |
| `toyota-sangyo` | トヨタ産業技術記念館 | 名古屋駅 | 繊維機械から自動車へ。実機が動く。屋内で涼しく雨天の代替に最適 |
| `kinshachi-yokocho` | 金シャチ横丁 | 名古屋城 | 名古屋城の正門側（義直ゾーン）と東門側（宗春ゾーン）。天むす・どて煮・味噌おでん |
| `esca` | エスカ地下街 | 名古屋駅 | 新幹線口直結。土産と名古屋めしが一箇所に揃う。復路の買い物はここで完結できる |

**Interfaces に対する注意:** `pokecen` の館は **東館2F**。表の「西館?→」は判断の痕跡なので書かない。

- [ ] **Step 2: `spots.html` にデータを読ませる**

`<script src="assets/core.js"></script>` の直後に足す。

```html
<script src="data/spots.data.js"></script>
```

- [ ] **Step 3: 手動確認**

`spots.html` を開き、コンソールで次を実行する。

```js
NT.spots.length                                   // → 30
NT.spots.filter(s => !s.id || !s.name || !s.area).length   // → 0
NT.spots.filter(s => NT.AREAS.indexOf(s.area) < 0)         // → []
NT.spots.filter(s => typeof s.lat !== 'number').length     // → 0
NT.spots.filter(s => !s.trivia || !s.trivia.length).length // → 0
new Set(NT.spots.map(s => s.id)).size             // → 30（id の重複なし）
NT.spotById('kanou').unverified                   // → true
NT.spots.filter(s => s.unverified).map(s => s.id)
// → ['kanou','houraiken-jingu','houraiken-matsuzakaya'] を含む
```

- [ ] **Step 4: コミット**

```bash
git add data/spots.data.js spots.html
git commit -m "feat: 名所データ30件を追加

確定行程の10件は豆知識を4-5本、代替20件は2-3本。
8/12の営業が不確実な叶と蓬莱軒2店には unverified を立て、
画面側で「要確認」と電話番号を出せるようにした。"
```

---

### Task 3: 行程データ（プランA / プランB）

**Files:**
- Create: `data/trip.data.js`
- Modify: `index.html`（`data/spots.data.js` と `data/trip.data.js` を読む）

**Interfaces:**
- Consumes: `NT.spotById`（Task 2）
- Produces:
  - `NT.plans -> Plan[]`、`NT.planById(id) -> Plan|undefined`、`NT.currentPlan() -> Plan`
  - `Plan = { id:'A'|'B', name, note, days:Day[] }`
  - `Day = { date:'YYYY-MM-DD', label, items:Item[] }`
  - `Item = { time:'HH:MM', title, spotId?, kind:'meal'|'hero'|'poke'|'move'|'plain',
    hero?:'コーチン'|'味噌カツ'|'ひつまぶし', note, stay:number, minStay:number,
    hardDeadline?:'HH:MM', deadlineWhy?:string, alts?:{rain?:Alt, heat?:Alt, crowd?:Alt} }`
  - `Alt = { title, note, spotId? }`
  - `flex` は別に持たず `stay - minStay` で求める。二重管理を避けるため。
  - `NT.currentPlan()` は `nt:plan` を読み、未設定・不正値なら プランA を返す

- [ ] **Step 1: `data/trip.data.js` を書く**

```js
(function (w) {
  var NT = (w.NT = w.NT || {});

  NT.plans = [
    { id:'A',
      name:'プランA｜叶を8/11に',
      note:'8/12の休業リスクを最小化した既定案。ひつまぶしは駅直結・年中無休のまるや本店にする',
      days:[
        { date:'2026-08-11', label:'DAY 1 — 8/11 tue 山の日', items:[
          { time:'10:12', title:'東京駅発 のぞみ', kind:'move',
            note:'11:48 名古屋着。所要1時間36分', stay:96, minStay:96 },
          { time:'11:50', title:'荷物を預ける', kind:'plain',
            note:'ホテルが名古屋駅前ならフロントへ。栄泊なら駅のコインロッカーが早い',
            stay:25, minStay:10 },
          { time:'12:20', title:'味噌カツ｜味処 叶（栄）', spotId:'kanou', kind:'hero', hero:'味噌カツ',
            note:'元祖味噌カツ丼。揚げたカツを味噌で煮込むので重くない。半熟玉子とねぎを足すのが定番',
            stay:60, minStay:40, hardDeadline:'14:30', deadlineWhy:'昼の部のラストオーダー',
            alts:{
              crowd:{ title:'すゞ家（大須）に切り替える', spotId:'suzuya',
                note:'叶の行列が読めないときは大須の老舗へ。味噌串カツなら待たずに食べられる' },
              rain:{ title:'そのまま叶へ', spotId:'kanou',
                note:'栄駅から地下街を通れば地上に出るのは最後の1分だけ' }
            } },
          { time:'14:00', title:'熱田神宮', spotId:'atsuta', kind:'plain',
            note:'栄→熱田神宮伝馬町 名城線で15分。樹齢1000年超の大楠で木陰が濃い',
            stay:70, minStay:35,
            alts:{
              rain:{ title:'トヨタ産業技術記念館', spotId:'toyota-sangyo',
                note:'屋内で実機が動く。名古屋駅から徒歩圏なので雨なら南へ下がらない方が楽' },
              heat:{ title:'熱田は木陰が濃いので続行可', spotId:'atsuta',
                note:'ただし宝物館（9:00-16:30）で涼む時間を挟む。こころの小径は16:00で閉まる' }
            } },
          { time:'15:45', title:'ポケモンセンターナゴヤ', spotId:'pokecen', kind:'poke',
            note:'PARCO東館2F。矢場町駅4番出口 徒歩1分。しゃちほこピカチュウはここ限定',
            stay:60, minStay:30, hardDeadline:'21:00', deadlineWhy:'閉店',
            alts:{
              crowd:{ title:'先に大須へ回し、閉店前に戻る', spotId:'osu',
                note:'祝日の昼過ぎは入場制限が出ることがある。21時まで開いているので夜に回せる' }
            } },
          { time:'17:00', title:'大須商店街', spotId:'osu', kind:'plain',
            note:'PARCOから徒歩10分。全蓋アーケードなので日陰',
            stay:60, minStay:30,
            alts:{
              heat:{ title:'アーケードなので続行可', spotId:'osu',
                note:'それでも厳しければオアシス21の地下へ。栄まで地下鉄1駅' }
            } },
          { time:'18:15', title:'名古屋城 夏まつり', spotId:'nagoyajo', kind:'plain',
            note:'上前津→市役所 名城線で10分。建物の最終入場は16時なので天守と本丸御殿は元から入れない。' +
                 '狙うのは大盆踊り18:00-20:00（西之丸）、大道芸16:00-20:30、城子屋「名古屋城と怪異」18:00-19:30',
            stay:105, minStay:45, hardDeadline:'20:30', deadlineWhy:'開園終了（閉門21:00）',
            alts:{
              rain:{ title:'盆踊りは中止の可能性。オアシス21か栄へ', spotId:'oasis21',
                note:'雨天時の催し中止は公式サイトで告知される。城まで出る前に確認' }
            } },
          { time:'18:45', title:'鯱食堂で軽くつまむ', spotId:'shachihoko-shokudo', kind:'meal',
            note:'城内の飲食ブース。16:00-20:30。かき氷とビール、屋台グルメ。夜の本番があるので一皿だけ',
            stay:35, minStay:15,
            alts:{
              rain:{ title:'金シャチ横丁へ', spotId:'kinshachi-yokocho',
                note:'城の外だが屋根のある区画がある。天むすとどて煮' }
            } },
          { time:'20:30', title:'名古屋コーチン｜伍味酉 本店（栄）', spotId:'gomitori',
            kind:'hero', hero:'コーチン',
            note:'市役所→栄 名城線で3分。17:00-05:00 年中無休なので盆踊りが20:00に終わってからでも余裕。' +
                 '純系名古屋コーチンの串焼き、贅沢親子丼、味噌おでん',
            stay:90, minStay:50,
            alts:{
              crowd:{ title:'世界の山ちゃん 本店', spotId:'sekaino-yamachan',
                note:'祝日の栄は21時台が混む。手羽先で妥協するなら深夜まで開いている' }
            } }
        ]},
        { date:'2026-08-12', label:'DAY 2 — 8/12 wed', items:[
          { time:'08:00', title:'喫茶店のモーニング', spotId:'konparu-meieki', kind:'meal',
            note:'名古屋駅地下メイチカのコンパル。8:00から。小倉トーストとゆで卵',
            stay:50, minStay:25,
            alts:{
              crowd:{ title:'大須のコンパル本店', spotId:'kissa-tanaka',
                note:'えびフライサンドが名物。駅から離れる分すいている' }
            } },
          { time:'09:40', title:'徳川美術館', spotId:'tokugawa', kind:'plain',
            note:'10:00開館。大曽根駅から徒歩15分か名鉄瀬戸線 森下駅から徒歩10分。' +
                 '夏季特別展「武芸 サムライ・アスリート」開催中。屋内なので猛暑日の逃げ場',
            stay:95, minStay:50, hardDeadline:'16:30', deadlineWhy:'入館締切',
            alts:{
              crowd:{ title:'ノリタケの森', spotId:'noritake',
                note:'名古屋駅から徒歩15分。移動が短いぶん昼に余裕が出る' }
            } },
          { time:'12:00', title:'ひつまぶし｜まるや本店 名駅店', spotId:'maruya-esca',
            kind:'hero', hero:'ひつまぶし',
            note:'エスカ地下街。年中無休で駅直結なので14:49発の日でも読み違えがない。' +
                 '一杯目はそのまま、二杯目は薬味、三杯目は出汁',
            stay:60, minStay:35, hardDeadline:'14:00', deadlineWhy:'土産と乗車の時間を残す最終ライン',
            alts:{
              crowd:{ title:'エスカ内の別店へ', spotId:'esca',
                note:'エスカには味噌煮込みうどんときしめんの店も入る。行列を見て決められる' }
            } },
          { time:'13:15', title:'土産', spotId:'esca', kind:'plain',
            note:'エスカとタカシマヤ。ぴよりんは要冷蔵で崩れやすいので最後に買う',
            stay:50, minStay:25, hardDeadline:'14:35', deadlineWhy:'ホームへの移動を残す' },
          { time:'14:20', title:'ホームの住よしできしめん', spotId:'sumiyoshi', kind:'meal',
            note:'新幹線ホーム上の立ち食い。3〜5分で出るので発車前に収まる',
            stay:15, minStay:8, hardDeadline:'14:45', deadlineWhy:'14:49発の乗車' },
          { time:'14:49', title:'名古屋発 のぞみ', kind:'move',
            note:'16:24 東京着', stay:95, minStay:95 }
        ]}
      ]},

    { id:'B',
      name:'プランB｜蓬莱軒を優先',
      note:'ひつまぶしをあつた蓬莱軒で食べる案。8/11昼は松坂屋店の祝日通し営業なら行列を待てる。味噌カツは無休の矢場とんに回す',
      days:[ /* Step 2 で書く */ ]}
  ];

  NT.planById = function (id) {
    for (var i = 0; i < NT.plans.length; i++) if (NT.plans[i].id === id) return NT.plans[i];
    return undefined;
  };
  NT.currentPlan = function () {
    return NT.planById(NT.get('plan', 'A')) || NT.plans[0];
  };
})(window);
```

- [ ] **Step 2: プランB の `days` を書く**

プランA と同じ構造で、次の並びにする。`alts` はプランA から該当箇所を流用してよい。

DAY 1（8/11 火・祝）
| time | title | spotId | kind | 要点 |
|---|---|---|---|---|
| 10:12 | 東京駅発 のぞみ | — | move | 11:48 名古屋着 |
| 11:50 | 荷物を預ける | — | plain | stay:25 minStay:10 |
| 12:30 | ひつまぶし｜あつた蓬莱軒 松坂屋店 | `houraiken-matsuzakaya` | hero (`ひつまぶし`) | 矢場町。**祝日は11:00-20:30の通し営業でL.O.の崖がない**ので行列を待てる。待ち時間は松坂屋の館内で潰せる。stay:90 minStay:45。hardDeadline は付けない（通し営業のため） |
| 14:30 | ポケモンセンターナゴヤ | `pokecen` | poke | 松坂屋から徒歩3分。stay:60 minStay:30。hardDeadline:'21:00' |
| 15:45 | 大須商店街 | `osu` | plain | stay:60 minStay:30 |
| 17:00 | 熱田神宮 | `atsuta` | plain | 上前津→熱田神宮伝馬町 名城線10分。**こころの小径は16:00で閉まる**ため夕方は境内と信長塀のみ。宝物館も16:30まで。stay:55 minStay:30 |
| 18:40 | 名古屋城 夏まつり | `nagoyajo` | plain | 熱田神宮伝馬町→市役所 名城線20分。盆踊りは20:00まで。stay:80 minStay:40。hardDeadline:'20:30' |
| 19:00 | 鯱食堂で軽くつまむ | `shachihoko-shokudo` | meal | stay:30 minStay:15 |
| 20:30 | 名古屋コーチン｜伍味酉 本店 | `gomitori` | hero (`コーチン`) | stay:90 minStay:50 |

DAY 2（8/12 水）
| time | title | spotId | kind | 要点 |
|---|---|---|---|---|
| 08:00 | 喫茶店のモーニング | `konparu-meieki` | meal | stay:50 minStay:25 |
| 09:40 | 徳川美術館 | `tokugawa` | plain | stay:85 minStay:50 |
| 11:45 | 味噌カツ｜矢場とん 矢場町本店 | `yabaton` | hero (`味噌カツ`) | 大曽根→栄→矢場町。**年中無休**なので水曜でも確実。わらじとんかつ。stay:55 minStay:35。hardDeadline:'13:30' / `deadlineWhy:'名古屋駅へ戻る時間を残す最終ライン'` |
| 13:15 | 土産 | `esca` | plain | 矢場町→名古屋 徒歩含め20分。stay:45 minStay:25。hardDeadline:'14:35' |
| 14:20 | ホームの住よしできしめん | `sumiyoshi` | meal | stay:15 minStay:8。hardDeadline:'14:45' |
| 14:49 | 名古屋発 のぞみ | — | move | 16:24 東京着 |

プランB の DAY1 には「熱田神宮が夕方になるため、こころの小径と宝物館に入れない」という
トレードオフがある。`note` にこれを明記する。案の欠点を隠さないため。

- [ ] **Step 3: `index.html` にデータを読ませる**

```html
<script src="assets/core.js"></script>
<script src="data/spots.data.js"></script>
<script src="data/trip.data.js"></script>
```

- [ ] **Step 4: 手動確認**

`index.html` を開き、コンソールで実行する。

```js
NT.plans.map(p => p.id)                    // → ['A','B']
NT.plans.every(p => p.days.length === 2)   // → true
var items = p => p.days.reduce((a,d) => a.concat(d.items), []);
items(NT.planById('A')).length             // → 15
items(NT.planById('B')).length             // → 15
// spotId は必ず実在すること
NT.plans.flatMap(items).filter(i => i.spotId && !NT.spotById(i.spotId))   // → []
// alts の spotId も実在すること
NT.plans.flatMap(items).flatMap(i => Object.values(i.alts || {}))
  .filter(a => a.spotId && !NT.spotById(a.spotId))                        // → []
// minStay は stay 以下
NT.plans.flatMap(items).filter(i => i.minStay > i.stay)                   // → []
// 各プランに 味噌カツ / コーチン / ひつまぶし が1回ずつ
['A','B'].map(id => items(NT.planById(id)).filter(i => i.hero).map(i => i.hero).sort())
// → [['コーチン','ひつまぶし','味噌カツ'], ['コーチン','ひつまぶし','味噌カツ']]
NT.currentPlan().id                        // → 'A'
NT.set('plan','B'); NT.currentPlan().id    // → 'B'
NT.set('plan','Z'); NT.currentPlan().id    // → 'A'（不正値はAに落ちる）
```

- [ ] **Step 5: コミット**

```bash
git add data/trip.data.js index.html
git commit -m "feat: 行程データをプランA/Bの2案で追加

叶と蓬莱軒の8/12営業が電話確認待ちのため、片方を消さず両案を保持する。
Aは休業リスク最小化（叶を8/11、ひつまぶしは無休のまるや本店）、
Bは蓬莱軒優先（松坂屋店の祝日通し営業を使い、味噌カツは無休の矢場とん）。
flex は stay-minStay で求めるため持たない。"
```

---

### Task 4: 行程ページの描画とプラン切替

**Files:**
- Create: `assets/itinerary.js`
- Modify: `index.html`（`assets/itinerary.js` を読み、`NT.mountNav` の後に `NT.renderItinerary()` を呼ぶ）
- Modify: `assets/style.css`（タイムラインとプラン切替のスタイルを追記）

**Interfaces:**
- Consumes: `NT.currentPlan`, `NT.planById`, `NT.spotById`, `NT.el`, `NT.get`, `NT.set`
- Produces:
  - `NT.renderItinerary() -> void` — `#itinerary-root` を空にして全体を描き直す
  - `NT.itemKey(dayIndex, itemIndex) -> string` — `'0-3'` 形式。`nt:progress` のキーに使う
  - `NT.renderItinerary` は再入可能でなければならない。プラン切替・状況切替・時刻変更のたびに呼ばれる
  - `#itinerary-root` 内の各コマは `<li class="tl-item" data-key="0-3" id="item-0-3">` を持つ
  - 拡張点: `NT.itemDecorators = []` に `function(li, item, ctx)` を push すると各コマの描画後に呼ばれる。
    ctx は `{ dayIndex, itemIndex, day, plan, key }`。Task 5・6・7 がここに差し込む

- [ ] **Step 1: `assets/itinerary.js` を書く**

```js
(function (w) {
  var NT = w.NT;
  NT.itemDecorators = NT.itemDecorators || [];

  NT.itemKey = function (di, ii) { return di + '-' + ii; };

  function planSwitcher() {
    var cur = NT.currentPlan();
    var box = NT.el('div', { class: 'plan-switch' }, [
      NT.el('div', { class: 'plan-switch-row' }, NT.plans.map(function (p) {
        return NT.el('button', {
          class: 'btn' + (p.id === cur.id ? ' on' : ''), type: 'button', text: p.name,
          onclick: function () { NT.set('plan', p.id); NT.renderItinerary(); }
        });
      })),
      NT.el('p', { class: 'notice', text: cur.note })
    ]);
    return box;
  }

  function spotLink(item) {
    if (!item.spotId) return null;
    var s = NT.spotById(item.spotId);
    if (!s) return null;
    return NT.el('span', { class: 'tl-links' }, [
      NT.el('a', { href: 'spots.html#spot-' + s.id, text: '詳細' }),
      s.map ? NT.el('a', { href: s.map, target: '_blank', rel: 'noopener', text: '地図' }) : null,
      s.unverified ? NT.el('span', { class: 'badge warn', text: '要確認' }) : null,
      s.unverified && s.tel ? NT.el('a', { href: 'tel:' + s.tel, text: s.tel }) : null
    ]);
  }

  function renderItem(day, di, item, ii, plan) {
    var key = NT.itemKey(di, ii);
    var cls = 'tl-item k-' + item.kind + (item.hero ? ' has-hero' : '');
    var li = NT.el('li', { class: cls, 'data-key': key, id: 'item-' + key }, [
      NT.el('span', { class: 'tl-time mono', text: item.time }),
      NT.el('div', { class: 'tl-body' }, [
        NT.el('strong', {}, [
          item.title,
          item.hero ? NT.el('span', { class: 'hero-tag', text: item.hero }) : null
        ]),
        item.note ? NT.el('span', { class: 'tl-note', text: item.note }) : null,
        item.hardDeadline
          ? NT.el('span', { class: 'tl-deadline mono',
              text: '⏱ ' + item.hardDeadline + ' ' + (item.deadlineWhy || '') })
          : null,
        spotLink(item)
      ])
    ]);
    var ctx = { dayIndex: di, itemIndex: ii, day: day, plan: plan, key: key };
    NT.itemDecorators.forEach(function (fn) { fn(li, item, ctx); });
    return li;
  }

  NT.renderItinerary = function () {
    var root = NT.$('#itinerary-root');
    if (!root) return;
    root.textContent = '';
    var plan = NT.currentPlan();

    root.appendChild(NT.el('section', {}, [
      NT.el('div', { class: 'sec-head' }, [
        NT.el('span', { class: 'no', text: '01' }), NT.el('h2', { text: 'プラン' })
      ]),
      planSwitcher()
    ]));

    var sec = NT.el('section', {}, [
      NT.el('div', { class: 'sec-head' }, [
        NT.el('span', { class: 'no', text: '02' }), NT.el('h2', { text: '行程' })
      ])
    ]);
    plan.days.forEach(function (day, di) {
      sec.appendChild(NT.el('div', { class: 'day' }, [
        NT.el('div', { class: 'daybar mono' + (di ? ' d2' : ''), text: day.label }),
        NT.el('ul', { class: 'tl' }, day.items.map(function (item, ii) {
          return renderItem(day, di, item, ii, plan);
        }))
      ]));
    });
    root.appendChild(sec);

    /* 描画後フック。Task 5 以降がここに足す */
    (NT.afterRender || []).forEach(function (fn) { fn(plan); });
  };
  NT.afterRender = NT.afterRender || [];
})(window);
```

- [ ] **Step 2: `assets/style.css` に追記**

```css
.plan-switch-row{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:8px}
.plan-switch-row .btn{flex:1 1 220px;text-align:left}

.day{background:var(--card);border:1px solid var(--rule);border-radius:3px;
  overflow:hidden;margin-bottom:16px}
.daybar{font-size:10.5px;letter-spacing:.2em;color:#fff;background:var(--rokusho);padding:8px 16px}
.daybar.d2{background:var(--rokusho-mid)}
.tl{list-style:none;margin:0;padding:14px 16px 18px}
.tl-item{display:grid;grid-template-columns:50px 1fr;gap:10px;position:relative;padding:0 0 15px}
.tl-item::before{content:"";position:absolute;left:56px;top:9px;width:1px;height:100%;background:var(--rule)}
.tl-item:last-child::before{display:none}
.tl-time{font-size:12px;color:var(--gray);padding-top:1px}
.tl-body{position:relative;padding-left:17px}
.tl-body::before{content:"";position:absolute;left:-5px;top:7px;width:9px;height:9px;
  border-radius:50%;background:var(--card);border:1.5px solid var(--rule);z-index:1}
.tl-body strong{display:block;font-size:14.5px;line-height:1.5}
.tl-note{display:block;font-size:12.5px;color:var(--gray);margin-top:3px}
.tl-deadline{display:block;font-size:11.5px;color:var(--miso);margin-top:4px}
.tl-links{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:6px;font-size:12px}
.hero-tag{font-family:"Zen Kaku Gothic New",system-ui,sans-serif;font-size:10px;
  letter-spacing:.06em;color:#fff;background:var(--miso);padding:2px 8px;border-radius:2px;
  margin-left:8px;vertical-align:2px;font-weight:700}
.k-meal .tl-body::before{background:var(--rokusho);border-color:var(--rokusho)}
.k-hero .tl-body::before{background:var(--miso);border-color:var(--miso)}
.k-move .tl-body::before{background:var(--gray);border-color:var(--gray)}
.k-poke .tl-body::before{background:var(--kin);border-color:var(--kin);
  box-shadow:0 0 0 4px rgba(199,154,60,.22)}
.k-poke .tl-body{background:linear-gradient(90deg,rgba(199,154,60,.16),rgba(199,154,60,0));
  margin-left:-4px;padding:5px 8px 7px 21px;border-radius:2px}
```

- [ ] **Step 3: `index.html` を修正**

```html
<script src="assets/core.js"></script>
<script src="data/spots.data.js"></script>
<script src="data/trip.data.js"></script>
<script src="assets/itinerary.js"></script>
<script>NT.mountNav('index.html'); NT.renderItinerary();</script>
```

- [ ] **Step 4: 手動確認**

1. `index.html` を開くと DAY1 に9コマ、DAY2 に6コマ出る
2. 「味噌カツ｜味処 叶」に味噌色の `味噌カツ` タグ、「ポケモンセンターナゴヤ」に金色の強調が付く
3. 叶の行に `要確認` バッジと `052-241-3471` の電話リンクが出る
4. 叶の行に `⏱ 14:30 昼の部のラストオーダー` が味噌色で出る
5. 「詳細」を押すと `spots.html#spot-kanou` へ飛ぶ（Task 8 まで中身は空でよい）
6. 「プランB｜蓬莱軒を優先」を押すと DAY1 昼が松坂屋店に変わり、DAY2 昼が矢場とんに変わる。
   ボタンの `on` が移り、説明文も差し替わる
7. リロードしてもプランBのままである
8. 幅375pxで横スクロールが出ない
9. コンソールで `NT.itemDecorators.push((li,it)=>li.classList.add('probe')); NT.renderItinerary();`
   を実行すると全コマに `probe` が付く（拡張点が機能している）。確認後リロードで戻す

- [ ] **Step 5: コミット**

```bash
git add assets/itinerary.js assets/style.css index.html
git commit -m "feat: 行程ページの描画とプラン切替を追加

renderItinerary は再入可能にし、プラン・状況・時刻の変更で丸ごと描き直す。
各コマの装飾は itemDecorators、全体の後処理は afterRender という拡張点に集め、
今ここ追尾・遅延リカバリ・状況切替が描画本体に触らず差し込めるようにした。"
```

---

### Task 5: 今ここ追尾とデモ時刻

**Files:**
- Modify: `assets/itinerary.js`（末尾に追記）
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: `NT.now`, `NT.setClock`, `NT.isClockFaked`, `NT.parseHM`, `NT.itemDecorators`, `NT.afterRender`
- Produces:
  - `NT.flatItems(plan) -> [{ item, day, dayIndex, itemIndex, key, start:Date, end:Date }]`
    — 全日程を1本に平坦化し、各コマの開始と終了を Date で持たせる。`end` は次のコマの `start`
      （同日内）か `start + stay分`（その日の最後）。Task 6 と 16 も使う
  - `NT.currentSlot(plan) -> slot|null` — `NT.now()` が入るコマ。旅程外なら `null`
  - `NT.nextSlot(plan) -> slot|null` — `NT.now()` より後で最初に始まるコマ
  - `#now-bar` に現在地表示、`#clock-bar` にデモ時刻セレクタを描く

- [ ] **Step 1: `assets/itinerary.js` に平坦化と現在地判定を追記**

```js
(function (w) {
  var NT = w.NT;

  NT.flatItems = function (plan) {
    var out = [];
    plan.days.forEach(function (day, di) {
      day.items.forEach(function (item, ii) {
        out.push({ item: item, day: day, dayIndex: di, itemIndex: ii,
                   key: NT.itemKey(di, ii), start: NT.parseHM(item.time, day.date), end: null });
      });
    });
    /* end は同日内の次のコマの start。最後は start + stay 分 */
    out.forEach(function (s, i) {
      var nx = out[i + 1];
      s.end = (nx && nx.dayIndex === s.dayIndex)
        ? nx.start
        : new Date(s.start.getTime() + (s.item.stay || 30) * 60000);
    });
    return out;
  };

  NT.currentSlot = function (plan) {
    var t = NT.now().getTime(), list = NT.flatItems(plan);
    for (var i = 0; i < list.length; i++) {
      if (t >= list[i].start.getTime() && t < list[i].end.getTime()) return list[i];
    }
    return null;
  };
  NT.nextSlot = function (plan) {
    var t = NT.now().getTime(), list = NT.flatItems(plan);
    for (var i = 0; i < list.length; i++) if (list[i].start.getTime() > t) return list[i];
    return null;
  };

  function mins(ms) { return Math.round(ms / 60000); }
  function human(m) {
    if (m < 60) return m + '分';
    return Math.floor(m / 60) + '時間' + (m % 60 ? (m % 60) + '分' : '');
  }

  /* 旅程外で開いたときに出すデモ時刻セレクタ。旅の前に全機能を試せるようにするため */
  var DEMO = [
    ['8/11 12:10 叶の直前', '2026-08-11T12:10:00'],
    ['8/11 15:24 ポケセン', '2026-08-11T15:24:00'],
    ['8/11 19:30 遅れ検証', '2026-08-11T19:30:00'],
    ['8/12 09:50 徳川美術館', '2026-08-12T09:50:00'],
    ['8/12 13:40 土産', '2026-08-12T13:40:00'],
    ['8/13 10:00 旅の後', '2026-08-13T10:00:00']
  ];

  function clockBar() {
    var faked = NT.isClockFaked();
    var sel = NT.el('select', { class: 'btn', 'aria-label': 'デモ時刻を選ぶ',
      onchange: function () { NT.setClock(sel.value || null); NT.renderItinerary(); } },
      [NT.el('option', { value: '', text: '実際の時刻' })].concat(DEMO.map(function (d) {
        return NT.el('option', { value: d[1], text: d[0],
          selected: NT.get('clock', null) === d[1] ? true : null });
      })));
    return NT.el('div', { class: 'clock-bar' }, [
      NT.el('span', { class: 'mono', text: '⏱ ' + NT.fmtTime(NT.now()) + (faked ? '（デモ）' : '') }),
      sel
    ]);
  }

  function nowBar(plan) {
    var cur = NT.currentSlot(plan), nx = NT.nextSlot(plan), now = NT.now();
    var box = NT.el('div', { class: 'now-bar' + (cur ? ' active' : '') });
    if (cur) {
      box.appendChild(NT.el('div', { class: 'now-label mono', text: 'NOW ' + NT.fmtTime(now) }));
      box.appendChild(NT.el('div', { class: 'now-title', text: '▶ ' + cur.item.title }));
      box.appendChild(NT.el('div', { class: 'now-sub',
        text: 'このコマは残り ' + human(mins(cur.end - now)) +
              (nx ? ' ／ 次は ' + nx.item.time + ' ' + nx.item.title : ' ／ これが最後') }));
      box.appendChild(NT.el('a', { class: 'now-jump', href: '#item-' + cur.key, text: 'このコマへ' }));
    } else if (nx) {
      box.appendChild(NT.el('div', { class: 'now-label mono', text: '旅程前 ' + NT.fmtTime(now) }));
      box.appendChild(NT.el('div', { class: 'now-title',
        text: '次の予定は ' + nx.day.label.slice(0, 5) + ' ' + nx.item.time + ' ' + nx.item.title }));
    } else {
      box.appendChild(NT.el('div', { class: 'now-label mono', text: '旅程終了' }));
      box.appendChild(NT.el('div', { class: 'now-title', text: 'おつかれさまでした' }));
    }
    box.appendChild(clockBar());
    return box;
  }

  /* 現在のコマに印を付ける */
  NT.itemDecorators.push(function (li, item, ctx) {
    var cur = NT.currentSlot(ctx.plan);
    if (cur && cur.key === ctx.key) li.classList.add('is-now');
    var t = NT.now().getTime();
    var list = NT.flatItems(ctx.plan), me = null;
    for (var i = 0; i < list.length; i++) if (list[i].key === ctx.key) me = list[i];
    if (me && me.end.getTime() <= t) li.classList.add('is-past');
  });

  /* 描画後に now-bar を先頭へ差し込み、現在のコマへスクロールする */
  NT.afterRender.push(function (plan) {
    var root = NT.$('#itinerary-root');
    root.insertBefore(nowBar(plan), root.firstChild);
    var cur = NT.currentSlot(plan);
    if (cur && !NT.__scrolled) {
      NT.__scrolled = true;
      var el = NT.$('#item-' + cur.key);
      if (el) el.scrollIntoView({ block: 'center',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  });
})(window);
```

`NT.__scrolled` で1回だけスクロールさせる。プラン切替や状況切替で再描画するたびに
画面が飛ぶのを防ぐため。

- [ ] **Step 2: `assets/style.css` に追記**

```css
.now-bar{background:var(--head-bg);color:var(--head-fg);border-left:4px solid var(--gray);
  border-radius:3px;padding:13px 15px;margin:18px 0 4px}
.now-bar.active{border-left-color:var(--kin)}
.now-label{font-size:10.5px;letter-spacing:.2em;color:var(--kin-light)}
.now-title{font-size:16px;font-weight:700;margin-top:4px;font-family:"Shippori Mincho B1",serif}
.now-sub{font-size:12.5px;color:var(--head-sub);margin-top:4px}
.now-jump{display:inline-block;font-size:12px;margin-top:8px;color:var(--kin-light)}
.clock-bar{display:flex;align-items:center;gap:9px;margin-top:11px;
  padding-top:10px;border-top:1px solid rgba(199,154,60,.3);font-size:11.5px;color:var(--head-sub)}
.clock-bar select{max-width:200px;font-size:12px;padding:6px 8px}
.tl-item.is-now .tl-body{outline:2px solid var(--kin);outline-offset:3px;border-radius:2px}
.tl-item.is-now .tl-body strong{color:var(--kin)}
.tl-item.is-past{opacity:.5}
```

- [ ] **Step 3: 手動確認**

1. 今日（8/11より前）に開くと `旅程前` と「次の予定は DAY 1 10:12 東京駅発 のぞみ」が出る
2. デモ時刻で `8/11 15:24 ポケセン` を選ぶと `NOW 15:24` と `▶ ポケモンセンターナゴヤ`、
   「このコマは残り 1時間6分 ／ 次は 17:00 大須商店街」が出る
3. 同時にポケセンの行に金色の枠が付き、それより前の行が薄くなる
4. ページを開いた直後に現在のコマまで自動スクロールする
5. プランBに切り替えても画面が先頭に飛ばない（`__scrolled` が効いている）
6. `8/13 10:00 旅の後` を選ぶと `旅程終了` と「おつかれさまでした」
7. `実際の時刻` に戻すと `旅程前` に戻り、`（デモ）` の表示が消える
8. コンソールで検算する

```js
var p = NT.planById('A'), f = NT.flatItems(p);
f.length                                          // → 15
f.every(s => s.end > s.start)                     // → true
f[0].end.getHours() + ':' + f[0].end.getMinutes() // → 11:50（次のコマの開始）
NT.setClock('2026-08-11T15:24:00'); NT.currentSlot(p).item.title  // → 'ポケモンセンターナゴヤ'
NT.nextSlot(p).item.title                         // → '大須商店街'
NT.setClock('2026-08-11T23:00:00'); NT.currentSlot(p)             // → null（伍味酉のendを過ぎている）
NT.setClock(null);
```

- [ ] **Step 4: コミット**

```bash
git add assets/itinerary.js assets/style.css
git commit -m "feat: 今ここ追尾とデモ時刻セレクタを追加

flatItems で日をまたいだ1本の列にし、各コマの end は次のコマの start とする。
旅程外で開くと追尾する対象がないため、デモ時刻セレクタを出して
旅の前に全機能を試せるようにした。時刻は NT.now() のみを経由する。"
```

---

### Task 6: 遅延リカバリ

**Files:**
- Create: `assets/recovery.js`
- Modify: `index.html`（`assets/itinerary.js` の後に読む）
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: `NT.flatItems`, `NT.currentSlot`, `NT.now`, `NT.parseHM`, `NT.itemDecorators`, `NT.afterRender`
- Produces:
  - `NT.markHere(key) -> void` / `NT.clearHere() -> void` — `nt:progress` に `{key, at:ISO}` を書く
  - `NT.delayMinutes(plan) -> { minutes:number, source:'explicit'|'implicit'|'none', slot:slot|null }`
    — 明示（「今ここ」押下）があればそれを優先、なければ現在のコマの予定終了超過から推定
  - `NT.recoveryPlan(plan) -> { delay, deadline:slot|null, cuts:[{key,title,cut}], shortfall:number }|null`
    — 遅延15分超のときだけ非null。`cuts` は削る提案、`shortfall` は削り切れない残り分
  - `#recovery` に提案を描く

- [ ] **Step 1: `assets/recovery.js` を書く**

```js
(function (w) {
  var NT = w.NT;
  var THRESHOLD = 15; /* これ以下の遅れは提案しない */

  NT.markHere = function (key) { NT.set('progress', { key: key, at: NT.now().toISOString() }); };
  NT.clearHere = function () { localStorage.removeItem('nt:progress'); };

  function slotByKey(plan, key) {
    var list = NT.flatItems(plan);
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }

  NT.delayMinutes = function (plan) {
    var pr = NT.get('progress', null);
    if (pr && pr.key && pr.at) {
      var s = slotByKey(plan, pr.key);
      if (s) {
        var d = Math.round((new Date(pr.at) - s.start) / 60000);
        return { minutes: Math.max(0, d), source: 'explicit', slot: s };
      }
    }
    var cur = NT.currentSlot(plan);
    if (cur) {
      var over = Math.round((NT.now() - cur.end) / 60000);
      if (over > 0) return { minutes: over, source: 'implicit', slot: cur };
      return { minutes: 0, source: 'implicit', slot: cur };
    }
    return { minutes: 0, source: 'none', slot: null };
  };

  NT.recoveryPlan = function (plan) {
    var d = NT.delayMinutes(plan);
    if (d.minutes <= THRESHOLD || !d.slot) return null;

    var list = NT.flatItems(plan);
    var from = list.indexOf(d.slot) + 1;
    var after = list.slice(from);

    /* 次に控える固定点。ここに間に合わせるのが目的 */
    var deadline = null;
    for (var i = 0; i < after.length; i++) {
      if (after[i].item.hardDeadline) { deadline = after[i]; break; }
    }

    /* 削れる余地が大きい順に削る。stay-minStay が余地 */
    var candidates = after.map(function (s) {
      return { slot: s, room: Math.max(0, (s.item.stay || 0) - (s.item.minStay || 0)) };
    }).filter(function (c) { return c.room > 0; })
      .sort(function (a, b) { return b.room - a.room; });

    var need = d.minutes, cuts = [];
    for (var j = 0; j < candidates.length && need > 0; j++) {
      var cut = Math.min(candidates[j].room, need);
      cuts.push({ key: candidates[j].slot.key, title: candidates[j].slot.item.title, cut: cut });
      need -= cut;
    }
    return { delay: d, deadline: deadline, cuts: cuts, shortfall: need };
  };

  function recoveryBox(plan) {
    var r = NT.recoveryPlan(plan);
    if (!r) return null;
    var kids = [
      NT.el('div', { class: 'rec-head', text: '⚠ 予定より ' + r.delay.minutes + '分 遅れ' +
        (r.delay.source === 'explicit' ? '（「今ここ」の記録から）' : '（時刻から推定）') })
    ];
    if (r.cuts.length) {
      kids.push(NT.el('p', { class: 'rec-line', text: '次のように削れば取り戻せます。' }));
      kids.push(NT.el('ul', { class: 'rec-cuts' }, r.cuts.map(function (c) {
        return NT.el('li', {}, [
          NT.el('a', { href: '#item-' + c.key, text: c.title }),
          NT.el('span', { class: 'mono', text: ' −' + c.cut + '分' })
        ]);
      })));
    }
    if (r.deadline) {
      var ok = r.shortfall <= 0;
      kids.push(NT.el('p', { class: 'rec-line' + (ok ? ' ok' : ' ng'),
        text: (ok ? '✓ ' : '✗ ') + r.deadline.item.title + ' の ' + r.deadline.item.hardDeadline +
              '（' + (r.deadline.item.deadlineWhy || '締切') + '）に' +
              (ok ? '間に合います' : 'は ' + r.shortfall + '分 足りません') }));
    }
    if (r.shortfall > 0) {
      kids.push(NT.el('p', { class: 'rec-line ng',
        text: '削り切れない ' + r.shortfall + '分は、どれかを落とす判断が必要です。' +
              '状況切替の「行列が長い」で代替に差し替えるのも手です。' }));
    }
    kids.push(NT.el('button', { class: 'btn', type: 'button', text: '遅れの記録を消す',
      onclick: function () { NT.clearHere(); NT.renderItinerary(); } }));
    return NT.el('div', { class: 'rec', id: 'recovery' }, kids);
  }

  /* 各コマに「今ここ」ボタンを足す */
  NT.itemDecorators.push(function (li, item, ctx) {
    if (item.kind === 'move') return;
    var pr = NT.get('progress', null);
    var on = pr && pr.key === ctx.key;
    NT.$('.tl-body', li).appendChild(NT.el('button', {
      class: 'btn here' + (on ? ' on' : ''), type: 'button',
      text: on ? '今ここ ✓ ' + NT.fmtTime(new Date(pr.at)) : '今ここ',
      onclick: function () {
        if (on) NT.clearHere(); else NT.markHere(ctx.key);
        NT.renderItinerary();
      }
    }));
  });

  NT.afterRender.push(function (plan) {
    var box = recoveryBox(plan);
    if (!box) return;
    var bar = NT.$('.now-bar');
    bar.parentNode.insertBefore(box, bar.nextSibling);
  });
})(window);
```

- [ ] **Step 2: `assets/style.css` に追記**

```css
.rec{background:var(--card);border:1px solid var(--miso);border-left:4px solid var(--miso);
  border-radius:3px;padding:13px 15px;margin:10px 0 4px}
.rec-head{font-weight:700;color:var(--miso);font-size:14px}
.rec-line{margin:7px 0 0;font-size:12.5px;color:var(--fg)}
.rec-line.ok{color:var(--rokusho);font-weight:700}
.rec-line.ng{color:var(--miso);font-weight:700}
.rec-cuts{margin:6px 0 0;padding-left:20px;font-size:12.5px}
.rec-cuts li{margin:2px 0}
.rec .btn{margin-top:11px;font-size:12px;padding:7px 11px;min-height:36px}
.btn.here{font-size:11px;padding:5px 10px;min-height:32px;margin-top:7px}
```

- [ ] **Step 3: `index.html` に読ませる**

```html
<script src="assets/itinerary.js"></script>
<script src="assets/recovery.js"></script>
```

- [ ] **Step 4: 手動確認**

1. デモ時刻 `8/11 15:24 ポケセン` では遅れが0なので `⚠` の箱は出ない
2. デモ時刻 `8/11 19:30 遅れ検証` を選ぶ。19:30 は「大須商店街」（17:00開始、18:15終了）を
   過ぎているので暗黙の遅れが検出され、`⚠ 予定より 75分 遅れ（時刻から推定）` が出る
3. 提案に「名古屋城 夏まつり −60分」など余地の大きいコマから順に並ぶ
4. 名古屋城の `20:30 開園終了（閉門21:00）` に間に合うかが ✓ か ✗ で出る
5. 「大須商店街」の行の「今ここ」を押す。`⚠ …（「今ここ」の記録から）` に切り替わり、
   遅れが押した時刻基準で再計算される。ボタンが `今ここ ✓ 19:30` になる
6. 「遅れの記録を消す」で暗黙推定に戻る
7. リロードしても「今ここ」の記録が残る
8. コンソールで検算する

```js
var p = NT.planById('A');
NT.setClock('2026-08-11T19:30:00'); NT.clearHere();
NT.delayMinutes(p)          // → { minutes: 75, source: 'implicit', … }
var r = NT.recoveryPlan(p);
r.cuts.reduce((a,c) => a + c.cut, 0) + r.shortfall   // → 75（削り分と不足の合計が遅延に一致）
r.deadline.item.title       // → '名古屋城 夏まつり'
NT.markHere('0-6'); NT.delayMinutes(p).source        // → 'explicit'
NT.setClock('2026-08-11T15:24:00'); NT.clearHere(); NT.recoveryPlan(p)  // → null
NT.setClock(null);
```

- [ ] **Step 5: コミット**

```bash
git add assets/recovery.js assets/style.css index.html
git commit -m "feat: 遅延リカバリを追加

遅れは「今ここ」の押下記録があればそれを優先し、なければ現在のコマの
予定終了超過から推定する。削る余地は stay-minStay の大きい順に割り当て、
次の hardDeadline に間に合うかを判定する。予定データは書き換えず提案だけ行う。"
```

---

### Task 7: 状況切替（雨・猛暑・行列）

**Files:**
- Create: `assets/situation.js`
- Modify: `index.html`（`assets/recovery.js` の後に読む）
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: `NT.get`, `NT.set`, `NT.itemDecorators`, `NT.afterRender`, `NT.spotById`
- Produces:
  - `NT.SITUATIONS -> [{id, label}]` — `normal` / `rain` / `heat` / `crowd`
  - `NT.situation() -> string` — `nt:situation`、既定 `'normal'`
  - `NT.altFor(item) -> Alt|null` — 選択中の状況に対する代替。なければ null
  - 代替を持つコマは `<li class="tl-item has-alt">` になり、本文が代替の内容に差し替わる

- [ ] **Step 1: `assets/situation.js` を書く**

```js
(function (w) {
  var NT = w.NT;

  NT.SITUATIONS = [
    { id: 'normal', label: '通常' },
    { id: 'rain',   label: '☂ 雨' },
    { id: 'heat',   label: '🌡 猛暑' },
    { id: 'crowd',  label: '行列が長い' }
  ];
  NT.situation = function () { return NT.get('situation', 'normal'); };
  NT.altFor = function (item) {
    var s = NT.situation();
    if (s === 'normal' || !item.alts) return null;
    return item.alts[s] || null;
  };

  function switcher() {
    var cur = NT.situation();
    var row = NT.el('div', { class: 'btnrow' }, NT.SITUATIONS.map(function (s) {
      return NT.el('button', {
        class: 'btn' + (s.id === cur ? ' on' : ''), type: 'button', text: s.label,
        onclick: function () { NT.set('situation', s.id); NT.renderItinerary(); }
      });
    }));
    var n = 0;
    NT.currentPlan().days.forEach(function (d) {
      d.items.forEach(function (i) { if (NT.altFor(i)) n++; });
    });
    return NT.el('div', { class: 'sit' }, [
      NT.el('div', { class: 'sit-label', text: '今の状況' }),
      row,
      NT.el('p', { class: 'notice',
        text: cur === 'normal'
          ? '状況を選ぶと、その条件で差し替えられるコマが代替案に変わります。'
          : n + '件のコマを代替案に差し替えました。通常に戻すと元の予定が戻ります。' })
    ]);
  }

  /* 代替がある場合、本文を差し替える。元の予定は取り消し線で残す */
  NT.itemDecorators.push(function (li, item, ctx) {
    var alt = NT.altFor(item);
    if (!alt) return;
    li.classList.add('has-alt');
    var body = NT.$('.tl-body', li);
    var orig = NT.$('strong', body).textContent;
    body.textContent = '';
    body.appendChild(NT.el('strong', {}, [
      alt.title, NT.el('span', { class: 'alt-tag', text: NT.SITUATIONS.filter(function (s) {
        return s.id === NT.situation();
      })[0].label })
    ]));
    if (alt.note) body.appendChild(NT.el('span', { class: 'tl-note', text: alt.note }));
    body.appendChild(NT.el('span', { class: 'tl-orig', text: '元の予定: ' + orig }));
    var s = alt.spotId && NT.spotById(alt.spotId);
    if (s) {
      body.appendChild(NT.el('span', { class: 'tl-links' }, [
        NT.el('a', { href: 'spots.html#spot-' + s.id, text: '詳細' }),
        s.map ? NT.el('a', { href: s.map, target: '_blank', rel: 'noopener', text: '地図' }) : null,
        s.unverified ? NT.el('span', { class: 'badge warn', text: '要確認' }) : null
      ]));
    }
  });

  NT.afterRender.push(function () {
    var bar = NT.$('.now-bar');
    bar.parentNode.insertBefore(switcher(), bar);
  });
})(window);
```

`itemDecorators` の登録順に注意する。`situation.js` は `recovery.js` より後に読むため、
「今ここ」ボタンを追加した後に本文を差し替えることになり、ボタンが消える。
これを避けるため、`recovery.js` の decorator を後から走らせる必要がある。
**Step 2 で登録順を明示的に制御する。**

- [ ] **Step 2: decorator の実行順を保証する**

`assets/situation.js` の decorator は `push` ではなく `unshift` で先頭に入れる。
本文の差し替えを最初に済ませ、その後に「今ここ」ボタンや現在地の印が付く順にする。

```js
/* NT.itemDecorators.push(function (li, item, ctx) {  ← これを */
NT.itemDecorators.unshift(function (li, item, ctx) { /* ← こう変える */
```

- [ ] **Step 3: `assets/style.css` に追記**

```css
.sit{margin:18px 0 0}
.sit-label{font-size:11px;letter-spacing:.18em;color:var(--gray);margin-bottom:7px;
  font-family:"Space Mono",ui-monospace,monospace}
.tl-item.has-alt .tl-body{background:rgba(107,50,38,.07);margin-left:-4px;
  padding:6px 9px 8px 21px;border-radius:2px}
.tl-item.has-alt .tl-body::before{background:var(--miso);border-color:var(--miso)}
.alt-tag{font-family:"Zen Kaku Gothic New",system-ui,sans-serif;font-size:10px;
  color:#fff;background:var(--rokusho-mid);padding:2px 7px;border-radius:2px;
  margin-left:8px;vertical-align:2px;font-weight:700}
.tl-orig{display:block;font-size:11.5px;color:var(--gray);margin-top:5px;text-decoration:line-through}
```

- [ ] **Step 4: `index.html` に読ませる**

```html
<script src="assets/recovery.js"></script>
<script src="assets/situation.js"></script>
```

- [ ] **Step 5: 手動確認**

1. `通常` では全コマが元の予定のまま。説明文は「状況を選ぶと…」
2. `☂ 雨` を押すと、叶・熱田神宮・名古屋城・鯱食堂の4コマが差し替わり、
   「4件のコマを代替案に差し替えました」と出る
3. 差し替わったコマは味噌色の背景になり、`元の予定: 熱田神宮` が取り消し線で残る
4. `🌡 猛暑` では熱田神宮と大須が差し替わる。大須は「アーケードなので続行可」と出る
5. `行列が長い` では叶が「すゞ家（大須）に切り替える」になり、詳細リンクが すゞ家 を指す
6. **差し替わったコマにも「今ここ」ボタンが残っている**（Step 2 の順序制御の確認）
7. `通常` に戻すと元の予定が戻る
8. リロードしても状況の選択が残る
9. コンソールで確認する

```js
NT.set('situation','rain');
NT.planById('A').days[0].items.filter(i => NT.altFor(i)).map(i => i.title)
// → ['味噌カツ｜味処 叶（栄）','熱田神宮','名古屋城 夏まつり','鯱食堂で軽くつまむ']
NT.set('situation','normal');
NT.planById('A').days[0].items.filter(i => NT.altFor(i))   // → []
```

- [ ] **Step 6: コミット**

```bash
git add assets/situation.js assets/style.css index.html
git commit -m "feat: 雨・猛暑・行列の状況切替を追加

代替は本文を差し替え、元の予定を取り消し線で残して何を捨てたか分かるようにした。
decorator は unshift で先頭に入れ、本文差し替えのあとに
「今ここ」ボタンと現在地の印が付く順序を保証する。"
```

---

### Task 8: 名所ページ（エリアフィルタ・GPS距離ソート・訪問済み）

**Files:**
- Create: `assets/spotlist.js`
- Modify: `spots.html`（`assets/spotlist.js` を読み、`NT.renderSpots()` を呼ぶ）
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: `NT.spots`, `NT.AREAS`, `NT.el`, `NT.get`, `NT.set`, `NT.notice`
- Produces:
  - `NT.renderSpots() -> void` — `#spots-root` を描き直す。再入可能
  - `NT.distanceKm(a, b) -> number` — Haversine。`a`/`b` は `{lat, lng}`
  - `NT.toggleVisited(id) -> void` — `nt:visited` に `{id: ISO}` を書く
  - 各カードは `<article class="spot" id="spot-<id>">`。行程ページの `spots.html#spot-kanou` の着地点

- [ ] **Step 1: `assets/spotlist.js` を書く**

```js
(function (w) {
  var NT = w.NT;
  var state = { area: 'すべて', sort: 'area', origin: null, geoError: null };

  NT.distanceKm = function (a, b) {
    var R = 6371, r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  NT.toggleVisited = function (id) {
    var v = NT.get('visited', {});
    if (v[id]) delete v[id]; else v[id] = NT.now().toISOString();
    NT.set('visited', v);
  };

  function card(s) {
    var visited = !!NT.get('visited', {})[s.id];
    var dist = state.origin ? NT.distanceKm(state.origin, s) : null;
    var head = NT.el('h3', {}, [
      s.name,
      s.indoor ? NT.el('span', { class: 'badge indoor', text: '屋内' }) : null,
      !s.indoor && s.shade ? NT.el('span', { class: 'badge shade', text: '日陰' }) : null,
      s.unverified ? NT.el('span', { class: 'badge warn', text: '要確認' }) : null
    ]);
    var meta = NT.el('dl', { class: 'spot-meta' }, [].concat(
      row('場所', s.station + ' ' + s.walk),
      row('営業', s.hours),
      s.closed ? row('定休', s.closed) : [],
      s.fee ? row('料金', s.fee) : [],
      row('目安', s.stay + '分'),
      dist !== null ? row('距離', dist.toFixed(1) + ' km') : []
    ));
    var body = NT.el('div', { class: 'spot-body' }, [
      meta,
      NT.el('h4', { text: '豆知識' }),
      NT.el('ul', { class: 'triv' }, s.trivia.map(function (t) {
        return NT.el('li', { text: t });
      })),
      s.tips && s.tips.length ? NT.el('h4', { text: '現地での注意' }) : null,
      s.tips && s.tips.length ? NT.el('ul', { class: 'triv tips' }, s.tips.map(function (t) {
        return NT.el('li', { text: t });
      })) : null,
      NT.el('div', { class: 'tl-links' }, [
        s.map ? NT.el('a', { href: s.map, target: '_blank', rel: 'noopener', text: '地図で開く' }) : null,
        s.official ? NT.el('a', { href: s.official, target: '_blank', rel: 'noopener', text: '公式サイト' }) : null,
        s.tel ? NT.el('a', { href: 'tel:' + s.tel, text: s.tel }) : null
      ])
    ]);
    var art = NT.el('article', { class: 'card spot' + (visited ? ' visited' : ''), id: 'spot-' + s.id }, [
      NT.el('div', { class: 'spot-head' }, [
        head,
        NT.el('button', {
          class: 'btn vis' + (visited ? ' on' : ''), type: 'button',
          text: visited ? '訪問済 ✓' : '訪問済にする',
          onclick: function () { NT.toggleVisited(s.id); NT.renderSpots(); }
        })
      ]),
      NT.el('div', { class: 'spot-area mono', text: s.area + ' / ' + s.category }),
      body
    ]);
    return art;

    function row(k, v) {
      return [NT.el('dt', { text: k }), NT.el('dd', { text: v })];
    }
  }

  function controls() {
    var areas = ['すべて'].concat(NT.AREAS);
    var geoBtn = NT.el('button', { class: 'btn' + (state.sort === 'geo' ? ' on' : ''),
      type: 'button', text: '現在地から近い順',
      onclick: function () {
        if (!navigator.geolocation) {
          state.geoError = 'この端末では位置情報が使えません。エリア順で表示します。';
          NT.renderSpots(); return;
        }
        geoBtn.disabled = true; geoBtn.textContent = '測位中…';
        navigator.geolocation.getCurrentPosition(function (pos) {
          state.origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          state.sort = 'geo'; state.geoError = null; NT.renderSpots();
        }, function (err) {
          state.sort = 'area'; state.origin = null;
          state.geoError = err.code === 1
            ? '位置情報が許可されなかったので、エリア順で表示します。'
            : '位置情報を取得できなかったので、エリア順で表示します。';
          NT.renderSpots();
        }, { timeout: 8000, maximumAge: 60000 });
      } });
    return NT.el('div', {}, [
      NT.el('div', { class: 'btnrow' }, areas.map(function (a) {
        return NT.el('button', { class: 'btn' + (state.area === a ? ' on' : ''),
          type: 'button', text: a,
          onclick: function () { state.area = a; NT.renderSpots(); } });
      })),
      NT.el('div', { class: 'btnrow' }, [
        geoBtn,
        NT.el('button', { class: 'btn' + (state.sort === 'area' ? ' on' : ''),
          type: 'button', text: 'エリア順',
          onclick: function () { state.sort = 'area'; NT.renderSpots(); } })
      ])
    ]);
  }

  NT.renderSpots = function () {
    var root = NT.$('#spots-root');
    if (!root) return;
    root.textContent = '';
    root.appendChild(NT.el('section', {}, [
      NT.el('div', { class: 'sec-head' }, [
        NT.el('span', { class: 'no', text: '01' }), NT.el('h2', { text: '絞り込み' })
      ]),
      controls()
    ]));

    var list = NT.spots.filter(function (s) {
      return state.area === 'すべて' || s.area === state.area;
    });
    if (state.sort === 'geo' && state.origin) {
      list = list.slice().sort(function (a, b) {
        return NT.distanceKm(state.origin, a) - NT.distanceKm(state.origin, b);
      });
    } else {
      list = list.slice().sort(function (a, b) {
        return NT.AREAS.indexOf(a.area) - NT.AREAS.indexOf(b.area);
      });
    }

    var sec = NT.el('section', {}, [
      NT.el('div', { class: 'sec-head' }, [
        NT.el('span', { class: 'no', text: '02' }),
        NT.el('h2', { text: '名所 ' + list.length + '件' })
      ])
    ]);
    if (state.geoError) NT.notice(sec, state.geoError, 'warn');
    if (!list.length) NT.notice(sec, 'この条件に合う名所がありません。');
    list.forEach(function (s) { sec.appendChild(card(s)); });
    root.appendChild(sec);

    /* ハッシュ指定があればそこへ寄せる。行程ページからの「詳細」の着地 */
    if (location.hash && NT.$(location.hash)) {
      NT.$(location.hash).scrollIntoView({ block: 'start' });
    }
  };
})(window);
```

- [ ] **Step 2: `assets/style.css` に追記**

```css
.spot-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.spot-head h3{font-size:16.5px;line-height:1.45}
.spot-head h3 .badge{margin-left:7px}
.btn.vis{font-size:11px;padding:5px 9px;min-height:32px;white-space:nowrap;flex:none}
.spot.visited{border-left:4px solid var(--rokusho)}
.spot-area{font-size:10.5px;letter-spacing:.16em;color:var(--gray);margin-top:3px}
.spot-meta{display:grid;grid-template-columns:52px 1fr;gap:2px 10px;margin:11px 0 0;font-size:12.5px}
.spot-meta dt{color:var(--gray)}
.spot-meta dd{margin:0}
.spot-body h4{font-family:"Shippori Mincho B1",serif;font-size:13px;color:var(--accent);
  margin:14px 0 4px}
.triv{margin:0;padding-left:19px;font-size:13px}
.triv li{margin:3px 0}
.triv.tips li{color:var(--miso)}
```

- [ ] **Step 3: `spots.html` を修正**

```html
<script src="assets/core.js"></script>
<script src="data/spots.data.js"></script>
<script src="assets/spotlist.js"></script>
<script>NT.mountNav('spots.html'); NT.renderSpots();</script>
```

- [ ] **Step 4: 手動確認**

1. 30件のカードがエリア順（名古屋駅 → 栄・大須 → 熱田 → 名古屋城 → 覚王山・東部 → その他）で並ぶ
2. 見出しが `名所 30件`
3. `栄・大須` を押すと該当件数だけに絞られ、見出しの件数も変わる
4. 味処 叶 のカードに `要確認` バッジ、豆知識4本、現地での注意3本、電話リンクが出る
5. 徳川美術館に `屋内`、熱田神宮に `日陰` バッジが出る
6. 「訪問済にする」を押すと左端に緑の縦線が入り、ボタンが `訪問済 ✓` になる。リロードしても残る
7. 「現在地から近い順」を押して**拒否する** → `位置情報が許可されなかったので、エリア順で表示します。`
   が味噌色で出て、並びはエリア順のまま。無言で失敗しない
8. 許可した場合は距離順に並び替わり、各カードに `距離 x.x km` が出る
9. `index.html` の叶の「詳細」から遷移して、叶のカードまでスクロールした状態で着地する
10. コンソールで検算する

```js
/* 名古屋駅と栄の直線距離はおよそ 1.8-2.3km */
NT.distanceKm(NT.spotById('esca'), NT.spotById('kanou')).toFixed(1)
NT.distanceKm(NT.spotById('kanou'), NT.spotById('kanou'))   // → 0
```

- [ ] **Step 5: コミット**

```bash
git add assets/spotlist.js assets/style.css spots.html
git commit -m "feat: 名所ページにフィルタ・GPS距離ソート・訪問済みを追加

位置情報の拒否と取得失敗は理由を1行で表示してエリア順に戻す。
無言で失敗すると現地で操作を疑う時間が生まれるため。"
```

---

### Task 9: 名物データ 20品と名物ページ

**Files:**
- Create: `data/foods.data.js`
- Create: `assets/gourmetlist.js`
- Modify: `gourmet.html`
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: `NT.el`, `NT.spotById`
- Produces:
  - `NT.foods -> Food[]`、`NT.foodById(id) -> Food|undefined`
  - `Food = { id, name, kana, cat:'食事'|'軽食'|'甘味'|'土産', slot?:string, what, why,
    howto?:string[], where:[{name, area, hours, note, spotId?, map?}], price, trivia:string[] }`
  - `slot` は五食の枠との対応。`'day1-lunch'|'day1-eve'|'day1-dinner'|'day2-morning'|'day2-lunch'`
  - `NT.renderGourmet() -> void` — `#gourmet-root` を描き直す。再入可能
  - `NT.gourmetSections = []` に `function(root)` を push すると描画の先頭で呼ばれる（Task 10 が使う）

- [ ] **Step 1: `data/foods.data.js` を書く**

ひな型（全20品がこの形）。

```js
(function (w) {
  var NT = (w.NT = w.NT || {});
  NT.foods = [
    { id:'hitsumabushi', name:'ひつまぶし', kana:'ひつまぶし', cat:'食事', slot:'day2-lunch',
      what:'櫃に入れた蒲焼を切り分け、薬味と出汁で三通りに食べる鰻飯',
      why:'「ひつまぶし」はあつた蓬莱軒の登録商標。おひつのご飯に鰻をまぶすことから。' +
           '大人数の宴会で丼が割れるのを避けるため櫃で出したのが始まりという説が残る',
      howto:['一杯目はそのまま鰻と飯の味を見る',
             '二杯目はねぎ・海苔・わさびを乗せる',
             '三杯目は出汁をかけて茶漬けにする'],
      where:[
        { name:'まるや本店 名駅店', area:'名古屋駅', spotId:'maruya-esca',
          hours:'エスカ地下街・年中無休', note:'駅直結で復路の日でも読み違えがない。備長炭の地焼き' },
        { name:'あつた蓬莱軒 神宮店', area:'熱田', spotId:'houraiken-jingu',
          hours:'11:30-14:30 L.O. / 16:30-20:30', note:'定休 火・第2第4月。8/12は振替休の恐れ。要確認' },
        { name:'あつた蓬莱軒 松坂屋店', area:'栄・大須', spotId:'houraiken-matsuzakaya',
          hours:'土日祝 11:00-20:30 通し', note:'祝日はL.O.の崖がないので行列を待てる' }
      ],
      price:'4,000円前後',
      trivia:['名古屋の鰻は腹開きで、頭を落とさず一度素焼きしてから焼き上げる店が多い',
              '関東の背開き・関西の腹開きの境目が名古屋あたりにある'] },
    /* …以降19品… */
  ];
  NT.foodById = function (id) {
    for (var i = 0; i < NT.foods.length; i++) if (NT.foods[i].id === id) return NT.foods[i];
    return undefined;
  };
})(window);
```

収録する20品。`slot` を持つのは五食に対応する5品のみ。

| id | name | cat | slot | 由来として書くこと |
|---|---|---|---|---|
| `hitsumabushi` | ひつまぶし | 食事 | day2-lunch | 上記 |
| `misokatsu` | 味噌カツ | 食事 | day1-lunch | 八丁味噌ベースの甘辛だれ。串カツをどて煮の鍋に浸したのが始まりという説。叶は「かける」ではなく「煮込む」元祖型、矢場とんは「かける」型。同じ名前で作りが違う |
| `kochin` | 名古屋コーチン | 食事 | day1-dinner | 明治初期に尾張藩士の海部兄弟がバフコーチンと地鶏を交配。日本三大地鶏。卵も名物で「贅沢親子丼」になる。「純系」は血統が保たれた個体 |
| `morning` | 喫茶店のモーニング | 軽食 | day2-morning | 愛知の喫茶店文化。コーヒー1杯にトーストとゆで卵が付く。繊維業の商談で喫茶店が使われた名残という説 |
| `shachihoko-tsumami` | 城の屋台でつまむ | 軽食 | day1-eve | 鯱食堂と金シャチ横丁。天むす・どて煮・味噌おでん・かき氷 |
| `tebasaki` | 手羽先唐揚げ | 軽食 | — | 風来坊が元祖を名乗り、山ちゃんは胡椒で差別化。素揚げしてたれを塗る。二度揚げが基本 |
| `misonikomi` | 味噌煮込みうどん | 食事 | — | 塩を入れず打つので芯が残る。生煮えではなく仕様。土鍋の蓋を取り皿に使う |
| `kishimen` | きしめん | 食事 | — | 平打ち麺。ゆで時間が短く駅の立ち食いに向く。花かつおを大量に乗せるのが名古屋式 |
| `ankake` | あんかけスパ | 食事 | — | ヨコイが元祖。極太麺を茹でてから炒め、黒胡椒の効いたとろみのあるソースをかける |
| `taiwan-ramen` | 台湾ラーメン | 食事 | — | 味仙の郭明優が台湾の担仔麺を辛くしたもの。台湾に台湾ラーメンは存在しない。辛さは注文時に調整可 |
| `tenmusu` | 天むす | 軽食 | — | 発祥は三重県津市だが名古屋名物として定着。海老天を握り込んだ小さいおにぎり |
| `doteni` | どて煮 | 軽食 | — | 牛すじやモツを八丁味噌で煮込む。「どて」は鍋の縁に味噌を土手のように塗る作り方から |
| `misooden` | 味噌おでん | 軽食 | — | だしで煮た具に甘めの味噌だれ。おでんに味噌が「かかる」のが名古屋 |
| `tetsunapo` | 鉄板ナポリタン | 食事 | — | 熱した鉄板に卵を敷いてナポリタンを乗せる。最後まで熱い |
| `ebifurya` | えびふりゃー | 食事 | — | タモリが名古屋弁を誇張して広めた言い方が逆輸入され名物化した。地元は「えびふらい」と言う |
| `ogura-toast` | 小倉トースト | 甘味 | — | 大正時代の喫茶店「満つ葉」で、学生がぜんざいにトーストを浸したのを見て生まれたという説 |
| `uiro` | ういろう | 甘味 | — | 米粉と砂糖を蒸した棹菓子。青柳総本家の名古屋駅の実演販売が知られる。小田原にも別系統がある |
| `onimanju` | 鬼まんじゅう | 甘味 | — | 角切りのさつまいもを混ぜて蒸す。表面の凹凸が鬼の金棒に似ることから。戦中の代用食が出自 |
| `piyorin` | ぴよりん | 土産 | — | JR東海フーズのプリン菓子。要冷蔵で崩れやすく、専用の保冷が必要。買うのは帰る直前 |
| `shiruko-sand` | しるこサンド | 土産 | — | 松永製菓のビスケット。あんこ入りで日持ちする。ばら撒き用に強い |

各品の `where` は1〜3件。`spotId` は `NT.spots` に存在する id のみ書く（存在しない店は
`spotId` を省き `name` と `hours` だけ書く）。

- [ ] **Step 2: `assets/gourmetlist.js` を書く**

```js
(function (w) {
  var NT = w.NT;
  NT.gourmetSections = NT.gourmetSections || [];
  var state = { cat: 'すべて' };
  var CATS = ['すべて', '食事', '軽食', '甘味', '土産'];

  function card(f) {
    return NT.el('article', { class: 'card food', id: 'food-' + f.id }, [
      NT.el('div', { class: 'spot-head' }, [
        NT.el('h3', {}, [f.name,
          f.slot ? NT.el('span', { class: 'badge kin', text: '五食' }) : null]),
        NT.el('span', { class: 'food-price mono', text: f.price })
      ]),
      NT.el('p', { class: 'food-what', text: f.what }),
      NT.el('h4', { text: 'なぜ名古屋なのか' }),
      NT.el('p', { class: 'food-why', text: f.why }),
      f.howto ? NT.el('h4', { text: '食べ方' }) : null,
      f.howto ? NT.el('ol', { class: 'triv' }, f.howto.map(function (t) {
        return NT.el('li', { text: t }); })) : null,
      NT.el('h4', { text: '食べられる店' }),
      NT.el('ul', { class: 'where' }, f.where.map(function (p) {
        var s = p.spotId && NT.spotById(p.spotId);
        return NT.el('li', {}, [
          NT.el('strong', { text: p.name }),
          NT.el('span', { class: 'where-meta', text: ' ' + p.area + ' / ' + p.hours }),
          p.note ? NT.el('span', { class: 'where-note', text: p.note }) : null,
          s ? NT.el('span', { class: 'tl-links' }, [
            NT.el('a', { href: 'spots.html#spot-' + s.id, text: '詳細' }),
            s.map ? NT.el('a', { href: s.map, target: '_blank', rel: 'noopener', text: '地図' }) : null,
            s.unverified ? NT.el('span', { class: 'badge warn', text: '要確認' }) : null
          ]) : null
        ]);
      })),
      f.trivia && f.trivia.length ? NT.el('h4', { text: '豆知識' }) : null,
      f.trivia && f.trivia.length ? NT.el('ul', { class: 'triv' }, f.trivia.map(function (t) {
        return NT.el('li', { text: t }); })) : null
    ]);
  }

  NT.renderGourmet = function () {
    var root = NT.$('#gourmet-root');
    if (!root) return;
    root.textContent = '';
    NT.gourmetSections.forEach(function (fn) { fn(root); });

    root.appendChild(NT.el('section', {}, [
      NT.el('div', { class: 'sec-head' }, [
        NT.el('span', { class: 'no', text: '02' }), NT.el('h2', { text: '名物 図鑑' })
      ]),
      NT.el('div', { class: 'btnrow' }, CATS.map(function (c) {
        return NT.el('button', { class: 'btn' + (state.cat === c ? ' on' : ''),
          type: 'button', text: c,
          onclick: function () { state.cat = c; NT.renderGourmet(); } });
      }))
    ]));

    var list = NT.foods.filter(function (f) {
      return state.cat === 'すべて' || f.cat === state.cat;
    });
    var sec = NT.el('section', { class: 'tight' });
    list.forEach(function (f) { sec.appendChild(card(f)); });
    root.appendChild(sec);
    if (location.hash && NT.$(location.hash)) NT.$(location.hash).scrollIntoView({ block: 'start' });
  };
})(window);
```

- [ ] **Step 3: `assets/style.css` に追記**

```css
section.tight{padding-top:0}
.food-price{font-size:11.5px;color:var(--gray);white-space:nowrap;flex:none}
.food-what{margin:9px 0 0;font-size:13.5px;font-weight:500}
.food-why{margin:0;font-size:13px;color:var(--fg)}
.where{margin:0;padding-left:0;list-style:none;font-size:13px}
.where li{padding:8px 0;border-top:1px dotted var(--rule)}
.where li:first-child{border-top:none}
.where-meta{font-size:12px;color:var(--gray)}
.where-note{display:block;font-size:12px;color:var(--gray);margin-top:2px}
```

- [ ] **Step 4: `gourmet.html` を修正**

```html
<script src="assets/core.js"></script>
<script src="data/spots.data.js"></script>
<script src="data/foods.data.js"></script>
<script src="assets/gourmetlist.js"></script>
<script>NT.mountNav('gourmet.html'); NT.renderGourmet();</script>
```

- [ ] **Step 5: 手動確認**

1. 20品のカードが出る
2. `食事` / `軽食` / `甘味` / `土産` で絞れる
3. ひつまぶし・味噌カツ・名古屋コーチン・モーニング・城の屋台でつまむ の5品に金色の `五食` バッジ
4. ひつまぶしの「食べ方」が3項目の番号付きで出る
5. 蓬莱軒 神宮店の行に `要確認` バッジが出る
6. コンソールで検算する

```js
NT.foods.length                                        // → 20
new Set(NT.foods.map(f => f.id)).size                  // → 20
NT.foods.filter(f => f.slot).map(f => f.slot).sort()
// → ['day1-dinner','day1-eve','day1-lunch','day2-lunch','day2-morning']
NT.foods.flatMap(f => f.where).filter(p => p.spotId && !NT.spotById(p.spotId))  // → []
NT.foods.filter(f => !f.why || !f.what || !f.price).length   // → 0
```

- [ ] **Step 6: コミット**

```bash
git add data/foods.data.js assets/gourmetlist.js assets/style.css gourmet.html
git commit -m "feat: 名物データ20品と名物ページを追加

各品に「なぜ名古屋なのか」を必須で持たせる。味噌カツは叶の煮込む型と
矢場とんのかける型で作りが違うことを書き分けた。
gourmetSections を拡張点にして、五食メーターを後から先頭へ差し込めるようにした。"
```

---

### Task 10: 五食制覇メーターと写真つき記録

**Files:**
- Create: `assets/record.js`
- Modify: `gourmet.html`（`assets/gourmetlist.js` の後に読む）
- Modify: `assets/gourmetlist.js`（カードにチェック・メモ・写真の欄を足す）
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: `NT.foods`, `NT.get`, `NT.set`, `NT.el`, `NT.renderGourmet`, `NT.gourmetSections`
- Produces:
  - `NT.checks() -> { [foodId]: {done:bool, at:ISO, memo:string} }` — `nt:checks` の読み出し
  - `NT.setCheck(id, patch) -> void` — 部分更新して書き戻す
  - `NT.SLOTS -> [{id, label}]` — 五食の枠。`day1-lunch` … `day2-lunch` の5つ
  - `NT.photoPut(id, blob) -> Promise<void>` / `NT.photoGet(id) -> Promise<Blob|null>` /
    `NT.photoDel(id) -> Promise<void>` — IndexedDB `nt-photos` のストア `photos`
  - `NT.shrinkImage(file, maxEdge) -> Promise<Blob>` — 長辺を maxEdge に縮小した JPEG
  - `NT.progressCounts() -> { slotDone, slotTotal, foodDone, foodTotal }`

写真だけ IndexedDB に置く。localStorage は5MB前後で、写真を入れると
チェックとメモまで書けなくなるため、壊れ方が最悪になる。

- [ ] **Step 1: `assets/record.js` を書く**

```js
(function (w) {
  var NT = w.NT;

  NT.SLOTS = [
    { id: 'day1-lunch',   label: 'DAY1 昼' },
    { id: 'day1-eve',     label: 'DAY1 夕' },
    { id: 'day1-dinner',  label: 'DAY1 夜' },
    { id: 'day2-morning', label: 'DAY2 朝' },
    { id: 'day2-lunch',   label: 'DAY2 昼' }
  ];

  NT.checks = function () { return NT.get('checks', {}); };
  NT.setCheck = function (id, patch) {
    var all = NT.checks();
    var cur = all[id] || { done: false, at: null, memo: '' };
    Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
    all[id] = cur;
    NT.set('checks', all);
  };

  NT.progressCounts = function () {
    var c = NT.checks();
    var slotFoods = NT.foods.filter(function (f) { return f.slot; });
    return {
      slotDone: slotFoods.filter(function (f) { return c[f.id] && c[f.id].done; }).length,
      slotTotal: slotFoods.length,
      foodDone: NT.foods.filter(function (f) { return c[f.id] && c[f.id].done; }).length,
      foodTotal: NT.foods.length
    };
  };

  /* ---- IndexedDB。写真だけここに置く ---- */
  var DB = null;
  function db() {
    if (DB) return Promise.resolve(DB);
    return new Promise(function (res, rej) {
      var req = indexedDB.open('nt-photos', 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains('photos')) req.result.createObjectStore('photos');
      };
      req.onsuccess = function () { DB = req.result; res(DB); };
      req.onerror = function () { rej(req.error); };
    });
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction('photos', mode), store = t.objectStore('photos');
        var out = fn(store);
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  NT.photoPut = function (id, blob) { return tx('readwrite', function (s) { s.put(blob, id); }); };
  NT.photoGet = function (id) { return tx('readonly', function (s) { return s.get(id); }); };
  NT.photoDel = function (id) { return tx('readwrite', function (s) { s.delete(id); }); };

  /* ---- 長辺を縮めて保存量を抑える ---- */
  NT.shrinkImage = function (file, maxEdge) {
    maxEdge = maxEdge || 1600;
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        var cv = document.createElement('canvas');
        cv.width = Math.round(img.width * scale);
        cv.height = Math.round(img.height * scale);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { b ? res(b) : rej(new Error('toBlob failed')); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('decode failed')); };
      img.src = url;
    });
  };

  /* ---- 五食メーター ---- */
  function ring(done, total, label) {
    var R = 30, C = 2 * Math.PI * R, pct = total ? done / total : 0;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 72 72');
    svg.setAttribute('class', 'ring');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label + ' ' + done + ' / ' + total);
    svg.innerHTML =
      '<circle cx="36" cy="36" r="' + R + '" fill="none" stroke="var(--rule)" stroke-width="6"/>' +
      '<circle cx="36" cy="36" r="' + R + '" fill="none" stroke="var(--kin)" stroke-width="6"' +
      ' stroke-linecap="round" stroke-dasharray="' + C + '"' +
      ' stroke-dashoffset="' + (C * (1 - pct)) + '" transform="rotate(-90 36 36)"/>' +
      '<text x="36" y="34" text-anchor="middle" font-size="17" font-weight="700"' +
      ' fill="var(--fg)" font-family="monospace">' + done + '</text>' +
      '<text x="36" y="48" text-anchor="middle" font-size="10"' +
      ' fill="var(--gray)" font-family="monospace">/ ' + total + '</text>';
    return NT.el('div', { class: 'ring-box' }, [svg, NT.el('span', { class: 'ring-label', text: label })]);
  }

  NT.gourmetSections.push(function (root) {
    var p = NT.progressCounts(), c = NT.checks();
    root.appendChild(NT.el('section', {}, [
      NT.el('div', { class: 'sec-head' }, [
        NT.el('span', { class: 'no', text: '01' }), NT.el('h2', { text: '制覇状況' })
      ]),
      NT.el('div', { class: 'card' }, [
        NT.el('div', { class: 'rings' }, [
          ring(p.slotDone, p.slotTotal, '五食の枠'),
          ring(p.foodDone, p.foodTotal, '名物ぜんぶ')
        ]),
        NT.el('ul', { class: 'slots' }, NT.SLOTS.map(function (s) {
          var f = NT.foods.filter(function (x) { return x.slot === s.id; })[0];
          var done = f && c[f.id] && c[f.id].done;
          return NT.el('li', { class: done ? 'done' : '' }, [
            NT.el('span', { class: 'slot-when mono', text: s.label }),
            NT.el('a', { href: '#food-' + (f ? f.id : ''), text: f ? f.name : '—' }),
            NT.el('span', { class: 'slot-mark', text: done ? '✓' : '' })
          ]);
        })),
        NT.el('button', { class: 'btn', type: 'button', text: '記録をすべて消す',
          onclick: function () {
            if (!w.confirm('チェック・メモ・写真をすべて消します。よろしいですか。')) return;
            localStorage.removeItem('nt:checks');
            Promise.all(NT.foods.map(function (f) { return NT.photoDel(f.id); }))
              .then(function () { NT.renderGourmet(); });
          } })
      ])
    ]));
  });
})(window);
```

`window.confirm` を使う。ブラウザのモーダルは自動操作を止めるが、これは人が押すボタンで、
記録の全消去は取り返しがつかないため確認を挟む。

- [ ] **Step 2: `assets/gourmetlist.js` のカードに記録欄を足す**

`card(f)` が返す `article` の子要素の**末尾**に次を足す。`NT.setCheck` が未定義でも
落ちないよう、`record.js` が読まれているかを確認してから足す。

```js
      /* card(f) の children 配列の最後に足す */
      (NT.setCheck ? recordBox(f) : null)
```

同ファイル内に `recordBox` を定義する。

```js
  function recordBox(f) {
    var c = (NT.checks()[f.id]) || { done: false, memo: '' };
    var img = NT.el('img', { class: 'rec-photo', alt: f.name + 'の写真', hidden: true });
    var delBtn = NT.el('button', { class: 'btn', type: 'button', text: '写真を消す', disabled: true,
      onclick: function () { NT.photoDel(f.id).then(function () { NT.renderGourmet(); }); } });
    /* 写真の有無は IndexedDB を読むまで分からない。要素は先に作り、
       解決したときに表示と活性を切り替える。組み立て時に img.hidden で
       分岐すると、初回描画では常に写真なしとして扱われてしまう。 */
    NT.photoGet(f.id).then(function (b) {
      if (!b) return;
      img.src = URL.createObjectURL(b);
      img.hidden = false;
      delBtn.disabled = false;
    });
    var file = NT.el('input', { type: 'file', accept: 'image/*', class: 'rec-file',
      id: 'ph-' + f.id,
      onchange: function () {
        var fl = file.files && file.files[0];
        if (!fl) return;
        NT.shrinkImage(fl, 1600)
          .then(function (b) { return NT.photoPut(f.id, b).then(function () { return b; }); })
          .then(function (b) { img.src = URL.createObjectURL(b); img.hidden = false; })
          .catch(function () { w.alert('この画像は保存できませんでした。'); });
      } });
    var memo = NT.el('input', { type: 'text', class: 'rec-memo', value: c.memo || '',
      placeholder: 'ひとことメモ', 'aria-label': f.name + 'のメモ',
      onchange: function () { NT.setCheck(f.id, { memo: memo.value }); } });
    return NT.el('div', { class: 'rec-box' }, [
      NT.el('button', { class: 'btn' + (c.done ? ' on' : ''), type: 'button',
        text: c.done ? '食べた ✓' : '食べたらここを押す',
        onclick: function () {
          NT.setCheck(f.id, { done: !c.done, at: c.done ? null : NT.now().toISOString() });
          NT.renderGourmet();
        } }),
      NT.el('label', { class: 'btn rec-file-label', for: 'ph-' + f.id, text: '写真' }),
      file, memo, img, delBtn
    ]);
  }
```

- [ ] **Step 3: `assets/style.css` に追記**

```css
.rings{display:flex;gap:22px;align-items:center;justify-content:center;margin-bottom:6px}
.ring-box{text-align:center}
.ring{width:72px;height:72px;display:block;margin:0 auto}
.ring-label{font-size:11px;color:var(--gray)}
.slots{list-style:none;margin:12px 0 0;padding:0;font-size:13px}
.slots li{display:grid;grid-template-columns:64px 1fr 20px;gap:9px;align-items:baseline;
  padding:7px 0;border-top:1px dotted var(--rule)}
.slots li.done{color:var(--rokusho)}
.slot-when{font-size:11px;color:var(--gray)}
.slot-mark{color:var(--rokusho);font-weight:700;text-align:right}
.rec-box{display:flex;flex-wrap:wrap;gap:7px;align-items:center;
  margin-top:13px;padding-top:11px;border-top:1px solid var(--rule)}
.rec-box .btn{font-size:11.5px;padding:6px 11px;min-height:36px}
.rec-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.rec-file-label{cursor:pointer}
.rec-memo{flex:1 1 150px;min-width:120px;font-size:13px;padding:8px 10px;min-height:36px;
  background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:2px;
  font-family:inherit}
.rec-photo{width:100%;max-width:280px;border-radius:3px;margin-top:8px;display:block}
```

- [ ] **Step 4: `gourmet.html` に読ませる**

```html
<script src="assets/gourmetlist.js"></script>
<script src="assets/record.js"></script>
<script>NT.mountNav('gourmet.html'); NT.renderGourmet();</script>
```

`record.js` が `NT.gourmetSections.push` するのは `renderGourmet` の呼び出し前でなければ
ならないので、この読み込み順が必要。

- [ ] **Step 5: 手動確認**

1. ページ先頭に金色のリングが2つ出て、`0 / 5` と `0 / 20`
2. 五食の一覧に DAY1昼 味噌カツ / DAY1夕 城の屋台でつまむ / DAY1夜 名古屋コーチン /
   DAY2朝 喫茶店のモーニング / DAY2昼 ひつまぶし が並ぶ
3. 味噌カツのカードで「食べたらここを押す」を押すと `食べた ✓` になり、
   リングが `1 / 5` と `1 / 20` に進み、五食一覧の DAY1昼 に ✓ が付く
4. メモに文字を入れてフォーカスを外し、リロードしても残る
5. 「写真」を押して画像を選ぶと縮小されたプレビューが出る。リロードしても残る
6. 「写真を消す」で消える。写真が無い状態ではこのボタンが押せない
7. 「記録をすべて消す」で確認ダイアログが出て、承諾するとチェック・メモ・写真が消えリングが `0` に戻る
8. コンソールで確認する

```js
NT.SLOTS.length                             // → 5
NT.progressCounts()                         // → { slotDone: …, slotTotal: 5, foodDone: …, foodTotal: 20 }
/* 縮小が効いているか。長辺1600以下になる */
NT.photoGet('misokatsu').then(b => b && console.log(b.type, b.size))  // → image/jpeg と縮小後のサイズ
/* localStorage に写真が入っていないこと */
localStorage.getItem('nt:checks').length < 5000   // → true
```

- [ ] **Step 6: コミット**

```bash
git add assets/record.js assets/gourmetlist.js assets/style.css gourmet.html
git commit -m "feat: 五食制覇メーターと写真つき記録を追加

写真は IndexedDB、チェックとメモは localStorage に分ける。
localStorage は5MB前後で写真を入れるとチェックまで書けなくなり、
壊れ方が最悪になるため。保存前に長辺1600pxへ縮小する。"
```

---

### Task 11: 移動データと実用メモページ（営業時間表・移動早見表）

**Files:**
- Create: `data/transit.data.js`
- Create: `assets/tipspage.js`
- Modify: `tips.html`
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: `NT.spots`, `NT.el`
- Produces:
  - `NT.transit -> [{from, to, line, min, fare, note}]`
  - `NT.renderTips() -> void` — `#tips-root` を描き直す。再入可能
  - `NT.tipsSections -> [{no, title, build:function(): HTMLElement}]`
    — 節の定義を配列で持ち、`renderTips` が順に描く。Task 12・13・15・16 がここに push する
  - `NT.openOn(spot, dateISO, isHoliday) -> '○'|'×'|'要確認'` — 営業判定。
    `unverified` なら常に `'要確認'`

- [ ] **Step 1: `data/transit.data.js` を書く**

```js
(function (w) {
  var NT = (w.NT = w.NT || {});
  NT.transit = [
    { from:'名古屋', to:'栄',       line:'東山線',   min:5,  fare:210, note:'伏見で乗換なし' },
    { from:'名古屋', to:'伏見',     line:'東山線',   min:3,  fare:210, note:'' },
    { from:'栄',     to:'矢場町',   line:'名城線',   min:2,  fare:210, note:'徒歩でも10分' },
    { from:'栄',     to:'上前津',   line:'名城線',   min:4,  fare:210, note:'大須の南端' },
    { from:'栄',     to:'市役所',   line:'名城線',   min:3,  fare:210, note:'名古屋城の東門側' },
    { from:'栄',     to:'熱田神宮伝馬町', line:'名城線', min:15, fare:270, note:'金山経由で乗換なし' },
    { from:'矢場町', to:'上前津',   line:'名城線',   min:2,  fare:210, note:'大須は両駅から徒歩圏' },
    { from:'矢場町', to:'熱田神宮伝馬町', line:'名城線', min:13, fare:270, note:'' },
    { from:'上前津', to:'市役所',   line:'名城線',   min:10, fare:240, note:'名城線を北へ' },
    { from:'市役所', to:'栄',       line:'名城線',   min:3,  fare:210, note:'夜の栄へ戻る動線' },
    { from:'名古屋', to:'大曽根',   line:'東山線→名城線', min:22, fare:270, note:'栄で乗換。徳川美術館は徒歩15分' },
    { from:'大曽根', to:'栄',       line:'名城線',   min:12, fare:240, note:'' },
    { from:'名古屋', to:'金山',     line:'JR/名鉄',  min:6,  fare:200, note:'熱田方面の乗換拠点' },
    { from:'金山',   to:'神宮前',   line:'名鉄',     min:3,  fare:170, note:'熱田神宮の東門に近い' },
    { from:'名古屋', to:'大須観音', line:'桜通線→鶴舞線', min:11, fare:240, note:'丸の内で乗換' }
  ];
})(window);
```

- [ ] **Step 2: `assets/tipspage.js` を書く**

```js
(function (w) {
  var NT = w.NT;
  NT.tipsSections = NT.tipsSections || [];

  /* 8/11は祝日。unverified は断定せず「要確認」を返す */
  NT.openOn = function (spot, dateISO, isHoliday) {
    if (spot.unverified) return '要確認';
    var closed = spot.closed || '';
    if (!closed) return '○';
    var dow = ['日', '月', '火', '水', '木', '金', '土'][new Date(dateISO + 'T12:00:00').getDay()];
    if (closed.indexOf(dow) < 0) return '○';
    if (isHoliday && /祝日は営業|祝日の場合/.test(closed)) return '要確認';
    return '×';
  };

  function hoursTable() {
    var rows = NT.spots.filter(function (s) { return s.hours; });
    var t = NT.el('table', {}, [
      NT.el('thead', {}, [NT.el('tr', {}, [
        NT.el('th', { text: '店・施設' }), NT.el('th', { text: '営業時間' }),
        NT.el('th', { text: '定休' }),
        NT.el('th', { text: '8/11 火・祝' }), NT.el('th', { text: '8/12 水' })
      ])]),
      NT.el('tbody', {}, rows.map(function (s) {
        var a = NT.openOn(s, '2026-08-11', true), b = NT.openOn(s, '2026-08-12', false);
        return NT.el('tr', {}, [
          NT.el('th', {}, [
            NT.el('a', { href: 'spots.html#spot-' + s.id, text: s.name }),
            s.tel ? NT.el('span', { class: 'tel-line' }, [
              NT.el('a', { href: 'tel:' + s.tel, text: s.tel })]) : null
          ]),
          NT.el('td', { text: s.hours }),
          NT.el('td', { text: s.closed || '—' }),
          NT.el('td', { class: 'mk mk-' + mk(a), text: a }),
          NT.el('td', { class: 'mk mk-' + mk(b), text: b })
        ]);
      }))
    ]);
    return NT.el('div', {}, [
      NT.el('div', { class: 'table-scroll' }, [t]),
      NT.el('p', { class: 'notice warn',
        text: '「要確認」は営業時間が確認できなかった店です。叶と蓬莱軒は定休日が祝日に' +
              'ぶつかると振替が発生するため、出発前に電話で確かめてください。' })
    ]);
    function mk(v) { return v === '○' ? 'ok' : v === '×' ? 'ng' : 'q'; }
  }

  function transitTable() {
    var t = NT.el('table', {}, [
      NT.el('thead', {}, [NT.el('tr', {}, ['区間', '路線', '所要', '運賃', '備考'].map(function (h) {
        return NT.el('th', { text: h }); }))]),
      NT.el('tbody', {}, NT.transit.map(function (r) {
        return NT.el('tr', {}, [
          NT.el('th', { text: r.from + ' → ' + r.to }),
          NT.el('td', { text: r.line }),
          NT.el('td', { class: 'mono', text: r.min + '分' }),
          NT.el('td', { class: 'mono', text: '¥' + r.fare }),
          NT.el('td', { text: r.note || '—' })
        ]);
      }))
    ]);
    return NT.el('div', {}, [
      NT.el('div', { class: 'table-scroll' }, [t]),
      NT.el('div', { class: 'card' }, [
        NT.el('h3', { text: 'きっぷの判断' }),
        NT.el('p', { class: 'food-why',
          text: 'ドニチエコきっぷ（620円）は土日祝と毎月8日のみ有効。8/11は山の日なので使えますが、' +
                '8/12（水）は使えません。8/12は地下鉄一日乗車券（760円）か、都心ループの動きが' +
                '少ないなら都度払いのほうが安く済みます。' }),
        NT.el('p', { class: 'food-why',
          text: '8/11の想定は 名古屋→栄→熱田神宮伝馬町→矢場町→上前津→市役所→栄 で' +
                '運賃の合計が620円を超えるため、ドニチエコきっぷが有利です。' })
      ])
    ]);
  }

  function heatSection() {
    return NT.el('div', {}, [
      NT.el('div', { class: 'card' }, [
        NT.el('h3', { text: '猛暑対策' }),
        NT.el('ul', { class: 'triv' }, [
          '8月の名古屋は日中35℃を超える。屋外の連続は1時間までに区切る',
          '栄と名古屋駅は地下街が発達している。栄はセントラルパーク、名古屋駅はメイチカとエスカで' +
            '地上に出ずに移動できる区間が長い',
          '大須商店街は全蓋アーケードなので日陰。正午台を大須に充てるのは有効',
          '逃げ場になる屋内: オアシス21の地下、徳川美術館、トヨタ産業技術記念館、ノリタケの森',
          '熱田神宮は樹齢1000年超の大楠で木陰が濃く、真夏でも歩ける例外'
        ].map(function (t) { return NT.el('li', { text: t }); }))
      ]),
      NT.el('div', { class: 'card' }, [
        NT.el('h3', { text: '持ち物' }),
        NT.el('ul', { class: 'triv' }, [
          'モバイルバッテリー（このサイトを見続けるので消耗が早い）',
          '現金（大須の個人店と屋台はカード非対応が残る）',
          '折りたたみ傘（日傘兼用）',
          'ぴよりんを買うなら保冷バッグ'
        ].map(function (t) { return NT.el('li', { text: t }); }))
      ])
    ]);
  }

  NT.tipsSections.push(
    { no: '01', title: '営業時間・定休日', build: hoursTable },
    { no: '02', title: '移動の早見表',     build: transitTable },
    { no: '03', title: '暑さ対策と持ち物', build: heatSection }
  );

  NT.renderTips = function () {
    var root = NT.$('#tips-root');
    if (!root) return;
    root.textContent = '';
    NT.tipsSections.forEach(function (s) {
      root.appendChild(NT.el('section', {}, [
        NT.el('div', { class: 'sec-head' }, [
          NT.el('span', { class: 'no', text: s.no }), NT.el('h2', { text: s.title })
        ]),
        s.build()
      ]));
    });
  };
})(window);
```

- [ ] **Step 3: `assets/style.css` に追記**

```css
.mk{text-align:center;font-weight:700;white-space:nowrap}
.mk-ok{color:var(--rokusho)}
.mk-ng{color:var(--miso)}
.mk-q{color:var(--kin);font-size:11.5px}
.tel-line{display:block;font-size:11.5px;font-weight:400;margin-top:2px}
```

- [ ] **Step 4: `tips.html` を修正**

```html
<script src="assets/core.js"></script>
<script src="data/spots.data.js"></script>
<script src="data/transit.data.js"></script>
<script src="assets/tipspage.js"></script>
<script>NT.mountNav('tips.html'); NT.renderTips();</script>
```

- [ ] **Step 5: 手動確認**

1. 3つの節（営業時間・定休日／移動の早見表／暑さ対策と持ち物）が出る
2. 営業時間の表で、味処 叶の 8/11 と 8/12 が両方 `要確認`（金色）になり、電話番号が名前の下に出る
3. あつた蓬莱軒 本店の 8/12 が `×`（味噌色）になる（定休が「水」で祝日例外の記述がないため）
4. 伍味酉 本店は定休が「年中無休」相当なので両日 `○`（緑）
5. 徳川美術館は定休に「月曜」が入るので 8/11（火）と 8/12（水）ともに `○`
6. 表の下に「要確認は…電話で確かめてください」の注記が出る
7. 表は幅375pxでも**表だけが横スクロール**し、ページ本体は横に動かない
8. 移動の早見表が15行出て、運賃が `¥210` 形式
9. きっぷの判断に「8/12（水）は使えません」が書かれている
10. コンソールで判定を検算する

```js
NT.transit.length                                              // → 15
NT.openOn(NT.spotById('kanou'), '2026-08-12', false)           // → '要確認'（unverified）
NT.openOn(NT.spotById('houraiken-honten'), '2026-08-12', false) // → '×'（水曜定休）
NT.openOn(NT.spotById('houraiken-honten'), '2026-08-11', true)  // → '○'（火曜は定休でない）
NT.openOn(NT.spotById('tokugawa'), '2026-08-12', false)        // → '○'
NT.openOn(NT.spotById('gomitori'), '2026-08-11', true)         // → '○'
```

- [ ] **Step 6: コミット**

```bash
git add data/transit.data.js assets/tipspage.js assets/style.css tips.html
git commit -m "feat: 実用メモページに営業時間表と移動早見表を追加

openOn は unverified を常に「要確認」に落とし、祝日例外の記述がある定休日も
断定を避ける。営業を保証できないものを○×で書くと現地で閉店に当たるため。
節は tipsSections 配列で持ち、後続タスクが push で足せるようにした。"
```

---

### Task 12: 土産の買い物リスト

**Files:**
- Create: `data/omiyage.data.js`
- Create: `assets/omiyage.js`
- Modify: `tips.html`（`assets/tipspage.js` の後に読む）
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: `NT.tipsSections`, `NT.el`, `NT.get`, `NT.set`, `NT.renderTips`
- Produces:
  - `NT.omiyage -> [{id, name, where, price, caution, deadline}]`
  - `NT.cart() -> { [id]: {qty:number, forWhom:string, done:bool} }` / `NT.setCart(id, patch)`
  - `NT.RETURN_TRAIN -> '14:49'` — 復路の発車時刻。締切の計算の基準
  - 節 `04 土産の買い物リスト` を `NT.tipsSections` に足す

- [ ] **Step 1: `data/omiyage.data.js` を書く**

```js
(function (w) {
  var NT = (w.NT = w.NT || {});
  NT.RETURN_TRAIN = '14:49';
  NT.omiyage = [
    { id:'piyorin', name:'ぴよりん', price:'約450円',
      where:'JR名古屋駅 ジェイアール名古屋タカシマヤ地下／エスカ',
      caution:'要冷蔵で崩れやすい。保冷剤つきでも持ち帰りは数時間が限度。売り切れも早い',
      deadline:'14:20' },
    { id:'uiro', name:'ういろう（青柳総本家）', price:'約700円〜',
      where:'名古屋駅 エスカ／タカシマヤ', caution:'常温で日持ちする。実演販売がある', deadline:'14:35' },
    { id:'shiruko-sand', name:'しるこサンド', price:'約400円',
      where:'エスカ／駅構内の土産店', caution:'常温・大袋。ばら撒き用に強い', deadline:'14:35' },
    { id:'tebasaki-senbei', name:'手羽先せんべい', price:'約600円',
      where:'エスカ／駅構内', caution:'常温。名古屋らしさが分かりやすい', deadline:'14:35' },
    { id:'misodare', name:'味噌だれ・八丁味噌', price:'約500円〜',
      where:'エスカ／タカシマヤ食品', caution:'瓶は重い。液体なので緩衝材を挟む', deadline:'14:35' },
    { id:'kishimen-omiyage', name:'乾麺のきしめん', price:'約500円',
      where:'エスカ／駅構内', caution:'軽くて割れにくい。数を買うならこれ', deadline:'14:35' },
    { id:'ogura-spread', name:'小倉トースト用あんペースト', price:'約500円',
      where:'エスカ／タカシマヤ', caution:'常温。朝食の再現ができる', deadline:'14:35' },
    { id:'onimanju-omiyage', name:'鬼まんじゅう', price:'約200円／個',
      where:'大須の和菓子店／名古屋駅', caution:'当日中が本領。翌日には固くなる', deadline:'14:30' },
    { id:'kiyome-mochi', name:'きよめ餅', price:'約700円',
      where:'熱田神宮 門前（8/11のうちに買う）',
      caution:'日持ちが3日程度。8/11に熱田へ行くプランAなら現地で買える', deadline:'8/11中' },
    { id:'yabaton-katsu', name:'矢場とん 味噌だれ・レトルト', price:'約400円〜',
      where:'名古屋駅 エスカ／矢場町の店舗', caution:'常温。家で味噌カツを再現できる', deadline:'14:35' }
  ];
})(window);
```

- [ ] **Step 2: `assets/omiyage.js` を書く**

```js
(function (w) {
  var NT = w.NT;

  NT.cart = function () { return NT.get('omiyage', {}); };
  NT.setCart = function (id, patch) {
    var all = NT.cart();
    var cur = all[id] || { qty: 0, forWhom: '', done: false };
    Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
    all[id] = cur;
    NT.set('omiyage', all);
  };

  function minutesLeft(deadline) {
    if (!/^\d{1,2}:\d{2}$/.test(deadline)) return null;
    var now = NT.now();
    var d = NT.parseHM(deadline, '2026-08-12');
    return Math.round((d - now) / 60000);
  }

  function row(o) {
    var c = NT.cart()[o.id] || { qty: 0, forWhom: '', done: false };
    var left = minutesLeft(o.deadline);
    var qty = NT.el('input', { type: 'number', min: '0', max: '20', value: String(c.qty),
      class: 'om-qty', 'aria-label': o.name + 'の個数',
      onchange: function () { NT.setCart(o.id, { qty: Math.max(0, +qty.value || 0) }); NT.renderTips(); } });
    var who = NT.el('input', { type: 'text', value: c.forWhom, class: 'om-who',
      placeholder: '誰用', 'aria-label': o.name + 'の宛先',
      onchange: function () { NT.setCart(o.id, { forWhom: who.value }); } });
    return NT.el('div', { class: 'card om' + (c.done ? ' done' : '') }, [
      NT.el('div', { class: 'spot-head' }, [
        NT.el('h3', {}, [o.name,
          left !== null && left < 0 ? NT.el('span', { class: 'badge warn', text: '締切超過' }) : null,
          left !== null && left >= 0 && left < 60
            ? NT.el('span', { class: 'badge kin', text: 'あと' + left + '分' }) : null]),
        NT.el('span', { class: 'food-price mono', text: o.price })
      ]),
      NT.el('p', { class: 'where-note', text: o.where }),
      NT.el('p', { class: 'where-note', text: o.caution }),
      NT.el('div', { class: 'om-row' }, [
        NT.el('span', { class: 'om-dl mono', text: '締切 ' + o.deadline }),
        qty, who,
        NT.el('button', { class: 'btn' + (c.done ? ' on' : ''), type: 'button',
          text: c.done ? '買った ✓' : '買った',
          onclick: function () { NT.setCart(o.id, { done: !c.done }); NT.renderTips(); } })
      ])
    ]);
  }

  function build() {
    var cart = NT.cart();
    var picked = NT.omiyage.filter(function (o) { return (cart[o.id] || {}).qty > 0; });
    var total = picked.reduce(function (a, o) { return a + cart[o.id].qty; }, 0);
    var bought = picked.filter(function (o) { return cart[o.id].done; }).length;
    var head = NT.el('div', { class: 'card' }, [
      NT.el('h3', { text: '買う予定 ' + picked.length + '品／合計 ' + total + '個' }),
      NT.el('p', { class: 'food-why',
        text: picked.length
          ? bought + '品 購入済み。復路は ' + NT.RETURN_TRAIN +
            ' 発なので、要冷蔵のものは最後に回してください。'
          : '個数を入れると買い物リストになります。締切は ' + NT.RETURN_TRAIN +
            ' 発に間に合う目安の時刻です。' }),
      picked.length ? NT.el('button', { class: 'btn', type: 'button', text: 'リストを空にする',
        onclick: function () {
          if (!w.confirm('土産リストを空にします。よろしいですか。')) return;
          localStorage.removeItem('nt:omiyage'); NT.renderTips();
        } }) : null
    ]);
    var box = NT.el('div', {}, [head]);
    NT.omiyage.forEach(function (o) { box.appendChild(row(o)); });
    return box;
  }

  NT.tipsSections.push({ no: '04', title: '土産の買い物リスト', build: build });
})(window);
```

`omiyage.js` は `tipsSections` に `push` するため、節の並びは 01 営業時間 / 02 移動 /
03 暑さ対策 / 04 土産 になる。番号は `no` で明示しているので読み順と一致する。

- [ ] **Step 3: `assets/style.css` に追記**

```css
.om.done{opacity:.62;border-left:4px solid var(--rokusho)}
.om-row{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-top:10px}
.om-dl{font-size:11px;color:var(--miso);white-space:nowrap}
.om-qty{width:64px;font-size:13px;padding:8px;min-height:36px;
  background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:2px;font-family:inherit}
.om-who{flex:1 1 110px;min-width:90px;font-size:13px;padding:8px 10px;min-height:36px;
  background:var(--bg);color:var(--fg);border:1px solid var(--rule);border-radius:2px;font-family:inherit}
.om-row .btn{font-size:11.5px;padding:6px 11px;min-height:36px}
```

- [ ] **Step 4: `tips.html` に読ませる**

```html
<script src="data/transit.data.js"></script>
<script src="data/omiyage.data.js"></script>
<script src="assets/tipspage.js"></script>
<script src="assets/omiyage.js"></script>
<script>NT.mountNav('tips.html'); NT.renderTips();</script>
```

- [ ] **Step 5: 手動確認**

1. `04 土産の買い物リスト` の節が出て、10品が並ぶ
2. 見出しが `買う予定 0品／合計 0個`。説明に「締切は 14:49 発に間に合う目安」と出る
3. ぴよりんの個数に `2` を入れると見出しが `買う予定 1品／合計 2個` に変わり、リロードしても残る
4. 「誰用」に文字を入れてリロードしても残る
5. 「買った」を押すとカードが薄くなり左端に緑線が入る。見出しが `1品 購入済み` になる
6. デモ時刻を `8/12 13:40 土産` にして tips ページを開くと、ぴよりん（締切14:20）に
   金色の `あと40分` が出る
7. デモ時刻を `8/13 10:00 旅の後` にすると `締切超過` の味噌色バッジに変わる
8. きよめ餅の締切は `8/11中` で時刻形式でないため、バッジは出ない（`minutesLeft` が null を返す）
9. 「リストを空にする」で確認ダイアログののち空になる

- [ ] **Step 6: コミット**

```bash
git add data/omiyage.data.js assets/omiyage.js assets/style.css tips.html
git commit -m "feat: 土産の買い物リストを追加

締切は復路14:49発から逆算した目安を品ごとに持たせ、残り60分未満と
超過をバッジで出す。ぴよりんは要冷蔵で崩れやすく売り切れも早いため
締切を他より15分早く設定した。"
```

---

### Task 13: 地下鉄SVGマップ

**Files:**
- Create: `assets/subwaymap.js`
- Modify: `index.html`、`tips.html`（`assets/subwaymap.js` を読む）
- Modify: `assets/itinerary.js`（`afterRender` でマップを差し込む）
- Modify: `assets/tipspage.js`（節 `05` を足す）
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: `NT.el`, `NT.spotById`
- Produces:
  - `NT.buildSubwayMap(opts) -> HTMLElement` — `opts.onPick(spotId)` を渡すと駅のピンで呼ばれる。
    省略時はピンが `spots.html#spot-<id>` へのリンクになる
  - 地理的な正確さは狙わず、路線図としての位置関係を優先した模式図とする

- [ ] **Step 1: `assets/subwaymap.js` を書く**

```js
(function (w) {
  var NT = w.NT;
  var NS = 'http://www.w3.org/2000/svg';

  /* 模式図の座標。地理ではなく路線図としての分かりやすさを優先する */
  var ST = {
    nagoya:   { x:  60, y:  90, label: '名古屋' },
    marunouchi:{x: 130, y:  90, label: '丸の内' },
    fushimi:  { x: 130, y: 150, label: '伏見' },
    shiyakusho:{x: 250, y:  50, label: '市役所' },
    sakae:    { x: 250, y: 150, label: '栄' },
    yabacho:  { x: 250, y: 215, label: '矢場町' },
    uemaezu:  { x: 250, y: 275, label: '上前津' },
    osukannon:{ x: 170, y: 275, label: '大須観音' },
    kanayama: { x: 250, y: 340, label: '金山' },
    jingu:    { x: 250, y: 405, label: '熱田神宮伝馬町' },
    ozone:    { x: 350, y:  50, label: '大曽根' }
  };
  var LINES = [
    { name: '東山線', color: '#F7B500', path: ['nagoya', 'marunouchi', 'sakae'] },
    { name: '名城線', color: '#8C1C7D', path: ['shiyakusho', 'sakae', 'yabacho', 'uemaezu', 'kanayama', 'jingu'] },
    { name: '名城線(北)', color: '#8C1C7D', path: ['shiyakusho', 'ozone'] },
    { name: '桜通線', color: '#C8102E', path: ['nagoya', 'marunouchi'] },
    { name: '鶴舞線', color: '#0F7A3D', path: ['fushimi', 'osukannon', 'uemaezu'] }
  ];
  /* 駅に紐づくスポット */
  var PINS = [
    { st: 'nagoya',   spotId: 'esca',        label: 'エスカ・土産' },
    { st: 'nagoya',   spotId: 'maruya-esca', label: 'ひつまぶし' },
    { st: 'shiyakusho', spotId: 'nagoyajo',  label: '名古屋城' },
    { st: 'sakae',    spotId: 'kanou',       label: '味処 叶' },
    { st: 'sakae',    spotId: 'gomitori',    label: '伍味酉' },
    { st: 'yabacho',  spotId: 'pokecen',     label: 'ポケセン' },
    { st: 'uemaezu',  spotId: 'osu',         label: '大須商店街' },
    { st: 'jingu',    spotId: 'atsuta',      label: '熱田神宮' },
    { st: 'ozone',    spotId: 'tokugawa',    label: '徳川美術館' }
  ];

  function svgEl(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  NT.buildSubwayMap = function (opts) {
    opts = opts || {};
    var svg = svgEl('svg', {
      viewBox: '0 0 430 470', class: 'submap',
      role: 'img', 'aria-label': '名古屋の地下鉄と行き先の位置関係'
    });

    LINES.forEach(function (ln) {
      var pts = ln.path.map(function (k) { return ST[k].x + ',' + ST[k].y; }).join(' ');
      svg.appendChild(svgEl('polyline', {
        points: pts, fill: 'none', stroke: ln.color, 'stroke-width': '7',
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '.85'
      }));
    });

    Object.keys(ST).forEach(function (k) {
      var s = ST[k];
      svg.appendChild(svgEl('circle', { cx: s.x, cy: s.y, r: '6',
        fill: 'var(--bg)', stroke: 'var(--fg)', 'stroke-width': '2' }));
      var t = svgEl('text', { x: s.x - 11, y: s.y + 4, 'text-anchor': 'end',
        'font-size': '11', fill: 'var(--fg)' });
      t.textContent = s.label;
      svg.appendChild(t);
    });

    /* 駅の右側にスポットのピンを積む */
    var used = {};
    PINS.forEach(function (p) {
      var s = ST[p.st];
      used[p.st] = (used[p.st] || 0) + 1;
      var y = s.y + (used[p.st] - 1) * 17 - 6;
      var g = svgEl('g', { class: 'pin', tabindex: '0', role: 'link',
        'aria-label': p.label + 'へ' });
      g.appendChild(svgEl('rect', { x: s.x + 13, y: y - 1, width: '104', height: '15',
        rx: '2', fill: 'var(--card)', stroke: 'var(--kin)', 'stroke-width': '1' }));
      var t = svgEl('text', { x: s.x + 18, y: y + 10.5, 'font-size': '10.5', fill: 'var(--fg)' });
      t.textContent = '◆ ' + p.label;
      g.appendChild(t);
      function go() {
        if (opts.onPick) opts.onPick(p.spotId);
        else location.href = 'spots.html#spot-' + p.spotId;
      }
      g.addEventListener('click', go);
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
      svg.appendChild(g);
    });

    var legend = NT.el('div', { class: 'submap-legend' }, LINES.filter(function (l) {
      return l.name.indexOf('(') < 0;
    }).map(function (l) {
      return NT.el('span', { class: 'lg' }, [
        NT.el('i', { style: 'background:' + l.color }), l.name
      ]);
    }));

    var wrap = NT.el('div', { class: 'submap-wrap' }, [svg, legend,
      NT.el('p', { class: 'notice',
        text: '路線図としての位置関係を示す模式図です。距離と方角は正確ではありません。' })]);
    return wrap;
  };
})(window);
```

- [ ] **Step 2: 行程ページに折りたたみで差し込む**

`assets/itinerary.js` の末尾に追記する。

```js
(function (w) {
  var NT = w.NT;
  NT.afterRender.push(function () {
    if (!NT.buildSubwayMap) return;
    var root = NT.$('#itinerary-root');
    var det = NT.el('details', { class: 'map-det' }, [
      NT.el('summary', { text: '地下鉄と行き先の位置関係' }),
      NT.buildSubwayMap({})
    ]);
    root.appendChild(NT.el('section', { class: 'tight' }, [det]));
  });
})(window);
```

- [ ] **Step 3: 実用メモページに節を足す**

`assets/tipspage.js` の `NT.tipsSections.push(...)` に1件足す。

```js
    { no: '05', title: '地下鉄マップ', build: function () { return NT.buildSubwayMap({}); } }
```

- [ ] **Step 4: `assets/style.css` に追記**

```css
.submap-wrap{background:var(--card);border:1px solid var(--rule);border-radius:3px;
  padding:12px;overflow-x:auto}
.submap{width:100%;min-width:430px;height:auto;display:block}
.submap .pin{cursor:pointer}
.submap .pin:hover rect,.submap .pin:focus rect{fill:var(--kin);stroke:var(--kin)}
.submap .pin:focus{outline:2px solid var(--accent);outline-offset:2px}
.submap-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:9px;font-size:11.5px;color:var(--gray)}
.submap-legend .lg{display:flex;align-items:center;gap:5px}
.submap-legend i{width:14px;height:4px;border-radius:2px;display:inline-block}
.map-det summary{cursor:pointer;font-size:13.5px;padding:11px 0;color:var(--accent);font-weight:500}
```

`.submap` に `min-width:430px` を置き、親を `overflow-x:auto` にする。
幅375pxの端末では**マップだけが横スクロール**し、ページ本体は動かない。

- [ ] **Step 5: HTML に読ませる**

`index.html`（`itinerary.js` より**前**に読む。`itinerary.js` の追記部分が
`NT.buildSubwayMap` を参照するため）:

```html
<script src="assets/subwaymap.js"></script>
<script src="assets/itinerary.js"></script>
<script src="assets/recovery.js"></script>
<script src="assets/situation.js"></script>
```

`tips.html`（`tipspage.js` より前）:

```html
<script src="assets/subwaymap.js"></script>
<script src="assets/tipspage.js"></script>
<script src="assets/omiyage.js"></script>
```

- [ ] **Step 6: 手動確認**

1. 行程ページ末尾に「地下鉄と行き先の位置関係」の折りたたみがあり、開くとSVGが出る
2. 東山線が黄、名城線が紫、桜通線が赤、鶴舞線が緑で描かれ、凡例が4本出る
3. 駅名11個と、金枠のピン9個（エスカ・土産／ひつまぶし／名古屋城／味処 叶／伍味酉／
   ポケセン／大須商店街／熱田神宮／徳川美術館）が出る
4. 名古屋駅と栄の2枚のピンが重ならず縦に積まれている
5. ピンを押すと該当スポットのカードへ遷移する
6. Tab キーでピンにフォーカスが移り、Enter で遷移する
7. 実用メモページに `05 地下鉄マップ` の節がある
8. 幅375pxでマップだけが横スクロールし、ページ本体は横に動かない
9. 夜モードで駅名と背景のコントラストが保たれる（`var(--fg)` / `var(--bg)` を使っているため）
10. 機内モードでもマップが表示される（外部通信を一切しない）

- [ ] **Step 7: コミット**

```bash
git add assets/subwaymap.js assets/itinerary.js assets/tipspage.js assets/style.css index.html tips.html
git commit -m "feat: 自前SVGの地下鉄マップを追加

地理的な正確さは捨て、路線図としての位置関係を優先した模式図にする。
色は CSS 変数を参照するので夜モードでも読める。外部通信をしないため
地下街で圏外でも開く。模式図であることは画面に明記した。"
```

---

### Task 14: 名古屋豆知識ガチャ

**Files:**
- Create: `data/trivia.data.js`
- Create: `assets/triviagacha.js`
- Modify: `spots.html`（節として足す）
- Modify: `assets/spotlist.js`（描画の先頭にガチャを差し込む）
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: `NT.el`, `NT.get`, `NT.set`, `NT.spotById`
- Produces:
  - `NT.trivia -> [{id, text, tag, spotId?}]` — 40枚
  - `NT.drawn() -> string[]` — `nt:trivia` の引いた id 配列
  - `NT.drawTrivia() -> card|null` — 未引きから1枚を無作為に返し記録する。全部引き切ったら null
  - `NT.resetTrivia() -> void`
  - `NT.buildGacha() -> HTMLElement`

- [ ] **Step 1: `data/trivia.data.js` を書く**

```js
(function (w) {
  var NT = (w.NT = w.NT || {});
  NT.trivia = [
    { id:'t01', tag:'食', spotId:'maruya-esca',
      text:'ひつまぶしの「まぶし」は、おひつの飯に鰻をまぶすことから。' +
           '大人数の宴会で丼が割れるのを避けて櫃で出したのが始まりという説が残る' },
    { id:'t02', tag:'食', spotId:'kanou',
      text:'味噌カツの元祖には二系統ある。叶は揚げたカツを味噌で煮込む型、' +
           '矢場とんは味噌だれをかける型。同じ名前で作りが違う' },
    /* …以降38枚… */
  ];
})(window);
```

40枚の内訳。`tag` は `食` / `歴史` / `街` / `言葉` の4種。既に `spots.data.js` と
`foods.data.js` に書いた豆知識と**重複させない**。ガチャは読み物なので、
一枚で意味が閉じる長さ（60〜120字）に揃える。

| tag | 枚数 | 書く題材 |
|---|---|---|
| 食 | 14 | 味噌カツの二系統／台湾ラーメンは台湾に無い／手羽先の元祖争い（風来坊と山ちゃん）／味噌煮込みうどんの芯は仕様／きしめんの平打ちの理由／あんかけスパの極太麺／どて煮の「どて」の語源／天むすの発祥は津市／小倉トーストと満つ葉／鬼まんじゅうは戦中の代用食／モーニング文化と繊維業／えびふりゃーはタモリ由来の逆輸入／八丁味噌の「八丁」は岡崎八丁村／名古屋コーチンは海部兄弟の交配 |
| 歴史 | 12 | 熱田神宮の草薙剣／信長塀は桶狭間の戦勝奉納／名古屋城の金鯱は北が雌で南が雄／天守は耐震のため内部非公開／大須観音は家康が岐阜から移築／清洲越しで町がまるごと移った／尾張徳川家の大名道具1万点／源氏物語絵巻は原本非公開／名古屋城の石垣に刻まれた大名の刻印／碁盤割の町割り／熱田は東海道の宮の宿／徳川宗春の規制緩和で栄えた |
| 街 | 9 | 名城線は日本初の地下鉄環状運転／栄のセントラルパーク地下街／エスカは新幹線口直結／大須は全蓋アーケード／オアシス21の水の宇宙船／名古屋駅の高島屋とゲートタワー／久屋大通の100m道路は戦後復興／地下街の数が全国有数／市バスと地下鉄のドニチエコきっぷ |
| 言葉 | 5 | 「机をつる」は机を運ぶ／「ときんときん」は先が尖った／「えらい」は疲れた／「まわし」は準備／語尾の「〜だでね」 |

- [ ] **Step 2: `assets/triviagacha.js` を書く**

```js
(function (w) {
  var NT = w.NT;

  NT.drawn = function () { return NT.get('trivia', []); };
  NT.resetTrivia = function () { localStorage.removeItem('nt:trivia'); };
  NT.drawTrivia = function () {
    var got = NT.drawn();
    var rest = NT.trivia.filter(function (t) { return got.indexOf(t.id) < 0; });
    if (!rest.length) return null;
    var pick = rest[Math.floor(Math.random() * rest.length)];
    NT.set('trivia', got.concat([pick.id]));
    return pick;
  };

  function cardEl(t, n, total) {
    var s = t.spotId && NT.spotById(t.spotId);
    return NT.el('div', { class: 'gacha-card' }, [
      NT.el('div', { class: 'gacha-no mono', text: 'TRIVIA ' + ('0' + n).slice(-2) + ' / ' + total }),
      NT.el('span', { class: 'badge shade', text: t.tag }),
      NT.el('p', { class: 'gacha-text', text: t.text }),
      s ? NT.el('a', { href: '#spot-' + s.id, text: '→ ' + s.name } ) : null
    ]);
  }

  NT.buildGacha = function () {
    var total = NT.trivia.length;
    var slot = NT.el('div', { class: 'gacha-slot' });
    var host = NT.el('div', { class: 'card gacha' }, [
      NT.el('h3', { text: '名古屋豆知識ガチャ' }),
      NT.el('p', { class: 'notice',
        text: '移動中に1枚ずつ引けます。引いた枚数は端末に残ります。' }),
      slot
    ]);

    function refresh(justDrawn) {
      slot.textContent = '';
      var got = NT.drawn();
      if (justDrawn) slot.appendChild(cardEl(justDrawn, got.length, total));
      slot.appendChild(NT.el('div', { class: 'btnrow' }, [
        NT.el('button', { class: 'btn on', type: 'button',
          text: got.length >= total ? 'コンプリート' : (got.length ? 'もう1枚引く' : '1枚引く'),
          disabled: got.length >= total ? true : null,
          onclick: function () {
            var t = NT.drawTrivia();
            if (t) refresh(t);
          } }),
        got.length ? NT.el('button', { class: 'btn', type: 'button', text: '引いた分を見返す',
          onclick: function () { showAll(); } }) : null,
        got.length ? NT.el('button', { class: 'btn', type: 'button', text: 'リセット',
          onclick: function () { NT.resetTrivia(); refresh(null); } }) : null
      ]));
      slot.appendChild(NT.el('div', { class: 'gacha-bar' }, [
        NT.el('div', { class: 'gacha-fill',
          style: 'width:' + Math.round(got.length / total * 100) + '%' })
      ]));
      slot.appendChild(NT.el('p', { class: 'notice', text: got.length + ' / ' + total + ' 枚' }));
    }

    function showAll() {
      var got = NT.drawn();
      var list = NT.trivia.filter(function (t) { return got.indexOf(t.id) >= 0; });
      slot.textContent = '';
      list.forEach(function (t, i) { slot.appendChild(cardEl(t, i + 1, total)); });
      slot.appendChild(NT.el('div', { class: 'btnrow' }, [
        NT.el('button', { class: 'btn on', type: 'button', text: 'ガチャに戻る',
          onclick: function () { refresh(null); } })
      ]));
    }

    refresh(null);
    return host;
  };
})(window);
```

- [ ] **Step 3: `assets/spotlist.js` の `renderSpots` の先頭に差し込む**

`root.textContent = '';` の直後に足す。

```js
    if (NT.buildGacha) {
      root.appendChild(NT.el('section', {}, [
        NT.el('div', { class: 'sec-head' }, [
          NT.el('span', { class: 'no', text: '00' }), NT.el('h2', { text: '豆知識' })
        ]),
        NT.buildGacha()
      ]));
    }
```

- [ ] **Step 4: `assets/style.css` に追記**

```css
.gacha-card{border:1px solid var(--kin);border-radius:3px;padding:14px 15px;
  background:linear-gradient(160deg,rgba(199,154,60,.14),rgba(199,154,60,0));margin-bottom:11px}
.gacha-no{font-size:10.5px;letter-spacing:.2em;color:var(--gray);margin-bottom:6px}
.gacha-text{margin:7px 0 0;font-size:13.5px;line-height:1.8}
.gacha-bar{height:5px;background:var(--rule);border-radius:3px;overflow:hidden;margin-top:4px}
.gacha-fill{height:100%;background:var(--kin);transition:width .3s ease}
@media (prefers-reduced-motion:reduce){.gacha-fill{transition:none}}
```

- [ ] **Step 5: `spots.html` に読ませる**

```html
<script src="data/spots.data.js"></script>
<script src="data/trivia.data.js"></script>
<script src="assets/triviagacha.js"></script>
<script src="assets/spotlist.js"></script>
<script>NT.mountNav('spots.html'); NT.renderSpots();</script>
```

- [ ] **Step 6: 手動確認**

1. 名所ページの先頭に `00 豆知識` の節と「1枚引く」ボタン、`0 / 40 枚` が出る
2. 「1枚引く」で金枠のカードが出て `TRIVIA 01 / 40`、タグ、本文が表示される
3. 進捗バーが伸び、ボタンが「もう1枚引く」に変わる
4. 引き続けても**同じカードが二度出ない**
5. 40枚引き切るとボタンが `コンプリート` になり押せなくなる
6. 「引いた分を見返す」で引いた全カードが並び、「ガチャに戻る」で戻る
7. `spotId` があるカードの `→ 熱田神宮` を押すと同ページの該当カードへ飛ぶ
8. リロードしても引いた枚数が残る。「リセット」で 0 に戻る
9. コンソールで検算する

```js
NT.trivia.length                                   // → 40
new Set(NT.trivia.map(t => t.id)).size             // → 40
NT.trivia.filter(t => t.spotId && !NT.spotById(t.spotId))   // → []
new Set(NT.trivia.map(t => t.tag))                 // → Set {'食','歴史','街','言葉'}
NT.trivia.filter(t => t.text.length < 40 || t.text.length > 140)   // → []
/* 引き切ると null を返す */
NT.resetTrivia(); var n = 0; while (NT.drawTrivia()) n++; n   // → 40
NT.drawTrivia()                                    // → null
NT.resetTrivia();
```

- [ ] **Step 7: コミット**

```bash
git add data/trivia.data.js assets/triviagacha.js assets/spotlist.js assets/style.css spots.html
git commit -m "feat: 名古屋豆知識ガチャを追加

未引きの集合から選ぶので同じカードが二度出ない。40枚は
spots と foods に書いた豆知識と重複させず、一枚で意味が閉じる長さに揃えた。"
```

---

### Task 15: QRコード生成

**Files:**
- Create: `assets/qr.js`
- Modify: `assets/tipspage.js`（節 `06` を足す）
- Modify: `tips.html`
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: なし（`NT.el` のみ）
- Produces:
  - `NT.qrMatrix(text) -> boolean[][] | null` — 暗モジュールが `true` の正方行列。
    収まらなければ `null`
  - `NT.qrCanvas(text, px) -> HTMLCanvasElement | null` — `px` は1モジュールの辺（既定8）
  - 対応範囲: 誤り訂正レベル **L**、8bitバイトモード、**バージョン1〜5**。
    バージョン5-Lまで誤り訂正ブロックが1つなので、ブロック分割とインターリーブが要らない。
    上限は約106バイト

- [ ] **Step 1: `assets/qr.js` を書く**

```js
/* QRコード（バージョン1-5、誤り訂正L、バイトモード）の自前実装。
   v5-L までブロックが1つなので、インターリーブを実装せずに済む。 */
(function (w) {
  var NT = (w.NT = w.NT || {});

  /* [データ語数, 誤り訂正語数] を version 1..5 で */
  var CAP = { 1: [19, 7], 2: [34, 10], 3: [55, 15], 4: [80, 20], 5: [108, 26] };
  var ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30] };

  /* ---- GF(256) ---- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1; if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function rsGenerator(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var ng = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j++) {
        ng[j] ^= gmul(g[j], EXP[i]);
        ng[j + 1] ^= g[j];
      }
      g = ng;
    }
    return g;
  }
  function rsEncode(data, ecLen) {
    var g = rsGenerator(ecLen), res = data.concat(new Array(ecLen).fill(0));
    for (var i = 0; i < data.length; i++) {
      var c = res[i];
      if (!c) continue;
      for (var j = 0; j < g.length; j++) res[i + j] ^= gmul(g[j], c);
    }
    return res.slice(data.length);
  }

  /* ---- ビット列 ---- */
  function Bits() { this.a = []; }
  Bits.prototype.put = function (val, len) {
    for (var i = len - 1; i >= 0; i--) this.a.push((val >>> i) & 1);
  };

  function encodeData(bytes, version) {
    var cap = CAP[version][0], bits = new Bits();
    bits.put(4, 4);                 /* バイトモード */
    bits.put(bytes.length, 8);      /* v1-9 は文字数8ビット */
    for (var i = 0; i < bytes.length; i++) bits.put(bytes[i], 8);
    var max = cap * 8;
    bits.put(0, Math.min(4, max - bits.a.length));           /* 終端 */
    while (bits.a.length % 8) bits.a.push(0);                /* バイト境界へ */
    var cw = [];
    for (var k = 0; k < bits.a.length; k += 8) {
      var v = 0;
      for (var b = 0; b < 8; b++) v = (v << 1) | bits.a[k + b];
      cw.push(v);
    }
    var pad = [0xEC, 0x11], p = 0;
    while (cw.length < cap) cw.push(pad[p++ % 2]);           /* 埋め草 */
    return cw;
  }

  /* ---- 配置 ---- */
  function newMatrix(size) {
    var m = [], r = [];
    for (var i = 0; i < size; i++) {
      m.push(new Array(size).fill(null));
      r.push(new Array(size).fill(false));  /* 機能パターンか */
    }
    return { m: m, fn: r, size: size };
  }
  function setFinder(M, x, y) {
    for (var dy = -1; dy <= 7; dy++) for (var dx = -1; dx <= 7; dx++) {
      var px = x + dx, py = y + dy;
      if (px < 0 || py < 0 || px >= M.size || py >= M.size) continue;
      var on = (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) ||
               (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6)) ||
               (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      M.m[py][px] = on; M.fn[py][px] = true;
    }
  }
  function setAlign(M, cx, cy) {
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
      M.m[cy + dy][cx + dx] = (Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      M.fn[cy + dy][cx + dx] = true;
    }
  }
  function setFunctions(M, version) {
    setFinder(M, 0, 0); setFinder(M, M.size - 7, 0); setFinder(M, 0, M.size - 7);
    var a = ALIGN[version];
    for (var i = 0; i < a.length; i++) for (var j = 0; j < a.length; j++) {
      var cx = a[j], cy = a[i];
      if (M.fn[cy][cx]) continue;   /* 位置検出と重なる隅は置かない */
      setAlign(M, cx, cy);
    }
    for (var k = 8; k < M.size - 8; k++) {   /* タイミング */
      M.m[6][k] = (k % 2 === 0); M.fn[6][k] = true;
      M.m[k][6] = (k % 2 === 0); M.fn[k][6] = true;
    }
    M.m[M.size - 8][8] = true; M.fn[M.size - 8][8] = true;  /* 常時暗モジュール */
    /* 形式情報の領域を予約 */
    for (var f = 0; f < 9; f++) {
      if (!M.fn[8][f]) { M.fn[8][f] = true; M.m[8][f] = false; }
      if (!M.fn[f][8]) { M.fn[f][8] = true; M.m[f][8] = false; }
    }
    for (var g2 = 0; g2 < 8; g2++) {
      if (!M.fn[8][M.size - 1 - g2]) { M.fn[8][M.size - 1 - g2] = true; M.m[8][M.size - 1 - g2] = false; }
      if (!M.fn[M.size - 1 - g2][8]) { M.fn[M.size - 1 - g2][8] = true; M.m[M.size - 1 - g2][8] = false; }
    }
  }

  function placeData(M, cw) {
    var bits = [];
    cw.forEach(function (b) { for (var i = 7; i >= 0; i--) bits.push((b >> i) & 1); });
    var idx = 0, up = true;
    for (var right = M.size - 1; right > 0; right -= 2) {
      if (right === 6) right = 5;   /* 縦のタイミングパターンを飛ばす */
      for (var v = 0; v < M.size; v++) {
        var y = up ? M.size - 1 - v : v;
        for (var c = 0; c < 2; c++) {
          var x = right - c;
          if (M.fn[y][x]) continue;
          M.m[y][x] = idx < bits.length ? !!bits[idx] : false;
          idx++;
        }
      }
      up = !up;
    }
  }

  var MASKS = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x, y) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; },
    function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; },
    function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; },
    function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }
  ];

  function applyMask(M, n) {
    var out = M.m.map(function (r) { return r.slice(); });
    for (var y = 0; y < M.size; y++) for (var x = 0; x < M.size; x++) {
      if (!M.fn[y][x] && MASKS[n](x, y)) out[y][x] = !out[y][x];
    }
    return out;
  }

  /* 形式情報。ECC L = 01 */
  function formatBits(mask) {
    var data = (0x01 << 3) | mask, v = data << 10;
    for (var i = 4; i >= 0; i--) if (v & (1 << (i + 10))) v ^= 0x537 << i;
    return ((data << 10) | v) ^ 0x5412;
  }
  function setFormat(grid, size, mask) {
    var f = formatBits(mask);
    for (var i = 0; i < 15; i++) {
      var bit = ((f >> i) & 1) === 1;
      if (i < 6) grid[i][8] = bit;
      else if (i < 8) grid[i + 1][8] = bit;
      else if (i === 8) grid[8][7] = bit;
      else grid[8][14 - i] = bit;

      if (i < 8) grid[8][size - 1 - i] = bit;
      else grid[size - 15 + i][8] = bit;
    }
    grid[size - 8][8] = true;
  }

  /* 罰点。規格の4条件のうち、実用上効く1・3・4を評価する */
  function penalty(grid, size) {
    var p = 0, dark = 0, y, x, run, last;
    for (y = 0; y < size; y++) {
      run = 1; last = grid[y][0];
      for (x = 1; x < size; x++) {
        if (grid[y][x] === last) { run++; } else { if (run >= 5) p += 3 + (run - 5); run = 1; last = grid[y][x]; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
    for (x = 0; x < size; x++) {
      run = 1; last = grid[0][x];
      for (y = 1; y < size; y++) {
        if (grid[y][x] === last) { run++; } else { if (run >= 5) p += 3 + (run - 5); run = 1; last = grid[y][x]; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
    for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
      var a = grid[y][x];
      if (a === grid[y][x + 1] && a === grid[y + 1][x] && a === grid[y + 1][x + 1]) p += 3;
    }
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (grid[y][x]) dark++;
    p += Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5) * 10;
    return p;
  }

  NT.qrMatrix = function (text) {
    var bytes = [], enc = new TextEncoder().encode(text);
    for (var i = 0; i < enc.length; i++) bytes.push(enc[i]);

    var version = 0;
    for (var v = 1; v <= 5; v++) {
      if (bytes.length + 2 <= CAP[v][0]) { version = v; break; }   /* +2 はモードと文字数 */
    }
    if (!version) return null;

    var size = 17 + version * 4;
    var data = encodeData(bytes, version);
    var ec = rsEncode(data, CAP[version][1]);
    var all = data.concat(ec);

    var M = newMatrix(size);
    setFunctions(M, version);
    placeData(M, all);

    var best = null, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      var g = applyMask(M, m);
      setFormat(g, size, m);
      var s = penalty(g, size);
      if (s < bestScore) { bestScore = s; best = g; }
    }
    return best;
  };

  NT.qrCanvas = function (text, px) {
    px = px || 8;
    var g = NT.qrMatrix(text);
    if (!g) return null;
    var q = 4, size = g.length, dim = (size + q * 2) * px;
    var cv = document.createElement('canvas');
    cv.width = cv.height = dim;
    cv.style.width = cv.style.height = Math.min(dim, 260) + 'px';
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = '#000';
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      if (g[y][x]) ctx.fillRect((x + q) * px, (y + q) * px, px, px);
    }
    return cv;
  };
})(window);
```

QRは常に白地に黒で描く。夜モードでも読み取り機が反転を扱えない場合があるため、
テーマに追従させない。

- [ ] **Step 2: `assets/tipspage.js` に節を足す**

`NT.tipsSections.push(...)` に1件足す。

```js
    { no: '06', title: '同行者に渡す', build: function () {
      var url = location.href.replace(/[^/]*$/, '').replace(/\/$/, '') + '/index.html';
      var cv = NT.qrCanvas ? NT.qrCanvas(url, 6) : null;
      return NT.el('div', { class: 'card qr-card' }, [
        NT.el('h3', { text: 'このサイトのQRコード' }),
        cv || NT.el('p', { class: 'notice warn',
          text: 'URLが長すぎてQRにできませんでした。下のアドレスを直接渡してください。' }),
        NT.el('p', { class: 'qr-url mono', text: url }),
        NT.el('p', { class: 'notice',
          text: 'ホーム画面に追加しておくと、地下街で電波が弱くても開けます。' })
      ]);
    } }
```

`file://` で開くと URL がローカルパスになるため、QRの中身も `file:///…` になる。
これは仕様どおりで、GitHub Pages 上で開いたときに正しい公開URLが入る。

- [ ] **Step 3: `assets/style.css` に追記**

```css
.qr-card canvas{display:block;margin:11px auto 0;border:1px solid var(--rule);background:#fff}
.qr-url{font-size:11px;color:var(--gray);word-break:break-all;text-align:center;margin:9px 0 0}
```

- [ ] **Step 4: `tips.html` に読ませる**

```html
<script src="assets/subwaymap.js"></script>
<script src="assets/qr.js"></script>
<script src="assets/tipspage.js"></script>
<script src="assets/omiyage.js"></script>
```

- [ ] **Step 5: 手動確認**

1. 実用メモページに `06 同行者に渡す` の節が出て、白地に黒のQRが描かれる
2. QRの下にURLが表示される
3. **実機のカメラでQRを読み取り、表示されたURLが下のテキストと一致する**。これが本番の確認
4. 夜モードにしてもQRは白地に黒のまま（反転しない）
5. コンソールで検算する

```js
/* 正方形で、サイズが 17+4v になる */
var m = NT.qrMatrix('https://example.github.io/NagoyaTabi/index.html');
m.length                                  // → 33（version 4）または近い値
m.every(r => r.length === m.length)        // → true
/* 位置検出パターンの中心が暗い */
m[3][3] && m[3][m.length-4] && m[m.length-4][3]   // → true
/* タイミングパターンが交互 */
m[6][8] !== m[6][9]                        // → true
/* 短い文字列は version 1（21×21） */
NT.qrMatrix('abc').length                  // → 21
/* 上限を超えると null */
NT.qrMatrix('a'.repeat(200))               // → null
```

3 の実機読み取りが通らない場合、マスク選択か形式情報を疑う。`setFormat` の
ビット配置と `formatBits` の生成多項式 `0x537` とマスク `0x5412` を最初に確認する。

- [ ] **Step 6: コミット**

```bash
git add assets/qr.js assets/tipspage.js assets/style.css tips.html
git commit -m "feat: QRコード生成を自前実装で追加

外部ライブラリを持ち込まないため自前で書く。バージョン1-5・誤り訂正L に
限ると誤り訂正ブロックが1つで済み、インターリーブが不要になる。
上限106バイトで、サイトURLに対して十分な余裕がある。
QRは夜モードでも反転させない。読み取り機が反転を扱えないことがあるため。"
```

---

### Task 16: 旅サマリー画像

**Files:**
- Create: `assets/summary.js`
- Modify: `assets/tipspage.js`（節 `07` を足す）
- Modify: `tips.html`
- Modify: `assets/style.css`（追記）

**Interfaces:**
- Consumes: `NT.checks`, `NT.get`, `NT.foods`, `NT.spots`, `NT.currentPlan`, `NT.now`
- Produces:
  - `NT.summaryData() -> { foods:[{name, memo, at}], spots:[{name, at}], plan:string, counts }`
  - `NT.summaryCanvas() -> HTMLCanvasElement` — 縦長（720×可変）の画像
  - 節は**旅程終了後（8/12 の 14:49 以降）にのみ**出す。旅の最中に出しても使い道がないため

- [ ] **Step 1: `assets/summary.js` を書く**

```js
(function (w) {
  var NT = w.NT;

  NT.summaryData = function () {
    var c = NT.checks ? NT.checks() : {};
    var v = NT.get('visited', {});
    return {
      plan: NT.currentPlan().name,
      foods: NT.foods.filter(function (f) { return c[f.id] && c[f.id].done; })
        .map(function (f) { return { name: f.name, memo: (c[f.id].memo || ''), at: c[f.id].at }; }),
      spots: NT.spots.filter(function (s) { return v[s.id]; })
        .map(function (s) { return { name: s.name, at: v[s.id] }; }),
      counts: NT.progressCounts()
    };
  };

  NT.summaryCanvas = function () {
    var d = NT.summaryData();
    var W = 720, pad = 48, lh = 34;
    var rows = 9 + d.foods.length * (function () { return 1; })() + d.spots.length;
    d.foods.forEach(function (f) { if (f.memo) rows += 1; });
    var H = Math.max(900, pad * 2 + 210 + rows * lh);

    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d');

    g.fillStyle = '#EAEDE6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#0D2B28'; g.fillRect(0, 0, W, 150);
    g.fillStyle = '#C79A3C'; g.fillRect(0, 150, W, 5);

    g.fillStyle = '#E4C177'; g.font = '20px monospace';
    g.fillText('NAGOYA 2026.08.11 - 08.12', pad, 62);
    g.fillStyle = '#ffffff'; g.font = 'bold 40px serif';
    g.fillText('名古屋 王道、五食で組む。', pad, 112);

    var y = 150 + 60;
    g.fillStyle = '#6E7873'; g.font = '18px monospace';
    g.fillText(d.plan, pad, y); y += 44;

    g.fillStyle = '#1D5C55'; g.font = 'bold 28px serif';
    g.fillText('食べた名物  ' + d.counts.foodDone + ' / ' + d.counts.foodTotal, pad, y);
    y += 14; g.fillStyle = '#C6CDC5'; g.fillRect(pad, y, W - pad * 2, 1); y += 34;

    g.font = '24px sans-serif';
    if (!d.foods.length) {
      g.fillStyle = '#6E7873'; g.fillText('（記録なし）', pad, y); y += lh;
    }
    d.foods.forEach(function (f) {
      g.fillStyle = '#1E2523';
      g.fillText('◆ ' + f.name, pad, y); y += lh;
      if (f.memo) {
        g.fillStyle = '#6B3226'; g.font = '19px sans-serif';
        g.fillText('   「' + f.memo.slice(0, 26) + '」', pad, y);
        g.font = '24px sans-serif'; y += lh;
      }
    });

    y += 26;
    g.fillStyle = '#1D5C55'; g.font = 'bold 28px serif';
    g.fillText('回った名所  ' + d.spots.length + '箇所', pad, y);
    y += 14; g.fillStyle = '#C6CDC5'; g.fillRect(pad, y, W - pad * 2, 1); y += 34;
    g.font = '24px sans-serif'; g.fillStyle = '#1E2523';
    if (!d.spots.length) { g.fillStyle = '#6E7873'; g.fillText('（記録なし）', pad, y); y += lh; }
    d.spots.forEach(function (s) { g.fillText('◆ ' + s.name, pad, y); y += lh; });

    g.fillStyle = '#6E7873'; g.font = '17px monospace';
    g.fillText('generated ' + NT.now().toISOString().slice(0, 10), pad, H - 34);
    return cv;
  };

  /* 旅程が終わってからのみ節を出す */
  NT.tipsSections.push({ no: '07', title: '旅のまとめ', build: function () {
    var end = NT.parseHM('14:49', '2026-08-12');
    if (NT.now() < end) {
      return NT.el('div', { class: 'card' }, [
        NT.el('p', { class: 'notice',
          text: '旅が終わると、食べた名物と回った名所のまとめを画像で保存できるようになります。' +
                '（8/12 14:49 以降に表示されます）' })
      ]);
    }
    var host = NT.el('div', { class: 'card sum-card' }, [
      NT.el('p', { class: 'notice', text: '長押しか「画像を保存」で端末に残せます。' })
    ]);
    var cv = NT.summaryCanvas();
    host.appendChild(cv);
    host.appendChild(NT.el('button', { class: 'btn on', type: 'button', text: '画像を保存',
      onclick: function () {
        cv.toBlob(function (b) {
          if (!b) return;
          var a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = 'nagoya-2026-08.png';
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        }, 'image/png');
      } }));
    return host;
  } });
})(window);
```

サマリーは印刷物寄りの配色で描き、テーマに追従させない。保存して残す画像なので、
生成時のテーマで見た目が変わると後から見返したときに困る。

- [ ] **Step 2: `assets/style.css` に追記**

```css
.sum-card canvas{display:block;width:100%;max-width:360px;height:auto;margin:11px auto;
  border:1px solid var(--rule);border-radius:3px}
```

- [ ] **Step 3: `tips.html` に読ませる**

```html
<script src="assets/tipspage.js"></script>
<script src="assets/omiyage.js"></script>
<script src="assets/summary.js"></script>
```

`summary.js` は `NT.foods` と `NT.checks` と `NT.progressCounts` を使うので、
`tips.html` に `data/foods.data.js` と `assets/record.js` も読ませる必要がある。
`assets/core.js` の直後に足す。

```html
<script src="data/spots.data.js"></script>
<script src="data/foods.data.js"></script>
<script src="data/trip.data.js"></script>
<script src="data/transit.data.js"></script>
<script src="data/omiyage.data.js"></script>
<script src="assets/record.js"></script>
```

`record.js` は `NT.gourmetSections.push` を実行するが、`tips.html` には
`#gourmet-root` が無く `renderGourmet` も呼ばれないので副作用はない。

- [ ] **Step 4: 手動確認**

1. デモ時刻が旅程中（例 `8/11 15:24`）のとき、`07 旅のまとめ` の節は
   「8/12 14:49 以降に表示されます」の案内だけを出す
2. デモ時刻を `8/13 10:00 旅の後` にすると、縦長の画像が描かれる
3. 名物ページでいくつかチェックとメモを入れてから戻ると、画像にその名前とメモが載る
4. 名所ページで訪問済みにした場所が「回った名所」に載る
5. 記録が空のときは「（記録なし）」と出て、画像が壊れない
6. 「画像を保存」で `nagoya-2026-08.png` がダウンロードされ、開ける
7. 夜モードにしても画像の配色は変わらない
8. コンソールで確認する

```js
NT.setClock('2026-08-13T10:00:00');
var d = NT.summaryData();
d.plan                          // → 'プランA｜叶を8/11に'
d.counts.foodTotal              // → 20
NT.summaryCanvas().height >= 900   // → true
NT.setClock(null);
```

- [ ] **Step 5: コミット**

```bash
git add assets/summary.js assets/tipspage.js assets/style.css tips.html
git commit -m "feat: 旅サマリー画像の生成を追加

節は旅程終了後にだけ出す。旅の最中に出しても使い道がないため。
画像はテーマに追従させず印刷物寄りの配色で固定する。
保存して後から見返すものが、生成時のテーマで変わると困るため。"
```

---

### Task 17: スワイプでのページ送り

**Files:**
- Create: `assets/swipe.js`
- Modify: `index.html`、`spots.html`、`gourmet.html`、`tips.html`（全ページで読む）

**Interfaces:**
- Consumes: `NT.PAGES`
- Produces: `NT.initSwipe(currentFile) -> void`

夜モードは Task 1 で実装済みなので、ここではスワイプのみを足し、
夜モードは全コンポーネントで破綻していないかを確認する。

- [ ] **Step 1: `assets/swipe.js` を書く**

```js
(function (w) {
  var NT = w.NT;

  NT.initSwipe = function (currentFile) {
    var files = NT.PAGES.map(function (p) { return p.file; });
    var i = files.indexOf(currentFile);
    if (i < 0) return;
    var x0 = 0, y0 = 0, t0 = 0, tracking = false;

    document.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { tracking = false; return; }
      /* 入力欄・ボタン・横スクロールする箱の中では拾わない */
      if (e.target.closest('input,textarea,select,button,a,.table-scroll,.submap-wrap')) {
        tracking = false; return;
      }
      tracking = true;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - x0, dy = t.clientY - y0, dt = Date.now() - t0;
      /* 横が縦の2倍以上、40px超、素早い動きのときだけ発火。縦スクロールと競合させない */
      if (dt > 800) return;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 2) return;
      var next = dx < 0 ? i + 1 : i - 1;
      if (next < 0 || next >= files.length) return;
      location.href = files[next];
    }, { passive: true });
  };
})(window);
```

`e.target.closest` で入力欄や横スクロールする箱を除外する。
表と地下鉄マップの中で横に払ったときにページが飛ぶと、地図が読めなくなるため。

- [ ] **Step 2: 4ページすべてに読ませる**

各ページの末尾スクリプトを次の形にする（`index.html` の例）。

```html
<script src="assets/swipe.js"></script>
<script>
  NT.mountNav('index.html');
  NT.renderItinerary();
  NT.initSwipe('index.html');
</script>
```

他3ページも同様に、それぞれの `render*()` の後に `NT.initSwipe('<file>')` を呼ぶ。

- [ ] **Step 3: 手動確認**

開発者ツールのデバイスモードか実機で確認する。

1. 行程ページで左に払うと名所ページへ、名所ページで右に払うと行程ページへ戻る
2. 行程ページで右に払っても何も起きない（先頭のため）
3. 実用メモページで左に払っても何も起きない（末尾のため）
4. 縦にスクロールしてもページが切り替わらない
5. 斜めに払ったとき（横 < 縦×2）は切り替わらない
6. **営業時間の表を横スクロールしてもページが切り替わらない**
7. **地下鉄マップを横スクロールしてもページが切り替わらない**
8. メモ欄の中で払ってもページが切り替わらない
9. ゆっくり払った場合（800ms超）は切り替わらない

夜モードの通し確認:

10. 夜モードにして4ページを回り、次が読めることを確認する。
    金色の枠（今ここ・ガチャ）、味噌色のリカバリ箱、営業時間表の ○ × 要確認、
    リングの数字、地下鉄マップの駅名、入力欄の文字
11. QRとサマリー画像だけは白地のまま変わらない（意図どおり）

- [ ] **Step 4: コミット**

```bash
git add assets/swipe.js index.html spots.html gourmet.html tips.html
git commit -m "feat: スワイプでのページ送りを追加

横が縦の2倍かつ40px超かつ800ms以内のときだけ発火させ、縦スクロールと競合させない。
表と地下鉄マップと入力欄の中では拾わない。横スクロールできる箱の中で
ページが飛ぶと、その箱の内容が読めなくなるため。"
```

---

### Task 18: 印刷レイアウト

**Files:**
- Modify: `assets/style.css`（末尾に `@media print` を追記）

**Interfaces:**
- Consumes: 既存のクラス名
- Produces: なし（CSSのみ）

充電切れの保険として、行程ページと実用メモページをA4に収める。
操作するものは全て消す。紙の上では押せないため。

- [ ] **Step 1: `assets/style.css` の末尾に追記**

```css
@media print{
  /* 紙では操作できないものを消す */
  header[data-nav], .theme-toggle, .btnrow, .plan-switch-row, .sit,
  .now-jump, .clock-bar, .btn, .rec-box, .om-row .btn, .gacha, .qr-card,
  .sum-card, .map-det, .rec .btn, .btn.here, .btn.vis{ display:none !important; }

  /* 紙は白地。色は最小限に落とす */
  :root{ --bg:#fff; --card:#fff; --fg:#000; --gray:#555; --rule:#bbb;
         --head-bg:#fff; --head-fg:#000; --head-sub:#555; --shadow:none; }
  body{ font-size:10.5pt; line-height:1.55; background:#fff; color:#000; }
  .wrap{ max-width:none; padding:0; }
  section{ padding:10pt 0; break-inside:avoid; }
  .card, .day{ break-inside:avoid; box-shadow:none; border:1px solid #bbb; }
  .page-head{ padding:0 0 8pt; border-bottom:2pt solid #000; }
  .page-head h1{ font-size:18pt; color:#000; }
  .page-head .eyebrow, .page-head .sub{ color:#333; }
  .daybar{ background:#eee !important; color:#000 !important; border-bottom:1px solid #bbb; }
  thead th{ background:#eee !important; color:#000 !important; }
  footer{ background:none; color:#333; border-top:1px solid #bbb; }

  /* 画面では横スクロールする箱を、紙では全部出す */
  .table-scroll{ overflow:visible; border:none; }
  table{ min-width:0; font-size:9pt; }
  th,td{ padding:4pt 6pt; }

  /* 行程は詰める */
  .tl{ padding:8pt 10pt; }
  .tl-item{ padding-bottom:7pt; break-inside:avoid; }
  .tl-note{ font-size:9pt; }
  .now-bar{ border:1px solid #000; background:#fff !important; color:#000 !important; }
  .now-title{ color:#000; }
  .rec{ border:1px solid #000; }

  /* リンクの下線は残すがURLは展開しない。行程の可読性を優先する */
  a{ color:#000; text-decoration:underline; }

  @page{ size:A4; margin:12mm; }
}
```

- [ ] **Step 2: 手動確認**

1. `index.html` で印刷プレビューを開く。ナビ・テーマトグル・プラン切替・状況切替・
   「今ここ」ボタン・デモ時刻セレクタ・地下鉄マップの折りたたみが**すべて消えている**
2. 行程の2日分が読める。A4で2ページ以内に収まる
3. `tips.html` の印刷プレビューで、営業時間の表が**横に切れず全列出る**
   （画面では横スクロールする表が、紙では全部出る）
4. ガチャ・QR・サマリー・土産の操作ボタンが消えている
5. 移動早見表が読める
6. `spots.html` と `gourmet.html` も印刷でき、内容が欠けない
7. 夜モードで印刷しても白地に黒で出る（`@media print` の `:root` が上書きするため）

- [ ] **Step 3: コミット**

```bash
git add assets/style.css
git commit -m "feat: 印刷レイアウトを追加

充電切れの保険として行程と営業時間表を紙に落とせるようにする。
操作するものは紙の上では押せないので全て消す。
画面で横スクロールする表は、紙では全列を展開する。
夜モードで印刷しても白地に黒になるよう :root を上書きする。"
```

---

### Task 19: PWA（ホーム画面に追加とオフライン）

**Files:**
- Create: `manifest.webmanifest`
- Create: `sw.js`
- Create: `assets/icon.svg`
- Modify: 4ページすべて（Service Worker の登録を足す）

**Interfaces:**
- Consumes: なし
- Produces: `sw.js` が全ファイルを precache し cache-first で応答する

- [ ] **Step 1: `assets/icon.svg` を作る**

金鯱を模した単純な図形にする。ラスタ画像を持たずに済ませるため SVG にする。

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0D2B28"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="#C79A3C" stroke-width="10"/>
  <text x="256" y="310" text-anchor="middle" font-size="190" font-weight="700"
        font-family="serif" fill="#C79A3C">鯱</text>
</svg>
```

- [ ] **Step 2: `manifest.webmanifest` を作る**

```json
{
  "name": "名古屋 王道 2026.8.11-12",
  "short_name": "名古屋旅",
  "start_url": "index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#EAEDE6",
  "theme_color": "#0D2B28",
  "lang": "ja",
  "icons": [
    { "src": "assets/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
```

`start_url` と `scope` を相対にする。`https://<user>.github.io/NagoyaTabi/` の
サブディレクトリ配信で、ルート相対だとスコープが外れるため。

- [ ] **Step 3: `sw.js` を作る**

```js
/* 一覧は手で並べる。ビルドがないため自動生成しない。
   ファイルを足したら PRECACHE と VERSION の両方を更新すること。 */
var VERSION = 'nt-v1';
var PRECACHE = [
  './',
  'index.html', 'spots.html', 'gourmet.html', 'tips.html',
  'manifest.webmanifest',
  'assets/style.css',
  'assets/core.js',
  'assets/itinerary.js',
  'assets/recovery.js',
  'assets/situation.js',
  'assets/spotlist.js',
  'assets/gourmetlist.js',
  'assets/record.js',
  'assets/tipspage.js',
  'assets/omiyage.js',
  'assets/subwaymap.js',
  'assets/triviagacha.js',
  'assets/qr.js',
  'assets/summary.js',
  'assets/swipe.js',
  'assets/icon.svg',
  'data/spots.data.js',
  'data/foods.data.js',
  'data/trip.data.js',
  'data/transit.data.js',
  'data/trivia.data.js',
  'data/omiyage.data.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   /* 外部は素通し。そもそも使っていない */
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        /* オフラインで未キャッシュのものを求められたら、行程ページに落とす */
        return caches.match('index.html');
      });
    })
  );
});
```

- [ ] **Step 4: 4ページに Service Worker の登録を足す**

各ページの末尾スクリプトに追記する。

```html
<script>
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
</script>
```

`location.protocol` を見て `file://` では登録しない。`file://` では Service Worker が
動かず、握り潰さないとコンソールにエラーが出るため。

- [ ] **Step 5: 手動確認**

`file://` では Service Worker が動かないので、ローカルサーバを立てて確認する。

```bash
python3 -m http.server 8765
```

`http://localhost:8765/index.html` を開いて確認する。

1. 開発者ツールの Application → Service Workers に `sw.js` が activated で出る
2. Application → Cache Storage に `nt-v1` があり、26個のファイルが入っている
3. 開発者ツールの Network で **Offline** にしてリロードする。行程ページが開く
4. オフラインのまま名所・名物・メモの4ページすべてに移動できる
5. オフラインのまま地下鉄マップ・ガチャ・QRが動く
6. Application → Manifest に「名古屋 王道 2026.8.11-12」とアイコンが出て、
   `start_url` と `scope` の警告が出ない
7. `file://` で `index.html` を開くとコンソールに Service Worker のエラーが出ない
8. **実機のスマートフォンでホーム画面に追加し、機内モードで開けることを確認する**。これが本番の確認

- [ ] **Step 6: コミット**

```bash
git add manifest.webmanifest sw.js assets/icon.svg index.html spots.html gourmet.html tips.html
git commit -m "feat: PWA化してオフラインで開けるようにする

precache の一覧は手で並べる。ビルドがないため自動生成せず、
ファイルを足したら VERSION と両方更新する運用にする。ファイル数が
20台で固定されるので自動化のコストに見合わない。
manifest の start_url と scope は相対にする。サブディレクトリ配信で
ルート相対だとスコープが外れるため。file:// では SW を登録しない。"
```

---

### Task 20: 通し確認と公開

**Files:**
- Create: `README.md`
- Modify: なし（不具合が見つかった場合のみ該当ファイル）

**Interfaces:**
- Consumes: 全て
- Produces: GitHub Pages で公開された状態

- [ ] **Step 1: 全ページのコンソールを確認する**

```bash
python3 -m http.server 8765
```

4ページを開き、コンソールにエラーと警告が1つも出ないことを確認する。
`file://` でも4ページを開き、Service Worker 以外のエラーが出ないことを確認する。

- [ ] **Step 2: 仕様書の動作確認項目を通しで実施する**

`docs/superpowers/specs/2026-08-08-nagoya-travel-guide-design.md` の「動作確認」10項目を順に行う。
加えてプラン切替を含めた次を確認する。

1. 4ページが `http://localhost:8765/` と `file://` の両方で開き、コンソールにエラーが出ない
2. 幅375pxで横スクロールが発生しない。表・地下鉄マップは**それ自身だけ**が横スクロールする
3. デモ時刻 `8/11 15:24` で現在のコマが強調され、次の予定までの残りが出る
4. デモ時刻 `8/11 19:30` でリカバリ案が出て、名古屋城の 20:30 に言及する
5. 状況切替の4状態で、代替を持つコマが差し替わる
6. 機内モード（Network Offline）で再訪しても4ページとも開く
7. 夜モード・印刷プレビュー・スワイプ遷移が破綻しない
8. チェック・メモ・写真・土産リストがリロード後も残る
9. QRを実機カメラで読み取ってURLに解決する
10. 位置情報を拒否した場合に理由が表示され、エリア順に戻る
11. **プランA と プランB を切り替えても、今ここ追尾・リカバリ・サマリーが選択中のプランを見る**
12. `grep -rn "new Date()" assets/ | grep -v core.js` が**空**（時刻源を迂回していない）
13. `grep -rn 'src="/\|href="/' *.html` が**空**（ルート相対パスが無い）
14. `grep -rn "import \|export \|type=\"module\"" assets/ data/ *.html` が**空**
15. `grep -rn "cdn\|unpkg\|jsdelivr\|googleapis" *.html assets/ data/` が**空**

12〜15 は Global Constraints の機械的な検査。1つでも引っかかったら直してから進む。

- [ ] **Step 3: `README.md` を書く**

```markdown
# 名古屋 王道 2026.8.11-12

2026年8月11日（火・山の日）〜12日（水）の名古屋1泊2日の旅を、現地から開いて使うための静的サイト。

- 往路 東京 10:12発 → 名古屋 11:48着 ／ 復路 名古屋 14:49発 → 東京 16:24着
- 公開: <https://USER.github.io/NagoyaTabi/>

## 使い方

- **行程** — 端末の時計から今のコマを自動で強調する。遅れていれば取り返す案を出す。
  雨・猛暑・行列のボタンで、その場で代替に差し替えられる
- **名所** — 30箇所。エリアで絞るか、現在地から近い順に並べ替える。豆知識ガチャもここ
- **名物** — 20品。五食の枠の制覇状況と、写真つきの記録
- **メモ** — 営業時間の一覧、移動の早見表、土産の買い物リスト、地下鉄マップ、QR

スマートフォンのホーム画面に追加しておくと、地下街で電波が弱くても開く。

## 更新のしかた

情報は `data/` の6ファイルに集約してある。店を1軒足すなら配列に1要素を足すだけでよい。

| ファイル | 内容 |
|---|---|
| `data/spots.data.js` | 名所 |
| `data/foods.data.js` | 名物 |
| `data/trip.data.js` | 行程（プランA / プランB） |
| `data/transit.data.js` | 移動区間 |
| `data/trivia.data.js` | 豆知識カード |
| `data/omiyage.data.js` | 土産 |

ビルドは無い。編集して `git push` すれば GitHub Pages に反映される。

**ファイルを新しく追加したときは `sw.js` の `PRECACHE` と `VERSION` の両方を更新すること。**
更新しないと、既にホーム画面に追加した端末で古い版が表示され続ける。

## 営業時間について

2026-08-08 時点で公式サイトを確認した内容。「要確認」と表示されている店は、
祝日の振替定休が発生しうるため確定できていない。**出発前に電話で確かめること。**

- 味処 叶 052-241-3471 — 定休 月・火。ただし「祝日の場合は次の日が定休日」。
  8/11は山の日なので営業し、振替で **8/12（水）が定休になる可能性が高い**
- あつた蓬莱軒 神宮店 052-682-5598 — 定休 火・第2第4月（祝日は営業、振替休あり）。
  8/12 は振替休の恐れ

プランA はこのリスクを避けて組んである。電話で確認が取れたらプランB に切り替えてもよい。
```

`USER` は実際の GitHub ユーザー名に置き換える。

- [ ] **Step 4: GitHub Pages で公開する**

```bash
git add README.md
git commit -m "docs: READMEを追加

data/ の6ファイルを更新すれば内容が変わることと、
ファイル追加時に sw.js の PRECACHE と VERSION を更新する必要があることを明記した。
営業時間が確定していない店は電話番号つきで冒頭に出す。"

git push -u origin main
```

公開設定は GitHub の画面で行う。Settings → Pages → Source を
**Deploy from a branch**、Branch を **main / (root)** にする。
Actions は使わない（ビルドが無いため）。

- [ ] **Step 5: 公開先での確認**

`https://USER.github.io/NagoyaTabi/` を開いて確認する。

1. 4ページが開き、コンソールにエラーが出ない（相対パスが正しく解決している）
2. 実用メモページのQRが正しい公開URLを指す
3. スマートフォンで開いてホーム画面に追加できる
4. 追加したアイコンから起動し、**機内モードで4ページとも開く**
5. 幅375pxの実機で横スクロールが発生しない

- [ ] **Step 6: 最終コミット**

不具合を直した場合のみ。

```bash
git add -A
git commit -m "fix: 公開先での確認で見つかった不具合を修正"
git push
```

---

## Self-Review

計画を書き終えたあと、仕様書と突き合わせて確認した結果。

**1. 仕様の網羅**

| 仕様の要求 | 対応タスク |
|---|---|
| 4ページ構成 | 1 |
| `data/*.data.js` へのデータ分離、グローバル `NT` | 1, 2, 3, 9, 11, 12, 14 |
| ESモジュール禁止・相対パス・外部依存ゼロ | Global Constraints、Task 20 Step 2 の 12〜15 で機械的に検査 |
| デザインシステム（色・書体）と夜モード | 1 |
| 裏取り済み事実のデータ反映と「要確認」表示 | 2, 3, 11 |
| プランA / B の切替 | 3, 4 |
| 今ここ追尾・デモ時刻 | 5 |
| 遅延リカバリ | 6 |
| 状況切替（雨・猛暑・行列） | 7 |
| 名所30件・エリアフィルタ・GPS距離・訪問済み | 2, 8 |
| 名物20品・五食メーター・写真つき記録 | 9, 10 |
| 営業時間表（8/11・8/12の2列）・移動早見表・きっぷの判断 | 11 |
| 土産の買い物リストと購入締切 | 12 |
| 地下鉄SVGマップ | 13 |
| 豆知識ガチャ | 14 |
| QRコード自前生成 | 15 |
| 旅サマリー画像 | 16 |
| スワイプ遷移 | 17 |
| 印刷レイアウト | 18 |
| PWA（manifest・sw.js） | 19 |
| 仕様書の動作確認10項目 | 20 Step 2 |

漏れなし。

**2. 初稿から直した箇所**

初稿には誤りが4箇所あった。いずれも「そのまま書き写すと動くが誤っている」種類で、
訂正の注記を添えるのではなく、コードそのものを直した。計画に既知の誤りを残すと、
注記を読み飛ばした実装者がそのまま写す。

- Task 2 のひな型に `食べられない` の誤字
- Task 3 のプランA `alts.rain` にキリル文字の混入
- Task 9 の `howto` 配列に先頭スペース
- Task 10 の `recordBox` で、組み立て時に `img.hidden` を見て「写真を消す」ボタンの
  有無を決めていた。`img.hidden` が解除されるのは `NT.photoGet` の解決後なので、
  初回描画では写真があってもボタンが出ない。要素を先に作り、解決時に活性を切り替える形に直した

**3. 型と名前の整合**

- `NT.now` / `NT.get` / `NT.set` / `NT.el` / `NT.$` — Task 1 で定義、全タスクで同名で使用
- `NT.itemKey(di, ii)` — Task 4 で定義、Task 5・6 で使用。形式は `'0-3'` で一貫
- `NT.flatItems` の返す `slot` — Task 5 で定義、Task 6 の `delayMinutes`・`recoveryPlan` が使用
- `NT.itemDecorators` の署名 `(li, item, ctx)` — Task 4 で定義、Task 5・6・7 が同じ署名で登録
- `NT.afterRender` の署名 `(plan)` — Task 4 で定義、Task 5・6・7・13 が使用
- `NT.tipsSections` の要素 `{no, title, build}` — Task 11 で定義、Task 12・13・15・16 が push
- `NT.gourmetSections` の署名 `(root)` — Task 9 で定義、Task 10 が push
- `verifiedOn`（データの確認日）と `nt:checks`（利用者のチェック）— 仕様書どおり名前を分離
- `flex` は持たず `stay - minStay` で算出 — Task 3 で明記、Task 6 が同じ式を使用

**4. 依存の順序**

`itemDecorators` の実行順が Task 6（「今ここ」ボタン追加）と Task 7（本文差し替え）で
競合する。Task 7 Step 2 で `unshift` を使う訂正を明示し、Step 5 の確認項目6で検出できるようにした。

スクリプトの読み込み順に依存する箇所（Task 13 の `subwaymap.js` を `itinerary.js` より前、
Task 10 の `record.js` を `renderGourmet` 呼び出し前）は、各タスクの Step で明記した。

