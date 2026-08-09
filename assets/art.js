/* 作品ライブラリ（Task 27）。写真・アイコンフォントを一切使わない制約（オフライン、
   地下鉄トンネルでも開ける）の下で、線画・パターンをすべてコードで描く。
   外部依存ゼロ。file:// でも動く。NT 名前空間に SVG ファクトリ関数を積むだけで、
   ページへの適用（配置・余白・タイポグラフィ）は別タスクが行う。

   公開API（すべて window.NT 上）:
     NT.artLandmark(name, opts?)   → <svg> 要素（名所の線画。80〜120px 想定）
     NT.artIcon(category, opts?)   → <svg> 要素（分類グリフ。16〜24px 想定）
     NT.artCategoryColor(category) → 'var(--cat-xxx)' 文字列 | null
     NT.artKinshachi(opts?)        → <svg> 要素（金鯱シルエット。見出し用）
     NT.artPattern(name, opts?)    → { tile, dataUri, width, height }
     NT.ART_LANDMARKS             → [{key, label}, ...] 列挙用
     NT.ART_CATEGORIES            → [{key: 日本語ラベル, cssVar}, ...] 列挙用

   色の方針: 個々の図形は既定で stroke/fill="currentColor" を使う。周囲の要素で
   CSS の color を設定すれば追従する（例: style="color:var(--cat-meal)"）。
   金鯱と名古屋城の鯱だけは元ネタが「金」なので既定で var(--kin) を使う
   （opts.color で上書き可能）。パターンの data URI だけは静的な画像なので
   var(--rule) 相当の色を呼び出し時点で解決して焼き込む（テーマ切替時は
   NT.artPattern を呼び直す必要がある。詳しくは各関数のコメント参照）。 */
(function (w) {
  var NT = w.NT;
  var NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs, kids) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (k) { e.appendChild(k); });
    return e;
  }

  /* 100x100 の viewBox を持つ svg の外枠を作る。size はCSS px相当（width/height属性）。 */
  function frame(viewBox, size, cls, label, kids) {
    return svgEl('svg', {
      viewBox: viewBox, width: size, height: size, class: cls,
      role: 'img', 'aria-label': label, focusable: 'false'
    }, kids);
  }

  function path(d, attrs) {
    var a = { d: d, fill: 'none', stroke: 'currentColor' };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    return svgEl('path', a);
  }
  function line(x1, y1, x2, y2, attrs) {
    var a = { x1: x1, y1: y1, x2: x2, y2: y2, stroke: 'currentColor' };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    return svgEl('line', a);
  }
  function circle(cx, cy, r, attrs) {
    var a = { cx: cx, cy: cy, r: r, fill: 'none', stroke: 'currentColor' };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    return svgEl('circle', a);
  }
  function ellipse(cx, cy, rx, ry, attrs) {
    var a = { cx: cx, cy: cy, rx: rx, ry: ry, fill: 'none', stroke: 'currentColor' };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    return svgEl('ellipse', a);
  }
  function rect(x, y, wid, hei, attrs) {
    var a = { x: x, y: y, width: wid, height: hei, fill: 'none', stroke: 'currentColor' };
    Object.keys(attrs || {}).forEach(function (k) { a[k] = attrs[k]; });
    return svgEl('rect', a);
  }

  var STROKE = { 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  function S(extra) {
    var a = {}; Object.keys(STROKE).forEach(function (k) { a[k] = STROKE[k]; });
    Object.keys(extra || {}).forEach(function (k) { a[k] = extra[k]; });
    return a;
  }

  /* ===================================================================
     1. 名所の線画（80〜120px 表示を想定。viewBox は 0 0 100 100）
     =================================================================== */
  var LANDMARKS = {
    /* 名古屋城 + 金鯱。石垣の強い末広がり（＝城とすぐ分かる決め手）→ 天守の矩形
       （窓1つ）→ フックを作らない左右対称の単純な一筆屋根 → 稜線の両端に金鯱。
       最初の版は屋根の両端に隙間を空けたフック（小さな渦）を描いており、
       金色の勾玉と組み合わさると「うさぎの耳」に見えてしまった（実描画で確認）。
       屋根を塔の角にぴったり接する単純な弧に描き直し、金鯱も稜線に直接重ねる
       小さな三角に変えてある。 */
    nagoyajo: function () {
      var g = [];
      g.push(line(14, 90, 86, 90, S()));
      g.push(path('M18,90 L31,56 L69,56 L82,90', S()));
      g.push(rect(32, 32, 36, 24, S()));
      g.push(rect(46, 40, 8, 8, S({ 'stroke-width': 3 })));
      g.push(path('M30,32 Q50,10 70,32', S()));
      /* 金鯱（左右2体）。屋根の稜線の両端に重ねる、金色の小さな三角の一筆 */
      g.push(svgEl('path', {
        d: 'M30,32 L24,20 L34,26 Z', fill: 'var(--kin)', stroke: 'none'
      }));
      g.push(svgEl('path', {
        d: 'M70,32 L76,20 L66,26 Z', fill: 'var(--kin)', stroke: 'none'
      }));
      return g;
    },
    /* 熱田神宮の鳥居。上の笠木は両端が反る太い一筆、下の貫は直線、柱は下ほど開く */
    atsuta: function () {
      var g = [];
      g.push(path('M16,24 Q50,13 84,24', S({ 'stroke-width': 6 })));
      g.push(line(34, 40, 66, 40, S()));
      g.push(line(33, 22, 27, 88, S()));
      g.push(line(67, 22, 73, 88, S()));
      return g;
    },
    /* ひつまぶし。お櫃（浅い木の丸桶）+ 中に並ぶうなぎの細切り（すべて同じ向きの
       平行な短い線）。最初の版は斜めに交差する箸を重ねており、細切りと交差して
       ただの落書きに見えた（実描画で確認）。箸をやめ、細切りだけをきれいに
       並べる方に振った。 */
    hitsumabushi: function () {
      var g = [];
      g.push(ellipse(50, 54, 30, 9, S()));
      g.push(path('M20,54 L20,68 Q50,80 80,68 L80,54', S()));
      g.push(line(30, 50, 40, 44, S({ 'stroke-width': 3.5 })));
      g.push(line(40, 52, 50, 46, S({ 'stroke-width': 3.5 })));
      g.push(line(50, 52, 60, 46, S({ 'stroke-width': 3.5 })));
      g.push(line(60, 50, 70, 44, S({ 'stroke-width': 3.5 })));
      return g;
    },
    /* 味噌カツ丼。丼 + 大きく平たい衣付きカツ（丼にしっかり重ねて置く）+
       中央を貫く太い味噌だれのジグザグ。最初の版はカツが小さく丼の上に浮いて
       見え、ただの塊にしか見えなかった（実描画で確認）。カツを大きく低くして
       丼に重ね、ジグザグも一段太くした。 */
    misokatsu: function () {
      var g = [];
      g.push(ellipse(50, 66, 32, 8, S()));
      g.push(path('M18,66 Q50,90 82,66', S()));
      g.push(rect(24, 44, 52, 20, { rx: 4, ry: 4, stroke: 'currentColor', 'stroke-width': 4 }));
      g.push(path('M22,44 q4,-6 8,0 q4,-6 8,0 q4,-6 8,0 q4,-6 8,0 q4,-6 8,0 q4,-6 8,0',
        S({ 'stroke-width': 3 })));
      g.push(path('M28,54 q6,-7 12,0 q6,-7 12,0 q6,-7 12,0', S({ 'stroke-width': 4.5 })));
      return g;
    },
    /* 手羽先。先端の骨が露出した「フリフリ手羽先」の骨付きドラム形。
       最初の版は骨の露出がなく、ただの空豆シルエットにしか見えなかった
       （実描画で確認）。丸い肉のしずく形はそのままに、骨とその先端の関節を
       はっきり突き出させ、一目で「骨付き肉」と分かるようにした。 */
    tebasaki: function () {
      var g = [];
      g.push(path('M30,74 Q20,58 26,42 Q30,30 42,32 Q52,35 50,48 Q54,58 46,70 Q40,78 30,74 Z', S()));
      g.push(line(40, 32, 34, 14, S({ 'stroke-width': 5.5 })));
      g.push(circle(33, 11, 4.5, S({ 'stroke-width': 3.5 })));
      g.push(path('M32,58 Q38,54 38,46', S({ 'stroke-width': 2.2 })));
      return g;
    },
    /* 喫茶店のカップ。カップ+受け皿+取っ手+湯気2本 */
    kissa: function () {
      var g = [];
      g.push(path('M30,48 L34,78 Q50,86 66,78 L70,48 Z', S()));
      g.push(ellipse(50, 48, 20, 6, S()));
      g.push(path('M70,54 Q86,56 83,68 Q80,77 67,73', S()));
      g.push(ellipse(50, 86, 34, 6, S()));
      g.push(path('M42,38 Q37,30 42,24 Q47,17 42,9', S({ 'stroke-width': 3 })));
      g.push(path('M58,38 Q53,30 58,24 Q63,17 58,9', S({ 'stroke-width': 3 })));
      return g;
    },
    /* 大須のアーケード。奥へすぼまる3連アーチでトンネル状の商店街を表す */
    osu: function () {
      var g = [];
      g.push(path('M8,88 L8,50 Q50,12 92,50 L92,88', S()));
      g.push(path('M24,88 L24,55 Q50,27 76,55 L76,88', S()));
      g.push(path('M38,88 L38,60 Q50,42 62,60 L62,88', S()));
      return g;
    },
    /* 徳川美術館。破風三角 + エンタブラチュア + 列柱 + 基壇 */
    tokugawa: function () {
      var g = [];
      g.push(path('M12,42 L50,14 L88,42', S()));
      g.push(line(10, 42, 90, 42, S()));
      g.push(line(24, 42, 24, 82, S({ 'stroke-width': 3.5 })));
      g.push(line(40, 42, 40, 82, S({ 'stroke-width': 3.5 })));
      g.push(line(60, 42, 60, 82, S({ 'stroke-width': 3.5 })));
      g.push(line(76, 42, 76, 82, S({ 'stroke-width': 3.5 })));
      g.push(line(8, 86, 92, 86, S()));
      return g;
    },
    /* 新幹線。上下2本の弧が右端の同じ点で合流する一筆＝実際に尖った先頭形状に
       なる作図。最初の版は先端が丸くすぼまるだけで「石ころ」にしか見えなかった
       （実描画で確認）。上下の弧を同じ終点(96,50)に合わせて本当の鼻先を作り、
       窓も車体の輪郭に重ねて描き直した。 */
    shinkansen: function () {
      var g = [];
      g.push(path('M6,38 Q40,34 70,38 Q90,41 96,50 Q90,59 70,62 Q40,66 6,62 Z', S()));
      g.push(ellipse(23, 43, 7.5, 4.5, S({ 'stroke-width': 3 })));
      g.push(line(16, 52, 92, 50, S({ 'stroke-width': 3 })));
      g.push(line(2, 68, 98, 68, S({ 'stroke-width': 3 })));
      return g;
    },
    /* 地下街・駅。庇（キャノピー）+ 下りの階段 + 小さな駅マークの丸 */
    chikagai: function () {
      var g = [];
      g.push(circle(50, 16, 7, S()));
      g.push(line(20, 32, 80, 32, S()));
      g.push(line(26, 32, 26, 42, S()));
      g.push(line(74, 32, 74, 42, S()));
      g.push(path('M22,44 L40,44 L40,56 L58,56 L58,68 L76,68 L76,80', S()));
      return g;
    }
  };
  var LANDMARK_LABELS = {
    nagoyajo: '名古屋城', atsuta: '熱田神宮の鳥居', hitsumabushi: 'ひつまぶし',
    misokatsu: '味噌カツ丼', tebasaki: '手羽先', kissa: '喫茶店のモーニングのカップ',
    osu: '大須のアーケード', tokugawa: '徳川美術館', shinkansen: '新幹線',
    chikagai: '地下街・駅'
  };
  NT.ART_LANDMARKS = Object.keys(LANDMARKS).map(function (k) {
    return { key: k, label: LANDMARK_LABELS[k] };
  });

  /* name: LANDMARK_LABELS のキー。opts.size: 表示px（既定96）。
     opts.color: currentColor の代わりに使う色（既定は指定なし=currentColor 継承）。
     未知の name は console.warn の上、空の svg を返す（表示は壊さない）。 */
  NT.artLandmark = function (name, opts) {
    opts = opts || {};
    var build = LANDMARKS[name];
    if (!build) {
      w.console && console.warn('[art] unknown landmark: ' + name);
      build = function () { return []; };
    }
    var size = opts.size || 96;
    var svg = frame('0 0 100 100', size, 'nt-art nt-art-landmark nt-art-' + name,
      LANDMARK_LABELS[name] || name, build());
    if (opts.color) svg.style.color = opts.color;
    return svg;
  };

  /* ===================================================================
     2. 分類グリフ（16〜24px 表示を想定。viewBox は 0 0 24 24）
     =================================================================== */
  var ISTROKE = { 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  function IS(extra) {
    var a = {}; Object.keys(ISTROKE).forEach(function (k) { a[k] = ISTROKE[k]; });
    Object.keys(extra || {}).forEach(function (k) { a[k] = extra[k]; });
    return a;
  }

  var ICONS = {
    /* 神社: 鳥居のミニ版 */
    shrine: function () {
      return [
        path('M3,7 Q12,4.2 21,7', IS({ 'stroke-width': 2.2 })),
        line(7, 10, 7, 21, IS()),
        line(17, 10, 17, 21, IS()),
        line(6, 12.5, 18, 12.5, IS())
      ];
    },
    /* 城: 三角屋根+矩形の天守。最初の版は屋根の両端に丸（鯱のつもり）を置いており、
       ネズミの顔に見えてしまった（実描画で確認）ので外した。 */
    castle: function () {
      return [
        rect(6, 12, 12, 8, IS()),
        path('M4,12 L12,4 L20,12', IS()),
        line(10, 16, 14, 16, IS({ 'stroke-width': 1.4 }))
      ];
    },
    /* 博物館: 破風+列柱+基壇 */
    museum: function () {
      return [
        path('M3,9 L12,3 L21,9', IS()),
        line(3, 9, 21, 9, IS()),
        line(6, 9, 6, 18, IS()),
        line(11, 9, 11, 18, IS()),
        line(16, 9, 16, 18, IS()),
        line(3, 20, 21, 20, IS())
      ];
    },
    /* 公園・広場: 木（丸い樹冠+幹） */
    park: function () {
      return [
        circle(12, 9, 6, IS()),
        line(12, 15, 12, 21, IS())
      ];
    },
    /* ショッピング: 手提げ袋 */
    shopping: function () {
      return [
        path('M8,8 Q8,3 12,3 Q16,3 16,8', IS()),
        rect(5, 8, 14, 13, { rx: 1.5, stroke: 'currentColor', 'stroke-width': 1.8, fill: 'none' })
      ];
    },
    /* 商店街: 小さなアーチ入口 */
    shotengai: function () {
      return [
        path('M4,21 L4,12 Q12,4 20,12 L20,21', IS())
      ];
    },
    /* 商業施設: ビル+小窓2つ */
    mall: function () {
      return [
        rect(5, 4, 14, 17, IS()),
        rect(9, 8, 3, 3, { fill: 'currentColor', stroke: 'none' }),
        rect(14, 8, 3, 3, { fill: 'currentColor', stroke: 'none' }),
        line(5, 21, 19, 21, IS())
      ];
    },
    /* 土産: リボン掛けの箱 */
    miyage: function () {
      return [
        rect(4, 9, 16, 12, IS()),
        line(12, 9, 12, 21, IS()),
        line(4, 14, 20, 14, IS()),
        path('M9,9 Q9,4 12,4 Q15,4 15,9', IS({ 'stroke-width': 1.6 }))
      ];
    },
    /* 食事: 丼+箸。最初の版は箸が丼の右肩に浮いていて、チェックマークに見えた
       （実描画で確認）。丼の縁をまたいで斜めに渡す形に描き直した。 */
    meal: function () {
      return [
        path('M4,11 Q12,19 20,11', IS()),
        line(4, 11, 20, 11, IS()),
        line(7, 17, 19, 5, IS({ 'stroke-width': 1.4 })),
        line(9, 18, 21, 6, IS({ 'stroke-width': 1.4 }))
      ];
    },
    /* 軽食: おにぎり（三角+海苔の帯） */
    snack: function () {
      return [
        path('M12,3 L20,20 L4,20 Z', IS()),
        line(6.4, 16, 17.6, 16, IS({ 'stroke-width': 2.4 }))
      ];
    },
    /* 屋台・グルメ: 焼き鳥の串 */
    yatai: function () {
      return [
        line(4, 20, 20, 4, IS()),
        circle(9, 15, 2.6, IS()),
        circle(14, 10, 2.6, IS())
      ];
    },
    /* 屋台街: 提灯（樽形+横リブ2本+上下の口）。最初の版は縦線+横線の十字が
       入っており、標的（クロスヘア）に見えた（実描画で確認）。縦の中心線を
       やめ、横リブだけを残した。 */
    yataigai: function () {
      return [
        ellipse(12, 12, 6.5, 8, IS()),
        line(6, 8.5, 18, 8.5, IS({ 'stroke-width': 1.3 })),
        line(6, 15.5, 18, 15.5, IS({ 'stroke-width': 1.3 })),
        rect(10, 2.5, 4, 2.5, IS({ 'stroke-width': 1.3 })),
        rect(10, 18.5, 4, 2.5, IS({ 'stroke-width': 1.3 })),
        line(12, 0.5, 12, 2.5, IS({ 'stroke-width': 1.3 }))
      ];
    },
    /* 喫茶: カップのミニ版 */
    kissa: function () {
      return [
        path('M5,9 L6.5,18 Q12,21 17.5,18 L19,9 Z', IS()),
        path('M19,11 Q23,11.5 22,15 Q21,18 17.5,17', IS({ 'stroke-width': 1.5 })),
        line(9, 6, 9, 3, IS({ 'stroke-width': 1.4 })),
        line(14, 6, 14, 3, IS({ 'stroke-width': 1.4 }))
      ];
    },
    /* 甘味: 三色だんご。最初の版は串の線が3つの丸を貫通しており、鎖のように
       繋がって見えた（実描画で確認）。串は下の柄だけに残し、丸どうしは
       間隔を空けて独立させた。 */
    kanmi: function () {
      return [
        circle(12, 5.6, 2.8, IS()),
        circle(12, 12, 2.8, IS()),
        circle(12, 18.4, 2.8, IS()),
        line(12, 21.2, 12, 23.5, IS({ 'stroke-width': 1.6 }))
      ];
    }
  };

  /* データ上のカテゴリ文字列（spots.data.js の category / foods.data.js の cat）を
     そのままキーに使う。内部の英字キーやCSS変数名を呼び出し側が知る必要はない。 */
  var CATS = {
    '神社': { icon: 'shrine', cssVar: '--cat-shrine' },
    '城': { icon: 'castle', cssVar: '--cat-castle' },
    '博物館': { icon: 'museum', cssVar: '--cat-museum' },
    '公園・広場': { icon: 'park', cssVar: '--cat-park' },
    'ショッピング': { icon: 'shopping', cssVar: '--cat-shopping' },
    '商店街': { icon: 'shotengai', cssVar: '--cat-shotengai' },
    '商業施設': { icon: 'mall', cssVar: '--cat-mall' },
    '土産': { icon: 'miyage', cssVar: '--cat-miyage' },
    '食事': { icon: 'meal', cssVar: '--cat-meal' },
    '軽食': { icon: 'snack', cssVar: '--cat-snack' },
    '屋台・グルメ': { icon: 'yatai', cssVar: '--cat-yatai' },
    '屋台街': { icon: 'yataigai', cssVar: '--cat-yataigai' },
    '喫茶': { icon: 'kissa', cssVar: '--cat-kissa' },
    '甘味': { icon: 'kanmi', cssVar: '--cat-kanmi' }
  };
  NT.ART_CATEGORIES = Object.keys(CATS).map(function (k) {
    return { key: k, cssVar: CATS[k].cssVar };
  });

  /* category: spots.data.js の category / foods.data.js の cat とまったく同じ文字列
     （例: '食事', '神社', '屋台・グルメ'）。opts.size: 表示px（既定20）。
     opts.color: currentColor の代わりに使う色。未知の category は console.warn の上、
     汎用の小さな点グリフを返す（表示は壊さない＝データに新分類が増えても落ちない）。 */
  NT.artIcon = function (category, opts) {
    opts = opts || {};
    var def = CATS[category];
    var iconKey = def ? def.icon : null;
    var build = iconKey && ICONS[iconKey];
    if (!build) {
      if (category) w.console && console.warn('[art] unknown category icon: ' + category);
      build = function () { return [circle(12, 12, 3, IS())]; };
    }
    var size = opts.size || 20;
    var svg = frame('0 0 24 24', size, 'nt-art nt-art-icon nt-art-icon-' + (iconKey || 'unknown'),
      category || '分類', build());
    if (opts.color) svg.style.color = opts.color;
    return svg;
  };

  /* category: 上と同じ文字列。対応する CSS変数を 'var(--cat-xxx)' の形で返す。
     style.color / style.backgroundColor などにそのまま代入できる。
     未知の category は console.warn の上 null を返す。 */
  NT.artCategoryColor = function (category) {
    var def = CATS[category];
    if (!def) {
      w.console && console.warn('[art] unknown category color: ' + category);
      return null;
    }
    return 'var(' + def.cssVar + ')';
  };

  /* ===================================================================
     3. 金鯱シルエット（見出し用。1体で存在感を持たせる別枠）
     =================================================================== */
  /* 勾玉（まがたま）状のシルエット: 頭は単純な円、尾は円周上の2点から
     1つの尖った先端へ集める2本のベジェ曲線（新幹線の鼻先と同じ手口＝
     2本の曲線を同じ終点に合わせると、丸めずに本当に尖らせられる）。
     円と尾の閉じ目（始点と終点を結ぶ直線）は円の内側の弦になるので、
     円をその上に重ねて描けば継ぎ目は隠れ、1つの滑らかなシルエットに見える。

     最初の版は体の輪郭を9本の小さなベジェで手描きしており、輪郭が波打って
     「毛玉」にしか見えなかった（実描画で確認）。曲線の本数を2本まで減らし、
     円との組み合わせだけで「丸まった金色の魚」を作る方式に作り直した。 */
  NT.artKinshachi = function (opts) {
    opts = opts || {};
    var size = opts.size || 64;
    var color = opts.color || 'var(--kin)';
    var tail = svgEl('path', {
      d: 'M53.9,44.5 Q75,40 92,88 Q60,95 34.3,56.9 Z',
      fill: color, stroke: 'none'
    });
    var head = circle(36, 38, 19, { fill: color, stroke: 'none' });
    /* 背びれ（尾の外側の縁から3本、短い直線で突き出す） */
    var fins = svgEl('path', {
      d: 'M66,47 L72,41 M76,55 L83,50 M84,69 L92,65',
      fill: 'none', stroke: color, 'stroke-width': 3,
      'stroke-linecap': 'round'
    });
    /* 目の抜き（背景色で打ち抜く。テーマが変わっても自動で追従する） */
    var eye = circle(30, 32, 3, { fill: 'var(--bg)', stroke: 'none' });
    var svg = frame('0 0 100 100', size, 'nt-art nt-art-kinshachi', '金鯱',
      [tail, head, fins, eye]);
    return svg;
  };

  /* ===================================================================
     4. 麻の葉・青海波パターン（背景用。ごく淡く使う想定）
     =================================================================== */
  /* 六角格子の各中心から対頂点をむすぶ3本の対角線＝麻の葉。
     1タイル分の座標だけを正しく作れば <pattern>／data URI どちらも
     ぴったり繋がって見える（隣接コピーとの境界で線がずれない）。 */
  function asanohaTile(r, strokeColor, strokeOpacity, strokeW) {
    var wid = r * Math.sqrt(3), hei = r * 3;
    function star(cx, cy) {
      var v = [];
      for (var k = 0; k < 6; k++) {
        var ang = (60 * k - 90) * Math.PI / 180;
        v.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
      }
      var d = 'M' + v[0][0] + ',' + v[0][1] + 'L' + v[3][0] + ',' + v[3][1] +
        'M' + v[1][0] + ',' + v[1][1] + 'L' + v[4][0] + ',' + v[4][1] +
        'M' + v[2][0] + ',' + v[2][1] + 'L' + v[5][0] + ',' + v[5][1];
      return d;
    }
    var centers = [
      [wid / 2, r],
      [0, 2.5 * r], [wid, 2.5 * r],
      [0, -0.5 * r], [wid, -0.5 * r]
    ];
    var d = centers.map(function (c) { return star(c[0], c[1]); }).join(' ');
    return {
      width: wid, height: hei,
      markup: '<path d="' + d + '" fill="none" stroke="' + strokeColor + '" ' +
        'stroke-width="' + strokeW + '" stroke-opacity="' + strokeOpacity + '"/>'
    };
  }

  /* 同心円弧（波）を敷き詰める青海波。1タイル=1組の同心弧で、上下左右そのまま
     並べるだけで隣接コピーの弧が繋がるように、弧の両端をタイルの下端に揃える。 */
  function seigaihaTile(r, strokeColor, strokeOpacity, strokeW) {
    var wid = r * 2, hei = r;
    var rings = [1, 0.72, 0.46, 0.2].map(function (f) { return r * f; });
    var d = rings.map(function (rr) {
      return 'M' + (r - rr) + ',' + r + ' A' + rr + ',' + rr + ' 0 0 1 ' + (r + rr) + ',' + r;
    }).join(' ');
    return {
      width: wid, height: hei,
      markup: '<path d="' + d + '" fill="none" stroke="' + strokeColor + '" ' +
        'stroke-width="' + strokeW + '" stroke-opacity="' + strokeOpacity + '"/>'
    };
  }

  /* CSS変数を今の実測色（hex等）に解決する。data URI は静的な画像なので
     var() をそのまま埋め込めないための橋渡し。呼び出し時点のテーマで固定される。 */
  function resolveVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  /* name: 'asanoha'（麻の葉）| 'seigaiha'（青海波）。
     opts.size: 麻の葉は中心-頂点半径、青海波は最大弧の半径（既定18）。
     opts.color: 焼き込む線の色（既定は var(--rule) を呼び出し時点で解決した実色。
       --rule はこのサイトの罫線・区切り線に使う最も控えめな色なので既定に選んだ）。
     opts.opacity: 線の不透明度（既定0.35）。"ちら見えする程度"を狙うなら
       0.15〜0.35 の範囲を推奨。
     戻り値 { tile, dataUri, width, height }:
       tile    … 1タイル分の <svg> 要素。DOM に直接挿してプレビューできる
                 （stroke に color を渡さなければ currentColor を継承するので、
                 インラインで置く分にはテーマ追従する）。
       dataUri … 'data:image/svg+xml,...' 文字列。style.backgroundImage や
                 CSS の background-image:url(...) にそのまま使える固定画像。
                 テーマが変わったら呼び直すこと（自動追従しない）。
       width / height … タイル1枚のサイズ（px相当）。background-size に使う。 */
  NT.artPattern = function (name, opts) {
    opts = opts || {};
    var opacity = opts.opacity != null ? opts.opacity : 0.35;
    var strokeW = opts.strokeWidth || 1;
    var color = opts.color || resolveVar('--rule', '#C6CDC5');
    var size = opts.size || 18;
    var t = name === 'seigaiha'
      ? seigaihaTile(size, color, opacity, strokeW)
      : asanohaTile(size, color, opacity, strokeW);

    var tileSvg = svgEl('svg', {
      viewBox: '0 0 ' + t.width + ' ' + t.height,
      width: t.width, height: t.height,
      class: 'nt-art nt-art-pattern nt-art-pattern-' + name
    });
    tileSvg.innerHTML = t.markup;

    var doc = '<svg xmlns="' + NS + '" viewBox="0 0 ' + t.width + ' ' + t.height + '" ' +
      'width="' + t.width + '" height="' + t.height + '">' + t.markup + '</svg>';
    var dataUri = 'data:image/svg+xml,' + encodeURIComponent(doc);

    return { tile: tileSvg, dataUri: dataUri, width: t.width, height: t.height };
  };
})(window);
