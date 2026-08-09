/* 演出層（Task 28）。オフラインの前提は変えない — このファイル自体もローカルの
   <script src> で、外部ライブラリもネットワークも一切使わない。すべて自前の
   IntersectionObserver / Web Animations API / requestAnimationFrame。

   prefers-reduced-motion: reduce のときは「短くする」のではなく「止める」。
   このファイルの全関数は NT.fx.reducedMotion を見て、trueなら:
     - スクロール演出(reveal)は登録した瞬間に最終状態へ（観測すらしない）
     - drawIn は何もしない（線画は最初から全部見えている）
     - shimmer はクラスだけ付くが、対応するCSSのアニメーション定義自体が
       @media (prefers-reduced-motion:no-preference) の中にしかないので動かない
     - countUp は目標値を即座に描画（アニメーションなし）
     - burst は何も生成しない（粒子ゼロ）
   CSS側も同じ原則: 「隠す→見せる」の初期状態そのものを no-preference の
   メディアクエリの中に閉じ込めてあるので、reduced-motion環境ではJSが
   一切走らなくてもコンテンツは最初から完全に見える（進行の初期状態に
   依存しない）。

   公開API（すべて window.NT.fx 上）:
     NT.fx.reducedMotion            → bool（起動時に確定。OS設定変更もlistenして更新）
     NT.fx.init()                   → ページ末尾で1回呼ぶ。grain・ヘッダー装飾・
                                       スクロール演出・テーマ切替追従をまとめて配線する
     NT.fx.reveal(el, variant)      → 個別要素を1件だけ演出対象に登録する
                                       （init() が拾い切れない後づけ要素向け）
                                       variant: 'rise'(既定) | 'slide' | 'wipe'
     NT.fx.drawIn(svg, opts?)       → 線画SVGにストロークの「描かれる」演出を付ける
                                       opts.duration(既定900ms) opts.stagger(既定70ms)
     NT.fx.shimmer(el)              → 金の光沢スイープをその要素に付ける（クラス付与のみ）
     NT.fx.countUp(el, target, opts?) → el.textContent を数値カウントアップで更新
                                       opts.from(既定0) opts.duration(既定650ms)
                                       opts.format(既定 Math.round) opts.trigger
                                       'immediate'(既定) | 'inview'
     NT.fx.burst(el, opts?)         → el中心に自前パーティクルの祝祭演出を1回出す
                                       opts.count(既定16) opts.colors(既定 金/緑/味噌)
     NT.fx.headerArt(main)          → ページヘッダーの名所線画・パターン・グラデ装飾
                                       （init() が data-page から自動で呼ぶ。個別にも呼べる） */
(function (w) {
  var NT = w.NT;
  var fx = (NT.fx = NT.fx || {});

  var mql = w.matchMedia ? w.matchMedia('(prefers-reduced-motion: reduce)') : null;
  fx.reducedMotion = !!(mql && mql.matches);
  if (mql) {
    var onMqChange = function (e) { fx.reducedMotion = e.matches; };
    if (mql.addEventListener) mql.addEventListener('change', onMqChange);
    else if (mql.addListener) mql.addListener(onMqChange);
  }

  /* ===================================================================
     0. 粒状のノイズオーバーレイ（背景の質感。ページに1枚だけ、静的）
     =================================================================== */
  function ensureGrain() {
    if (document.querySelector('.nt-grain')) return;
    /* アルファは feColorMatrix と .nt-grain の CSS opacity の掛け算になる。
       最初 0.05 x 0.05 = 実効0.25% で描いていたら、スクリーンショット実測で
       ほぼ何も見えていないことに気づいた。0.5 x 0.05 = 実効2.5%へ上げ、
       粒立ちが見える最小限まで持ち上げてある（それでもコントラストへの
       影響は無視できる範囲。詳細は報告書参照）。 */
    var svg = '<svg xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>';
    var uri = 'data:image/svg+xml,' + encodeURIComponent(svg);
    var d = document.createElement('div');
    d.className = 'nt-grain';
    d.style.backgroundImage = 'url("' + uri + '")';
    d.setAttribute('aria-hidden', 'true');
    document.body.appendChild(d);
  }

  /* ===================================================================
     1. スクロール演出（登場アニメーション）
     =================================================================== */
  var REVEAL_SELECTOR =
    '.card,.day,.tl-item,.gacha-card,.mission-card,.rank-item,.exp-item,' +
    '.rec,.now-bar,.sec-head,.mission-history,.rate';
  var revealCounter = 0;
  var revealIO = null;
  var revealIOFailed = false; /* IntersectionObserver未対応 or 生成失敗を確定させたら二度と試さない */
  /* 何かが未回収のまま残っていないか a few seconds ごとに掃除する保険。
     観測が一度も刺さらなかった要素（IO自体の失敗、rootMarginの外側で
     一生スクロールされない、将来の別バグ）を拾って必ず可視化する。
     「アニメーションを逃す」は見た目に出ないが「コンテンツが消える」は
     出るので、こちらを優先する。 */
  var BACKSTOP_MS = 2500;
  function forceReveal(el) {
    if (el.classList.contains('nt-in')) return;
    el.classList.add('nt-in');
    if (revealIO) { try { revealIO.unobserve(el); } catch (e) { /* noop */ } }
  }
  function getRevealIO() {
    if (revealIO || revealIOFailed) return revealIO;
    if (!('IntersectionObserver' in w)) { revealIOFailed = true; return null; }
    try {
      /* rootMarginを大きく取り、要素が実際に画面へ入るより前後に武装させる。
         速いフリックでも「一度も交差を計算されないまま素通り」を減らす
         （それでも理論上ゼロにはならない — ジャンプ的なscrollToは経由点を
         持たないため。そこは下のscroll settle再チェックとタイムアウト
         保険が拾う）。 */
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          forceReveal(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '60% 0px 60% 0px' });
    } catch (e) {
      revealIOFailed = true;
      return null;
    }
    return revealIO;
  }
  /* スクロールが落ち着いた瞬間（あるいは各フレーム）に、まだ .nt-in が付いて
     いない .nt-pending 要素を実測でチェックする。rect.top が viewport の
     下端より上＝「現在見えている」か「ジャンプスクロールで素通りされた」の
     どちらか（後者はIntersectionObserverが一度も交差を報告できないケース）。
     どちらも、もう表示していい/表示すべき状態なので即座に可視化する。 */
  function checkPendingOnScroll() {
    var pend = document.querySelectorAll('.nt-pending:not(.nt-in)');
    for (var i = 0; i < pend.length; i++) {
      var el = pend[i];
      var r = el.getBoundingClientRect();
      if (r.top < w.innerHeight) forceReveal(el);
    }
  }
  var scrollRafPending = false;
  var scrollSettleTimer = null;
  function onScrollSettle() {
    if (!scrollRafPending) {
      scrollRafPending = true;
      requestAnimationFrame(function () { scrollRafPending = false; checkPendingOnScroll(); });
    }
    clearTimeout(scrollSettleTimer);
    scrollSettleTimer = setTimeout(checkPendingOnScroll, 150);
  }
  var scrollListenerBound = false;
  function ensureScrollListener() {
    if (scrollListenerBound) return;
    scrollListenerBound = true;
    w.addEventListener('scroll', onScrollSettle, { passive: true });
  }

  /* 閉じた<details>の中で「隠れたまま」opacity:0→1のCSSトランジションが起こると、
     一部の環境では閉じている間スタイル計算そのものが省略され、後から.nt-inを
     付けてもopacity:0のまま固まって二度と動かないことがある（実機検証で発見:
     tips.html の土産セクション、閉じた節のさらに中の閉じたカードで再現。
     BACKSTOP_MSのタイムアウトは働いて.nt-inは付くのに、詳細を開いても
     opacity:0のまま——スクロールでは絶対に踏まない経路だが、「速いフリック」と
     同種の"消えたまま"の不具合なので同じ基準で直す）。
     <details>が開いた瞬間、その中の.nt-pending要素を演出を待たず即座に
     最終状態へスナップし、この詰まりが起こる余地自体をなくす。ユーザーが
     自分で開いた操作なので、スクロール発見用のふわっとしたフェードより
     即時表示の方が体感としても自然。 */
  function snapWithin(root) {
    var els = root.querySelectorAll('.nt-pending');
    for (var i = 0; i < els.length; i++) {
      els[i].classList.add('nt-in');
      els[i].classList.remove('nt-pending');
    }
  }
  var detailsSnapBound = false;
  function ensureDetailsSnapListener() {
    if (detailsSnapBound) return;
    detailsSnapBound = true;
    /* 'toggle' はバブリングしないが、キャプチャフェーズは非バブリングのイベントでも
       document まで届く。true(capture) を指定すれば <details> の数によらず1本で拾える。 */
    document.addEventListener('toggle', function (e) {
      var t = e.target;
      if (t && t.tagName === 'DETAILS' && t.open) snapWithin(t);
    }, true);
  }
  function variantClass(el) {
    if (el.classList.contains('tl-item')) return 'nt-reveal-tl';
    if (el.classList.contains('sec-head')) return 'nt-reveal-wipe';
    return 'nt-reveal';
  }
  /* 個別要素を1件だけ演出対象に登録する。init() が拾えなかった後づけ要素用。
     reduced-motion では即座に最終状態にして観測すら省く（動かない、が
     見た目としては常に「表示済み」で正しい）。

     順序が重要: 要素を隠す（.nt-pending を付ける）のは、observer の生成と
     observe() の両方が例外なく成功した「あと」だけ。先に隠してから
     observe を試みると、observe が失敗した瞬間にコンテンツが永久に消える
     ——それがこの関数が直していた不具合そのもの。失敗したら何もせず
     return するだけで、要素は最初から触られていない＝普通に見えている。 */
  fx.reveal = function (el, variant) {
    if (!el || el.nodeType !== 1 || el.hasAttribute('data-nt-r')) return;
    el.setAttribute('data-nt-r', '1');
    if (fx.reducedMotion) return; /* CSSの初期状態自体が no-preference 限定なので何もしなくてよい */
    var io = getRevealIO();
    if (!io) return; /* observer自体が使えない環境。何もせず既定の可視状態のまま */
    try {
      io.observe(el);
    } catch (e) {
      return; /* observeが例外を投げた。同上、既定の可視状態のまま何もしない */
    }
    /* ここまで来て初めて隠す。観測は確実に有効になっている。 */
    var cls = variant === 'slide' ? 'nt-reveal-tl' : variant === 'wipe' ? 'nt-reveal-wipe' : (variant === 'rise' ? 'nt-reveal' : variantClass(el));
    el.classList.add(cls);
    el.classList.add('nt-pending');
    el.style.setProperty('--nt-d', (revealCounter++ % 7) * 16 + 'ms');
    ensureScrollListener();
    setTimeout(function () { forceReveal(el); }, BACKSTOP_MS);
  };
  function scanReveal(root) {
    var els = root.querySelectorAll(REVEAL_SELECTOR);
    for (var i = 0; i < els.length; i++) fx.reveal(els[i]);
  }

  /* ページ内容は再描画のたびに丸ごと作り直される（root.textContent=''+再構築）。
     MutationObserverでその差し替えを検知し、新しく現れた要素だけを拾って
     演出登録する。監視は各 *-root コンテナに1つずつ、childList のみ
     （subtree不要 = 深い階層の変更まで見に行かない分だけ軽い）。 */
  function watchRoot(root) {
    scanReveal(root);
    scanArt(root);
    var mo = new MutationObserver(function () {
      scanReveal(root);
      scanArt(root);
    });
    mo.observe(root, { childList: true });
  }

  /* ===================================================================
     2. 線画の「描かれる」演出（stroke-dasharray / dashoffset）
     =================================================================== */
  function shapeLength(el) {
    var tag = el.tagName.toLowerCase();
    try {
      if (tag === 'path') return el.getTotalLength();
      if (tag === 'line') {
        var dx = el.x2.baseVal.value - el.x1.baseVal.value;
        var dy = el.y2.baseVal.value - el.y1.baseVal.value;
        return Math.sqrt(dx * dx + dy * dy);
      }
      if (tag === 'circle') return 2 * Math.PI * el.r.baseVal.value;
      if (tag === 'ellipse') {
        var rx = el.rx.baseVal.value, ry = el.ry.baseVal.value;
        return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
      }
      if (tag === 'rect') return 2 * (el.width.baseVal.value + el.height.baseVal.value);
    } catch (e) { /* 未対応の座標系。諦めて演出なしで普通に見せる */ }
    return 0;
  }
  /* svg: NT.artLandmark/artIcon が返す <svg>。塗り図形（例: 名古屋城の金鯱の
     金の三角）は対象外にし、線（stroke）のある図形だけを「一筆書き」で見せる。
     reduced-motion では何もしない＝最初から普通に全部見えている。

     ここも reveal と同じ順序で: dasharray/dashoffset を設定して線を隠すのは
     IntersectionObserver の生成と observe() の両方が成功した「あと」だけ。
     先に隠してから observe を試みると、observe が失敗した瞬間にその名所線画は
     永久に「描かれていない（=見えない）」状態で固まる。失敗したら dasharray に
     一切触れず終了＝最初から普通の実線として見えている（進行の初期状態に
     依存しない、が正しい失敗モード）。仕上げに数秒後のタイムアウト保険も
     付け、観測が万一一度も刺さらなくても最後は必ず全部描き切った状態にする。 */
  fx.drawIn = function (svg, opts) {
    if (!svg || svg.hasAttribute('data-nt-drawn') || fx.reducedMotion) return;
    svg.setAttribute('data-nt-drawn', '1');
    opts = opts || {};
    var dur = opts.duration || 900;
    var stagger = opts.stagger != null ? opts.stagger : 70;
    var shapes = svg.querySelectorAll('path,line,circle,ellipse,rect');
    var items = [];
    for (var i = 0; i < shapes.length; i++) {
      var el = shapes[i];
      var fill = el.getAttribute('fill');
      if (fill && fill !== 'none') continue;
      var len = shapeLength(el);
      if (!len) continue;
      items.push({ el: el, len: len });
    }
    if (!items.length) return;
    if (!('IntersectionObserver' in w)) return; /* 未対応環境。線はそのまま普通に見える */
    var io;
    try {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          draw();
        });
      }, { threshold: 0.25 });
      io.observe(svg);
    } catch (e) {
      return; /* 生成/observe失敗。dasharrayには一切触っていないので普通の実線のまま */
    }
    /* ここまで来て初めて隠す。観測は確実に有効になっている。 */
    items.forEach(function (it) {
      it.el.style.strokeDasharray = it.len;
      it.el.style.strokeDashoffset = it.len;
    });
    var drawn = false;
    function draw() {
      if (drawn) return;
      drawn = true;
      try { io.unobserve(svg); } catch (e) { /* noop */ }
      items.forEach(function (it, idx) {
        it.el.style.transition = 'stroke-dashoffset ' + dur + 'ms cubic-bezier(.3,.6,.2,1) ' + (idx * stagger) + 'ms';
        requestAnimationFrame(function () { it.el.style.strokeDashoffset = '0'; });
      });
    }
    setTimeout(draw, BACKSTOP_MS);
  };
  function scanArt(root) {
    var svgs = root.querySelectorAll('svg.nt-art-landmark, svg.nt-art-kinshachi');
    for (var i = 0; i < svgs.length; i++) fx.drawIn(svgs[i]);
  }

  /* ===================================================================
     3. 金の光沢（見出し・金鯱にスイープを1本通す。CSS駆動）
     =================================================================== */
  fx.shimmer = function (el) {
    if (el) el.classList.add('nt-shimmer');
  };

  /* ===================================================================
     4. カウントアップ
     =================================================================== */
  fx.countUp = function (el, target, opts) {
    if (!el) return;
    opts = opts || {};
    var format = opts.format || function (n) { return String(Math.round(n)); };
    var from = opts.from != null ? opts.from : 0;
    if (fx.reducedMotion || target === from) { el.textContent = format(target); return; }
    var dur = opts.duration || 650;
    function run() {
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(from + (target - from) * eased);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = format(target);
      }
      requestAnimationFrame(step);
    }
    if (opts.trigger === 'inview') {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          io.disconnect();
          run();
        });
      }, { threshold: 0.4 });
      io.observe(el);
    } else {
      run();
    }
  };

  /* ===================================================================
     5. 祝祭パーティクル
     =================================================================== */
  fx.burst = function (el, opts) {
    if (fx.reducedMotion) return; /* 動きそのものを止める。粒子を出さない */
    opts = opts || {};
    var rect = (el && el.getBoundingClientRect) ? el.getBoundingClientRect()
      : { left: w.innerWidth / 2, top: w.innerHeight / 2, width: 0, height: 0 };
    var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    var host = document.createElement('div');
    host.className = 'nt-burst-host';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);
    var colors = opts.colors || ['var(--kin)', 'var(--rokusho)', 'var(--miso)', 'var(--kin-light)'];
    var n = opts.count || 16;
    var pending = n;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('span');
      p.className = 'nt-burst-particle' + (i % 3 === 0 ? ' sq' : '');
      var size = 5 + Math.random() * 5;
      p.style.width = p.style.height = size + 'px';
      p.style.background = colors[i % colors.length];
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      host.appendChild(p);
      var ang = (Math.PI * 2) * (i / n) + (Math.random() - 0.5) * 0.6;
      var dist = 55 + Math.random() * 70;
      var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 18;
      var rot = (Math.random() * 360) | 0;
      var anim = p.animate([
        { transform: 'translate(-50%,-50%) translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg) scale(.35)', opacity: 0 }
      ], { duration: 650 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      anim.onfinish = function () { pending--; if (pending <= 0 && host.parentNode) host.remove(); };
    }
    setTimeout(function () { if (host.parentNode) host.remove(); }, 1500);
  };

  /* ===================================================================
     6. ページヘッダー装飾（名所線画 or 金鯱 + パターンの透かし + グラデ）
     =================================================================== */
  var HEADER_ART = {
    itinerary: { kind: 'landmark', name: 'nagoyajo', pattern: 'seigaiha' },
    spots: { kind: 'landmark', name: 'tokugawa', pattern: 'asanoha' },
    gourmet: { kind: 'landmark', name: 'hitsumabushi', pattern: 'seigaiha' },
    tips: { kind: 'landmark', name: 'chikagai', pattern: 'asanoha' },
    play: { kind: 'kinshachi', pattern: 'seigaiha' }
  };
  var themedArt = []; /* {el, opts} — テーマが変わったら焼き直すパターン背景の一覧 */

  /* ===================================================================
     6.1 ヘッダー装飾のパララックス（Task 29）。.page-head は sticky ではなく
     本文と一緒に普通にスクロールで流れていく。その通過中だけ、装飾層
     （模様+線画/金鯱）を本文よりわずかに遅く動かして奥行きを出す。
     transformのみ・rAFで1フレーム1回に間引く・reduced-motionでは
     一切書き込まない（この層は常にtranslateY(0)のまま静止＝動きが
     完全に止まる。「短くする」ではなく「止める」という他の演出と同じ方針）。 */
  var parallaxEl = null, parallaxHead = null, parallaxRafPending = false;
  function applyParallax() {
    parallaxRafPending = false;
    if (!parallaxEl || !parallaxHead) return;
    var rect = parallaxHead.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= w.innerHeight) return; /* 画面外。計算しない */
    var progress = Math.max(0, -rect.top);
    var y = Math.min(progress * 0.3, rect.height * 0.6);
    parallaxEl.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
  }
  function onParallaxScroll() {
    if (parallaxRafPending) return;
    parallaxRafPending = true;
    requestAnimationFrame(applyParallax);
  }
  function ensureParallax(art, head) {
    if (fx.reducedMotion || parallaxEl) return; /* ページにつき1本のヘッダーだけが対象 */
    parallaxEl = art;
    parallaxHead = head;
    w.addEventListener('scroll', onParallaxScroll, { passive: true });
    applyParallax();
  }

  function buildPatternLayer(name) {
    var pat = NT.artPattern(name, { size: 20, opacity: 0.14 });
    var d = document.createElement('div');
    d.className = 'page-head-pattern';
    d.style.backgroundImage = 'url("' + pat.dataUri + '")';
    d.style.backgroundSize = pat.width + 'px ' + pat.height + 'px';
    d.setAttribute('aria-hidden', 'true');
    themedArt.push({ el: d, name: name });
    return d;
  }
  fx.headerArt = function (main) {
    var page = main && main.getAttribute('data-page');
    var def = HEADER_ART[page];
    var head = NT.$('.page-head');
    if (!head || !def || head.querySelector('.page-head-art')) return;
    var wrap = head.querySelector('.wrap');
    if (wrap) wrap.classList.add('page-head-content');
    var art = document.createElement('div');
    art.className = 'page-head-art';
    art.appendChild(buildPatternLayer(def.pattern));
    var glyph = document.createElement('div');
    glyph.className = 'page-head-glyph';
    /* サイズは assets/style.css の .page-head-content{padding-right} が確保する
       「文字の入らない帯」に収まる値。ここを広げるならCSS側の帯幅も合わせて
       広げること（実測で見出しの文字に絵が重なる不具合を1度出している）。 */
    var svg = def.kind === 'kinshachi'
      ? NT.artKinshachi({ size: 76 })
      : NT.artLandmark(def.name, { size: 84, color: 'var(--kin-light)' });
    glyph.appendChild(svg);
    fx.shimmer(glyph);
    art.appendChild(glyph);
    head.insertBefore(art, head.firstChild);
    fx.shimmer(head);
    fx.drawIn(svg, { duration: 1100, stagger: 90 });
    ensureParallax(art, head);
  };
  function refreshThemedArt() {
    themedArt.forEach(function (t) {
      var pat = NT.artPattern(t.name, { size: 20, opacity: 0.14 });
      t.el.style.backgroundImage = 'url("' + pat.dataUri + '")';
    });
  }

  /* ===================================================================
     7. 初期化。ページ末尾で1回呼ぶ
     =================================================================== */
  fx.init = function () {
    ensureGrain();
    var main = document.querySelector('main[data-page]');
    if (main) fx.headerArt(main);

    var roots = NT.$$('[id$="-root"]');
    roots.forEach(watchRoot);
    ensureDetailsSnapListener();
    /* IntersectionObserver の最初のコールバックは仕様上「非同期のいつか」で、
       環境によっては初回ペイントの直後に来ない（実測、ヘッドレス環境で顕著）。
       登録した直後に一度だけ実測チェックを走らせ、初期表示ですでに画面内にある
       要素はコールバックを待たずに見せる。 */
    if (w.requestAnimationFrame) requestAnimationFrame(checkPendingOnScroll);
    else checkPendingOnScroll();

    /* テーマ切替（昼/夜/端末設定ボタン、および端末設定=autoでのOS変更）に
       焼き込み画像（パターン背景）を追従させる。NT.cycleTheme をラップして
       クリック起点の切替を拾い、OS側の自動切替は matchMedia を直接listenする。 */
    if (!fx._themeWrapped && themedArt.length === 0) {
      /* headerArt が無いページ（今のところ無い）でも安全なように毎回ラップは試みるが
         実処理は themedArt が空でも副作用なし（forEachが空を回すだけ） */
    }
    if (!fx._themeWrapped) {
      fx._themeWrapped = true;
      var origCycle = NT.cycleTheme;
      NT.cycleTheme = function () {
        var r = origCycle();
        refreshThemedArt();
        return r;
      };
      var dmql = w.matchMedia && w.matchMedia('(prefers-color-scheme: dark)');
      if (dmql) {
        var onDark = function () { if (!NT.get('theme', 'auto') || NT.get('theme', 'auto') === 'auto') refreshThemedArt(); };
        if (dmql.addEventListener) dmql.addEventListener('change', onDark);
        else if (dmql.addListener) dmql.addListener(onDark);
      }
    }
  };
})(window);
