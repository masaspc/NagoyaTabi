/* 実用メモページの節「変更履歴」。data/changelog.data.js を新しい順に描く。

   決定そのものより「なぜそうしたか」を読ませたいので、理由（why）を本文の主役に、
   行程にどう反映したか（effect）を補足として下に置く。 */
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
        NT.el('p', { class: 'where-note', text: c.effect })
      ]));
    });
    return box;
  }

  NT.tipsSections.push({ no: '11', title: '変更履歴', build: build });
})(window);
