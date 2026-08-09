/* Task 25: 立替・割り勘記録。tips.html 08節（07は summary.js の「旅のまとめ」で
   既に使用済み）。誰が何にいくら払ったかを記録し、
   最終的に「どちらがどちらにいくら払えば清算できるか」の一点だけを答える。

   二人ぶんしか扱わない前提で単純化する: 対象（forWhom）は「ふたり分」
   （割り勘）か「どちらか一人だけ」の3択のみで、n人割り勘の一般化はしない。

   金額は整数円のみ。ふたり分（割り勘）が奇数のときは端数が出る。
   「払った人が端数の1円を多く負担する」と決め打つ: 半分ずつに割ったとき
   支払った本人の取り分を切り上げ、相手の取り分（＝相手が払うべき額）を
   切り下げる。これで「相手にいくら請求するか」が常に整数で、かつ
   四捨五入で1円をどこかに消してしまうことがない（切り上げた1円は
   払った本人がそのまま被る）。

   精算（NT.settlement）は「誰が払った合計（paid）」と「本来の取り分の
   合計（fair）」の差だけで決まる。差はふたりで符号が反転する関係になる
   （全体の支払額と全体の取り分は常に一致するため）。差が0でなければ、
   取り分より多く払っているほう（net>0）が、もう片方から不足分を受け取る。

   一手で片手操作できるよう、フォームは「金額（必須）」以外すべて既定値を
   持つ: 誰が払ったか（既定=前回の選択、初期は0番目）、誰の分か（既定=
   ふたり分）、内容（空なら「支払い」）。既定値はモジュール変数 uiState に
   持ち、入力途中の金額・内容も同様に持たせて、他のトグルを押しても
   途中まで入力した文字が再描画で消えないようにする（omiyage.js の
   qty/who が onchange のたびに NT.renderTips() で全体を描き直すのと
   同じ構造上、入力欄の値は再描画のたびに state から作り直す必要がある）。

   保存先: localStorage の nt:expenses（配列）。金額の入れ間違いは起こる
   前提で、各行に削除ボタンを付ける。 */
(function (w) {
  var NT = w.NT;
  NT.tipsSections = NT.tipsSections || [];

  /* ---- データ ---- */
  NT.expenses = function () { return NT.get('expenses', []); };

  NT.addExpense = function (entry) {
    var yen = Math.max(0, Math.round(+((entry && entry.yen) || 0)));
    if (!yen) return null; /* 金額だけは必須。0円や未入力は記録しない */
    var payer = (entry.payer === 1) ? 1 : 0;
    var forWhom = (entry.forWhom === 0 || entry.forWhom === 1) ? entry.forWhom : 'both';
    var e = {
      id: 'e' + NT.now().getTime().toString(36) + Math.random().toString(36).slice(2, 6),
      label: ((entry.label || '') + '').trim() || '支払い',
      yen: yen, payer: payer, forWhom: forWhom, at: NT.now().toISOString()
    };
    var all = NT.expenses();
    all.push(e);
    NT.set('expenses', all);
    return e;
  };

  NT.removeExpense = function (id) {
    var all = NT.expenses().filter(function (e) { return e.id !== id; });
    NT.set('expenses', all);
    return all;
  };

  /* 立替の集計と清算額。paid=各人が実際に支払った合計。
     fair=各人が本来負担すべき取り分の合計（ふたり分は上の規約で端数を
     支払った人に寄せる。片方だけの分は全額その人の取り分）。
     net = paid - fair。net[0] は net[1] の符号反転になる（total(paid) ===
     total(fair) が常に成り立つため、個々の記録で端数をどちらに寄せても
     全体としては1円たりとも消えたり増えたりしない）。 */
  NT.settlement = function () {
    var list = NT.expenses();
    var paid = [0, 0], fair = [0, 0];
    list.forEach(function (e) {
      var payer = e.payer === 1 ? 1 : 0;
      var other = 1 - payer;
      paid[payer] += e.yen;
      if (e.forWhom === 0 || e.forWhom === 1) {
        fair[e.forWhom] += e.yen;
      } else {
        var half = Math.floor(e.yen / 2);
        var extra = e.yen - half * 2; /* 0 か 1 */
        fair[payer] += half + extra; /* 端数は払った人が被る */
        fair[other] += half;
      }
    });
    var net = [paid[0] - fair[0], paid[1] - fair[1]];
    var yen = Math.abs(net[0]);
    var from = net[0] < 0 ? 0 : (net[0] > 0 ? 1 : null);
    var to = from === null ? null : (from === 0 ? 1 : 0);
    return { paid: paid, fair: fair, net: net, from: from, to: to, yen: yen };
  };

  /* ---- UI ---- */

  /* フォームの入力途中の値。再描画（トグル操作のたびに NT.renderTips() が
     ページ全体を描き直す）をまたいで保つ唯一の情報源。spotlist.js の
     openIds と同じ考え方 */
  var uiState = { amount: '', label: '', payer: 0, forWhom: 'both' };

  function yenFmt(n) { return '¥' + (Math.round(n) || 0).toLocaleString('ja-JP'); }

  function settleCard() {
    var s = NT.settlement();
    var players = NT.players();
    var figure;
    if (!s.yen) {
      figure = NT.el('p', { class: 'settle-figure settle-even', text: '貸し借りなし' });
    } else {
      var yenSpan = NT.el('span', { class: 'settle-yen mono' });
      figure = NT.el('p', { class: 'settle-figure' }, [
        NT.el('span', { class: 'settle-who', text: players[s.from] }),
        ' が ',
        NT.el('span', { class: 'settle-who', text: players[s.to] }),
        ' に',
        yenSpan,
        ' 払う'
      ]);
      /* Task 28: 精算額はこの節を開いて画面内に入ったところで0からカウントアップ
         する（結論の数字＝ページの中の“見せ場”という位置づけ）。 */
      if (w.NT.fx) NT.fx.countUp(yenSpan, s.yen, { trigger: 'inview', duration: 750, format: yenFmt });
      else yenSpan.textContent = yenFmt(s.yen);
    }
    return NT.el('div', { class: 'card settle-card' }, [
      NT.el('div', { class: 'settle-label', text: '精算' }),
      figure,
      NT.el('div', { class: 'settle-totals mono' }, [0, 1].map(function (i) {
        return NT.el('span', { class: 'settle-total-item',
          text: players[i] + ' 立替 ' + yenFmt(s.paid[i]) });
      }))
    ]);
  }

  function addForm() {
    var players = NT.players();
    var amount = NT.el('input', {
      type: 'number', inputmode: 'numeric', min: '0', step: '1',
      class: 'exp-amount', placeholder: '金額（円）', 'aria-label': '金額（円）・必須',
      value: uiState.amount,
      oninput: function () { uiState.amount = amount.value; }
    });
    var label = NT.el('input', {
      type: 'text', class: 'exp-label', placeholder: '何に（空欄可）', 'aria-label': '内容（空欄可）',
      value: uiState.label,
      oninput: function () { uiState.label = label.value; }
    });
    var payerRow = NT.el('div', { class: 'btnrow exp-toggle' }, [0, 1].map(function (i) {
      return NT.el('button', {
        class: 'btn' + (uiState.payer === i ? ' on' : ''), type: 'button',
        text: players[i] + 'が払った',
        onclick: function () { uiState.payer = i; NT.renderTips(); }
      });
    }));
    var forWhomOpts = [['both', 'ふたり分'], [0, players[0] + 'だけ'], [1, players[1] + 'だけ']];
    var forWhomRow = NT.el('div', { class: 'btnrow exp-toggle' }, forWhomOpts.map(function (o) {
      return NT.el('button', {
        class: 'btn' + (uiState.forWhom === o[0] ? ' on' : ''), type: 'button', text: o[1],
        onclick: function () { uiState.forWhom = o[0]; NT.renderTips(); }
      });
    }));
    var addBtn = NT.el('button', {
      class: 'btn on exp-add', type: 'button', text: '追加する',
      onclick: function () {
        var yen = Math.round(+amount.value || 0);
        if (yen <= 0) { amount.focus(); return; }
        NT.addExpense({ label: label.value, yen: yen, payer: uiState.payer, forWhom: uiState.forWhom });
        uiState.amount = '';
        uiState.label = '';
        NT.renderTips();
      }
    });
    return NT.el('div', { class: 'card exp-form' }, [
      NT.el('div', { class: 'exp-form-row' }, [amount, label]),
      payerRow, forWhomRow, addBtn
    ]);
  }

  function entriesList() {
    var players = NT.players();
    var list = NT.expenses().slice().reverse();
    if (!list.length) {
      var empty = NT.el('div', {});
      NT.notice(empty, 'まだ記録がありません。上のフォームから追加してください。');
      return empty;
    }
    return NT.el('ul', { class: 'exp-list' }, list.map(function (e) {
      var forWhomLabel = e.forWhom === 'both' ? 'ふたり分' : players[e.forWhom] + 'だけ';
      return NT.el('li', { class: 'exp-item' }, [
        NT.el('div', { class: 'exp-item-main' }, [
          NT.el('span', { class: 'exp-item-label', text: e.label }),
          NT.el('span', { class: 'exp-item-yen mono', text: yenFmt(e.yen) })
        ]),
        NT.el('div', { class: 'exp-item-meta', text: players[e.payer] + 'が払った ・ ' + forWhomLabel }),
        NT.el('button', {
          class: 'btn exp-del', type: 'button', text: '削除', 'aria-label': e.label + 'の記録を削除',
          onclick: function () {
            if (!w.confirm('この記録を削除します。よろしいですか。')) return;
            NT.removeExpense(e.id);
            NT.renderTips();
          }
        })
      ]);
    }));
  }

  function build() {
    return NT.el('div', {}, [
      settleCard(),
      NT.el('p', { class: 'notice',
        text: '金額は整数の円のみ。ふたり分の割り勘で端数が出る場合は、払った本人が1円多く負担します。' }),
      addForm(),
      entriesList()
    ]);
  }

  NT.tipsSections.push({ no: '08', title: '立替・割り勘記録', build: build });
})(window);
