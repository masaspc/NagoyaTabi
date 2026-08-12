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

  /* ---- 二人のプレイヤー名（nt:players）----
     豆知識対戦クイズ（quiz.js）・名古屋めし総選挙（foodrank.js）・
     立替割り勘（expenses.js）はどれも「同じふたり」を扱う。quiz.js は元々
     対戦の名前を nt:quiz.players（状態オブジェクトの一部）に持っていたが、
     それは対戦の進行状況（得点・出題済み設問）と一体になっており、他機能が
     名前だけを読みに行く先としては不向き。ここに名前だけを持つ最小の
     取得・保存関数を置き、3機能はここを唯一の情報源として読み書きする
     （quiz.js は開始時にここへ書き戻す形で追従させてある）。 */
  NT.players = function () {
    var p = NT.get('players', null);
    return (p && p.length === 2) ? p : ['プレイヤー1', 'プレイヤー2'];
  };
  NT.setPlayers = function (n1, n2) {
    var p = [(n1 || '').trim() || 'プレイヤー1', (n2 || '').trim() || 'プレイヤー2'];
    NT.set('players', p);
    return p;
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
    { file: 'tips.html', label: 'メモ' },
    { file: 'play.html', label: 'あそび' },
    /* 8/12にポケモンセンターへ行くと決まってから足したページ。ナビが6つになるので
       .nav の文字サイズを狭い端末向けに一段落としてある（style.css の 360px 以下の指定） */
    { file: 'goods.html', label: 'グッズ' }
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

  /* ---- 名所線画（assets/art.js の10種）を、行程・名所・名物のどのカードに
     使うかの対応表（Task 29）。art.js 自体はデータの id を一切知らないので、
     ここでページ側が「どの id にどの絵を当てるか」を1箇所にまとめる。
     10種の線画すべてに最低1つの行き先を割り当てることを狙った:
       nagoyajo/atsuta/osu/tokugawa は名前どおりの直接一致。
       hitsumabushi は「まるや本店」（ひつまぶしの実演店）、
       misokatsu は「味処 叶」（味噌カツ発祥を名乗る元祖）に、料理の絵をその店に当てる。
       shinkansen は新幹線ホーム上の「住よし」（きしめん）に当てる。
       tebasaki は「伍味酉」（名古屋コーチン）と食品データの手羽先の両方に使う——
       専用の「コーチン」線画は無いため、鳥料理という近い家族の絵を転用する
       （精密な一致ではないが、10種のうち転用できる候補としては最も近い）。
       kissa は「コンパル」系の喫茶スポットと、食品データの「喫茶店のモーニング」に。
       chikagai（地下街・駅）は「エスカ地下街」に直接一致し、
       駅至近の「ポケモンセンターナゴヤ」にも同じ絵を転用する。 */
  NT.LANDMARK_FOR_SPOT = {
    kanou: 'misokatsu',
    atsuta: 'atsuta',
    osu: 'osu',
    nagoyajo: 'nagoyajo',
    tokugawa: 'tokugawa',
    'maruya-esca': 'hitsumabushi',
    sumiyoshi: 'shinkansen',
    gomitori: 'tebasaki',
    pokecen: 'chikagai',
    esca: 'chikagai',
    'konparu-meieki': 'kissa',
    'kissa-tanaka': 'kissa',
    /* 朝のきしめん2軒。専用の線画は無いので、同じ「駅で食べるきしめん」である
       住よしに当てている shinkansen（新幹線）を転用する */
    'ekikama-taiko': 'shinkansen',
    'ekikama-chuo': 'shinkansen'
  };
  NT.LANDMARK_FOR_FOOD = {
    hitsumabushi: 'hitsumabushi',
    misokatsu: 'misokatsu',
    kochin: 'tebasaki',
    morning: 'kissa',
    kishimen: 'shinkansen',
    tebasaki: 'tebasaki'
  };
})(window);
