/* 遅延リカバリ。遅れの唯一の情報源は「今ここ」の明示記録。
   NT.currentSlot(plan) は定義上「start <= now < end」を満たすコマしか返さないため、
   これと now を比べる限り差は絶対に正にならない ―― 時計だけからは「予定のどのコマに
   いるべきか」は分かっても「実際にどれだけ遅れているか」は原理的に分からない
   （currentSlot はスケジュール通りの位置を返すだけで、旅行者が本当にそこにいる保証は
   ない）。start/stay/end のどんな式に置き換えても、スケジュール上「今いるはずのコマ」
   の中にいる限り遅れは検出できない ―― むしろ「まだ余裕がある」だけの滞在（例: 105分の
   枠に35分の軽食で、まだ10分しか経っていない）を遅れと誤検知し、削らなくていいコマを
   削らせる誤警報になる。誤警報は機能なしより悪い。よって暗黙推定は行わず、明示の
   「今ここ」記録だけを遅れの根拠にする。 */
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
    return { minutes: 0, source: 'none', slot: null };
  };

  NT.recoveryPlan = function (plan) {
    var d = NT.delayMinutes(plan);
    if (d.minutes <= THRESHOLD || !d.slot) return null;

    var list = NT.flatItems(plan);
    /* slot はキーで引き直す。flatItems は呼ぶたびに新しいオブジェクトを作るので、
       currentSlot/delayMinutes が返した slot への参照や indexOf でその位置を探すと
       常に見つからず -1 になる（from が 0 になり、既に終わったコマまで削減候補に
       入ってしまう）。必ず NT.slotIndex で .key を引き直す。 */
    var from = NT.slotIndex(plan, d.slot.key) + 1;
    var after = list.slice(from);

    /* 次に控える固定点。ここに間に合わせるのが目的 */
    var deadline = null;
    for (var i = 0; i < after.length; i++) {
      if (after[i].item.hardDeadline) { deadline = after[i]; break; }
    }

    /* 削れる余地が大きい順に削る。stay-minStay が余地（flex は保存しない） */
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
      NT.el('div', { class: 'rec-head',
        text: '⚠ 「今ここ」の記録から ' + r.delay.minutes + '分 遅れています' })
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

  /* リカバリ箱が出ない間、静かな一行の誘導だけを now-bar の下に添える。警告ではなく
     ヒントなので、rec とは別の控えめなクラスにし、色も miso（警告色）にしない。
     今どこかのコマの最中でなければ「遅れ」の意味がないので、その間だけ出す。 */
  function recoveryHint(plan) {
    if (!NT.currentSlot(plan)) return null;
    return NT.el('p', { class: 'rec-hint',
      text: '遅れていたら、今いる場所の「今ここ」を押してください。取り戻せる分を提案します。' });
  }

  NT.afterRender.push(function (plan) {
    var bar = NT.$('.now-bar');
    if (!bar) return;
    var box = recoveryBox(plan) || recoveryHint(plan);
    if (!box) return;
    bar.parentNode.insertBefore(box, bar.nextSibling);
  });
})(window);
