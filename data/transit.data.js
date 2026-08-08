/* 移動早見表 15区間。行程で実際に使う駅間だけを収録。運賃はIC運賃(円)。 */
(function (w) {
  var NT = (w.NT = w.NT || {});
  NT.transit = [
    { from:'名古屋', to:'栄',       line:'東山線',   min:5,  fare:210, note:'伏見で乗換なし' },
    { from:'名古屋', to:'伏見',     line:'東山線',   min:3,  fare:210, note:'' },
    { from:'栄',     to:'矢場町',   line:'名城線',   min:2,  fare:210, note:'徒歩でも10分' },
    { from:'栄',     to:'上前津',   line:'名城線',   min:4,  fare:210, note:'大須の南端' },
    { from:'栄',     to:'市役所',   line:'名城線',   min:3,  fare:210, note:'名古屋城の東門側' },
    { from:'栄',     to:'熱田神宮伝馬町', line:'名城線', min:15, fare:270, note:'金山経由で乗換なし' },
    { from:'矢場町', to:'上前津',   line:'名城線',   min:2,  fare:210, note:'大須は両駅から徒歩圏' },
    { from:'矢場町', to:'熱田神宮伝馬町', line:'名城線', min:13, fare:270, note:'' },
    { from:'上前津', to:'市役所',   line:'名城線',   min:10, fare:240, note:'名城線を北へ' },
    { from:'市役所', to:'栄',       line:'名城線',   min:3,  fare:210, note:'夜の栄へ戻る動線' },
    { from:'名古屋', to:'大曽根',   line:'東山線→名城線', min:22, fare:270, note:'栄で乗換。徳川美術館は徒歩15分' },
    { from:'大曽根', to:'栄',       line:'名城線',   min:12, fare:240, note:'' },
    { from:'名古屋', to:'金山',     line:'JR/名鉄',  min:6,  fare:200, note:'熱田方面の乗換拠点' },
    { from:'金山',   to:'神宮前',   line:'名鉄',     min:3,  fare:170, note:'熱田神宮の東門に近い' },
    { from:'名古屋', to:'大須観音', line:'桜通線→鶴舞線', min:11, fare:240, note:'丸の内で乗換' }
  ];
})(window);
