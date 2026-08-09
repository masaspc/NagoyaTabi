/* 名古屋豆知識ガチャ。未引きの集合から無作為に1枚を選び nt:trivia に記録する。
   同じカードは引いた分（nt:trivia）から除外されるので二度と出ない。 */
(function (w) {
  var NT = w.NT;

  NT.drawn = function () { return NT.get('trivia', []); };
  NT.resetTrivia = function () { localStorage.removeItem('nt:trivia'); };
  NT.drawTrivia = function () {
    var got = NT.drawn();
    var rest = NT.trivia.filter(function (t) { return got.indexOf(t.id) < 0; });
    if (!rest.length) return null;
    var pick = rest[Math.floor(Math.random() * rest.length)];
    NT.set('trivia', got.concat([pick.id]));
    return pick;
  };

  function cardEl(t, n, total) {
    var s = t.spotId && NT.spotById(t.spotId);
    return NT.el('div', { class: 'gacha-card' }, [
      NT.el('div', { class: 'gacha-no mono', text: 'TRIVIA ' + ('0' + n).slice(-2) + ' / ' + total }),
      NT.el('span', { class: 'badge shade', text: t.tag }),
      NT.el('p', { class: 'gacha-text', text: t.text }),
      s ? NT.el('a', { href: '#spot-' + s.id, text: '→ ' + s.name } ) : null
    ]);
  }

  NT.buildGacha = function () {
    var total = NT.trivia.length;
    var slot = NT.el('div', { class: 'gacha-slot' });
    var host = NT.el('div', { class: 'card gacha' }, [
      NT.el('h3', { text: '名古屋豆知識ガチャ' }),
      NT.el('p', { class: 'notice',
        text: '移動中に1枚ずつ引けます。引いた枚数は端末に残ります。' }),
      slot
    ]);

    function refresh(justDrawn) {
      slot.textContent = '';
      var got = NT.drawn();
      if (justDrawn) slot.appendChild(cardEl(justDrawn, got.length, total));
      /* Task 28: 「今引いた1枚」でちょうど全部揃った瞬間だけ祝う。justDrawnが
         無い呼び出し（初期表示・見返す・リセット後の再描画）では出さない —
         既にコンプリート済みの手持ちを開いただけで毎回バーストしないため */
      if (justDrawn && got.length >= total && w.NT.fx) NT.fx.burst(slot);
      slot.appendChild(NT.el('div', { class: 'btnrow' }, [
        NT.el('button', { class: 'btn on', type: 'button',
          text: got.length >= total ? 'コンプリート' : (got.length ? 'もう1枚引く' : '1枚引く'),
          disabled: got.length >= total ? true : null,
          onclick: function () {
            var t = NT.drawTrivia();
            if (t) refresh(t);
          } }),
        got.length ? NT.el('button', { class: 'btn', type: 'button', text: '引いた分を見返す',
          onclick: function () { showAll(); } }) : null,
        got.length ? NT.el('button', { class: 'btn', type: 'button', text: 'リセット',
          onclick: function () { NT.resetTrivia(); refresh(null); } }) : null
      ]));
      slot.appendChild(NT.el('div', { class: 'gacha-bar' }, [
        NT.el('div', { class: 'gacha-fill',
          style: 'width:' + Math.round(got.length / total * 100) + '%' })
      ]));
      slot.appendChild(NT.el('p', { class: 'notice', text: got.length + ' / ' + total + ' 枚' }));
    }

    function showAll() {
      var got = NT.drawn();
      var list = NT.trivia.filter(function (t) { return got.indexOf(t.id) >= 0; });
      slot.textContent = '';
      list.forEach(function (t, i) { slot.appendChild(cardEl(t, i + 1, total)); });
      slot.appendChild(NT.el('div', { class: 'btnrow' }, [
        NT.el('button', { class: 'btn on', type: 'button', text: 'ガチャに戻る',
          onclick: function () { refresh(null); } })
      ]));
    }

    refresh(null);
    return host;
  };
})(window);
