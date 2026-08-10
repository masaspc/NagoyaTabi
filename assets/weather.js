/* 名古屋の天気（行程ページの先頭）。Open-Meteo から取得して描く。

   なぜ Open-Meteo か: このサイトはビルドもサーバーも無い静的サイトで、
   GitHub Pages に置いたファイルがそのまま公開される。APIキーの要る天気サービスは、
   キーをこのリポジトリに書く＝公開することになるので使えない。Open-Meteo は
   キー不要・CORS許可・非商用無料で、ブラウザから直接叩ける数少ない選択肢。

   オフラインとの関係: sw.js の fetch ハンドラは別オリジンを素通しするので、
   この API 応答はキャッシュされない（=機内モードでは必ず失敗する）。そこで
   取得できた内容を localStorage（nt:weather）に畳んで持ち、電波が無いときは
   「いつ時点の予報か」を明示したうえで前回の内容を出す。取得失敗でページが
   壊れたり、行程が見えなくなったりはしない。

   保存するのは応答そのものではなく、旅の2日ぶんに絞って畳んだもの
   （distill）。7日×24時間の生データは十数KBあり、localStorage を名物の
   チェックやメモと共有している以上、天気で容量を食う理由がない。 */
(function (w) {
  var NT = w.NT;

  /* 名古屋市中心部（市役所付近）。行程の範囲はすべてこの周辺に収まる */
  var LAT = 35.1815, LON = 136.9066;
  var API = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + LAT + '&longitude=' + LON
    + '&current=temperature_2m,apparent_temperature,precipitation,weather_code'
    + '&hourly=temperature_2m,precipitation_probability,weather_code'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + '&timezone=Asia%2FTokyo&forecast_days=7';

  /* 自動で取り直す間隔。これより新しければ再取得しない（連打・再訪での無駄打ちを防ぐ）。
     Open-Meteo の更新自体が1時間おきなので、10分は十分に細かい */
  var STALE_MS = 10 * 60 * 1000;
  var TIMEOUT_MS = 10000;

  /* 雨で中止になる催しはこの旅では大盆踊りの1つだけなので、データファイルには
     出さずここに置く。増えたら data/ 側へ持っていくこと。時刻は
     data/trip.data.js の名古屋城のコマの note に書いてある 18:00-20:00 と合わせる */
  var RAIN_SENSITIVE = {
    date: '2026-08-11', from: 18, to: 20,
    name: '名古屋城の大盆踊り', spotId: 'nagoyajo'
  };

  /* 猛暑の判定。気象庁の呼び方に合わせる（真夏日30℃/猛暑日35℃）。
     33℃は公式の区分ではないが、屋外の連続を切り上げる目安としてこのサイトが置く線 */
  var HEAT_DANGER = 35, HEAT_WARN = 33;
  /* 傘・中止判断の目安にする降水確率 */
  var RAIN_HIGH = 50, RAIN_SOME = 30;

  /* WMO天気コード → 日本語。Open-Meteo が返すのはこの番号だけ */
  var CODES = {
    0: '快晴', 1: '晴れ', 2: '晴れ時々曇り', 3: '曇り',
    45: '霧', 48: '霧（霧氷）',
    51: '弱い霧雨', 53: '霧雨', 55: '強い霧雨',
    56: '着氷性の霧雨', 57: '強い着氷性の霧雨',
    61: '弱い雨', 63: '雨', 65: '強い雨',
    66: '着氷性の雨', 67: '強い着氷性の雨',
    71: '弱い雪', 73: '雪', 75: '強い雪', 77: '霧雪',
    80: 'にわか雨', 81: '強いにわか雨', 82: '激しいにわか雨',
    85: 'にわか雪', 86: '強いにわか雪',
    95: '雷雨', 96: '雷雨（ひょう）', 99: '激しい雷雨（ひょう）'
  };
  function codeLabel(c) { return CODES[c] || '—'; }
  /* 雨の記号が要るのは「傘が要るか」の一目判断だけなので、細かい区分は畳む */
  function isRainy(c) { return c >= 51 && c <= 99 && !(c >= 71 && c <= 77) && c !== 85 && c !== 86; }

  /* ---- 保存（nt:weather） ----
     取得できた内容はまずメモリ（mem）に置き、localStorage への書き込みは
     「次に開いたときのため」の best-effort として扱う。

     core.js の NT.set は容量超過やプライベートモードの失敗を黙って握りつぶす
     設計なので、保存だけを唯一の情報源にすると、**取得に成功しているのに
     localStorage が書けない端末では画面が「まだ取得していません」のまま
     固まる**（更新を押しても同じことが起きる）。このサイトは名物の写真を
     IndexedDB へ逃がすほど localStorage の容量に余裕がない前提で作ってあり、
     書き込み失敗は十分あり得る。表示はメモリ側で必ず成り立たせる。 */
  var mem = null;

  function valid(c) { return (c && c.at && c.wx) ? c : null; }
  function cached() {
    return valid(mem) || valid(NT.get('weather', null));
  }
  function remember(rec) {
    mem = rec;
    NT.set('weather', rec);   /* 失敗しても mem があるので表示は壊れない */
  }

  /* 応答を旅の2日ぶんに畳む。プランのどちらでも日付は同じ（8/11・8/12）だが、
     data/trip.data.js を唯一の情報源にしておきたいので現在のプランから引く。

     ラベルは日付から組み直す。行程の label（'DAY 1 — 8/11 tue 山の日'）を
     流用すると、'8/11 tue 山の日 は最高36℃の予報' のように英語の曜日が
     日本語の文の途中に挟まって読みにくい */
  function tripDates() {
    var p = NT.currentPlan();
    return p.days.map(function (d) {
      var dt = NT.parseHM('00:00', d.date);
      var dow = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()];
      return { date: d.date, label: (dt.getMonth() + 1) + '/' + dt.getDate() + '（' + dow + '）' };
    });
  }

  function distill(j) {
    var out = { current: null, days: [] };
    if (j.current) {
      out.current = {
        t: j.current.temperature_2m,
        feels: j.current.apparent_temperature,
        code: j.current.weather_code,
        precip: j.current.precipitation
      };
    }
    var dIdx = {};
    (j.daily && j.daily.time || []).forEach(function (d, i) { dIdx[d] = i; });

    /* 時刻→値の引き当て表。API は 'YYYY-MM-DDTHH:MM' で返す */
    var hIdx = {};
    (j.hourly && j.hourly.time || []).forEach(function (t, i) { hIdx[t] = i; });

    tripDates().forEach(function (td) {
      var i = dIdx[td.date];
      if (i === undefined) return;          /* まだ予報の範囲外の日は落とす */
      var hours = {};
      for (var h = 0; h < 24; h++) {
        var key = td.date + 'T' + ('0' + h).slice(-2) + ':00';
        var hi = hIdx[key];
        if (hi === undefined) continue;
        hours[h] = {
          p: j.hourly.precipitation_probability[hi],
          t: j.hourly.temperature_2m[hi],
          c: j.hourly.weather_code[hi]
        };
      }
      out.days.push({
        date: td.date, label: td.label,
        code: j.daily.weather_code[i],
        tmax: j.daily.temperature_2m_max[i],
        tmin: j.daily.temperature_2m_min[i],
        pmax: j.daily.precipitation_probability_max[i],
        hours: hours
      });
    });
    return out;
  }

  /* ---- 取得 ---- */
  var state = { loading: false, error: null };

  /* 天気は現実の時刻に紐づくので、ここだけは NT.now()（デモ時計で動かせる）ではなく
     実時刻を使う。デモ時計を8/11に進めても、取得できる予報は今日のものしかない */
  function nowMs() { return new Date().getTime(); }

  NT.fetchWeather = function (force) {
    var c = cached();
    if (!force && c && nowMs() - c.at < STALE_MS) return Promise.resolve(c);
    if (state.loading) return Promise.resolve(c);
    if (!w.fetch) {
      state.error = 'この端末のブラウザは天気の取得に対応していません';
      NT.renderWeather();
      return Promise.resolve(c);
    }
    state.loading = true;
    state.error = null;
    NT.renderWeather();

    /* AbortController が無い環境（古いWebView）でも取得自体は走らせる。
       その場合はタイムアウトが効かないだけで、失敗すれば catch に落ちる */
    var ctl = w.AbortController ? new w.AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT_MS) : null;

    return fetch(API, ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) {
        var rec = { at: nowMs(), wx: distill(j) };
        remember(rec);
        state.loading = false;
        NT.renderWeather();
        return rec;
      })
      .catch(function (e) {
        state.loading = false;
        state.error = (e && e.name === 'AbortError')
          ? '天気の取得がタイムアウトしました' : '天気を取得できませんでした';
        NT.renderWeather();
        return cached();
      })
      .then(function (r) { if (timer) clearTimeout(timer); return r; });
  };

  /* ---- 描画 ---- */
  /* 「いつ時点の内容か」の表示。時刻だけ（'23:35 時点'）にしてはいけない——
     8/11の夜に取った内容を8/12の朝に圏外で開くと、前夜の観測が今朝のものに
     見えてしまう。日をまたいでいれば日付を、1時間以上経っていれば経過時間を
     必ず添えて、古いものを今のものと読み違えられないようにする。 */
  function stamp(ms) {
    var d = new Date(ms), n = new Date();
    var hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var sameDay = d.getFullYear() === n.getFullYear()
      && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
    var s = (sameDay ? '' : (d.getMonth() + 1) + '/' + d.getDate() + ' ') + hm + ' 時点';
    var mins = Math.floor((n.getTime() - ms) / 60000);
    if (mins >= 60) {
      var hrs = Math.floor(mins / 60);
      s += hrs >= 24 ? '（' + Math.floor(hrs / 24) + '日以上前）' : '（約' + hrs + '時間前）';
    }
    return s;
  }
  function deg(v) { return (v === null || v === undefined) ? '—' : Math.round(v) + '℃'; }
  function pct(v) { return (v === null || v === undefined) ? '—' : Math.round(v) + '%'; }

  /* その日の行程が動いている時間帯を3時間おきに拾う。
     何時を見せるかを固定値で持たず、data/trip.data.js のコマの時刻から作る */
  function markHours(dateISO) {
    var day = null;
    NT.currentPlan().days.forEach(function (d) { if (d.date === dateISO) day = d; });
    if (!day || !day.items.length) return [];
    var hs = day.items.map(function (i) { return +i.time.split(':')[0]; });
    var start = Math.min.apply(null, hs), end = Math.max.apply(null, hs);
    var out = [];
    for (var h = start; h <= end; h += 3) out.push(h);
    return out;
  }

  /* 雨に弱い催しの時間帯で、いちばん高い降水確率 */
  function sensitiveRisk(days) {
    var d = null;
    days.forEach(function (x) { if (x.date === RAIN_SENSITIVE.date) d = x; });
    if (!d) return null;
    var max = null;
    for (var h = RAIN_SENSITIVE.from; h <= RAIN_SENSITIVE.to; h++) {
      var e = d.hours[h];
      if (!e || e.p === null || e.p === undefined) continue;
      if (max === null || e.p > max) max = e.p;
    }
    return max;
  }

  /* 状況切替（situation.js）へのひと押し。今の状況と違うときだけ出す。
     押したあとは自分も描き直す —— renderItinerary だけだと、切り替わったのに
     「雨モードにする」ボタンがこのカードに残り続ける */
  function switchBtn(sit, label) {
    if (!NT.situation || NT.situation() === sit) return null;
    return NT.el('button', {
      class: 'btn wx-act', type: 'button', text: label,
      onclick: function () {
        NT.set('situation', sit);
        NT.renderItinerary();
        NT.renderWeather();
      }
    });
  }

  function dayRow(d) {
    var marks = markHours(d.date).map(function (h) {
      var e = d.hours[h];
      return NT.el('span', { class: 'wx-h' }, [
        NT.el('span', { class: 'wx-h-t mono', text: h + '時' }),
        NT.el('span', { class: 'wx-h-p mono' + (e && e.p >= RAIN_HIGH ? ' hi' : ''),
          text: e ? pct(e.p) : '—' })
      ]);
    });
    var hot = d.tmax >= HEAT_DANGER ? 'danger' : d.tmax >= HEAT_WARN ? 'warn' : '';
    return NT.el('div', { class: 'wx-day' }, [
      NT.el('div', { class: 'wx-day-head' }, [
        NT.el('span', { class: 'wx-day-label', text: d.label }),
        NT.el('span', { class: 'wx-day-code', text: codeLabel(d.code) }),
        NT.el('span', { class: 'wx-day-temp mono' + (hot ? ' ' + hot : ''),
          text: deg(d.tmax) + ' / ' + deg(d.tmin) }),
        NT.el('span', { class: 'wx-day-p mono' + (d.pmax >= RAIN_HIGH ? ' hi' : ''),
          text: '降水 ' + pct(d.pmax) })
      ]),
      marks.length ? NT.el('div', { class: 'wx-hours' }, marks) : null
    ]);
  }

  /* 助言1件 = 本文の段落 + （あれば）操作の行。
     ボタンやリンクを本文に流し込むと、「…してください。」の直後で折り返して
     ボタンだけが次の行に取り残される見え方になる（実機で確認）。
     押せるものは必ず本文の下の専用の行にまとめる。 */
  function adviceBlock(text, warn, actions) {
    var acts = (actions || []).filter(Boolean);
    return NT.el('div', { class: 'wx-adv' }, [
      NT.el('p', { class: 'notice' + (warn ? ' warn' : ''), text: text }),
      acts.length ? NT.el('div', { class: 'wx-actrow' }, acts) : null
    ]);
  }

  /* 行程に効く1〜3件。ここが「天気を見て何をするか」の本体で、
     数字を並べるだけで終わらせないための節 */
  function advice(wx) {
    var out = [];
    var risk = sensitiveRisk(wx.days);
    var saidRainFor = null;

    if (risk !== null && risk >= RAIN_SOME) {
      saidRainFor = RAIN_SENSITIVE.date;
      var jo = NT.spotById && NT.spotById(RAIN_SENSITIVE.spotId);
      out.push(adviceBlock(
        RAIN_SENSITIVE.name + '（' + RAIN_SENSITIVE.from + ':00-' + RAIN_SENSITIVE.to + ':00）の'
          + '時間帯は降水確率 ' + pct(risk) + '。'
          + (risk >= RAIN_HIGH ? '中止の可能性があります。' : '')
          + '中止は公式サイトで告知されるので、城へ出る前に確認してください。',
        true,
        [
          jo && jo.official ? NT.el('a', {
            class: 'btn wx-act', href: jo.official,
            target: '_blank', rel: 'noopener', text: '名古屋城 公式'
          }) : null,
          /* この件が出たときは下の一般的な雨の件を抑えるので、切替ボタンはここに置く */
          switchBtn('rain', '雨モードにする')
        ]));
    }

    var hottest = null, wettest = null;
    wx.days.forEach(function (d) {
      if (hottest === null || d.tmax > hottest.tmax) hottest = d;
      if (wettest === null || d.pmax > wettest.pmax) wettest = d;
    });
    if (hottest && hottest.tmax >= HEAT_WARN) {
      out.push(adviceBlock(
        hottest.label + 'は最高 ' + deg(hottest.tmax) + ' の予報。'
          + (hottest.tmax >= HEAT_DANGER ? '猛暑日です。' : '')
          + '屋外は1時間で区切り、地下街と屋内の逃げ場を挟んでください。',
        hottest.tmax >= HEAT_DANGER,
        [switchBtn('heat', '猛暑モードにする')]));
    }
    /* 大盆踊りの件で同じ日の雨に触れたときは、この一般論を重ねない。
       同じ日について2件つづけて雨を言うと、どちらも読み飛ばされる */
    if (wettest && wettest.pmax >= RAIN_SOME && wettest.date !== saidRainFor) {
      out.push(adviceBlock(
        wettest.label + 'の降水確率は最大 ' + pct(wettest.pmax) + '。傘を持って出てください。',
        false,
        [switchBtn('rain', '雨モードにする')]));
    }
    return out;
  }

  function head(rec) {
    var btn = NT.el('button', {
      class: 'btn wx-reload', type: 'button',
      text: state.loading ? '取得中…' : '更新',
      disabled: state.loading,
      onclick: function () { NT.fetchWeather(true); }
    });
    return NT.el('div', { class: 'wx-head' }, [
      NT.el('h3', { text: '名古屋の天気' }),
      NT.el('span', { class: 'wx-at mono',
        text: rec ? stamp(rec.at) : '' }),
      btn
    ]);
  }

  function currentLine(c) {
    if (!c) return null;
    return NT.el('div', { class: 'wx-now' }, [
      NT.el('span', { class: 'wx-now-temp mono', text: deg(c.t) }),
      NT.el('span', { class: 'wx-now-code', text: codeLabel(c.code) }),
      NT.el('span', { class: 'wx-now-feels', text: '体感 ' + deg(c.feels) })
    ]);
  }

  NT.renderWeather = function () {
    var root = NT.$('#weather-root');
    if (!root) return;
    root.textContent = '';

    var rec = cached();
    var card = NT.el('div', { class: 'card wx' }, [head(rec)]);

    if (!rec) {
      card.appendChild(NT.el('p', { class: 'notice' + (state.error ? ' warn' : ''),
        text: state.loading ? '取得しています…'
          : (state.error || '天気はまだ取得していません。') }));
      if (state.error) {
        card.appendChild(NT.el('p', { class: 'notice',
          text: '電波が無いか、機内モードかもしれません。行程・名所・名物は' +
                'このまま使えます。電波が戻ったら「更新」を押してください。' }));
      }
    } else {
      card.appendChild(currentLine(rec.wx.current));
      /* 取得に失敗していても、前回の内容は必ず「いつ時点か」を添えて出す。
         古い予報を今の予報と誤読させないための一行 */
      if (state.error) {
        card.appendChild(NT.el('p', { class: 'notice warn',
          text: state.error + '。以下は ' + stamp(rec.at) + 'の内容です。' }));
      }
      if (rec.wx.days.length) {
        rec.wx.days.forEach(function (d) { card.appendChild(dayRow(d)); });
        advice(rec.wx).forEach(function (p) { card.appendChild(p); });
      } else {
        card.appendChild(NT.el('p', { class: 'notice',
          text: '旅の日（8/11・8/12）の予報はまだ出ていません。予報は7日先までです。' }));
      }
    }

    card.appendChild(NT.el('p', { class: 'notice wx-src' }, [
      '出典 Open-Meteo。気象庁の警報・注意報は ',
      NT.el('a', {
        href: 'https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=230000',
        target: '_blank', rel: 'noopener', text: '気象庁（愛知県）' }),
      ' で確認してください。'
    ]));

    root.appendChild(NT.el('section', { class: 'tight' }, [card]));
  };

  /* 起動時に1回。以降は、画面に戻ってきたときに古ければ取り直す
     （地下街から地上に出た・翌朝また開いた、という使い方を拾う）。 */
  NT.initWeather = function () {
    if (!NT.$('#weather-root')) return;
    NT.renderWeather();
    NT.fetchWeather(false);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') NT.fetchWeather(false);
    });
  };
})(window);
