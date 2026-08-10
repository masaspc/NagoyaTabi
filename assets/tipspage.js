/* 実用メモページ（営業時間表・移動早見表・暑さ対策）。
   NT.tipsSections は節の定義を配列で持ち、renderTips が順に描く。
   Task 12・13・15・16 はここに { no, title, build } を push して節を足す。
   読み込み順に依存しないよう防御的に初期化する。 */
(function (w) {
  var NT = w.NT;
  NT.tipsSections = NT.tipsSections || [];

  /* 営業判定。8/11は祝日（山の日）、8/12は平日。
     unverified な箇所は文字列がどうであれ断定せず常に「要確認」を返す。
     定休日の記述に祝日の振替に触れるもの（「祝日は営業」「祝日の場合は…」）が
     あり、かつ判定日がその定休曜日に当たる場合も、文字列だけでは
     振替後の休業日を特定できないため「要確認」に倒す。

     曜日の判定は「◯曜」という並びだけを手がかりにする。dow の1文字だけを
     indexOf で探すと、「定休日」「開催日」「休館日」のような地の文にまで
     誤反応する（「日」が代表例）。また「第2第4木曜」のように週番号が付く
     表記は、文字列だけでは何週目かを解決できないため、○/×で断定せず
     「要確認」に倒す。判断できないときは閉まっている方向に倒さない。 */
  NT.openOn = function (spot, dateISO, isHoliday) {
    if (spot.unverified) return '要確認';
    var closed = spot.closed || '';
    if (!closed) return '○';
    if (/不定休|要確認/.test(closed)) return '要確認';
    var dow = ['日', '月', '火', '水', '木', '金', '土'][NT.parseHM('00:00', dateISO).getDay()];

    var re = /((?:第[0-9一二三四五六七八九十]+)+|最終)?([月火水木金土日])曜/g;
    var plainMatch = false, qualifiedMatch = false, m;
    while ((m = re.exec(closed))) {
      if (m[2] !== dow) continue;
      if (m[1]) qualifiedMatch = true; else plainMatch = true;
    }
    if (!plainMatch && !qualifiedMatch) return '○';
    if (isHoliday && /祝日は営業|祝日の場合/.test(closed)) return '要確認';
    if (qualifiedMatch && !plainMatch) return '要確認';
    return '×';
  };

  function mk(v) { return v === '○' ? 'ok' : v === '×' ? 'ng' : 'q'; }

  function hoursTable() {
    var rows = NT.spots.filter(function (s) { return s.hours; });
    var t = NT.el('table', {}, [
      NT.el('thead', {}, [NT.el('tr', {}, [
        NT.el('th', { text: '店・施設' }), NT.el('th', { text: '営業時間' }),
        NT.el('th', { text: '定休' }),
        NT.el('th', { text: '8/11 火・祝' }), NT.el('th', { text: '8/12 水' })
      ])]),
      NT.el('tbody', {}, rows.map(function (s) {
        var a = NT.openOn(s, '2026-08-11', true), b = NT.openOn(s, '2026-08-12', false);
        return NT.el('tr', {}, [
          NT.el('th', {}, [
            NT.el('a', { href: 'spots.html#spot-' + s.id, text: s.name }),
            s.tel ? NT.el('span', { class: 'tel-line' }, [
              NT.el('a', { href: 'tel:' + s.tel, text: s.tel })]) : null
          ]),
          NT.el('td', { text: s.hours }),
          NT.el('td', { text: s.closed || '—' }),
          NT.el('td', { class: 'mk mk-' + mk(a), text: a }),
          NT.el('td', { class: 'mk mk-' + mk(b), text: b })
        ]);
      }))
    ]);
    return NT.el('div', {}, [
      NT.el('div', { class: 'table-scroll' }, [t]),
      NT.el('p', { class: 'notice warn',
        text: '「要確認」は営業時間が確認できなかった店です。叶と蓬莱軒は定休日が祝日に' +
              'ぶつかると振替が発生するため、出発前に電話で確かめてください。' })
    ]);
  }

  function transitTable() {
    var t = NT.el('table', {}, [
      NT.el('thead', {}, [NT.el('tr', {}, ['区間', '路線', '所要', '運賃', '備考'].map(function (h) {
        return NT.el('th', { text: h }); }))]),
      NT.el('tbody', {}, NT.transit.map(function (r) {
        return NT.el('tr', {}, [
          NT.el('th', { text: r.from + ' → ' + r.to }),
          NT.el('td', { text: r.line }),
          NT.el('td', { class: 'mono', text: r.min + '分' }),
          NT.el('td', { class: 'mono', text: '¥' + r.fare }),
          NT.el('td', { text: r.note || '—' })
        ]);
      }))
    ]);
    return NT.el('div', {}, [
      NT.el('div', { class: 'table-scroll' }, [t]),
      NT.el('div', { class: 'card' }, [
        NT.el('h3', { text: 'きっぷの判断' }),
        NT.el('p', { class: 'food-why',
          text: 'ドニチエコきっぷ（620円）は土日祝と毎月8日のみ有効。8/11は山の日なので使えますが、' +
                '8/12（水）は使えません。8/12は地下鉄一日乗車券（760円）か、都心ループの動きが' +
                '少ないなら都度払いのほうが安く済みます。' }),
        NT.el('p', { class: 'food-why',
          text: '8/11の想定は 名古屋→栄→熱田神宮伝馬町→矢場町→上前津→市役所→栄 で' +
                '運賃の合計が620円を超えるため、ドニチエコきっぷが有利です。' })
      ])
    ]);
  }

  function heatSection() {
    return NT.el('div', {}, [
      NT.el('div', { class: 'card' }, [
        NT.el('h3', { text: '猛暑対策' }),
        NT.el('ul', { class: 'triv' }, [
          '8月の名古屋は日中35℃を超える。屋外の連続は1時間までに区切る',
          '栄と名古屋駅は地下街が発達している。栄はセントラルパーク、名古屋駅はメイチカとエスカで' +
            '地上に出ずに移動できる区間が長い',
          '大須商店街は全蓋アーケードなので日陰。正午台を大須に充てるのは有効',
          '逃げ場になる屋内: オアシス21の地下、徳川美術館、トヨタ産業技術記念館、ノリタケの森',
          '熱田神宮は樹齢1000年超の大楠で木陰が濃く、真夏でも歩ける例外'
        ].map(function (t) { return NT.el('li', { text: t }); }))
      ]),
      /* 持ち物そのものは 01「出発前チェック」（assets/prep.js）が
         チェックリストとして持つ。ここに短い一覧を重ねて置くと、
         片方だけ直したときに食い違うので、案内だけを置いて実体は持たない。 */
      NT.el('p', { class: 'notice',
        text: '暑さに効く持ち物（モバイルバッテリー・晴雨兼用の傘・塩分・替えのシャツなど）は、' +
              '01「出発前チェック」のチェックリストにまとめてあります。' })
    ]);
  }

  NT.tipsSections.push(
    { no: '03', title: '営業時間・定休日', build: hoursTable },
    { no: '04', title: '移動の早見表',     build: transitTable },
    { no: '05', title: '暑さ対策',         build: heatSection },
    { no: '07', title: '地下鉄マップ',     build: function () { return NT.buildSubwayMap({}); } },
    { no: '08', title: '同行者に渡す', build: function () {
      var url = location.href.replace(/[^/]*$/, '').replace(/\/$/, '') + '/index.html';
      var cv = NT.qrCanvas ? NT.qrCanvas(url, 6) : null;
      return NT.el('div', { class: 'card qr-card' }, [
        NT.el('h3', { text: 'このサイトのQRコード' }),
        cv || NT.el('p', { class: 'notice warn',
          text: 'URLが長すぎてQRにできませんでした。下のアドレスを直接渡してください。' }),
        NT.el('p', { class: 'qr-url mono', text: url }),
        NT.el('p', { class: 'notice',
          text: 'ホーム画面に追加しておくと、地下街で電波が弱くても開けます。' })
      ]);
    } }
  );

  /* 節ごとの開閉状態。spotlist.js の openIds と同じ方式（モジュール変数を
     唯一の情報源にして、再描画をまたいでユーザーの開閉操作を保つ）。
     このページは営業時間表を「11時半に栄で開く」使い方が主なので、既定で
     開いているのは 03（営業時間・定休日）だけにする。他の節は目的があって
     わざわざ開きに行く参考情報として畳んでおく。01・02（出発前チェック・
     1泊2日の進め方）は旅の前に一度読むもので、現地で毎回開くものではないため
     先頭に置きつつ畳んでおく。 */
  var openIds = { '03': true };

  /* #tips-root を描き直す。再入可能（再描画しても節が重複しない）。
     各節は <details> にして、開いた節は再描画をまたいで開いたままにする
     （土産リストで個数を変えるたびに NT.renderTips() が丸ごと呼ばれるため、
     ここで状態を保たないと開いていた節が毎回閉じてしまう）。

     no でソートしてから描く: 07（地下鉄マップ）は tipspage.js 内の push で
     06（土産リスト、omiyage.js が tipspage.js の後に読み込まれて push する）
     より前に配列へ積まれるため、push 順そのままだと表示順が 03,04,05,07,06 に
     ずれる。読み込み順に依存させず番号順を保証するため、描画直前にソートする。
     no は必ず2桁のゼロ詰めにすること——文字列比較なので、'9' を使うと
     '10' より後ろに並ぶ。 */
  NT.renderTips = function () {
    var root = NT.$('#tips-root');
    if (!root) return;
    root.textContent = '';
    var ordered = NT.tipsSections.slice().sort(function (a, b) {
      return a.no < b.no ? -1 : a.no > b.no ? 1 : 0;
    });
    ordered.forEach(function (s) {
      var det = NT.el('details', {
        class: 'card tips-det', id: 'tips-' + s.no, open: !!openIds[s.no]
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
