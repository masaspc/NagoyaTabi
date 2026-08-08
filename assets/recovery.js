/* 遅延リカバリ。「今ここ」の明示記録があればそれを優先し、なければ現在のコマの
   予定終了超過から遅れを推定する。削る余地は stay-minStay（未保存・都度計算）の
   大きい順に割り当てる提案のみを行い、行程データ自体は書き換えない。 */
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
    var cur = NT.currentSlot(plan);
    if (cur) {
      /* NT.currentSlot は「start <= now < end」を満たすコマを返す（Task 5 の定義通り）。
         その cur.end（次のコマの開始で切り詰められた枠）と now を比べると、選ばれた
         時点で必ず now < cur.end なので差は絶対に正にならない ―― 「終了超過」が
         検出不能になる死んだ分岐になってしまう。予定終了とは、そのコマ自身に割り当て
         られた滞在時間（stay）が尽きることだと読み替え、cur.start + stay 分を実際の
         「予定終了」として使う。次のコマの開始が詰まっていて cur.end の方が早い区間
         （例: 名古屋城まつり中に鯱食堂を挟む重なり）では、そのコマがアクティブな間は
         自然終了が枠の外に出るため常に負になり得るが、通常の滞在（次のコマまで余裕が
         ある）では自然終了が枠内で先に来るので、そこを超えれば正しく遅れとして拾える。 */
      var naturalEnd = new Date(cur.start.getTime() + (cur.item.stay || 30) * 60000);
      var over = Math.round((NT.now() - naturalEnd) / 60000);
      if (over > 0) return { minutes: over, source: 'implicit', slot: cur };
      return { minutes: 0, source: 'implicit', slot: cur };
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
      NT.el('div', { class: 'rec-head', text: '⚠ 予定より ' + r.delay.minutes + '分 遅れ' +
        (r.delay.source === 'explicit' ? '（「今ここ」の記録から）' : '（時刻から推定）') })
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

  NT.afterRender.push(function (plan) {
    var box = recoveryBox(plan);
    if (!box) return;
    var bar = NT.$('.now-bar');
    bar.parentNode.insertBefore(box, bar.nextSibling);
  });
})(window);
