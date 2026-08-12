/* グッズページ。ポケモンセンターナゴヤで買うものの順位と、買い方の段取り。

   店の中で片手で使う前提なので、順位カードは畳まず全部を開いた状態で出す——
   名所・名物のように <details> にすると、混んだ店内で1枚ずつ開く操作が邪魔になる。
   代わりに「買った」チェックだけを付けられるようにして、買い物リストとして機能させる。

   チェックは localStorage（nt:goods）。土産リスト（nt:omiyage）とは別に持つ。
   あちらは個数と宛先まで扱う買い物リストで、こちらは「見た・買った」を潰すだけなので、
   同じ器に混ぜると両方の意味が濁る。 */
(function (w) {
  var NT = w.NT;

  NT.goodsBought = function () { return NT.get('goods', {}); };
  NT.setGoodsBought = function (id, on) {
    var all = NT.goodsBought();
    if (on) all[id] = true; else delete all[id];
    NT.set('goods', all);
  };

  /* 行程から、今日ポケモンセンターにいられる終わりの時刻を引く。
     data/trip.data.js のコマの hardDeadline を唯一の情報源にして、
     このページに時刻を二重に書かない（行程を直せばここも直る） */
  function leaveBy() {
    var out = null;
    NT.currentPlan().days.forEach(function (d) {
      d.items.forEach(function (i) {
        if (i.spotId === 'pokecen' && i.hardDeadline) out = i;
      });
    });
    return out;
  }

  function head() {
    var lv = leaveBy();
    var box = NT.el('div', { class: 'card' }, [
      NT.el('h3', { text: '限られた時間で、何から買うか' }),
      NT.el('p', { class: 'food-why',
        text: '順位は一般的な人気順ではなく、この旅の条件で並べてある——' +
              'ここでしか買えないか、復路の新幹線まで持ち歩けるか、名古屋の記念になるか。' +
              '上から順に見れば、時間が足りなくなっても悔いが残りにくい。' }),
      lv ? NT.el('p', { class: 'notice warn',
        text: '店を出る目安は ' + lv.hardDeadline + '（' + lv.deadlineWhy + '）。' +
              'レジの列を考えて、その15〜20分前には会計に並ぶ。' }) : null,
      NT.el('p', { class: 'notice', text: NT.goodsNote })
    ]);
    return box;
  }

  function card(g) {
    var bought = !!NT.goodsBought()[g.id];
    var btn = NT.el('button', {
      class: 'btn eat' + (bought ? ' on' : ''), type: 'button',
      text: bought ? '買った ✓' : '買った',
      onclick: function () {
        NT.setGoodsBought(g.id, !bought);
        NT.renderGoods();
      }
    });
    return NT.el('div', { class: 'card goods' + (bought ? ' done' : '') }, [
      NT.el('div', { class: 'goods-head' }, [
        NT.el('span', { class: 'goods-rank mono', text: String(g.rank) }),
        NT.el('h3', {}, [g.name,
          g.tag ? NT.el('span', { class: 'badge ' + (g.tagKind || 'indoor'), text: g.tag }) : null]),
        btn
      ]),
      NT.el('p', { class: 'goods-price mono', text: g.price }),
      NT.el('p', { class: 'food-what', text: g.what }),
      NT.el('h4', { text: 'なぜこの順位か' }),
      NT.el('p', { class: 'food-why', text: g.why }),
      NT.el('h4', { text: '買うときのコツ' }),
      NT.el('p', { class: 'where-note', text: g.tip })
    ]);
  }

  function howto() {
    return NT.el('div', { class: 'card' }, [
      NT.el('h3', { text: '店内での段取り' }),
      NT.el('ul', { class: 'triv' }, NT.goodsHowto.map(function (h) {
        return NT.el('li', {}, [
          NT.el('strong', { text: h.title }),
          NT.el('span', { class: 'howto-text', text: h.text })
        ]);
      }))
    ]);
  }

  NT.renderGoods = function () {
    var root = NT.$('#goods-root');
    if (!root) return;
    root.textContent = '';

    var b = NT.goodsBought();
    var done = NT.goods.filter(function (g) { return b[g.id]; }).length;

    var sec = NT.el('section', {}, [
      NT.el('div', { class: 'sec-head' }, [
        NT.el('span', { class: 'no', text: '01' }), NT.el('h2', { text: '買うものの順位' }),
        NT.el('span', { class: 'goods-count mono', text: done + ' / ' + NT.goods.length })
      ]),
      head()
    ]);
    NT.goods.forEach(function (g) { sec.appendChild(card(g)); });
    root.appendChild(sec);

    root.appendChild(NT.el('section', { class: 'tight' }, [
      NT.el('div', { class: 'sec-head' }, [
        NT.el('span', { class: 'no', text: '02' }), NT.el('h2', { text: '店内での段取り' })
      ]),
      howto(),
      NT.el('div', { class: 'card' }, [
        NT.el('h3', { text: 'このあとの予定' }),
        NT.el('p', { class: 'food-why',
          text: 'ここで買った量は、このあとの土産の量に効いてくる。' +
                'かさばるものを買ったら、メモページの土産リストで個数を減らして帳尻を合わせること。' }),
        NT.el('p', { class: 'tl-links' }, [
          NT.el('a', { href: 'index.html', text: '行程へ' }),
          NT.el('a', { href: 'tips.html#tips-06', text: '土産リストへ' }),
          NT.el('a', { href: 'spots.html#spot-pokecen', text: 'ポケモンセンターの詳細' })
        ])
      ])
    ]));
  };
})(window);
