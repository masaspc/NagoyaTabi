/* ミッションカード。data/missions.data.js の24枚から未出題の集合を無作為に1枚引く、
   trivia ガチャと同じ「引いたら二度と出ない」方式。引いた1枚は達成/失敗のどちらかを
   記録でき、記録は下書き直後にリセットするまで残る。状態は localStorage の
   nt:missions に一つのオブジェクトとして持つ（quiz.js の nt:quiz と同じ設計）。

     state = {
       drawn: [id, id, ...],        // 引いた順。同じidは二度と出ない
       results: { id: 'ok'|'ng' }   // 判定済みのものだけキーを持つ
     }

   NT.drawMission / NT.markMission / NT.resetMissions が状態の唯一の変更経路。
   build() は毎回 NT.missionsState() で読み直すだけ（quiz.js/triviagacha.js と同じ
   防御的パターン）。 */
(function (w) {
  var NT = w.NT;
  NT.playSections = NT.playSections || [];

  /* 「引いた分を見る」の開閉状態。再描画をまたいで保つため、spotlist.js の
     openIds と同じくモジュール変数を唯一の情報源にする。 */
  var histOpen = false;

  function defaultState() { return { drawn: [], results: {} }; }
  NT.missionsState = function () { return NT.get('missions', null) || defaultState(); };
  function save(s) { NT.set('missions', s); return s; }

  NT.resetMissions = function () { localStorage.removeItem('nt:missions'); };

  /* 直近に描画したカードの id（Task 29: 「引く」の瞬間だけカードをフリップ
     させるため）。build() は「達成/失敗を記録する」「デッキをリセットする」等、
     引いたカードそのものは変わらない操作でも毎回呼ばれ、そのたびに
     missionCard() は新しいDOM要素を作り直す（このファイル・fx.js共通の設計:
     状態が変わるたびにコンテナごと再構築する）。そのため「要素が新しく
     作られたこと」自体は「今まさに引いた」の合図にならない —— 見ている
     ミッションのidが前回の描画から変わったときだけをフリップの合図にする。
     ページ読み込み時点の値で種入れしておくことで、前回セッションからの
     続きを開いた瞬間には誤ってフリップしない（本当に「引く」を押した
     ときだけ動く）。 */
  var lastDrawnCardId = (function () {
    var s0 = NT.missionsState();
    return s0.drawn.length ? s0.drawn[s0.drawn.length - 1] : null;
  })();

  /* 未出題の中から1枚選んで drawn の末尾に積む。尽きていれば null を返す
     （trivia ガチャの NT.drawTrivia と同じ契約）。 */
  NT.drawMission = function () {
    var s = NT.missionsState();
    var rest = NT.missions.filter(function (m) { return s.drawn.indexOf(m.id) < 0; });
    if (!rest.length) return null;
    var pick = rest[Math.floor(Math.random() * rest.length)];
    s.drawn = s.drawn.concat([pick.id]);
    save(s);
    return pick;
  };

  NT.markMission = function (id, result) {
    var s = NT.missionsState();
    s.results = s.results || {};
    s.results[id] = result;
    return save(s);
  };

  /* ---- UI ---- */

  function tally(s) {
    var total = NT.missions.length;
    var results = s.results || {};
    var okN = 0, ngN = 0;
    Object.keys(results).forEach(function (k) {
      if (results[k] === 'ok') okN++; else if (results[k] === 'ng') ngN++;
    });
    return NT.el('div', { class: 'mission-tally' }, [
      NT.el('span', { class: 'mission-tally-item', text: '引いた ' + s.drawn.length + ' / ' + total }),
      NT.el('span', { class: 'mission-tally-item ok', text: '達成 ' + okN }),
      NT.el('span', { class: 'mission-tally-item ng', text: '失敗 ' + ngN })
    ]);
  }

  function missionCard(m, s, isCurrent) {
    var result = s.results && s.results[m.id];
    var spot = m.spotId && NT.spotById(m.spotId);
    var actions;
    if (result) {
      actions = NT.el('p', {
        class: 'mission-result ' + (result === 'ok' ? 'ok' : 'ng'),
        text: result === 'ok' ? '達成 ✓' : '失敗…'
      });
    } else if (isCurrent) {
      actions = NT.el('div', { class: 'mission-actions' }, [
        NT.el('button', {
          class: 'btn on', type: 'button', text: '達成',
          onclick: function () { NT.markMission(m.id, 'ok'); NT.renderPlay(); }
        }),
        NT.el('button', {
          class: 'btn mission-ng-btn', type: 'button', text: '失敗',
          onclick: function () { NT.markMission(m.id, 'ng'); NT.renderPlay(); }
        })
      ]);
    } else {
      actions = NT.el('p', { class: 'mission-result pending', text: '未判定' });
    }
    var card = NT.el('div', { class: 'card mission-card' }, [
      NT.el('span', { class: 'badge kin', text: m.cat }),
      NT.el('p', { class: 'mission-text', text: m.text }),
      spot ? NT.el('a', { class: 'mission-spot-link', href: '#spot-' + spot.id, text: '→ ' + spot.name }) : null,
      actions
    ]);
    /* fx.js の汎用スクロール登場演出（.card は REVEAL_SELECTOR に含まれる）は
       ここでは使わない。入場演出はbuild()側の「引いた瞬間だけのフリップ」が
       専任で担当するため、先に data-nt-r を立てて汎用スキャンの二重登録を防ぐ
       （常に即表示＝コンテンツが消えるモードには絶対に落ちない）。 */
    card.setAttribute('data-nt-r', '1');
    return card;
  }

  function history(s) {
    if (s.drawn.length < 2) return null;
    var past = s.drawn.slice(0, -1).slice().reverse();
    var det = NT.el('details', { class: 'mission-history', open: histOpen }, [
      NT.el('summary', { text: '引いた分を見る（' + past.length + '枚）' }),
      NT.el('ul', { class: 'mission-hist-list' }, past.map(function (id) {
        var m = NT.missionById(id);
        var r = s.results && s.results[id];
        return NT.el('li', {}, [
          NT.el('span', { class: 'mission-hist-cat', text: m ? m.cat : '' }),
          NT.el('span', { class: 'mission-hist-text', text: m ? m.text : '（不明なミッション）' }),
          NT.el('span', {
            class: 'mission-hist-mark ' + (r === 'ok' ? 'ok' : r === 'ng' ? 'ng' : ''),
            text: r === 'ok' ? '達成' : r === 'ng' ? '失敗' : '未判定'
          })
        ]);
      }))
    ]);
    det.addEventListener('toggle', function () { histOpen = det.open; });
    return det;
  }

  function build() {
    var s = NT.missionsState();
    var total = NT.missions.length;
    var restLeft = total - s.drawn.length;
    var curId = s.drawn.length ? s.drawn[s.drawn.length - 1] : null;
    var cur = curId && NT.missionById(curId);

    var box = [
      NT.el('p', { class: 'notice',
        text: '未出題のカードから1枚引いて挑戦する。達成か失敗かを記録すると、二度と同じカードは出ない。' }),
      tally(s)
    ];

    var mc = null;
    if (cur) { mc = missionCard(cur, s, true); box.push(mc); }
    else box.push(NT.el('p', { class: 'notice', text: 'まだ1枚も引いていません。下のボタンで最初の1枚を引く。' }));
    var freshDraw = !!curId && curId !== lastDrawnCardId;
    lastDrawnCardId = curId;

    box.push(NT.el('div', { class: 'btnrow' }, [
      NT.el('button', {
        class: 'btn on mission-draw', type: 'button',
        text: restLeft > 0 ? (s.drawn.length ? 'もう1枚引く' : '1枚引く') : 'デッキ終了',
        disabled: restLeft > 0 ? null : true,
        onclick: function () { NT.drawMission(); NT.renderPlay(); }
      }),
      s.drawn.length ? NT.el('button', {
        class: 'btn', type: 'button', text: 'デッキをリセット',
        onclick: function () {
          if (!w.confirm('引いた記録と達成/失敗の結果をすべてリセットします。よろしいですか。')) return;
          NT.resetMissions(); histOpen = false; NT.renderPlay();
        }
      }) : null
    ]));

    var wrapDiv = NT.el('div', {}, box);
    if (restLeft === 0) wrapDiv.appendChild(NT.el('p', { class: 'notice',
      text: '24枚すべて引き終えました。デッキをリセットすればもう一度最初から挑戦できます。' }));

    var hist = history(s);
    if (hist) wrapDiv.appendChild(hist);

    /* 「引く」の瞬間だけ、カードを配るようにフリップさせる（Task 29）。
       呼び出し元（playpage.js の NT.renderPlay）がこの戻り値を同期的に
       appendChild するので、次のフレームまで待ってから animate すれば
       要素は確実にDOMへ接続済み。transform/opacityのみのWeb Animations API
       で、CSSのreveal系（.nt-reveal等）とは競合しない
       （mission-cardはdata-nt-rを立てて汎用revealの対象から外している）。 */
    if (freshDraw && mc && w.NT.fx && !NT.fx.reducedMotion) {
      requestAnimationFrame(function () {
        mc.style.transformOrigin = 'center 25%';
        mc.animate([
          { transform: 'rotateX(-84deg) scale(.94)', opacity: 0 },
          { transform: 'rotateX(8deg) scale(1.015)', opacity: 1, offset: .72 },
          { transform: 'rotateX(0deg) scale(1)', opacity: 1 }
        ], { duration: 520, easing: 'cubic-bezier(.25,.7,.3,1)' });
      });
    }

    return wrapDiv;
  }

  NT.playSections.push({ no: '02', title: 'ミッションカード', build: build });
})(window);
