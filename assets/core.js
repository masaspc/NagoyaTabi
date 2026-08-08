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
