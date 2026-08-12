/* 入場方法の事前確認。

   なぜこれが要るか（2026-08-12 の失敗から）:
   ポケモンセンターナゴヤは混雑期に当日整理券制で、8月は土日祝に加えてお盆の
   混雑予想日が対象、配布は9:00からだった。公式サイトで7月に告知されていたのに、
   こちらは営業時間（10:00-21:00）だけを見て「開店に行けば入れる」と組んだ。
   結果、8/11に入れず→8/12の午前に回し→徳川美術館が丸ごと消えた。
   **1件の見落としが、行程2コマ分の崩壊になった。**

   このサイトには元々「営業時間は疑え」という仕組みがあった（unverified →
   要確認バッジ＋電話番号）。叶と蓬莱軒の祝日振替はそれで防げている。
   足りなかったのは、同じ疑いを **入場方法** に向けることだった。

   設計の要点は「未確認をいちばん強い警告にする」こと。整理券が要ると
   分かっている状態より、**どうやって入るか調べていない状態のほうが危ない**。
   だから severity は unknown を最大にしてある。データに entry が無い名所は
   自動的に unknown になる——書き忘れが警告として表に出る作りで、
   「欄が無いから調べなかった」を二度と起こさない。 */
(function (w) {
  var NT = w.NT;

  NT.ENTRY_KINDS = {
    free:    { label: '自由入場',   severity: 0, act: '' },
    queue:   { label: '行列に並ぶ', severity: 1, act: '待ち時間の目安を調べる。予約できる店なら取る' },
    ticket:  { label: '当日整理券', severity: 2, act: '配布の開始時刻と対象日を公式のお知らせで確認する' },
    lottery: { label: '抽選',       severity: 2, act: '申込の締切を確認する。締切が旅より前なら出発前に申し込む' },
    reserve: { label: '要予約',     severity: 2, act: '予約を取る。取れなければ行程から外す' },
    timed:   { label: '時間指定',   severity: 2, act: '枠を押さえる。押さえた時刻に行程を合わせる' },
    unknown: { label: '入場方法 未確認', severity: 3,
      act: '公式サイトの「お知らせ」を読む。営業時間のページではなく、お知らせ。混雑期は特に' }
  };

  /* 名所1件の入場方法。entry が無ければ unknown（＝書き忘れが警告になる） */
  NT.entryOf = function (spot) {
    var e = (spot && spot.entry) || {};
    var kind = NT.ENTRY_KINDS[e.kind] ? e.kind : 'unknown';
    var def = NT.ENTRY_KINDS[kind];
    return {
      kind: kind, label: def.label, severity: def.severity, act: def.act,
      note: e.note || '', url: e.url || '', checkedOn: e.checkedOn || ''
    };
  };

  function badgeClass(sev) {
    return sev >= 3 ? 'warn' : sev >= 2 ? 'kin' : sev >= 1 ? 'shade' : 'indoor';
  }
  /* 行程・名所カードに出す小さなバッジ。自由入場のときは出さない（静かにする） */
  NT.entryBadge = function (spot) {
    var e = NT.entryOf(spot);
    if (e.severity <= 0) return null;
    return NT.el('span', { class: 'badge ' + badgeClass(e.severity), text: e.label });
  };

  /* 行程の各コマにバッジを足す。situation.js の代替差し替えより後に走らせたいので
     push（unshift ではない）——先に本文を差し替えられても、こちらは要素を
     足すだけなので順序に強い */
  NT.itemDecorators = NT.itemDecorators || [];
  NT.itemDecorators.push(function (li, item) {
    if (!item.spotId || !NT.spotById) return;
    var s = NT.spotById(item.spotId);
    if (!s) return;
    var b = NT.entryBadge(s);
    if (!b) return;
    var strong = NT.$('.tl-body strong', li);
    if (strong) strong.appendChild(b);
  });

  /* 実用メモ 01「出発前チェック」の先頭に置く確認表。
     今のプランで実際に行く先だけを対象にする——行かない名所まで並べると
     本当に手配が要る数件が埋もれる。 */
  NT.buildEntryCheck = function () {
    if (!NT.currentPlan || !NT.spotById) return null;

    var seen = {}, rows = [];
    NT.currentPlan().days.forEach(function (d) {
      d.items.forEach(function (i) {
        if (!i.spotId || seen[i.spotId]) return;
        var s = NT.spotById(i.spotId);
        if (!s) return;
        seen[i.spotId] = true;
        rows.push({ spot: s, entry: NT.entryOf(s), date: d.date, time: i.time });
      });
    });
    /* 危ない順。同じ危険度なら行程の早い順 */
    rows.sort(function (a, b) {
      if (b.entry.severity !== a.entry.severity) return b.entry.severity - a.entry.severity;
      return (a.date + a.time) < (b.date + b.time) ? -1 : 1;
    });

    var todo = rows.filter(function (r) { return r.entry.severity >= 1; });
    var unknown = rows.filter(function (r) { return r.entry.severity >= 3; });

    var head = NT.el('div', { class: 'card entry-head' }, [
      NT.el('h3', { text: '入場方法の事前確認' }),
      NT.el('p', { class: 'food-why',
        text: '営業時間を見ただけで「開いているなら入れる」と考えないこと。' +
              '整理券・抽選・予約・時間指定は、営業時間のページではなく公式の「お知らせ」に出る。' +
              'ここが未確認のまま出発すると、1件の見落としで行程が2コマ分まとめて崩れる。' }),
      NT.el('p', { class: unknown.length ? 'notice warn' : 'notice',
        text: unknown.length
          ? '未確認 ' + unknown.length + '件。出発前に必ず調べてください。'
          : '未確認はありません。' + (todo.length ? '事前の手配が要るものが ' + todo.length + '件あります。' : '') })
    ]);

    var box = NT.el('div', {}, [head]);

    rows.forEach(function (r) {
      var e = r.entry;
      var card = NT.el('div', { class: 'card entry-row sev-' + e.severity }, [
        NT.el('div', { class: 'entry-line' }, [
          NT.el('span', { class: 'entry-when mono', text: r.date.slice(5).replace('-', '/') + ' ' + r.time }),
          NT.el('a', { class: 'entry-name', href: 'spots.html#spot-' + r.spot.id, text: r.spot.name }),
          NT.el('span', { class: 'badge ' + badgeClass(e.severity), text: e.label })
        ]),
        e.note ? NT.el('p', { class: 'where-note', text: e.note }) : null,
        e.severity >= 1 ? NT.el('p', { class: 'entry-act', text: 'やること: ' + e.act }) : null,
        NT.el('p', { class: 'tl-links' }, [
          e.url ? NT.el('a', { href: e.url, target: '_blank', rel: 'noopener', text: '公式のお知らせ' })
                : (r.spot.official ? NT.el('a', { href: r.spot.official, target: '_blank', rel: 'noopener', text: '公式サイト' }) : null),
          r.spot.tel ? NT.el('a', { href: 'tel:' + r.spot.tel, text: r.spot.tel }) : null,
          e.checkedOn ? NT.el('span', { class: 'entry-checked mono', text: e.checkedOn + ' 確認' }) : null
        ])
      ]);
      box.appendChild(card);
    });

    return box;
  };
})(window);
