/* スワイプでのページ送り（Task 17）。
   行程 → 名所 → 名物 → メモ の順に、左右スワイプで隣のページへ移る。
   横スクロールする箱（営業時間表・地下鉄マップ）や入力欄の中で拾うと、
   その箱を横に払っただけでページが飛んでしまうため、
   e.target.closest で明示的に除外する。 */
(function (w) {
  var NT = w.NT;

  NT.initSwipe = function (currentFile) {
    var files = NT.PAGES.map(function (p) { return p.file; });
    var i = files.indexOf(currentFile);
    if (i < 0) return;
    var x0 = 0, y0 = 0, t0 = 0, tracking = false;

    document.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { tracking = false; return; }
      /* 入力欄・ボタン・横スクロールする箱の中では拾わない。
         record.js の「写真を追加」は <button> ではなく <label class="btn">
         （file input を隣に置き、for で紐付けてクリックを委譲する実装）なので、
         タグ名だけでなく label も除外に加える。ブリーフのセレクタ例は
         button タグしか見ていないため、実際のページを確認して補った。 */
      if (e.target.closest('input,textarea,select,button,a,label,.table-scroll,.submap-wrap')) {
        tracking = false; return;
      }
      tracking = true;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - x0, dy = t.clientY - y0, dt = Date.now() - t0;
      /* 横が縦の2倍以上、40px超、素早い動きのときだけ発火。縦スクロールと競合させない */
      if (dt > 800) return;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 2) return;
      var next = dx < 0 ? i + 1 : i - 1;
      if (next < 0 || next >= files.length) return;
      location.href = files[next];
    }, { passive: true });
  };
})(window);
