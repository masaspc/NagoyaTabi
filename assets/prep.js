/* 実用メモページの節 01「出発前チェック」と 02「1泊2日の進め方」。
   文言は data/prep.data.js（NT.packing / NT.knowhow）に置き、ここは描画だけを持つ。

   チェックの保存先は localStorage の nt:packing（{ 項目id: true }）。
   写真のように容量を食うものは扱わないので、record.js のように
   IndexedDB へ逃がす必要はない。

   ほかの節（土産・割り勘）はユーザー操作のたびに NT.renderTips() でページ全体を
   描き直すが、この節はそうしない。持ち物は数十項目を続けてタップして潰していく
   使い方になるため、1タップごとに全画面を作り直すと、そのたびに他の節の
   スクロール位置や入力中の状態を揺らすことになる。チェックで変わるのは
   「行の見た目」と「済み件数」の2つだけなので、その2つだけを書き換える。 */
(function (w) {
  var NT = w.NT;
  NT.tipsSections = NT.tipsSections || [];

  NT.packed = function () { return NT.get('packing', {}); };
  NT.setPacked = function (id, on) {
    var all = NT.packed();
    if (on) all[id] = true; else delete all[id];
    NT.set('packing', all);
  };

  function allItems() {
    return NT.packing.reduce(function (a, g) { return a.concat(g.items); }, []);
  }
  function doneCount(items, state) {
    return items.filter(function (i) { return !!state[i.id]; }).length;
  }

  function packingBuild() {
    var state = NT.packed();
    var items = allItems();

    /* 済み件数の表示は2箇所（全体・グループごと）。チェックのたびに
       ここを書き換えるため、テキストノードを持つ要素を配列に控えておく。 */
    var totalNode = NT.el('span', { class: 'pk-count mono' });
    var groupNodes = {};

    function refresh() {
      var s = NT.packed();
      totalNode.textContent = doneCount(items, s) + ' / ' + items.length;
      NT.packing.forEach(function (g) {
        var n = groupNodes[g.id];
        if (n) n.textContent = doneCount(g.items, s) + '/' + g.items.length;
      });
    }

    var head = NT.el('div', { class: 'card' }, [
      NT.el('h3', {}, ['準備できたもの ', totalNode]),
      NT.el('p', { class: 'food-why',
        text: 'チェックはこの端末に保存され、閉じても消えません。前夜に鞄を作りながら、' +
              '上から順に潰していってください。印刷（ブラウザの印刷機能）すると、' +
              '手でチェックを入れられる紙のリストになります。' }),
      NT.el('button', { class: 'btn', type: 'button', text: 'チェックを全部外す',
        onclick: function () {
          if (!w.confirm('持ち物チェックを全部外します。よろしいですか。')) return;
          localStorage.removeItem('nt:packing');
          NT.renderTips();
        } })
    ]);

    var box = NT.el('div', {}, [head]);

    NT.packing.forEach(function (g) {
      var cnt = NT.el('span', { class: 'pk-gcount mono',
        text: doneCount(g.items, state) + '/' + g.items.length });
      groupNodes[g.id] = cnt;

      var list = NT.el('ul', { class: 'pk-list' }, g.items.map(function (it) {
        var row = NT.el('li', { class: 'pk-item' + (state[it.id] ? ' done' : '') });
        var box2 = NT.el('input', {
          type: 'checkbox', class: 'pk-check', id: 'pk-' + it.id,
          checked: !!state[it.id],
          onchange: function () {
            NT.setPacked(it.id, box2.checked);
            if (box2.checked) row.classList.add('done'); else row.classList.remove('done');
            refresh();
          }
        });
        /* ラベルをタップ領域にする。<input> は行頭の全体ルール
           （button,select,.btn,a.btn）の対象外なので、44px は CSS 側で
           .pk-item の label に明示してある。 */
        row.appendChild(box2);
        row.appendChild(NT.el('label', { class: 'pk-label', for: 'pk-' + it.id }, [
          NT.el('span', { class: 'pk-name', text: it.t }),
          it.why ? NT.el('span', { class: 'pk-why', text: it.why }) : null
        ]));
        return row;
      }));

      box.appendChild(NT.el('div', { class: 'card pk-group' }, [
        NT.el('h3', {}, [g.title, cnt]),
        g.lead ? NT.el('p', { class: 'food-why', text: g.lead }) : null,
        list
      ]));
    });

    /* 初期表示の件数もこの1本で入れる。件数の作り方をここと refresh() の
       2箇所に書くと、片方だけ直したときに初回表示と操作後で食い違う。 */
    refresh();
    return box;
  }

  function knowhowBuild() {
    var box = NT.el('div', {}, [
      NT.el('p', { class: 'notice',
        text: 'はじめての名古屋でも迷わないよう、時系列に並べてあります。' +
              '復路は ' + (NT.RETURN_TRAIN || '14:49') + ' 発。2日目はこの時刻から逆算して動きます。' })
    ]);
    NT.knowhow.forEach(function (k) {
      box.appendChild(NT.el('div', { class: 'card kh' }, [
        NT.el('h3', { text: k.title }),
        k.lead ? NT.el('p', { class: 'food-why', text: k.lead }) : null,
        NT.el('ul', { class: 'triv' }, k.items.map(function (t) {
          return NT.el('li', { text: t });
        }))
      ]));
    });
    return box;
  }

  NT.tipsSections.push(
    { no: '01', title: '出発前チェック', build: packingBuild },
    { no: '02', title: '1泊2日の進め方', build: knowhowBuild }
  );
})(window);
