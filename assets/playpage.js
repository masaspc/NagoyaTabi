/* あそびページの土台。NT.playSections は節の定義を配列で持ち、
   NT.renderPlay が no 順に描く。tipspage.js の NT.tipsSections と同じ契約:

     NT.playSections.push({ no: '02', title: '節タイトル', build: function () { return DOMノード; } });

   no は2桁文字列のゾロ目を避けた昇順ソートキー（'01'『豆知識対戦クイズ』は本タスクが
   使用済み。ミッションカード・名物ランキングは '02'・'03' などを使うこと）。
   build は毎回の再描画で呼ばれ、素の DOM ノードを1つ返す（呼ぶたびに新しく作ってよい。
   状態は build 側が localStorage 等から読み直す前提）。読み込み順に依存しないよう
   防御的に初期化する（tipspage.js / gourmetlist.js と同じパターン）。 */
(function (w) {
  var NT = w.NT;
  NT.playSections = NT.playSections || [];

  /* 節ごとの開閉状態。spotlist.js の openIds と同じ方式（モジュール変数を
     唯一の情報源にして、再描画をまたいでユーザーの開閉操作を保つ）。
     このページは移動中や待ち時間にとにかく遊ぶのが目的なので、既定で
     01（豆知識対戦クイズ）は開いておく。 */
  var openIds = { '01': true };

  /* #play-root を描き直す。再入可能（再描画しても節が重複しない）。
     tipspage.js の NT.renderTips と同じ構造: no でソートしてから <details> で描く。 */
  NT.renderPlay = function () {
    var root = NT.$('#play-root');
    if (!root) return;
    root.textContent = '';
    var ordered = NT.playSections.slice().sort(function (a, b) {
      return a.no < b.no ? -1 : a.no > b.no ? 1 : 0;
    });
    if (!ordered.length) {
      NT.notice(root, 'まだ遊べるものがありません。');
      return;
    }
    ordered.forEach(function (s) {
      var det = NT.el('details', {
        class: 'card tips-det', id: 'play-' + s.no, open: !!openIds[s.no]
      }, [
        NT.el('summary', {}, [
          NT.el('span', { class: 'chev', 'aria-hidden': 'true' }),
          NT.el('span', { class: 'no', text: s.no }),
          NT.el('h2', { text: s.title })
        ]),
        NT.el('div', { class: 'tips-body-wrap' }, [s.build()])
      ]);
      det.addEventListener('toggle', function () {
        if (det.open) openIds[s.no] = true; else delete openIds[s.no];
      });
      root.appendChild(det);
    });
  };
})(window);
