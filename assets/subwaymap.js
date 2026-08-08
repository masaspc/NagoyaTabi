/* 自前SVGの地下鉄マップ（Task 13）。
   外部タイル・画像・アイコンフォントを一切使わず、地下鉄路線図として位置関係だけを
   示す模式図をコードで組み立てる。地理的な正確さは狙わない。
   色は路線のブランドカラーとしてリテラルの16進を使うが、駅名・背景・ピンの枠は
   var(--fg)/var(--bg)/var(--card)/var(--kin) など CSS 変数を参照するので、
   夜モードでもコントラストが保たれる。 */
(function (w) {
  var NT = w.NT;
  var NS = 'http://www.w3.org/2000/svg';

  /* 模式図の座標。地理ではなく路線図としての分かりやすさを優先する */
  var ST = {
    nagoya:     { x:  60, y:  90, label: '名古屋' },
    marunouchi: { x: 130, y:  90, label: '丸の内' },
    fushimi:    { x: 130, y: 150, label: '伏見' },
    shiyakusho: { x: 250, y:  50, label: '市役所' },
    sakae:      { x: 250, y: 150, label: '栄' },
    yabacho:    { x: 250, y: 215, label: '矢場町' },
    uemaezu:    { x: 250, y: 275, label: '上前津' },
    osukannon:  { x: 170, y: 275, label: '大須観音' },
    kanayama:   { x: 250, y: 340, label: '金山' },
    jingu:      { x: 250, y: 405, label: '熱田神宮伝馬町' },
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
       元の430から広げてある。svgはデフォルトでviewBox外を切り取るため、
       ここが足りないとピンのラベルが見切れる */
    var svg = svgEl('svg', {
      viewBox: '0 0 520 470', class: 'submap',
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
       前提の操作なので、ラベルを大きくせずに指の当たりだけ広げる。 */
    var used = {};
    PINS.forEach(function (p) {
      var s = ST[p.st];
      used[p.st] = (used[p.st] || 0) + 1;
      var y = s.y + (used[p.st] - 1) * 17 - 6;
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
