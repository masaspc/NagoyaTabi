/* 実用メモページの節「変更履歴」。data/changelog.data.js を新しい順に描く。

   決定そのものより「なぜそうしたか」を読ませたいので、理由（why）を本文の主役に、
   行程にどう反映したか（effect）を補足として下に置く。

   lesson（次にどう組めば防げたか）は金枠で強調する。ここが変更履歴のいちばんの
   値打ちで、「運が悪かった」で終わらせないための欄。source があれば裏付けの
   リンクを添える。どちらも任意なので、無い項目では出さない。 */
(function (w) {
  var NT = w.NT;
  NT.tipsSections = NT.tipsSections || [];

  function build() {
    var log = NT.changelog || [];
    if (!log.length) {
      return NT.el('p', { class: 'notice', text: 'まだ変更はありません。' });
    }
    var box = NT.el('div', {}, [
      NT.el('p', { class: 'notice',
        text: '旅の途中で行程を変えたときの記録。新しいものが上です。' })
    ]);
    log.forEach(function (c) {
      box.appendChild(NT.el('div', { class: 'card chg' }, [
        NT.el('div', { class: 'chg-head' }, [
          NT.el('span', { class: 'chg-at mono', text: c.at }),
          c.tag ? NT.el('span', { class: 'badge ' + (c.tag === '現地' ? 'kin' : 'shade'), text: c.tag }) : null
        ]),
        NT.el('h3', { text: c.title }),
        NT.el('p', { class: 'food-why', text: c.why }),
        NT.el('p', { class: 'where-note', text: c.effect }),
        c.lesson ? NT.el('div', { class: 'chg-lesson' }, [
          NT.el('span', { class: 'chg-lesson-label', text: '次はこうする' }),
          NT.el('p', { class: 'chg-lesson-text', text: c.lesson })
        ]) : null,
        c.source ? NT.el('p', { class: 'tl-links' }, [
          NT.el('a', { href: c.source.url, target: '_blank', rel: 'noopener',
            text: c.source.label })
        ]) : null
      ]));
    });
    return box;
  }

  NT.tipsSections.push({ no: '11', title: '変更履歴', build: build });
})(window);
