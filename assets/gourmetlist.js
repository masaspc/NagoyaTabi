(function (w) {
  var NT = w.NT;
  /* Task 10 が完成メーターなどを差し込む拡張点。描画の先頭で毎回呼ばれる。
     読み込み順に依存しないよう防御的に初期化する */
  NT.gourmetSections = NT.gourmetSections || [];
  /* Task 10 がカードごとの記録欄（チェック・写真・メモ）を差し込む拡張点。
     カードを組み立てた直後に function(card, food, parts) として呼ばれる。
     parts.summary は <summary> 自身、parts.body はカード本文の div。
     カードは既定で閉じており、閉じたまま見せたい操作（食べた チェックなど）は
     parts.summary に付けること。<details> の子は summary 以外すべて閉じた
     状態でネイティブに非表示になるため、parts.body に付けたものは開かないと見えない。
     summary にクリック可能な要素を足す場合は spotlist.js の 訪問済にする ボタンに倣い、
     click ハンドラで e.preventDefault()/e.stopPropagation() して開閉トグルへ伝播させない */
  NT.foodDecorators = NT.foodDecorators || [];

  var state = { cat: 'すべて' };
  var CATS = ['すべて', '食事', '軽食', '甘味', '土産'];

  /* 開いているカードの id 集合。フィルタ切り替えをまたいで開閉状態を保つための
     唯一の情報源。着地ハッシュがあれば最初に一度だけ種入れする。
     以後はユーザーの開閉操作（toggle イベント）だけが更新する（spotlist.js と同じ方式） */
  var openIds = {};
  (function seedFromHash() {
    var h = (location.hash || '').replace(/^#food-/, '');
    if (h) openIds[h] = true;
  })();

  function whereItem(p) {
    var s = p.spotId && NT.spotById(p.spotId);
    return NT.el('li', {}, [
      NT.el('strong', { text: p.name }),
      NT.el('span', { class: 'where-meta', text: ' ' + (p.area || '') + ' / ' + p.hours }),
      p.note ? NT.el('span', { class: 'where-note', text: p.note }) : null,
      NT.el('span', { class: 'tl-links' }, [
        s ? NT.el('a', { href: 'spots.html#spot-' + s.id, text: '詳細' }) : null,
        s && s.map ? NT.el('a', { href: s.map, target: '_blank', rel: 'noopener', text: '地図' }) : null,
        !s && p.map ? NT.el('a', { href: p.map, target: '_blank', rel: 'noopener', text: '地図' }) : null,
        s && s.unverified ? NT.el('span', { class: 'badge warn', text: '要確認' }) : null
      ])
    ]);
  }

  /* --- 折りたたみ時（summary）: カードを開かずに選べる材料だけを載せる ---
     名称・五食バッジ・カテゴリ・価格帯。詳細（何が名古屋なのか・食べ方・店・豆知識）は開いたときだけ */
  function card(f) {
    var isOpen = !!openIds[f.id];
    /* 分類グリフ + 色（Task 29）。spotlist.js と同じ考え方: 20品の一覧を
       「形と色」で見分けられるように、折りたたみ時のsummaryにも常に出す。 */
    var catColor = NT.artCategoryColor ? NT.artCategoryColor(f.cat) : null;
    var catIcon = NT.artIcon ? NT.artIcon(f.cat, { size: 20 }) : null;
    if (catIcon) {
      catIcon.classList.add('cat-ico');
      if (catColor) catIcon.style.color = catColor;
    }
    /* 食べたトグル（record.js が差し込む）の置き場を空けるため、価格は
       summary の2行目（summeta）へ回す。1行目は chevron + 名前 + トグルだけにして、
       折りたたみ時に押しやすい列を保つ */
    var summary = NT.el('summary', {}, [
      NT.el('div', { class: 'spot-head' }, [
        NT.el('span', { class: 'chev', 'aria-hidden': 'true' }),
        catIcon,
        NT.el('h3', {}, [f.name,
          f.slot ? NT.el('span', { class: 'badge kin', text: '五食' }) : null])
      ]),
      NT.el('div', { class: 'spot-summeta mono' }, [
        NT.el('span', { class: 'sm-cat', text: f.cat }),
        NT.el('span', { class: 'food-price', text: f.price })
      ])
    ]);

    /* 名所線画（Task 29）。core.js の NT.LANDMARK_FOR_FOOD に対応がある品だけ、
       開いたときに絵を出す。drawInの配線はfx.jsのscanArtが自動でやる
       （spotlist.js と同じ仕組み）。 */
    var landmarkKey = NT.LANDMARK_FOR_FOOD && NT.LANDMARK_FOR_FOOD[f.id];
    var landmarkArt = landmarkKey && NT.artLandmark
      ? NT.artLandmark(landmarkKey, { size: 64, color: 'var(--accent)' }) : null;
    var whatRow = landmarkArt
      ? NT.el('div', { class: 'body-top' }, [
          NT.el('p', { class: 'food-what', text: f.what }),
          NT.el('div', { class: 'card-landmark', 'aria-hidden': 'true' }, [landmarkArt])
        ])
      : NT.el('p', { class: 'food-what', text: f.what });

    var body = NT.el('div', { class: 'food-body' }, [
      whatRow,
      NT.el('h4', { text: 'なぜ名古屋なのか' }),
      NT.el('p', { class: 'food-why', text: f.why }),
      f.howto && f.howto.length ? NT.el('h4', { text: '食べ方' }) : null,
      f.howto && f.howto.length ? NT.el('ol', { class: 'triv' }, f.howto.map(function (t) {
        return NT.el('li', { text: t }); })) : null,
      NT.el('h4', { text: '食べられる店' }),
      NT.el('ul', { class: 'where' }, f.where.map(whereItem)),
      f.trivia && f.trivia.length ? NT.el('h4', { text: '豆知識' }) : null,
      f.trivia && f.trivia.length ? NT.el('ul', { class: 'triv' }, f.trivia.map(function (t) {
        return NT.el('li', { text: t }); })) : null
    ]);

    var det = NT.el('details', {
      class: 'card food', id: 'food-' + f.id, open: isOpen
    }, [summary, NT.el('div', { class: 'spot-body-wrap' }, [body])]);

    det.addEventListener('toggle', function () {
      if (det.open) openIds[f.id] = true; else delete openIds[f.id];
    });

    /* summary は details が閉じていても常に見える唯一の子。訪問済みトグルに倣い、
       決まったクラス名を知らなくても正しい場所へ挿せるよう summary/body を渡す */
    NT.foodDecorators.forEach(function (fn) { fn(det, f, { summary: summary, body: body }); });
    return det;
  }

  function controls() {
    return NT.el('div', { class: 'btnrow' }, CATS.map(function (c) {
      return NT.el('button', { class: 'btn' + (state.cat === c ? ' on' : ''),
        type: 'button', text: c,
        onclick: function () { state.cat = c; NT.renderGourmet(); } });
    }));
  }

  NT.renderGourmet = function () {
    var root = NT.$('#gourmet-root');
    if (!root) return;
    root.textContent = '';

    NT.gourmetSections.forEach(function (fn) { fn(root); });

    root.appendChild(NT.el('section', {}, [
      NT.el('div', { class: 'sec-head' }, [
        NT.el('span', { class: 'no', text: '02' }), NT.el('h2', { text: '名物 図鑑' })
      ]),
      controls()
    ]));

    var list = NT.foods.filter(function (f) {
      return state.cat === 'すべて' || f.cat === state.cat;
    });
    var sec = NT.el('section', { class: 'tight' });
    if (!list.length) NT.notice(sec, 'この条件に合う名物がありません。');
    list.forEach(function (f) { sec.appendChild(card(f)); });
    root.appendChild(sec);

    if (location.hash && NT.$(location.hash)) {
      NT.$(location.hash).scrollIntoView({ block: 'start' });
    }
  };
})(window);
