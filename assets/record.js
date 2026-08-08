/* Task 10: 五食制覇メーターと、名物ごとの「食べた」記録（チェック・メモ・写真）。
   gourmet.html では gourmetlist.js の後、renderGourmet() を呼ぶ前に読む
   （NT.gourmetSections / NT.foodDecorators への登録が描画前に済んでいる
   必要があるため）。

   Task 16 で tips.html にも読ませるようになった。tips.html は
   gourmetlist.js を読まない（#gourmet-root が無く renderGourmet も呼ばない
   ため、gourmetSections/foodDecorators に登録しても使われない）ので、
   NT.summaryData/summaryCounts が使う NT.checks/NT.setCheck/NT.progressCounts
   だけが要る。それでも下の NT.gourmetSections.push(...) が未定義の配列に
   push しようとして例外を投げないよう、ここで防御的に初期化しておく
   （tipspage.js が同じ理由で NT.tipsSections を防御的に初期化しているのと
   同じパターン）。

   保存先を分ける: チェックとメモは localStorage の nt:checks、写真だけ IndexedDB
   (DB名 nt-photos / ストア photos) に置く。localStorage は5MB前後で上限があり、
   写真を1枚でも入れると即座に埋まって書き込みが黙って失敗する（core.js の
   NT.set は例外を握りつぶす設計）。写真をそこに混ぜると、旅行者が一番失いたく
   ないチェックとメモまで巻き添えで消える。写真だけを外に出しておけば、
   写真保存の失敗は写真だけで完結する。 */
(function (w) {
  var NT = w.NT;
  NT.gourmetSections = NT.gourmetSections || [];
  NT.foodDecorators = NT.foodDecorators || [];

  /* ---- 五食の枠。data/foods.data.js の slot と対応 ---- */
  NT.SLOTS = [
    { id: 'day1-lunch',   label: 'DAY1 昼' },
    { id: 'day1-eve',     label: 'DAY1 夕' },
    { id: 'day1-dinner',  label: 'DAY1 夜' },
    { id: 'day2-morning', label: 'DAY2 朝' },
    { id: 'day2-lunch',   label: 'DAY2 昼' }
  ];

  /* ---- チェック・メモ（localStorage, nt:checks） ---- */
  NT.checks = function () { return NT.get('checks', {}); };
  NT.setCheck = function (id, patch) {
    var all = NT.checks();
    var cur = all[id] || { done: false, at: null, memo: '' };
    Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
    all[id] = cur;
    NT.set('checks', all);
    return cur;
  };

  NT.progressCounts = function () {
    var c = NT.checks();
    var slotFoods = NT.foods.filter(function (f) { return !!f.slot; });
    var isDone = function (f) { return !!(c[f.id] && c[f.id].done); };
    return {
      slotDone: slotFoods.filter(isDone).length,
      slotTotal: slotFoods.length,
      foodDone: NT.foods.filter(isDone).length,
      foodTotal: NT.foods.length
    };
  };

  /* ---- 写真（IndexedDB, nt-photos / photos）----
     IndexedDB が使えない環境（プライベートモードの一部・古いWebView等）でも
     ページ全体が壊れないよう、開けなければ静かに「写真機能なし」として振る舞う。
     photoGet は null 解決、photoPut/photoDel は reject にして呼び出し側で
     ユーザーへ「保存できません」と伝えられるようにする */
  var IDB_OK = !!w.indexedDB;
  var dbPromise = null;
  function db() {
    if (!IDB_OK) return Promise.reject(new Error('IndexedDB is not available'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (res, rej) {
      var req = w.indexedDB.open('nt-photos', 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains('photos')) req.result.createObjectStore('photos');
      };
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { dbPromise = null; rej(req.error || new Error('IndexedDB open failed')); };
    });
    return dbPromise;
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t;
        try {
          t = d.transaction('photos', mode);
        } catch (e) { rej(e); return; }
        var store = t.objectStore('photos');
        var req = fn(store);
        t.oncomplete = function () { res(req ? req.result : undefined); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error || new Error('transaction aborted')); };
      });
    });
  }
  NT.photoPut = function (id, blob) {
    if (!IDB_OK) return Promise.reject(new Error('この端末では写真を保存できません'));
    return tx('readwrite', function (s) { return s.put(blob, id); });
  };
  NT.photoGet = function (id) {
    if (!IDB_OK) return Promise.resolve(null);
    return tx('readonly', function (s) { return s.get(id); }).catch(function () { return null; });
  };
  NT.photoDel = function (id) {
    if (!IDB_OK) return Promise.resolve();
    return tx('readwrite', function (s) { return s.delete(id); }).catch(function () {});
  };

  /* ---- 画像縮小。長辺を maxEdge に収め、JPEGへ変換する ----
     現地でスマホ撮影した写真は数MBになりうる。20品ぶん原寸のまま溜めると
     ストレージにも電池にも負担が大きい8月の炎天下運用なので、保存前に縮める */
  NT.shrinkImage = function (fileOrBlob, maxEdge) {
    maxEdge = maxEdge || 1600;
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(fileOrBlob);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.width * scale));
        cv.height = Math.max(1, Math.round(img.height * scale));
        var ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) {
          if (b) res(b); else rej(new Error('toBlob failed'));
        }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('画像を読み込めませんでした')); };
      img.src = url;
    });
  };

  /* ---- 五食メーター（リング2つ + 五食一覧 + 全消去）---- */
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
          var done = !!(f && c[f.id] && c[f.id].done);
          return NT.el('li', { class: done ? 'done' : '' }, [
            NT.el('span', { class: 'slot-when mono', text: s.label }),
            NT.el('a', { href: '#food-' + (f ? f.id : ''), text: f ? f.name : '—' }),
            NT.el('span', { class: 'slot-mark', text: done ? '✓' : '' })
          ]);
        })),
        NT.el('button', { class: 'btn', type: 'button', text: '記録をすべて消す',
          onclick: function () {
            /* 取り返しがつかない操作なので、何を失うかを明示して確認する */
            if (!w.confirm('チェック・メモ・写真をすべて消します。この操作は取り消せません。よろしいですか。')) return;
            localStorage.removeItem('nt:checks');
            Promise.all(NT.foods.map(function (f) { return NT.photoDel(f.id); }))
              .then(function () { NT.renderGourmet(); }, function () { NT.renderGourmet(); });
          } })
      ])
    ]));
  });

  /* ---- カードごとの記録欄 ----
     summary（食べたトグル）: <details> が閉じていても常に見え、押しても開閉が
     連動しない一番使う操作。spotlist.js の 訪問済にする ボタンに倣い、
     click で preventDefault/stopPropagation して開閉トグルへ伝播させない。

     body（写真・メモ）: 開いたときだけ触る操作なので本文側に置く */
  NT.foodDecorators.push(function (det, f, parts) {
    var cur = NT.checks()[f.id] || { done: false, memo: '' };

    /* --- summary: 食べたトグル。spot-head（chevron + 名前）の右端に付ける --- */
    var head = parts.summary.querySelector('.spot-head');
    var eatBtn = NT.el('button', {
      class: 'btn eat' + (cur.done ? ' on' : ''), type: 'button',
      'aria-label': f.name + 'を食べた',
      text: cur.done ? '食べた ✓' : '食べた',
      onclick: function (e) {
        e.preventDefault();
        e.stopPropagation();
        var wasDone = cur.done;
        NT.setCheck(f.id, { done: !wasDone, at: wasDone ? null : NT.now().toISOString() });
        NT.renderGourmet();
      }
    });
    if (head) head.appendChild(eatBtn);
    else parts.summary.appendChild(eatBtn);

    /* --- body: 写真・メモ --- */
    var img = NT.el('img', { class: 'rec-photo', alt: f.name + 'の写真', hidden: true });
    var delBtn = NT.el('button', { class: 'btn', type: 'button', text: '写真を消す', disabled: true,
      onclick: function () {
        NT.photoDel(f.id).then(function () { NT.renderGourmet(); });
      } });
    /* 写真の有無は IndexedDB を読むまで分からない。要素は先に組み立てておき、
       解決したときに表示と活性を切り替える（初回描画で常に「写真なし」に
       固定してしまわないため） */
    NT.photoGet(f.id).then(function (b) {
      if (!b) return;
      img.src = URL.createObjectURL(b);
      img.hidden = false;
      delBtn.disabled = false;
    });

    var recChildren = [];
    if (IDB_OK) {
      var fileId = 'ph-' + f.id;
      var file = NT.el('input', { type: 'file', accept: 'image/*', class: 'rec-file', id: fileId,
        onchange: function () {
          var fl = file.files && file.files[0];
          if (!fl) return;
          NT.shrinkImage(fl, 1600)
            .then(function (b) { return NT.photoPut(f.id, b).then(function () { return b; }); })
            .then(function (b) { img.src = URL.createObjectURL(b); img.hidden = false; delBtn.disabled = false; })
            .catch(function () { w.alert('この画像は保存できませんでした。'); });
        } });
      recChildren.push(NT.el('label', { class: 'btn rec-file-label', for: fileId, text: '写真を追加' }));
      recChildren.push(file);
      recChildren.push(delBtn);
    } else {
      recChildren.push(NT.el('span', { class: 'notice', text: 'この端末では写真の保存に対応していません' }));
    }
    var memo = NT.el('input', { type: 'text', class: 'rec-memo', value: cur.memo || '',
      placeholder: 'ひとことメモ', 'aria-label': f.name + 'のメモ',
      onchange: function () { NT.setCheck(f.id, { memo: memo.value }); } });
    recChildren.push(memo);
    recChildren.push(img);

    parts.body.appendChild(NT.el('div', { class: 'rec-box' }, recChildren));
  });
})(window);
