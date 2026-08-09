/* Task 24: 名古屋めし総選挙。gourmet.html では食べた名物ごとに二人が★1〜5で
   採点し、play.html の 03節が合計順位と「一番もめた1品」（差が最大の1品）を出す。

   置き場所の判断: <details> のカードは閉じていると summary しか見えない。
   summary にはすでに chevron・名前・五食バッジ（1行目）と カテゴリ・価格
   （2行目）に加え、record.js が「食べた」トグルを差し込んでいる。そこへ
   さらに星5つ×二人ぶん（10個のタップ領域）を並べると、375px幅では
   確実に収まりきらない。加えて「食べた」は現地でその場ワンタップする
   一次操作だが、採点は食べ終えたあとに二人で相談しながら決める、もう少し
   考える操作なので、summary（畳んだまま押す用）ではなく本文側に置くのが
   自然。summary には「採点済みか」だけが畳んだままでも一目でわかるよう、
   平均点の短いバッジだけを足す（星ボタンそのものは置かない）。

   食べていない品は評価できない: 本文には星ボタンではなく案内文だけを出す
   （ボタン自体を出さない = 誤ってタップできる余地がない）。ただし
   NT.setRating 自体は「食べた」チェックの有無を見ない。play.html の
   検証や、後から食べた記録を消した場合でも既に入れた評価が消えずに
   残るようにするため（食べた/評価は別の記録で、片方を消してももう片方は
   壊さない）。

   保存先: localStorage の nt:ratings。{ [foodId]: [player0の点, player1の点] }。
   点は 0（未評価）〜5。0は「★0」ではなく「まだ採点していない」なので、
   平均・合計・意見の差を出すときはすべて 0 を対象外として扱う。

   プレイヤー名は core.js の NT.players()/NT.setPlayers()（nt:players）を
   唯一の情報源にする。quiz.js（豆知識対戦クイズ）と同じふたりが同じ旅を
   歩くので、名前を機能ごとに別々に持たせない。 */
(function (w) {
  var NT = w.NT;
  NT.foodDecorators = NT.foodDecorators || [];
  NT.playSections = NT.playSections || [];

  /* ---- データ（localStorage, nt:ratings） ---- */
  NT.ratings = function () { return NT.get('ratings', {}); };
  NT.setRating = function (playerIdx, foodId, stars) {
    var all = NT.ratings();
    var cur = (all[foodId] || [0, 0]).slice();
    var idx = playerIdx === 1 ? 1 : 0;
    cur[idx] = Math.max(0, Math.min(5, Math.round(+stars || 0)));
    all[foodId] = cur;
    NT.set('ratings', all);
    return all;
  };

  /* 0（未評価）を除いた平均。誰も採点していなければ null */
  function avgOf(pair) {
    var vals = pair.filter(function (v) { return v > 0; });
    if (!vals.length) return null;
    return vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
  }

  /* ---- gourmet.html: カードごとの採点欄 ---- */
  function starsRow(playerIdx, foodId, value, playerName) {
    var buttons = [1, 2, 3, 4, 5].map(function (n) {
      var filled = n <= value;
      return NT.el('button', {
        type: 'button', class: 'rate-star' + (filled ? ' on' : ''),
        'data-rate': '', 'data-player': String(playerIdx), 'data-food': foodId, 'data-stars': String(n),
        'aria-label': playerName + 'の評価を★' + n + 'にする' + (value === n ? '（もう一度押すと取り消す）' : ''),
        text: filled ? '★' : '☆',
        onclick: function () {
          /* 同じ星をもう一度押すと 0（未評価）へ戻す。星だけの操作系で
             「評価を消す」をボタンひとつ増やさずに賄うための小さな工夫 */
          NT.setRating(playerIdx, foodId, value === n ? 0 : n);
          NT.renderGourmet();
        }
      });
    });
    return NT.el('div', { class: 'rate-row' }, [
      NT.el('span', { class: 'rate-player', text: playerName }),
      NT.el('div', { class: 'rate-stars' }, buttons)
    ]);
  }

  NT.foodDecorators.push(function (det, f, parts) {
    var done = !!(NT.checks()[f.id] && NT.checks()[f.id].done);
    var players = NT.players();
    var pair = NT.ratings()[f.id] || [0, 0];

    /* --- summary: 平均点の短いバッジだけ。星ボタンは置かない --- */
    var avg = avgOf(pair);
    var meta = parts.summary.querySelector('.spot-summeta');
    if (meta && (done || avg !== null)) {
      meta.appendChild(NT.el('span', {
        class: 'rate-badge' + (avg === null ? ' pending' : ''),
        text: avg === null ? '未採点' : '採点 ★' + avg.toFixed(1)
      }));
    }

    /* --- body: 星の採点欄。食べ終えたあとの振り返りなので本文側 --- */
    var wrap = NT.el('div', { class: 'rate' });
    if (!done) {
      NT.notice(wrap, '「食べた」にチェックすると、ふたりで★評価できます。');
    } else {
      wrap.appendChild(NT.el('h4', { text: '評価する' }));
      wrap.appendChild(starsRow(0, f.id, pair[0], players[0]));
      wrap.appendChild(starsRow(1, f.id, pair[1], players[1]));
    }
    parts.body.appendChild(wrap);
  });

  /* ---- play.html 03節: 名古屋めし総選挙 ---- */

  /* 評価が1つでも付いた品を、食品データと突き合わせて行データにする。
     NT.foods に無い id（データ更新でずれた場合）は静かに無視する */
  function rankRows() {
    var ratings = NT.ratings();
    var rows = [];
    Object.keys(ratings).forEach(function (id) {
      var f = NT.foodById ? NT.foodById(id) : null;
      if (!f) return;
      var pair = ratings[id];
      if (!(pair[0] > 0 || pair[1] > 0)) return;
      rows.push({ food: f, pair: pair, combined: pair[0] + pair[1], diff: Math.abs(pair[0] - pair[1]) });
    });
    return rows;
  }

  function nameRow() {
    var players = NT.players();
    var i1 = NT.el('input', {
      type: 'text', class: 'quiz-name', value: players[0], maxlength: '12',
      'aria-label': 'プレイヤー1の名前'
    });
    var i2 = NT.el('input', {
      type: 'text', class: 'quiz-name', value: players[1], maxlength: '12',
      'aria-label': 'プレイヤー2の名前'
    });
    function commit() { NT.setPlayers(i1.value, i2.value); NT.renderPlay(); }
    i1.addEventListener('change', commit);
    i2.addEventListener('change', commit);
    return NT.el('div', { class: 'quiz-name-row rank-names' }, [i1, i2]);
  }

  function rankingList(rows, players) {
    var ordered = rows.slice().sort(function (a, b) { return b.combined - a.combined; });
    return NT.el('ol', { class: 'rank-list' }, ordered.map(function (r, i) {
      return NT.el('li', { class: 'rank-item' + (i === 0 ? ' top' : '') }, [
        NT.el('span', { class: 'rank-no mono', text: String(i + 1) }),
        NT.el('div', { class: 'rank-body' }, [
          NT.el('a', { href: 'gourmet.html#food-' + r.food.id, class: 'rank-name', text: r.food.name }),
          NT.el('div', { class: 'rank-scores mono' }, [
            NT.el('span', { class: 'rank-combined', text: '合計 ' + r.combined }),
            NT.el('span', { class: 'rank-each', text: players[0] + ' ' + (r.pair[0] > 0 ? '★' + r.pair[0] : '—') }),
            NT.el('span', { class: 'rank-each', text: players[1] + ' ' + (r.pair[1] > 0 ? '★' + r.pair[1] : '—') })
          ])
        ])
      ]);
    }));
  }

  /* 意見が一番割れた1品 = 両者が採点していて差が最大の品。
     0点（未評価）を差の計算に混ぜると「片方しか食べてない」だけの品が
     「大差で意見が割れた」ように見えてしまうため、両者評価済みに限る */
  function biggestDispute(rows) {
    var both = rows.filter(function (r) { return r.pair[0] > 0 && r.pair[1] > 0; });
    if (!both.length) return null;
    return both.sort(function (a, b) { return b.diff - a.diff; })[0];
  }

  function disputeCard(rows, players) {
    var d = biggestDispute(rows);
    if (!d) return null;
    if (d.diff === 0) {
      return NT.el('div', { class: 'card rank-dispute agree' }, [
        NT.el('div', { class: 'rank-dispute-label', text: '意見の一致' }),
        NT.el('p', { class: 'rank-dispute-text', text: 'ふたりの評価はぴったり一致しています。' })
      ]);
    }
    return NT.el('div', { class: 'card rank-dispute' }, [
      NT.el('div', { class: 'rank-dispute-label', text: '一番もめた1品' }),
      NT.el('p', { class: 'rank-dispute-text' }, [
        NT.el('strong', { text: d.food.name }),
        ' で評価が ' + d.diff + '点 割れました。電車の中で聞いてみてください。'
      ]),
      NT.el('p', { class: 'rank-dispute-scores mono' }, [
        players[0] + ' ★' + d.pair[0] + '　' + players[1] + ' ★' + d.pair[1]
      ])
    ]);
  }

  function ranking() {
    var players = NT.players();
    var rows = rankRows();
    if (!rows.length) {
      var empty = NT.el('div', {});
      NT.notice(empty, '名物図鑑で「食べた」を付けて★評価すると、ここにランキングが出ます。');
      return empty;
    }
    var dc = disputeCard(rows, players);
    return NT.el('div', {}, [rankingList(rows, players), dc].filter(function (x) { return x; }));
  }

  function build() {
    return NT.el('div', {}, [
      NT.el('p', { class: 'notice',
        text: '名物図鑑で「食べた」を付けた品だけ、ふたりが★1〜5で採点。合計点が高い順のランキングと、意見が一番割れた1品を見せます。' }),
      nameRow(),
      ranking()
    ]);
  }

  NT.playSections.push({ no: '03', title: '名古屋めし総選挙', build: build });
})(window);
