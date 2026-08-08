(function (w) {
  var NT = w.NT;
  var state = { area: 'すべて', sort: 'area', origin: null, geoError: null };

  /* 開いているカードの id 集合。再描画（フィルタ・ソート・訪問済み）をまたいで
     開閉状態を保つための唯一の情報源。着地ハッシュがあれば最初に一度だけ種入れする。
     以後はユーザーの開閉操作（toggle イベント）だけが更新する。 */
  var openIds = {};
  (function seedFromHash() {
    var h = (location.hash || '').replace(/^#spot-/, '');
    if (h) openIds[h] = true;
  })();

  NT.distanceKm = function (a, b) {
    var R = 6371, r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  NT.toggleVisited = function (id) {
    var v = NT.get('visited', {});
    if (v[id]) delete v[id]; else v[id] = NT.now().toISOString();
    NT.set('visited', v);
  };

  function badges(s) {
    return [
      s.indoor ? NT.el('span', { class: 'badge indoor', text: '屋内' }) : null,
      !s.indoor && s.shade ? NT.el('span', { class: 'badge shade', text: '日陰' }) : null,
      s.unverified ? NT.el('span', { class: 'badge warn', text: '要確認' }) : null
    ];
  }

  function card(s) {
    var visited = !!NT.get('visited', {})[s.id];
    var dist = state.origin ? NT.distanceKm(state.origin, s) : null;
    var isOpen = !!openIds[s.id];

    /* --- 折りたたみ時（summary）: カードを開かずに選べる材料だけを載せる ---
       名称・バッジ・エリア・道案内1行（駅と徒歩時間）・距離順のときは距離・訪問済トグル */
    var visBtn = NT.el('button', {
      class: 'btn vis' + (visited ? ' on' : ''), type: 'button',
      text: visited ? '訪問済 ✓' : '訪問済にする',
      onclick: function (e) {
        /* summary の開閉トグルへ伝播させない。閉じたままチェックを付けられるようにする */
        e.preventDefault();
        e.stopPropagation();
        NT.toggleVisited(s.id);
        NT.renderSpots();
      }
    });
    var head = NT.el('div', { class: 'spot-head' }, [
      NT.el('span', { class: 'chev', 'aria-hidden': 'true' }),
      NT.el('h3', {}, [s.name].concat(badges(s))),
      visBtn
    ]);
    var sumMeta = NT.el('div', { class: 'spot-summeta mono' }, [].concat(
      NT.el('span', { class: 'sm-area', text: s.area }),
      NT.el('span', { class: 'sm-orient', text: s.station + ' ' + s.walk }),
      dist !== null ? NT.el('span', { class: 'sm-dist', text: dist.toFixed(1) + ' km' }) : null
    ));
    var summary = NT.el('summary', {}, [head, sumMeta]);

    /* --- 展開時（body）: それ以外の全部 --- */
    var meta = NT.el('dl', { class: 'spot-meta' }, [].concat(
      row('分類', s.category),
      row('場所', s.station + ' ' + s.walk),
      row('営業', s.hours),
      s.closed ? row('定休', s.closed) : [],
      s.fee ? row('料金', s.fee) : [],
      row('目安', s.stay + '分'),
      dist !== null ? row('距離', dist.toFixed(1) + ' km') : []
    ));
    var body = NT.el('div', { class: 'spot-body' }, [
      meta,
      NT.el('h4', { text: '豆知識' }),
      NT.el('ul', { class: 'triv' }, s.trivia.map(function (t) {
        return NT.el('li', { text: t });
      })),
      s.tips && s.tips.length ? NT.el('h4', { text: '現地での注意' }) : null,
      s.tips && s.tips.length ? NT.el('ul', { class: 'triv tips' }, s.tips.map(function (t) {
        return NT.el('li', { text: t });
      })) : null,
      NT.el('div', { class: 'tl-links' }, [
        s.map ? NT.el('a', { href: s.map, target: '_blank', rel: 'noopener', text: '地図で開く' }) : null,
        s.official ? NT.el('a', { href: s.official, target: '_blank', rel: 'noopener', text: '公式サイト' }) : null,
        s.tel ? NT.el('a', { href: 'tel:' + s.tel, text: s.tel }) : null
      ])
    ]);

    var det = NT.el('details', {
      class: 'card spot' + (visited ? ' visited' : ''),
      id: 'spot-' + s.id,
      open: isOpen
    }, [summary, NT.el('div', { class: 'spot-body-wrap' }, [body])]);

    /* 開閉状態を openIds に記録する。再描画（フィルタ・ソート・訪問済み）をまたいで
       ユーザーが開いたカードを勝手に閉じない・閉じたカードを勝手に開かないため */
    det.addEventListener('toggle', function () {
      if (det.open) openIds[s.id] = true; else delete openIds[s.id];
    });

    return det;

    function row(k, v) {
      return [NT.el('dt', { text: k }), NT.el('dd', { text: v })];
    }
  }

  function controls() {
    var areas = ['すべて'].concat(NT.AREAS);
    var geoBtn = NT.el('button', { class: 'btn' + (state.sort === 'geo' ? ' on' : ''),
      type: 'button', text: '現在地から近い順',
      onclick: function () {
        if (!navigator.geolocation) {
          state.geoError = 'この端末では位置情報が使えません。エリア順で表示します。';
          NT.renderSpots(); return;
        }
        geoBtn.disabled = true; geoBtn.textContent = '測位中…';
        navigator.geolocation.getCurrentPosition(function (pos) {
          state.origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          state.sort = 'geo'; state.geoError = null; NT.renderSpots();
        }, function (err) {
          state.sort = 'area'; state.origin = null;
          state.geoError = err.code === 1
            ? '位置情報が許可されなかったので、エリア順で表示します。'
            : '位置情報を取得できなかったので、エリア順で表示します。';
          NT.renderSpots();
        }, { timeout: 8000, maximumAge: 60000 });
      } });
    return NT.el('div', {}, [
      NT.el('div', { class: 'btnrow' }, areas.map(function (a) {
        return NT.el('button', { class: 'btn' + (state.area === a ? ' on' : ''),
          type: 'button', text: a,
          onclick: function () { state.area = a; NT.renderSpots(); } });
      })),
      NT.el('div', { class: 'btnrow' }, [
        geoBtn,
        NT.el('button', { class: 'btn' + (state.sort === 'area' ? ' on' : ''),
          type: 'button', text: 'エリア順',
          /* state.origin を消す。sort だけを 'area' に倒して origin を残すと、
             card() の distance 表示が state.origin の有無だけで判定しているため
             （エリア順に戻っても）過去に取得した位置からの距離が出続けてしまう。
             歩いて移動した後の古い距離は、出さないより悪い。origin ごと捨てて
             再度「現在地から近い順」を押したときは必ず取り直させる。 */
          onclick: function () { state.sort = 'area'; state.origin = null; NT.renderSpots(); } })
      ])
    ]);
  }

  NT.renderSpots = function () {
    var root = NT.$('#spots-root');
    if (!root) return;
    root.textContent = '';
    if (NT.buildGacha) {
      root.appendChild(NT.el('section', {}, [
        NT.el('div', { class: 'sec-head' }, [
          NT.el('span', { class: 'no', text: '00' }), NT.el('h2', { text: '豆知識' })
        ]),
        NT.buildGacha()
      ]));
    }
    root.appendChild(NT.el('section', {}, [
      NT.el('div', { class: 'sec-head' }, [
        NT.el('span', { class: 'no', text: '01' }), NT.el('h2', { text: '絞り込み' })
      ]),
      controls()
    ]));

    var list = NT.spots.filter(function (s) {
      return state.area === 'すべて' || s.area === state.area;
    });
    if (state.sort === 'geo' && state.origin) {
      list = list.slice().sort(function (a, b) {
        return NT.distanceKm(state.origin, a) - NT.distanceKm(state.origin, b);
      });
    } else {
      list = list.slice().sort(function (a, b) {
        return NT.AREAS.indexOf(a.area) - NT.AREAS.indexOf(b.area);
      });
    }

    var sec = NT.el('section', {}, [
      NT.el('div', { class: 'sec-head' }, [
        NT.el('span', { class: 'no', text: '02' }),
        NT.el('h2', { text: '名所 ' + list.length + '件' })
      ])
    ]);
    if (state.geoError) NT.notice(sec, state.geoError, 'warn');
    if (!list.length) NT.notice(sec, 'この条件に合う名所がありません。');
    list.forEach(function (s) { sec.appendChild(card(s)); });
    root.appendChild(sec);

    /* ハッシュ指定があればそこへ寄せる。行程ページからの「詳細」の着地 */
    if (location.hash && NT.$(location.hash)) {
      NT.$(location.hash).scrollIntoView({ block: 'start' });
    }
  };
})(window);
