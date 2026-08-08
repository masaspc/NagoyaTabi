/* QRコード（バージョン1-5、誤り訂正L、バイトモード）の自前実装。
   v5-L までブロックが1つなので、インターリーブを実装せずに済む。 */
(function (w) {
  var NT = (w.NT = w.NT || {});

  /* [データ語数, 誤り訂正語数] を version 1..5 で */
  var CAP = { 1: [19, 7], 2: [34, 10], 3: [55, 15], 4: [80, 20], 5: [108, 26] };
  var ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30] };

  /* ---- GF(256) ---- */
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1; if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function rsGenerator(n) {
    var g = [1];
    for (var i = 0; i < n; i++) {
      var ng = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j++) {
        ng[j] ^= gmul(g[j], EXP[i]);
        ng[j + 1] ^= g[j];
      }
      g = ng;
    }
    return g;
  }
  function rsEncode(data, ecLen) {
    /* rsGenerator は係数を低次→高次の順で返す（g[0]が定数項、g[n]が
       最高次のモニック係数1）。この除算ループは res[i] を先頭項として
       消去するため、モニック係数1を res[i] に合わせる必要がある。
       reverse() せずに g[j] をそのまま res[i+j] に掛けると、g[0]（定数項、
       1ではない）が先頭消去に使われてしまい res[i] が0にならず、
       誤り訂正語が丸ごと狂う。実際に自前デコーダで検算して発見した。 */
    var g = rsGenerator(ecLen).slice().reverse();
    var res = data.concat(new Array(ecLen).fill(0));
    for (var i = 0; i < data.length; i++) {
      var c = res[i];
      if (!c) continue;
      for (var j = 0; j < g.length; j++) res[i + j] ^= gmul(g[j], c);
    }
    return res.slice(data.length);
  }

  /* ---- ビット列 ---- */
  function Bits() { this.a = []; }
  Bits.prototype.put = function (val, len) {
    for (var i = len - 1; i >= 0; i--) this.a.push((val >>> i) & 1);
  };

  function encodeData(bytes, version) {
    var cap = CAP[version][0], bits = new Bits();
    bits.put(4, 4);                 /* バイトモード */
    bits.put(bytes.length, 8);      /* v1-9 は文字数8ビット */
    for (var i = 0; i < bytes.length; i++) bits.put(bytes[i], 8);
    var max = cap * 8;
    bits.put(0, Math.min(4, max - bits.a.length));           /* 終端 */
    while (bits.a.length % 8) bits.a.push(0);                /* バイト境界へ */
    var cw = [];
    for (var k = 0; k < bits.a.length; k += 8) {
      var v = 0;
      for (var b = 0; b < 8; b++) v = (v << 1) | bits.a[k + b];
      cw.push(v);
    }
    var pad = [0xEC, 0x11], p = 0;
    while (cw.length < cap) cw.push(pad[p++ % 2]);           /* 埋め草 */
    return cw;
  }

  /* ---- 配置 ---- */
  function newMatrix(size) {
    var m = [], r = [];
    for (var i = 0; i < size; i++) {
      m.push(new Array(size).fill(null));
      r.push(new Array(size).fill(false));  /* 機能パターンか */
    }
    return { m: m, fn: r, size: size };
  }
  function setFinder(M, x, y) {
    for (var dy = -1; dy <= 7; dy++) for (var dx = -1; dx <= 7; dx++) {
      var px = x + dx, py = y + dy;
      if (px < 0 || py < 0 || px >= M.size || py >= M.size) continue;
      var on = (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) ||
               (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6)) ||
               (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      M.m[py][px] = on; M.fn[py][px] = true;
    }
  }
  function setAlign(M, cx, cy) {
    for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
      M.m[cy + dy][cx + dx] = (Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      M.fn[cy + dy][cx + dx] = true;
    }
  }
  function setFunctions(M, version) {
    setFinder(M, 0, 0); setFinder(M, M.size - 7, 0); setFinder(M, 0, M.size - 7);
    var a = ALIGN[version];
    for (var i = 0; i < a.length; i++) for (var j = 0; j < a.length; j++) {
      var cx = a[j], cy = a[i];
      if (M.fn[cy][cx]) continue;   /* 位置検出と重なる隅は置かない */
      setAlign(M, cx, cy);
    }
    for (var k = 8; k < M.size - 8; k++) {   /* タイミング */
      M.m[6][k] = (k % 2 === 0); M.fn[6][k] = true;
      M.m[k][6] = (k % 2 === 0); M.fn[k][6] = true;
    }
    M.m[M.size - 8][8] = true; M.fn[M.size - 8][8] = true;  /* 常時暗モジュール */
    /* 形式情報の領域を予約 */
    for (var f = 0; f < 9; f++) {
      if (!M.fn[8][f]) { M.fn[8][f] = true; M.m[8][f] = false; }
      if (!M.fn[f][8]) { M.fn[f][8] = true; M.m[f][8] = false; }
    }
    for (var g2 = 0; g2 < 8; g2++) {
      if (!M.fn[8][M.size - 1 - g2]) { M.fn[8][M.size - 1 - g2] = true; M.m[8][M.size - 1 - g2] = false; }
      if (!M.fn[M.size - 1 - g2][8]) { M.fn[M.size - 1 - g2][8] = true; M.m[M.size - 1 - g2][8] = false; }
    }
  }

  function placeData(M, cw) {
    var bits = [];
    cw.forEach(function (b) { for (var i = 7; i >= 0; i--) bits.push((b >> i) & 1); });
    var idx = 0, up = true;
    for (var right = M.size - 1; right > 0; right -= 2) {
      if (right === 6) right = 5;   /* 縦のタイミングパターンを飛ばす */
      for (var v = 0; v < M.size; v++) {
        var y = up ? M.size - 1 - v : v;
        for (var c = 0; c < 2; c++) {
          var x = right - c;
          if (M.fn[y][x]) continue;
          M.m[y][x] = idx < bits.length ? !!bits[idx] : false;
          idx++;
        }
      }
      up = !up;
    }
  }

  var MASKS = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x, y) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; },
    function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; },
    function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; },
    function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }
  ];

  function applyMask(M, n) {
    var out = M.m.map(function (r) { return r.slice(); });
    for (var y = 0; y < M.size; y++) for (var x = 0; x < M.size; x++) {
      if (!M.fn[y][x] && MASKS[n](x, y)) out[y][x] = !out[y][x];
    }
    return out;
  }

  /* 形式情報。ECC L = 01 */
  function formatBits(mask) {
    var data = (0x01 << 3) | mask, v = data << 10;
    for (var i = 4; i >= 0; i--) if (v & (1 << (i + 10))) v ^= 0x537 << i;
    return ((data << 10) | v) ^ 0x5412;
  }
  function setFormat(grid, size, mask) {
    var f = formatBits(mask);
    for (var i = 0; i < 15; i++) {
      var bit = ((f >> i) & 1) === 1;
      if (i < 6) grid[i][8] = bit;
      else if (i < 8) grid[i + 1][8] = bit;
      else if (i === 8) grid[8][7] = bit;
      else grid[8][14 - i] = bit;

      if (i < 8) grid[8][size - 1 - i] = bit;
      else grid[size - 15 + i][8] = bit;
    }
    grid[size - 8][8] = true;
  }

  /* 罰点。規格の4条件のうち、実用上効く1・3・4を評価する */
  function penalty(grid, size) {
    var p = 0, dark = 0, y, x, run, last;
    for (y = 0; y < size; y++) {
      run = 1; last = grid[y][0];
      for (x = 1; x < size; x++) {
        if (grid[y][x] === last) { run++; } else { if (run >= 5) p += 3 + (run - 5); run = 1; last = grid[y][x]; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
    for (x = 0; x < size; x++) {
      run = 1; last = grid[0][x];
      for (y = 1; y < size; y++) {
        if (grid[y][x] === last) { run++; } else { if (run >= 5) p += 3 + (run - 5); run = 1; last = grid[y][x]; }
      }
      if (run >= 5) p += 3 + (run - 5);
    }
    for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
      var a = grid[y][x];
      if (a === grid[y][x + 1] && a === grid[y + 1][x] && a === grid[y + 1][x + 1]) p += 3;
    }
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (grid[y][x]) dark++;
    p += Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5) * 10;
    return p;
  }

  NT.qrMatrix = function (text) {
    var bytes = [], enc = new TextEncoder().encode(text);
    for (var i = 0; i < enc.length; i++) bytes.push(enc[i]);

    var version = 0;
    for (var v = 1; v <= 5; v++) {
      if (bytes.length + 2 <= CAP[v][0]) { version = v; break; }   /* +2 はモードと文字数 */
    }
    if (!version) return null;

    var size = 17 + version * 4;
    var data = encodeData(bytes, version);
    var ec = rsEncode(data, CAP[version][1]);
    var all = data.concat(ec);

    var M = newMatrix(size);
    setFunctions(M, version);
    placeData(M, all);

    var best = null, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      var g = applyMask(M, m);
      setFormat(g, size, m);
      var s = penalty(g, size);
      if (s < bestScore) { bestScore = s; best = g; }
    }
    return best;
  };

  NT.qrCanvas = function (text, px) {
    px = px || 8;
    var g = NT.qrMatrix(text);
    if (!g) return null;
    var q = 4, size = g.length, dim = (size + q * 2) * px;
    var cv = document.createElement('canvas');
    cv.width = cv.height = dim;
    cv.style.width = cv.style.height = Math.min(dim, 260) + 'px';
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = '#000';
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      if (g[y][x]) ctx.fillRect((x + q) * px, (y + q) * px, px, px);
    }
    return cv;
  };
})(window);
