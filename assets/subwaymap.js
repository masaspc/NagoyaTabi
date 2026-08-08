/* 自前SVGの地下鉄マップ（Task 13）。
   外部タイル・画像・アイコンフォントを一切使わず、地下鉄路線図として位置関係だけを
   示す模式図をコードで組み立てる。地理的な正確さは狙わない。
   色は路線のブランドカラーとしてリテラルの16進を使うが、駅名・背景・ピンの枠は
   var(--fg)/var(--bg)/var(--card)/var(--kin) など CSS 変数を参照するので、
   夜モードでもコントラストが保たれる。 */
(function (w) {
  var NT = w.NT;
  var NS = 'http://www.w3.org/2000/svg';

  /* ピンの当たり判定(縦44)を積んだときに隣とぶつからないための最小間隔。
     44ちょうどだと境界が接するだけで理論上は重ならないが、丸め誤差の
     保険として+2する。同じx帯（駅の右に帯が伸びる範囲が重なる駅どうし）
     の間は、ピンを持つ駅どうしの中心がこの値以上離れている必要がある */
  var PIN_GAP = 46;

  /* 模式図の座標。地理ではなく路線図としての分かりやすさを優先する。
     ここの y はピンの当たり判定の重なりを避けるために元の brief の座標から
     調整してある（レビュー参照）:
       - 矢場町・上前津・熱田神宮伝馬町を+30。栄はピンを2枚(叶・伍味酉)
         縦積みするため、積み増し後の帯が直後の矢場町のピン(タップ判定)に
         食い込んでいた（積み間隔を17→46に広げた結果、余白がわずか19しか
         残らなかった）。矢場町以降を下にずらして46以上の間隔を確保した
       - 伏見を+30。名古屋がピンを2枚(エスカ・土産／ひつまぶし)縦積みする
         ため、積み間隔を46に広げると2枚目の当たり判定が伏見の駅アイコンに
         かぶっていた（伏見自体はピンを持たないため重なりチェックには
         出ないが、伏見の駅名の上をタップするとひつまぶしへ飛ぶという
         無言のバグになる）
       - 丸の内を x+70。名古屋の2枚のピンの帯(x:73-177)の内側に丸の内の
         駅アイコンが埋まっていて、実は名古屋の隣の路線図上では見えて
         いなかった（ピンの矩形が後から描かれ上に重なっていたため）。
         帯の外側まで離した
       - 大須観音を上前津と同じ行に保つため+30（上前津との位置関係を保つ
         意図で、重なり制約そのものは無い）
     このため東山線・鶴舞線の一部区間はやや斜めになるが、模式図であって
     地理的な正確さを狙っていないことは画面の注記の通り */
  var ST = {
    nagoya:     { x:  60, y:  90, label: '名古屋' },
    marunouchi: { x: 200, y:  90, label: '丸の内' },
    fushimi:    { x: 130, y: 180, label: '伏見' },
    shiyakusho: { x: 250, y:  50, label: '市役所' },
    sakae:      { x: 250, y: 150, label: '栄' },
    yabacho:    { x: 250, y: 245, label: '矢場町' },
    uemaezu:    { x: 250, y: 305, label: '上前津' },
    osukannon:  { x: 170, y: 305, label: '大須観音' },
    kanayama:   { x: 250, y: 340, label: '金山' },
    jingu:      { x: 250, y: 435, label: '熱田神宮伝馬町' },
    /* 市役所と同じ高さ(y:50)に置くため、x を離す。ピンの帯は駅の右に
       104幅で伸びるので、市役所(x:250)とその帯(右端367)に大曽根の帯が
       食い込まないよう390に置く。svg の viewBox もこれに合わせて広げてある */
    ozone:      { x: 390, y:  50, label: '大曽根' }
  };
  var LINES = [
    { name: '東山線',     color: '#F7B500', path: ['nagoya', 'marunouchi', 'sakae'] },
    { name: '名城線',     color: '#8C1C7D', path: ['shiyakusho', 'sakae', 'yabacho', 'uemaezu', 'kanayama', 'jingu'] },
    { name: '名城線(北)', color: '#8C1C7D', path: ['shiyakusho', 'ozone'] },
    { name: '桜通線',     color: '#C8102E', path: ['nagoya', 'marunouchi'] },
    { name: '鶴舞線',     color: '#0F7A3D', path: ['fushimi', 'osukannon', 'uemaezu'] }
  ];
  /* 駅に紐づくスポット */
  var PINS = [
    { st: 'nagoya',     spotId: 'esca',        label: 'エスカ・土産' },
    { st: 'nagoya',     spotId: 'maruya-esca', label: 'ひつまぶし' },
    { st: 'shiyakusho', spotId: 'nagoyajo',    label: '名古屋城' },
    { st: 'sakae',      spotId: 'kanou',       label: '味処 叶' },
    { st: 'sakae',      spotId: 'gomitori',    label: '伍味酉' },
    { st: 'yabacho',    spotId: 'pokecen',     label: 'ポケセン' },
    { st: 'uemaezu',    spotId: 'osu',         label: '大須商店街' },
    { st: 'jingu',      spotId: 'atsuta',      label: '熱田神宮' },
    { st: 'ozone',      spotId: 'tokugawa',    label: '徳川美術館' }
  ];

  /* PINS が指す spotId が spots データに実在するかの防御チェック。
     地図はスポットデータと独立した座標表なので、将来スポットが増減しても
     ここが黙って壊れたリンクを描かないよう console.warn だけ出す（表示は止めない） */
  if (NT.spotById) {
    PINS.forEach(function (p) {
      if (!NT.spotById(p.spotId)) {
        w.console && console.warn('[subwaymap] unknown spotId: ' + p.spotId);
      }
    });
  }

  function svgEl(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  NT.buildSubwayMap = function (opts) {
    opts = opts || {};
    /* 幅520: 大曽根(x:390)のピン帯(駅+13〜+117=右端507)が収まるよう
       元の430から広げてある。高さ480: 熱田神宮伝馬町のピンの当たり判定の
       下端(約457.5)が収まるよう、積み間隔を広げた分だけ元の470から
       10増やしてある。svgはデフォルトでviewBox外を切り取るため、
       ここが足りないとピンのラベルが見切れる */
    var svg = svgEl('svg', {
      viewBox: '0 0 520 480', class: 'submap',
      role: 'img', 'aria-label': '名古屋の地下鉄と行き先の位置関係（模式図）'
    });

    LINES.forEach(function (ln) {
      var pts = ln.path.map(function (k) { return ST[k].x + ',' + ST[k].y; }).join(' ');
      svg.appendChild(svgEl('polyline', {
        points: pts, fill: 'none', stroke: ln.color, 'stroke-width': '7',
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '.85'
      }));
    });

    Object.keys(ST).forEach(function (k) {
      var s = ST[k];
      svg.appendChild(svgEl('circle', { cx: s.x, cy: s.y, r: '6',
        fill: 'var(--bg)', stroke: 'var(--fg)', 'stroke-width': '2' }));
      var t = svgEl('text', { x: s.x - 11, y: s.y + 4, 'text-anchor': 'end',
        'font-size': '11', fill: 'var(--fg)' });
      t.textContent = s.label;
      svg.appendChild(t);
    });

    /* 駅の右側にスポットのピンを積む。
       描かれる帯（見た目）は高さ15pxのままだが、タップ領域はそれとは別に
       高さ44px以上の透明な当たり判定を重ねる。地図は「歩きながら片手で押す」
       前提の操作なので、ラベルを大きくせずに指の当たりだけ広げる。

       同じ駅で2枚重ねるときの積み間隔は当たり判定の高さ(44)以上でなければ
       ならない（それより狭いと重なった当たり判定のうち後から描画された方が
       常に勝ち、隣のピンを押したつもりで別の場所に飛ぶ）。ここは名古屋と
       栄の2駅だけが該当し、積み間隔をPIN_GAP(46)に広げた分、直後の駅
       （伏見・矢場町）をYに寄せてある（ST定義のコメント参照） */
    var used = {};
    PINS.forEach(function (p) {
      var s = ST[p.st];
      used[p.st] = (used[p.st] || 0) + 1;
      var y = s.y + (used[p.st] - 1) * PIN_GAP - 6;
      var pillH = 15, pillCenter = y - 1 + pillH / 2;
      var hitH = 44, hitY = pillCenter - hitH / 2;
      var g = svgEl('g', { class: 'pin', tabindex: '0', role: 'link',
        'aria-label': p.label + 'へ' });
      /* 透明な当たり判定。fill:transparent は none と違って pointer-events の対象になる */
      g.appendChild(svgEl('rect', { class: 'pin-hit',
        x: s.x + 13, y: hitY, width: '104', height: String(hitH), fill: 'transparent' }));
      g.appendChild(svgEl('rect', { class: 'pin-rect',
        x: s.x + 13, y: y - 1, width: '104', height: String(pillH),
        rx: '2', fill: 'var(--card)', stroke: 'var(--kin)', 'stroke-width': '1' }));
      var t = svgEl('text', { x: s.x + 18, y: y + 10.5, 'font-size': '10.5', fill: 'var(--fg)' });
      t.textContent = '◆ ' + p.label;
      g.appendChild(t);
      function go() {
        if (opts.onPick) opts.onPick(p.spotId);
        else location.href = 'spots.html#spot-' + p.spotId;
      }
      g.addEventListener('click', go);
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
      svg.appendChild(g);
    });

    var legend = NT.el('div', { class: 'submap-legend' }, LINES.filter(function (l) {
      return l.name.indexOf('(') < 0;
    }).map(function (l) {
      return NT.el('span', { class: 'lg' }, [
        NT.el('i', { style: 'background:' + l.color }), l.name
      ]);
    }));

    var wrap = NT.el('div', { class: 'submap-wrap' }, [svg, legend,
      NT.el('p', { class: 'notice',
        text: '模式図です。路線図としての位置関係を示すもので、距離と方角は正確ではありません。' })]);
    return wrap;
  };
})(window);
