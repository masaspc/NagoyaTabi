/* 土産の買い物リスト（Task 12）。
   カードは spotlist.js / gourmetlist.js と同じ <details> 折りたたみパターンを踏襲する。
   ただし相違点が一つある: このリストの主な使い方は「駅で残り15分、まだ何を
   買っていないか確認する」ことなので、締切バッジ・数量・宛先・買った ボタンは
   summary（畳んだままでも常に見える唯一の子）に置く。where/caution の説明文だけを
   本文側（開いたときだけ）に回す。summary にクリック可能な要素を足す場合は
   spotlist.js の 訪問済にする ボタンに倣い、click ハンドラで
   e.preventDefault()/e.stopPropagation() して開閉トグルへ伝播させない。 */
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

  /* 締切が 'HH:MM' 形式でなければ（例: きよめ餅の '8/11中'）、
     時計との差を計算しようがないので null を返す。null を「間に合っている」と
     誤読させないよう、呼び出し側は null のときバッジを一切出さない。 */
  function minutesLeft(deadline) {
    if (!/^\d{1,2}:\d{2}$/.test(deadline)) return null;
    var now = NT.now();
    var d = NT.parseHM(deadline, '2026-08-12');
    return Math.round((d - now) / 60000);
  }

  /* 開いているカードの id 集合。再描画（数量・宛先の変更のたびに走る）をまたいで
     開閉状態を保つための唯一の情報源。spotlist.js / gourmetlist.js と同じ方式。 */
  var openIds = {};

  function stopToggle(e) { e.stopPropagation(); }

  function card(o) {
    var isOpen = !!openIds[o.id];
    var c = NT.cart()[o.id] || { qty: 0, forWhom: '', done: false };
    var left = minutesLeft(o.deadline);

    var qty = NT.el('input', {
      type: 'number', min: '0', max: '20', value: String(c.qty),
      class: 'om-qty', 'aria-label': o.name + 'の個数',
      onclick: stopToggle,
      onchange: function () { NT.setCart(o.id, { qty: Math.max(0, +qty.value || 0) }); NT.renderTips(); }
    });
    var who = NT.el('input', {
      type: 'text', value: c.forWhom, class: 'om-who',
      placeholder: '誰用', 'aria-label': o.name + 'の宛先',
      onclick: stopToggle,
      onchange: function () { NT.setCart(o.id, { forWhom: who.value }); }
    });
    var doneBtn = NT.el('button', {
      class: 'btn' + (c.done ? ' on' : ''), type: 'button',
      text: c.done ? '買った ✓' : '買った',
      onclick: function (e) {
        e.preventDefault();
        e.stopPropagation();
        NT.setCart(o.id, { done: !c.done });
        NT.renderTips();
      }
    });

    var head = NT.el('div', { class: 'spot-head' }, [
      NT.el('span', { class: 'chev', 'aria-hidden': 'true' }),
      NT.el('h3', {}, [o.name,
        left !== null && left < 0 ? NT.el('span', { class: 'badge warn', text: '締切超過' }) : null,
        left !== null && left >= 0 && left < 60
          ? NT.el('span', { class: 'badge kin', text: 'あと' + left + '分' }) : null]),
      NT.el('span', { class: 'food-price mono', text: o.price })
    ]);
    var omRow = NT.el('div', { class: 'om-row' }, [
      NT.el('span', { class: 'om-dl mono', text: '締切 ' + o.deadline }),
      qty, who, doneBtn
    ]);
    var summary = NT.el('summary', {}, [head, omRow]);

    var body = NT.el('div', { class: 'spot-body' }, [
      NT.el('p', { class: 'where-note', text: o.where }),
      NT.el('p', { class: 'where-note', text: o.caution })
    ]);

    var det = NT.el('details', {
      class: 'card om' + (c.done ? ' done' : ''), id: 'om-' + o.id, open: isOpen
    }, [summary, NT.el('div', { class: 'spot-body-wrap' }, [body])]);

    det.addEventListener('toggle', function () {
      if (det.open) openIds[o.id] = true; else delete openIds[o.id];
    });
    return det;
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
            ' 発に間に合う目安の時刻です。カードは畳んでいても締切・数量・宛先・' +
            '買った ボタンはそのまま操作できます。' }),
      picked.length ? NT.el('button', { class: 'btn', type: 'button', text: 'リストを空にする',
        onclick: function () {
          if (!w.confirm('土産リストを空にします。よろしいですか。')) return;
          localStorage.removeItem('nt:omiyage');
          openIds = {};
          NT.renderTips();
        } }) : null
    ]);
    var box = NT.el('div', {}, [head]);
    NT.omiyage.forEach(function (o) { box.appendChild(card(o)); });
    return box;
  }

  NT.tipsSections.push({ no: '04', title: '土産の買い物リスト', build: build });
})(window);
