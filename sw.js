/* 一覧は手で並べる。ビルドがないため自動生成しない。
   ファイルを足したら PRECACHE と VERSION の両方を更新すること。 */
var VERSION = 'nt-v14';
var PRECACHE = [
  './',
  'index.html', 'spots.html', 'gourmet.html', 'tips.html', 'play.html',
  'manifest.webmanifest',
  'assets/style.css',
  'assets/core.js',
  'assets/art.js',
  'assets/fx.js',
  'assets/itinerary.js',
  'assets/recovery.js',
  'assets/situation.js',
  'assets/subwaymap.js',
  'assets/spotlist.js',
  'assets/triviagacha.js',
  'assets/gourmetlist.js',
  'assets/record.js',
  'assets/tipspage.js',
  'assets/omiyage.js',
  'assets/summary.js',
  'assets/qr.js',
  'assets/swipe.js',
  'assets/playpage.js',
  'assets/quiz.js',
  'assets/missions.js',
  'assets/foodrank.js',
  'assets/expenses.js',
  'assets/icon.svg',
  'data/spots.data.js',
  'data/trip.data.js',
  'data/trivia.data.js',
  'data/foods.data.js',
  'data/transit.data.js',
  'data/omiyage.data.js',
  'data/quiz.data.js',
  'data/missions.data.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   /* 外部は素通し。そもそも使っていない */
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        /* オフラインで未キャッシュのものを求められたら、ナビゲーション（ページ遷移）
           に限って行程ページへ落とす。script/link等はここに来ても素直に失敗させる。
           そうしないと、例えばキャッシュ漏れしたスクリプトが index.html のHTMLを
           script の中身として受け取り、原因不明の壊れ方をする */
        if (e.request.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
