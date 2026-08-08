/* 状況切替（通常 / 雨 / 猛暑 / 行列が長い）。
   代替は本文を差し替えるだけの表示上の切り替えで、NT.plans やコマ自体は書き換えない。
   通常に戻せば元の予定がそのまま戻る。 */
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

  /* 代替がある場合、本文を差し替える。元の予定は取り消し線で残す。
     unshift で先頭に登録し、本文差し替えを最初に済ませてから
     recovery.js の「今ここ」ボタンが .tl-body に追加される順序にする
     （.tl-body 要素自体は差し替えず中身だけ書き換えるので、後から追加される
     ボタンは残った同じ要素に乗る）。 */
  NT.itemDecorators.unshift(function (li, item, ctx) {
    var alt = NT.altFor(item);
    if (!alt) return;
    li.classList.add('has-alt');
    var body = NT.$('.tl-body', li);
    var orig = item.title;
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
