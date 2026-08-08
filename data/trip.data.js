(function (w) {
  var NT = (w.NT = w.NT || {});

  NT.plans = [
    { id:'A',
      name:'プランA｜叶を8/11に',
      note:'8/12の休業リスクを最小化した既定案。ひつまぶしは駅直結・年中無休のまるや本店にする',
      days:[
        { date:'2026-08-11', label:'DAY 1 — 8/11 tue 山の日', items:[
          { time:'10:12', title:'東京駅発 のぞみ', kind:'move',
            note:'11:48 名古屋着。所要1時間36分', stay:96, minStay:96 },
          { time:'11:50', title:'荷物を預ける', kind:'plain',
            note:'ホテルが名古屋駅前ならフロントへ。栄泊なら駅のコインロッカーが早い',
            stay:25, minStay:10 },
          { time:'12:20', title:'味噌カツ｜味処 叶（栄）', spotId:'kanou', kind:'hero', hero:'味噌カツ',
            note:'元祖味噌カツ丼。揚げたカツを味噌で煮込むので重くない。半熟玉子とねぎを足すのが定番',
            stay:60, minStay:40, hardDeadline:'14:30', deadlineWhy:'昼の部のラストオーダー',
            alts:{
              crowd:{ title:'すゞ家（大須）に切り替える', spotId:'suzuya',
                note:'叶の行列が読めないときは大須の老舗へ。味噌串カツなら待たずに食べられる' },
              rain:{ title:'そのまま叶へ', spotId:'kanou',
                note:'栄駅から地下街を通れば地上に出るのは最後の1分だけ' }
            } },
          { time:'14:00', title:'熱田神宮', spotId:'atsuta', kind:'plain',
            note:'栄→熱田神宮伝馬町 名城線で15分。樹齢1000年超の大楠で木陰が濃い',
            stay:70, minStay:35,
            alts:{
              rain:{ title:'トヨタ産業技術記念館', spotId:'toyota-sangyo',
                note:'屋内で実機が動く。名古屋駅から徒歩圏なので雨なら南へ下がらない方が楽' },
              heat:{ title:'熱田は木陰が濃いので続行可', spotId:'atsuta',
                note:'ただし宝物館（9:00-16:30）で涼む時間を挟む。こころの小径は16:00で閉まる' }
            } },
          { time:'15:45', title:'ポケモンセンターナゴヤ', spotId:'pokecen', kind:'poke',
            note:'PARCO東館2F。矢場町駅4番出口 徒歩1分。しゃちほこピカチュウはここ限定',
            stay:60, minStay:30, hardDeadline:'21:00', deadlineWhy:'閉店',
            alts:{
              crowd:{ title:'先に大須へ回し、閉店前に戻る', spotId:'osu',
                note:'祝日の昼過ぎは入場制限が出ることがある。21時まで開いているので夜に回せる' }
            } },
          { time:'17:00', title:'大須商店街', spotId:'osu', kind:'plain',
            note:'PARCOから徒歩10分。全蓋アーケードなので日陰',
            stay:60, minStay:30,
            alts:{
              heat:{ title:'アーケードなので続行可', spotId:'osu',
                note:'それでも厳しければオアシス21の地下へ。栄まで地下鉄1駅' }
            } },
          { time:'18:15', title:'名古屋城 夏まつり', spotId:'nagoyajo', kind:'plain',
            note:'上前津→市役所 名城線で10分。建物の最終入場は16時なので天守と本丸御殿は元から入れない。' +
                 '狙うのは大盆踊り18:00-20:00（西之丸）、大道芸16:00-20:30、城子屋「名古屋城と怪異」18:00-19:30',
            stay:105, minStay:45, hardDeadline:'20:30', deadlineWhy:'開園終了（閉門21:00）',
            alts:{
              rain:{ title:'金シャチ横丁で雨宿りしつつ中止を確認', spotId:'kinshachi-yokocho',
                note:'大盆踊り18:00-20:00の中止は公式サイトで告知される。屋根のある金シャチ横丁で待ちながら確認し、' +
                     '中止が確定してから栄・オアシス21へ動けば無駄足にならない' }
            } },
          { time:'18:45', title:'鯱食堂で軽くつまむ', spotId:'shachihoko-shokudo', kind:'meal',
            note:'城内の飲食ブース。16:00-20:30。かき氷とビール、屋台グルメ。夜の本番があるので一皿だけ',
            stay:35, minStay:15,
            alts:{
              rain:{ title:'金シャチ横丁で天むすとどて煮', spotId:'kinshachi-yokocho',
                note:'盆踊りが続いていれば横丁で食べながら待てる。中止確定で栄へ動いていたら、このまま栄で軽く済ませてもいい' }
            } },
          { time:'20:30', title:'名古屋コーチン｜伍味酉 本店（栄）', spotId:'gomitori',
            kind:'hero', hero:'コーチン',
            note:'市役所→栄 名城線で3分。17:00-05:00 年中無休なので盆踊りが20:00に終わってからでも余裕。' +
                 '純系名古屋コーチンの串焼き、贅沢親子丼、味噌おでん',
            stay:90, minStay:50,
            alts:{
              crowd:{ title:'世界の山ちゃん 本店', spotId:'sekaino-yamachan',
                note:'祝日の栄は21時台が混む。手羽先で妥協するなら深夜まで開いている' }
            } }
        ]},
        { date:'2026-08-12', label:'DAY 2 — 8/12 wed', items:[
          { time:'08:00', title:'喫茶店のモーニング', spotId:'konparu-meieki', kind:'meal',
            note:'名古屋駅地下メイチカのコンパル。8:00から。小倉トーストとゆで卵',
            stay:50, minStay:25,
            alts:{
              crowd:{ title:'大須のコンパル本店', spotId:'kissa-tanaka',
                note:'えびフライサンドが名物。駅から離れる分すいている' }
            } },
          { time:'09:40', title:'徳川美術館', spotId:'tokugawa', kind:'plain',
            note:'10:00開館。大曽根駅から徒歩15分か名鉄瀬戸線 森下駅から徒歩10分。' +
                 '夏季特別展「武芸 サムライ・アスリート」開催中。屋内なので猛暑日の逃げ場',
            stay:95, minStay:50, hardDeadline:'16:30', deadlineWhy:'入館締切',
            alts:{
              crowd:{ title:'ノリタケの森', spotId:'noritake',
                note:'名古屋駅から徒歩15分。移動が短いぶん昼に余裕が出る' }
            } },
          { time:'12:00', title:'ひつまぶし｜まるや本店 名駅店', spotId:'maruya-esca',
            kind:'hero', hero:'ひつまぶし',
            note:'エスカ地下街。年中無休で駅直結なので14:49発の日でも読み違えがない。' +
                 '一杯目はそのまま、二杯目は薬味、三杯目は出汁',
            stay:60, minStay:35, hardDeadline:'14:00', deadlineWhy:'土産と乗車の時間を残す最終ライン',
            alts:{
              crowd:{ title:'エスカ内の別店へ', spotId:'esca',
                note:'エスカには味噌煮込みうどんときしめんの店も入る。行列を見て決められる' }
            } },
          { time:'13:15', title:'土産', spotId:'esca', kind:'plain',
            note:'エスカとタカシマヤ。ぴよりんは要冷蔵で崩れやすいので最後に買う',
            stay:50, minStay:25, hardDeadline:'14:35', deadlineWhy:'ホームへの移動を残す' },
          { time:'14:20', title:'ホームの住よしできしめん', spotId:'sumiyoshi', kind:'meal',
            note:'新幹線ホーム上の立ち食い。3〜5分で出るので発車前に収まる',
            stay:15, minStay:8, hardDeadline:'14:45', deadlineWhy:'14:49発の乗車' },
          { time:'14:49', title:'名古屋発 のぞみ', kind:'move',
            note:'16:24 東京着', stay:95, minStay:95 }
        ]}
      ]},

    { id:'B',
      name:'プランB｜蓬莱軒を優先',
      note:'ひつまぶしをあつた蓬莱軒で食べる案。8/11昼は松坂屋店の祝日通し営業なら行列を待てる。味噌カツは無休の矢場とんに回す',
      days:[
        { date:'2026-08-11', label:'DAY 1 — 8/11 tue 山の日', items:[
          { time:'10:12', title:'東京駅発 のぞみ', kind:'move',
            note:'11:48 名古屋着。所要1時間36分', stay:96, minStay:96 },
          { time:'11:50', title:'荷物を預ける', kind:'plain',
            note:'ホテルが名古屋駅前ならフロントへ。栄泊なら駅のコインロッカーが早い',
            stay:25, minStay:10 },
          { time:'12:30', title:'ひつまぶし｜あつた蓬莱軒 松坂屋店', spotId:'houraiken-matsuzakaya',
            kind:'hero', hero:'ひつまぶし',
            note:'矢場町。祝日は11:00-20:30の通し営業でL.O.の崖がないので行列を待てる。待ち時間は松坂屋の館内で潰せる',
            stay:90, minStay:45,
            alts:{
              crowd:{ title:'エスカ内の別店へ', spotId:'esca',
                note:'エスカには味噌煮込みうどんときしめんの店も入る。行列を見て決められる' },
              rain:{ title:'そのまま松坂屋店へ', spotId:'houraiken-matsuzakaya',
                note:'松坂屋の館内から入れるので雨でも濡れない' }
            } },
          { time:'14:30', title:'ポケモンセンターナゴヤ', spotId:'pokecen', kind:'poke',
            note:'松坂屋から徒歩3分。PARCO東館2F',
            stay:60, minStay:30, hardDeadline:'21:00', deadlineWhy:'閉店',
            alts:{
              crowd:{ title:'先に大須へ回し、閉店前に戻る', spotId:'osu',
                note:'祝日の昼過ぎは入場制限が出ることがある。21時まで開いているので夜に回せる' }
            } },
          { time:'15:45', title:'大須商店街', spotId:'osu', kind:'plain',
            note:'PARCOから徒歩10分。全蓋アーケードなので日陰',
            stay:60, minStay:30,
            alts:{
              heat:{ title:'アーケードなので続行可', spotId:'osu',
                note:'それでも厳しければオアシス21の地下へ。栄まで地下鉄1駅' }
            } },
          { time:'17:00', title:'熱田神宮', spotId:'atsuta', kind:'plain',
            note:'上前津→熱田神宮伝馬町 名城線10分。こころの小径は16:00で閉まるため夕方は境内と信長塀のみ。宝物館も16:30まで入れない',
            stay:55, minStay:30,
            alts:{
              rain:{ title:'トヨタ産業技術記念館', spotId:'toyota-sangyo',
                note:'屋内で実機が動く。名古屋駅から徒歩圏なので雨なら南へ下がらない方が楽' },
              heat:{ title:'熱田は木陰が濃いので続行可', spotId:'atsuta',
                note:'ただし宝物館・こころの小径はこの時間帯には入れない' }
            } },
          { time:'18:40', title:'名古屋城 夏まつり', spotId:'nagoyajo', kind:'plain',
            note:'熱田神宮伝馬町→市役所 名城線20分。建物の最終入場は16時なので天守と本丸御殿は元から入れない。' +
                 '盆踊りは20:00まで。大道芸16:00-20:30',
            stay:80, minStay:40, hardDeadline:'20:30', deadlineWhy:'開園終了（閉門21:00）',
            alts:{
              rain:{ title:'盆踊りは中止の可能性。オアシス21か栄へ', spotId:'oasis21',
                note:'雨天時の催し中止は公式サイトで告知される。城まで出る前に確認' }
            } },
          { time:'19:00', title:'鯱食堂で軽くつまむ', spotId:'shachihoko-shokudo', kind:'meal',
            note:'城内の飲食ブース。16:00-20:30。かき氷とビール、屋台グルメ。夜の本番があるので一皿だけ',
            stay:30, minStay:15,
            alts:{
              rain:{ title:'金シャチ横丁へ', spotId:'kinshachi-yokocho',
                note:'城の外だが屋根のある区画がある。天むすとどて煮' }
            } },
          { time:'20:30', title:'名古屋コーチン｜伍味酉 本店（栄）', spotId:'gomitori',
            kind:'hero', hero:'コーチン',
            note:'市役所→栄 名城線で3分。17:00-05:00 年中無休なので盆踊りが20:00に終わってからでも余裕。' +
                 '純系名古屋コーチンの串焼き、贅沢親子丼、味噌おでん',
            stay:90, minStay:50,
            alts:{
              crowd:{ title:'世界の山ちゃん 本店', spotId:'sekaino-yamachan',
                note:'祝日の栄は21時台が混む。手羽先で妥協するなら深夜まで開いている' }
            } }
        ]},
        { date:'2026-08-12', label:'DAY 2 — 8/12 wed', items:[
          { time:'08:00', title:'喫茶店のモーニング', spotId:'konparu-meieki', kind:'meal',
            note:'名古屋駅地下メイチカのコンパル。8:00から。小倉トーストとゆで卵',
            stay:50, minStay:25,
            alts:{
              crowd:{ title:'大須のコンパル本店', spotId:'kissa-tanaka',
                note:'えびフライサンドが名物。駅から離れる分すいている' }
            } },
          { time:'09:40', title:'徳川美術館', spotId:'tokugawa', kind:'plain',
            note:'10:00開館。大曽根駅から徒歩15分か名鉄瀬戸線 森下駅から徒歩10分。' +
                 '夏季特別展「武芸 サムライ・アスリート」開催中。屋内なので猛暑日の逃げ場',
            stay:85, minStay:50, hardDeadline:'16:30', deadlineWhy:'入館締切',
            alts:{
              crowd:{ title:'ノリタケの森', spotId:'noritake',
                note:'名古屋駅から徒歩15分。移動が短いぶん昼に余裕が出る' }
            } },
          { time:'11:45', title:'味噌カツ｜矢場とん 矢場町本店', spotId:'yabaton',
            kind:'hero', hero:'味噌カツ',
            note:'大曽根→栄→矢場町。年中無休なので水曜でも確実。わらじとんかつ',
            stay:55, minStay:35, hardDeadline:'13:30', deadlineWhy:'名古屋駅へ戻る時間を残す最終ライン' },
          { time:'13:15', title:'土産', spotId:'esca', kind:'plain',
            note:'矢場町→名古屋 徒歩含め20分。エスカとタカシマヤ。ぴよりんは要冷蔵で崩れやすいので最後に買う',
            stay:45, minStay:25, hardDeadline:'14:35', deadlineWhy:'ホームへの移動を残す' },
          { time:'14:20', title:'ホームの住よしできしめん', spotId:'sumiyoshi', kind:'meal',
            note:'新幹線ホーム上の立ち食い。3〜5分で出るので発車前に収まる',
            stay:15, minStay:8, hardDeadline:'14:45', deadlineWhy:'14:49発の乗車' },
          { time:'14:49', title:'名古屋発 のぞみ', kind:'move',
            note:'16:24 東京着', stay:95, minStay:95 }
        ]}
      ]}
  ];

  NT.planById = function (id) {
    for (var i = 0; i < NT.plans.length; i++) if (NT.plans[i].id === id) return NT.plans[i];
    return undefined;
  };
  NT.currentPlan = function () {
    return NT.planById(NT.get('plan', 'A')) || NT.plans[0];
  };
})(window);
