/* Task 16: 旅サマリー画像。
   食べた名物（nt:checks の done）と回った名所（nt:visited）を1枚の縦長画像に
   まとめ、「画像を保存」で端末に残せるようにする。

   節は旅程終了後（8/12 14:49 発の後）にのみ出す。旅の最中に出しても
   使い道がなく、店を探しているときにページを占領するだけのため。

   画像はテーマに追従させず、印刷物寄りの固定配色で描く。保存して数ヶ月後に
   見返すものなので、生成した瞬間のテーマ（昼/夜）で見た目が変わると、
   見返すたびに「あれ、色が違う」と混乱する。CSS変数（var(--fg)等）は
   一切参照せず、すべて16進で固定する。

   高さは「行数から計算する」のではなく、実際に描く内容を一度 g=null で
   ドライラン（座標を進めるだけで何も描かない）して最終Yを求め、そこから
   キャンバス高さを決める。行数を数える近似式だと、後で描画ロジックを
   変えたときに式と実描画がずれてキャンバス下端をはみ出す事故が起きうる。
   ドライランなら描画と高さ計算が同じコード経路を通るので、原理的にずれない。

   長いメモは折り返さず1行に切り詰める（末尾に…）。折り返すと行数が
   不定になり高さ計算が崩れるため、「はみ出させない」を優先して切る。 */
(function (w) {
  var NT = w.NT;

  NT.summaryData = function () {
    var c = NT.checks ? NT.checks() : {};
    var v = NT.get('visited', {});
    return {
      plan: NT.currentPlan().name,
      foods: NT.foods.filter(function (f) { return c[f.id] && c[f.id].done; })
        .map(function (f) { return { name: f.name, memo: (c[f.id].memo || ''), at: c[f.id].at }; }),
      spots: NT.spots.filter(function (s) { return v[s.id]; })
        .map(function (s) { return { name: s.name, at: v[s.id] }; }),
      counts: NT.progressCounts()
    };
  };

  var MEMO_MAX = 26;

  NT.summaryCanvas = function () {
    var d = NT.summaryData();
    var W = 720, pad = 48, lh = 34;

    /* g が null のときは何も描かず y だけ進める（高さの測定用）。
       g が本物の 2D context のときは実際に描く。同じ関数を2回通すことで
       「高さの見積もり」と「実際の描画」が絶対にずれない。 */
    function layout(g) {
      var y = 210;

      function head(txt) {
        if (g) {
          g.fillStyle = '#1D5C55'; g.font = 'bold 28px serif';
          g.fillText(txt, pad, y);
        }
        y += 14;
        if (g) { g.fillStyle = '#C6CDC5'; g.fillRect(pad, y, W - pad * 2, 1); }
        y += 34;
      }
      function row(txt, color) {
        if (g) {
          g.fillStyle = color || '#1E2523'; g.font = '24px sans-serif';
          g.fillText(txt, pad, y);
        }
        y += lh;
      }
      function memoRow(txt) {
        if (g) {
          g.fillStyle = '#6B3226'; g.font = '19px sans-serif';
          g.fillText(txt, pad, y);
        }
        y += lh;
      }

      if (g) { g.fillStyle = '#6E7873'; g.font = '18px monospace'; g.fillText(d.plan, pad, y); }
      y += 44;

      head('食べた名物  ' + d.counts.foodDone + ' / ' + d.counts.foodTotal);
      if (!d.foods.length) row('（記録なし）', '#6E7873');
      d.foods.forEach(function (f) {
        row('◆ ' + f.name);
        var memo = String(f.memo || '').replace(/\s+/g, ' ').trim();
        if (memo) {
          var cut = memo.length > MEMO_MAX ? memo.slice(0, MEMO_MAX) + '…' : memo;
          memoRow('   「' + cut + '」');
        }
      });

      y += 26;
      head('回った名所  ' + d.spots.length + '箇所');
      if (!d.spots.length) row('（記録なし）', '#6E7873');
      d.spots.forEach(function (s) { row('◆ ' + s.name); });

      return y;
    }

    var contentEnd = layout(null);
    var H = Math.max(900, contentEnd + 90);

    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d');

    /* 背景・帯は固定色。ここに var(--...) を使わないこと。 */
    g.fillStyle = '#EAEDE6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#0D2B28'; g.fillRect(0, 0, W, 150);
    g.fillStyle = '#C79A3C'; g.fillRect(0, 150, W, 5);

    g.fillStyle = '#E4C177'; g.font = '20px monospace';
    g.fillText('NAGOYA 2026.08.11 - 08.12', pad, 62);
    g.fillStyle = '#ffffff'; g.font = 'bold 40px serif';
    g.fillText('名古屋 王道、五食で組む。', pad, 112);

    layout(g);

    g.fillStyle = '#6E7873'; g.font = '17px monospace';
    g.fillText('generated ' + NT.now().toISOString().slice(0, 10), pad, H - 34);

    return cv;
  };

  NT.tipsSections = NT.tipsSections || [];
  NT.tipsSections.push({ no: '09', title: '旅のまとめ', build: function () {
    var end = NT.parseHM('14:49', '2026-08-12');
    if (NT.now() < end) {
      return NT.el('div', { class: 'card' }, [
        NT.el('p', { class: 'notice',
          text: '旅が終わると、食べた名物と回った名所のまとめを画像で保存できるようになります。' +
                '（8/12 14:49 発の後に表示されます）' })
      ]);
    }
    var host = NT.el('div', { class: 'card sum-card' }, [
      NT.el('p', { class: 'notice', text: '長押しか「画像を保存」で端末に残せます。' })
    ]);
    var cv = NT.summaryCanvas();
    host.appendChild(cv);
    host.appendChild(NT.el('button', { class: 'btn on', type: 'button', text: '画像を保存',
      onclick: function () {
        cv.toBlob(function (b) {
          if (!b) return;
          var a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = 'nagoya-2026-08.png';
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        }, 'image/png');
      } }));
    return host;
  } });
})(window);
