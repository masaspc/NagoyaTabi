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

  /* currentSlot/nextSlot each call flatItems internally and return one of ITS OWN fresh
     object literals — never the same object twice, and the demo clock can change the
     answer between any two calls. Do not hold a slot reference across calls and never
     compare with === or Array#indexOf; look it up again by .key via NT.slotIndex. */
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
  /* 参照ではなく key で引き直すための唯一の正しい手段。Task 6 の遅延リカバリはこれで
     現在のコマの位置を求めてから残りをスライスする */
  NT.slotIndex = function (plan, key) {
    var list = NT.flatItems(plan);
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return i;
    return -1;
  };

  function mins(ms) { return Math.round(ms / 60000); }
  function human(m) {
    if (m < 60) return m + '分';
    return Math.floor(m / 60) + '時間' + (m % 60 ? (m % 60) + '分' : '');
  }

  /* 旅程外で開いたときに出すデモ時刻セレクタ。旅の前に全機能を試せるようにするため。
     ラベルはプランごとに違う行程に対して固定文字列で書くと（例:「ポケセン」が
     プランBでは大須の時間に化ける、プランBに存在しない「叶」を指すなど）プラン切替の
     たびに嘘のラベルになる。そこで時刻だけを固定し、ラベルは描画時に選択中のプランへ
     問い合わせて「その時刻に実際どのコマにいるか」から組み立てる。'遅れ検証' のように
     場所ではなくテスト用途を示すものだけ tag を添えて残す */
  var DEMO = [
    { iso: '2026-08-11T12:10:00' },
    { iso: '2026-08-11T16:00:00' },
    { iso: '2026-08-11T19:30:00', tag: '遅れ検証' },
    { iso: '2026-08-12T09:50:00' },
    { iso: '2026-08-12T13:40:00' },
    { iso: '2026-08-13T10:00:00', tag: '旅の後' }
  ];

  /* plan における、任意時刻（NT.now() ではなく明示の ms）に入っているコマ。
     デモの選択肢ラベルを作るためだけの内部ヘルパーで、NT.now() は経由しない
     （現在時刻ではなく「この選択肢を選んだら」の時刻を問うため） */
  function slotAtTime(plan, ms) {
    var list = NT.flatItems(plan);
    for (var i = 0; i < list.length; i++) {
      if (ms >= list[i].start.getTime() && ms < list[i].end.getTime()) return list[i];
    }
    return null;
  }

  function demoLabel(d, plan) {
    var dt = new Date(d.iso);
    var mm = ('0' + (dt.getMonth() + 1)).slice(-2).replace(/^0/, '');
    var dd = ('0' + dt.getDate()).slice(-2).replace(/^0/, '');
    var slot = slotAtTime(plan, dt.getTime());
    var where = slot ? slot.item.title : '旅程外';
    return mm + '/' + dd + ' ' + NT.fmtTime(dt) + ' ' + where + (d.tag ? '／' + d.tag : '');
  }

  function clockBar(plan) {
    var faked = NT.isClockFaked();
    var sel = NT.el('select', { class: 'btn', 'aria-label': 'デモ時刻を選ぶ',
      onchange: function () { NT.setClock(sel.value || null); NT.renderItinerary(); } },
      [NT.el('option', { value: '', text: '実際の時刻' })].concat(DEMO.map(function (d) {
        return NT.el('option', { value: d.iso, text: demoLabel(d, plan),
          selected: NT.get('clock', null) === d.iso ? true : null });
      })));
    return NT.el('div', { class: 'clock-bar' }, [
      NT.el('span', { class: 'mono', text: '⏱ ' + NT.fmtTime(NT.now()) + (faked ? '（デモ）' : '') }),
      sel
    ]);
  }

  function nowBar(plan) {
    var cur = NT.currentSlot(plan), nx = NT.nextSlot(plan), now = NT.now();
    var list = NT.flatItems(plan);
    var tripStart = list.length ? list[0].start.getTime() : null;
    var box = NT.el('div', { class: 'now-bar' + (cur ? ' active' : '') });
    if (cur) {
      box.appendChild(NT.el('div', { class: 'now-label mono', text: 'NOW ' + NT.fmtTime(now) }));
      box.appendChild(NT.el('div', { class: 'now-title', text: '▶ ' + cur.item.title }));
      box.appendChild(NT.el('div', { class: 'now-sub',
        text: 'このコマは残り ' + human(mins(cur.end - now)) +
              (nx ? ' ／ 次は ' + nx.item.time + ' ' + nx.item.title : ' ／ これが最後') }));
      box.appendChild(NT.el('a', { class: 'now-jump', href: '#item-' + cur.key, text: 'このコマへ' }));
    } else if (nx && tripStart !== null && now.getTime() >= tripStart) {
      /* 旅の初日が始まった後・最終コマが終わる前の「間」（例: 夜に伍味酉が終わって
         翌朝の最初のコマが始まるまで）。旅程前でも旅程終了でもないので、
         その語を使わずに「今は合間で、次はこれ」とだけ言う */
      box.appendChild(NT.el('div', { class: 'now-label mono', text: '合間 ' + NT.fmtTime(now) }));
      box.appendChild(NT.el('div', { class: 'now-title',
        text: '本日のコマの合間です。次は ' + nx.day.label.slice(0, 5) + ' ' + nx.item.time + ' ' + nx.item.title }));
    } else if (nx) {
      box.appendChild(NT.el('div', { class: 'now-label mono', text: '旅程前 ' + NT.fmtTime(now) }));
      box.appendChild(NT.el('div', { class: 'now-title',
        text: '次の予定は ' + nx.day.label.slice(0, 5) + ' ' + nx.item.time + ' ' + nx.item.title }));
    } else {
      box.appendChild(NT.el('div', { class: 'now-label mono', text: '旅程終了' }));
      box.appendChild(NT.el('div', { class: 'now-title', text: 'おつかれさまでした' }));
    }
    box.appendChild(clockBar(plan));
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
