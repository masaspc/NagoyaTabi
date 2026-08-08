/* 行程ページの描画とプラン切替。
   renderItinerary は再入可能: #itinerary-root を毎回空にして丸ごと描き直す。
   itemDecorators / afterRender は後続タスク（今ここ追尾・遅延リカバリ・状況切替）の
   差し込み口。ここでは配列を用意して呼ぶだけで、中身には関知しない。 */
(function (w) {
  var NT = w.NT;
  NT.itemDecorators = NT.itemDecorators || [];
  NT.afterRender = NT.afterRender || [];

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
      /* tel はある店なら常にリンクにする（houraiken-honten は unverified:false でも tel を持つ）。
         「要確認」バッジとは独立に判定する — ブリーフ原文は unverified && tel だったが、
         その条件だと確定済みの店の電話番号が拾えなくなるため広げた。 */
      s.tel ? NT.el('a', { href: 'tel:' + s.tel, text: s.tel }) : null
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
    NT.afterRender.forEach(function (fn) { fn(plan); });
  };
})(window);
