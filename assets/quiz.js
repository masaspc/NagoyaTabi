/* 豆知識対戦クイズ。1台のスマホを2人で回して遊ぶ、三択の交互対戦。
   data/quiz.data.js の NT.quizQuestions（40問）を種本にする。

   状態は localStorage の nt:quiz（NT.get/set 経由）に一つのオブジェクトとして持つ。
   画面（build）はこの状態を毎回 NT.quizGet() で読み直して描くだけなので、
   状態そのものは以下の純関数群（NT.quizStart/NT.quizAnswer/NT.quizAdvance/NT.quizReset）
   が唯一の変更経路。DOM を介さずこの4つだけでゲームを最初から最後まで進められる
   （検証ハーネスからの機械的な全問プレイもこの経路を使う）。

     state = {
       players: [name1, name2] | null,   // null なら名前入力前
       turn: 0 | 1,                      // 今の設問に答えるのはどちらか
       scores: [n, n],
       askedIds: [...],                  // 出題済み（既に答えた）設問id。尽きるまで再出題しない
       currentId: id | null,             // 今表示中の設問id
       reviewing: bool,                  // 回答済み・正誤発表中（「次の問題へ」待ち）
       lastAnswer: { choice, correct } | null,
       finished: bool                    // 全問終了
     } */
(function (w) {
  var NT = w.NT;
  NT.playSections = NT.playSections || [];

  function defaultState() {
    return {
      players: null, turn: 0, scores: [0, 0], askedIds: [],
      currentId: null, reviewing: false, lastAnswer: null, finished: false
    };
  }
  NT.quizGet = function () { return NT.get('quiz', null) || defaultState(); };
  function save(s) { NT.set('quiz', s); return s; }

  /* 未出題の中から1問選んで currentId に据える。出題中・発表中・終了後は何もしない。
     未出題が尽きていれば finished を立てる（結果発表を必ず出すため、黙って
     止まらせない） */
  function ensureQuestion(s) {
    if (s.currentId || s.reviewing || s.finished) return s;
    var rest = NT.quizQuestions.filter(function (q) { return s.askedIds.indexOf(q.id) < 0; });
    if (!rest.length) { s.finished = true; return save(s); }
    var pick = rest[Math.floor(Math.random() * rest.length)];
    s.currentId = pick.id;
    return save(s);
  }

  NT.quizStart = function (name1, name2) {
    var s = defaultState();
    s.players = [name1, name2];
    return ensureQuestion(save(s));
  };

  /* choiceIdx を今の手番の得点として採点し、出題済みへ回す。以後は「次の問題へ」
     （NT.quizAdvance）が押されるまで同じ設問の正誤表示のまま止まる。 */
  NT.quizAnswer = function (choiceIdx) {
    var s = NT.quizGet();
    if (!s.currentId || s.reviewing) return s;
    var q = NT.quizQuestions.filter(function (x) { return x.id === s.currentId; })[0];
    var correct = !!q && q.answer === choiceIdx;
    if (correct) s.scores[s.turn] += 1;
    s.askedIds.push(s.currentId);
    s.reviewing = true;
    s.lastAnswer = { choice: choiceIdx, correct: correct };
    return save(s);
  };

  NT.quizAdvance = function () {
    var s = NT.quizGet();
    if (!s.reviewing) return s;
    s.turn = 1 - s.turn;
    s.currentId = null;
    s.reviewing = false;
    s.lastAnswer = null;
    return ensureQuestion(save(s));
  };

  NT.quizReset = function () { localStorage.removeItem('nt:quiz'); celebratedQuiz = false; lastCelebratedAnswer = null; };

  /* ---- UI ---- */
  /* Task 28: 得点は前回描画時の値からカウントアップする（lastScoresが唯一の情報源。
     ページ読み込み直後は0からのカウントで気持ちよく見せる）。全問終了に「今まさに」
     到達した瞬間だけ祝祭を出す（celebratedQuizで多重発火を防ぐ。もう一度あそぶ＝
     quizResetでフラグを戻す） */
  var lastScores = null;
  var celebratedQuiz = false;
  var lastCelebratedAnswer = null; /* 正解時バーストの多重発火防止（設問id） */

  function nameForm() {
    /* nt:players（core.js）が名前の唯一の情報源。名古屋めし総選挙や
       割り勘記録で先に名前を決めていれば、ここにも引き継がれる。
       まだ誰も決めていない既定値（'プレイヤー1'/'プレイヤー2'）のときは
       空欄のままプレースホルダーで見せる（決め打ちの文字列を消させない） */
    var cur = NT.players();
    var i1 = NT.el('input', {
      type: 'text', class: 'quiz-name', placeholder: 'プレイヤー1の名前',
      'aria-label': 'プレイヤー1の名前', maxlength: '12',
      value: cur[0] === 'プレイヤー1' ? '' : cur[0]
    });
    var i2 = NT.el('input', {
      type: 'text', class: 'quiz-name', placeholder: 'プレイヤー2の名前',
      'aria-label': 'プレイヤー2の名前', maxlength: '12',
      value: cur[1] === 'プレイヤー2' ? '' : cur[1]
    });
    var goBtn = NT.el('button', {
      class: 'btn on quiz-start', type: 'button', text: 'はじめる',
      onclick: function () {
        var p = NT.setPlayers(i1.value, i2.value);
        NT.quizStart(p[0], p[1]);
        NT.renderPlay();
      }
    });
    return NT.el('div', { class: 'quiz-setup' }, [
      NT.el('p', { class: 'notice',
        text: '1台のスマホを2人で交互に回して遊ぶ三択クイズです。全40問、名前を入れてはじめてください。' }),
      NT.el('div', { class: 'quiz-name-row' }, [i1, i2]),
      goBtn
    ]);
  }

  function scoreBar(s) {
    var from = lastScores || [0, 0];
    var pts = [0, 1].map(function () { return NT.el('span', { class: 'quiz-score-pt mono' }); });
    var bar = NT.el('div', { class: 'quiz-scorebar' }, [0, 1].map(function (i) {
      return NT.el('div', { class: 'quiz-score' + (!s.finished && s.turn === i ? ' on' : '') }, [
        NT.el('span', { class: 'quiz-score-name', text: s.players[i] }),
        pts[i]
      ]);
    }));
    [0, 1].forEach(function (i) {
      if (w.NT.fx) NT.fx.countUp(pts[i], s.scores[i], { from: from[i], duration: 500, format: function (n) { return Math.round(n) + '点'; } });
      else pts[i].textContent = s.scores[i] + '点';
    });
    lastScores = s.scores.slice();
    return bar;
  }

  function questionBlock(s) {
    var q = NT.quizQuestions.filter(function (x) { return x.id === s.currentId; })[0];
    if (!q) return NT.el('p', { class: 'notice warn', text: '問題を読み込めませんでした。' });

    var body = [
      NT.el('div', { class: 'quiz-turn', text: s.players[s.turn] + 'さんの番' }),
      NT.el('p', { class: 'quiz-q', text: q.question })
    ];

    if (!s.reviewing) {
      body.push(NT.el('div', { class: 'quiz-choices' }, q.choices.map(function (c, idx) {
        return NT.el('button', {
          class: 'btn quiz-choice', type: 'button', text: c,
          onclick: function () { NT.quizAnswer(idx); NT.renderPlay(); }
        });
      })));
      return NT.el('div', {}, body);
    }

    var t = NT.trivia.filter(function (x) { return x.id === q.triviaId; })[0];
    var correctBtn = null;
    body.push(NT.el('div', { class: 'quiz-choices' }, q.choices.map(function (c, idx) {
      var cls = 'btn quiz-choice';
      if (idx === q.answer) cls += ' correct';
      else if (idx === s.lastAnswer.choice) cls += ' wrong';
      var btn = NT.el('button', { class: cls, type: 'button', text: c, disabled: true });
      if (idx === q.answer) correctBtn = btn;
      return btn;
    })));
    /* 正解したときだけ、正解の選択肢のまわりに小さな祝祭を1回出す（Task 29）。
       設問idをキーに多重発火を防ぐ ―― 同じ正誤発表のままrenderPlayが
       何度呼ばれても（他の操作の巻き添えの再描画等）、同じ設問に対して
       2回は出さない。 */
    if (s.lastAnswer.correct && correctBtn && s.currentId !== lastCelebratedAnswer) {
      lastCelebratedAnswer = s.currentId;
      if (w.NT.fx) requestAnimationFrame(function () {
        NT.fx.burst(correctBtn, { count: 10 });
      });
    }
    body.push(NT.el('p', { class: 'quiz-result ' + (s.lastAnswer.correct ? 'ok' : 'ng'),
      text: s.lastAnswer.correct ? '正解！' : '不正解…' }));
    if (t) body.push(NT.el('p', { class: 'quiz-source', text: t.text }));
    body.push(NT.el('button', {
      class: 'btn on quiz-next', type: 'button', text: '次の問題へ',
      onclick: function () { NT.quizAdvance(); NT.renderPlay(); }
    }));
    return NT.el('div', {}, body);
  }

  function finalBlock(s) {
    var msg = s.scores[0] === s.scores[1]
      ? '引き分け！'
      : (s.scores[0] > s.scores[1] ? s.players[0] : s.players[1]) + ' の勝ち！';
    return NT.el('div', { class: 'quiz-final' }, [
      NT.el('h3', { text: '全' + NT.quizQuestions.length + '問 終了' }),
      NT.el('p', { class: 'quiz-result-final', text: msg }),
      NT.el('button', {
        class: 'btn on', type: 'button', text: 'もう一度あそぶ',
        onclick: function () { NT.quizReset(); NT.renderPlay(); }
      })
    ]);
  }

  function build() {
    var s = NT.quizGet();
    if (!s.players) return nameForm();
    s = ensureQuestion(s);

    var box = [scoreBar(s)];
    if (s.finished) {
      var fb = finalBlock(s);
      box.push(fb);
      if (!celebratedQuiz) {
        celebratedQuiz = true;
        /* build()が返す時点ではまだDOMに未接続（呼び出し元のNT.renderPlayが
           このあと同期的にappendする）。getBoundingClientRectが正しい位置を
           返せるよう、接続が終わった次のフレームまでバーストを遅らせる */
        if (w.NT.fx) requestAnimationFrame(function () {
          NT.fx.burst(fb.querySelector('.quiz-result-final') || fb);
        });
      }
    } else {
      box.push(NT.el('p', { class: 'quiz-progress mono',
        text: s.askedIds.length + ' / ' + NT.quizQuestions.length + '問' }));
      box.push(questionBlock(s));
    }
    box.push(NT.el('button', {
      class: 'btn quiz-reset', type: 'button', text: '最初からやり直す',
      onclick: function () {
        if (!w.confirm('スコアと進行状況をリセットします。よろしいですか。')) return;
        NT.quizReset();
        NT.renderPlay();
      }
    }));
    return NT.el('div', { class: 'quiz-wrap' }, box);
  }

  NT.playSections.push({ no: '01', title: '豆知識対戦クイズ', build: build });
})(window);
