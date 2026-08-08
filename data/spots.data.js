/* 名所データ 30件。確定行程10件（★）は trivia/tips を厚く、代替20件は軽めに。
   営業時間・定休日は 2026-08-08 時点で確認した内容（brief 記載値）を転記。
   叶・あつた蓬莱軒 神宮店・松坂屋店の3件は祝日の振替休の関係で8/12の営業有無が
   確定できないため unverified:true。 */
(function (w) {
  var NT = (w.NT = w.NT || {});
  NT.AREAS = ['名古屋駅', '栄・大須', '熱田', '名古屋城', '覚王山・東部', 'その他'];

  NT.spots = [
    /* ===== 確定行程の箇所。trivia と tips を厚く ===== */
    { id:'kanou', name:'味処 叶', area:'栄・大須', category:'食事',
      indoor:true, shade:true,
      station:'地下鉄 栄駅', walk:'徒歩3分（矢場町駅 徒歩6分）',
      hours:'11:00-14:30 / 17:00-20:30',
      closed:'月・火（祝日の場合は次の日が定休日）',
      fee:'元祖味噌カツ丼 1,800円前後', stay:60,
      lat:35.1667, lng:136.9075, tel:'052-241-3471',
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('味処 叶 名古屋市中区栄3-4-110'),
      official:'https://www.misokatu-kanou.com/',
      trivia:[
        '創業昭和24年。味噌カツ発祥を名乗る店のひとつ',
        '揚げたカツに味噌だれをかけるのではなく、味噌で煮込むのが元祖の作り方。だから重さが出ない',
        '半熟玉子とねぎを足した状態が地元の定番',
        '支店を持たず1店舗のみ。名古屋を離れると食べられない'
      ],
      tips:[
        '定休は月・火だが「祝日の場合は次の日が定休日」。8/11は山の日なので営業し、振替で8/12が休みになる可能性が高い',
        '昼の部は14:30まで。小さい店なので開店前後に着くのが安全',
        '公式サイトに営業カレンダーがある。出発前に052-241-3471で確認するのが確実'
      ],
      verifiedOn:'2026-08-08', unverified:true },

    { id:'atsuta', name:'熱田神宮', area:'熱田', category:'神社',
      indoor:false, shade:true,
      station:'地下鉄 神宮西駅 / 名鉄 神宮前駅', walk:'神宮西駅から徒歩3分（正門）／神宮前駅から徒歩3分（西門）',
      hours:'境内 24時間（宝物館 9:00-16:30、こころの小径は9:00-16:00のみ通行可）',
      closed:'境内は無休（宝物館は展示替期間などに臨時休あり）',
      fee:'境内無料（宝物館 大人500円）', stay:60,
      lat:35.1287, lng:136.9074,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('熱田神宮 名古屋'),
      official:'https://www.atsutajingu.or.jp/',
      trivia:[
        '三種の神器のひとつ、草薙剣を祀る',
        '信長塀は桶狭間の戦勝を機に織田信長が奉納したと伝わる築地塀',
        '「こころの小径」は熱田神宮でもっとも神聖とされる区域で、通行できるのは9:00-16:00のみ',
        '境内には樹齢1000年超ともいわれる大楠が茂り、真夏でも木陰が濃い',
        '門前の「きよめ餅」は参拝の定番土産'
      ],
      tips:[
        '宝物館は展示替期間などに休館日があるため、拝観を軸にし宝物館は時間が合えば寄る程度に',
        '正門からこころの小径経由で東門・西門へ抜けると木陰を長く歩ける'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'pokecen', name:'ポケモンセンターナゴヤ', area:'栄・大須', category:'ショッピング',
      indoor:true, shade:true,
      station:'地下鉄 矢場町駅 4番出口', walk:'徒歩1分',
      hours:'10:00-21:00',
      closed:'名古屋PARCOの休館日に準ずる',
      fee:'入場無料（商品は店舗ごとの価格）', stay:40,
      lat:35.1637, lng:136.9086,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('ポケモンセンターナゴヤ 名古屋PARCO'),
      official:'https://www.pokemon.co.jp/shop/pokemoncenter/nagoya/',
      trivia:[
        '名古屋PARCOは西館・東館の2棟に分かれており、ポケモンセンターナゴヤは東館2階にある（西館ではない）',
        '地下鉄矢場町駅4番出口を出てすぐの立地で、雨天でもほぼ濡れずに入店できる',
        'しゃちほこピカチュウなど、名古屋モチーフの地域限定グッズを扱う数少ない店舗のひとつ',
        '祝日の昼過ぎは来店が集中し、入場整理券が配布されることがある'
      ],
      tips:[
        '西館ではなく東館2Fなので入口を間違えないこと',
        '混雑が読めないため滞在時間に余裕を持たせる'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'osu', name:'大須商店街', area:'栄・大須', category:'商店街',
      indoor:false, shade:true,
      station:'地下鉄 大須観音駅 / 上前津駅 / 矢場町駅', walk:'いずれの駅からも徒歩3-5分',
      hours:'商店街の通行は終日可（各店舗の営業時間は個別）',
      closed:'店舗により異なる',
      fee:'無料（散策）', stay:90,
      lat:35.1595, lng:136.8996,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('大須商店街 名古屋'),
      official:'https://osu.nagoya/',
      trivia:[
        '大須観音は真言宗のお寺で、徳川家康の命により岐阜羽島から現在地へ移築された',
        '1200店舗超がひしめき、電気街・古着・食べ歩きが混在する独特の成り立ち',
        '全蓋アーケードの通りが多く、日差しを遮るため真夏の日中でも比較的歩きやすい',
        '上前津・大須観音・矢場町という3つの地下鉄駅のいずれからもアクセスでき、周辺散策の合流点になる'
      ],
      tips:[
        '上前津・大須観音・矢場町の3駅に囲まれているので、行程の合流点として使いやすい'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'nagoyajo', name:'名古屋城', area:'名古屋城', category:'城',
      indoor:false, shade:false,
      station:'地下鉄 市役所駅', walk:'徒歩5分',
      hours:'夏まつり期間(8/8-16) 9:00-20:30（閉門21:00）。本丸御殿・西南隅櫓・西の丸御蔵城宝館の最終入場は16:00',
      closed:'無休（夏まつり期間中）',
      fee:'一般500円', stay:120,
      lat:35.1856, lng:136.8994,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('名古屋城'),
      official:'https://www.nagoyajo.city.nagoya.jp/',
      trivia:[
        '天守は耐震性の問題で内部非公開',
        '金鯱は北側が雌・南側が雄で、鱗の数が異なる',
        '8/11は大盆踊り(18:00-20:00)、大道芸(16:00-20:30)、城子屋「名古屋城と怪異」(18:00-19:30)が開催される',
        '本丸御殿は2018年に復元完成した木造建築'
      ],
      tips:[
        '本丸御殿など主要施設の最終入場は16:00。閉門21:00より早く締まる建物があるので順序に注意',
        '夏まつり期間中は夜間も開いているため、昼の暑さを避けて夕方以降に回すのもあり'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'shachihoko-shokudo', name:'鯱食堂', area:'名古屋城', category:'屋台・グルメ',
      indoor:false, shade:true,
      station:'地下鉄 市役所駅', walk:'徒歩5分（名古屋城内）',
      hours:'16:00-20:30（夏まつり期間限定）',
      closed:'夏まつり開催日以外は営業なし',
      fee:'かき氷・屋台グルメ 500-1,500円程度', stay:40,
      lat:35.1850, lng:136.8990,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('名古屋城 鯱食堂'),
      official:'https://www.nagoyajo.city.nagoya.jp/',
      trivia:[
        '名古屋城夏まつり(8/8-16)期間限定で城内に出る飲食ブース。通常期は営業しない',
        'かき氷やビール、屋台グルメを城内で楽しめる',
        '外の金シャチ横丁まで出なくても、城内だけで食事が完結する',
        '営業時間16:00-20:30は大盆踊り(18:00-20:00)の開催時間と重なり、踊りを眺めながら食事ができる'
      ],
      tips:[
        '盆踊りやイベントの合間に立ち寄りやすい位置にある'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'gomitori', name:'伍味酉 本店', area:'栄・大須', category:'食事',
      indoor:true, shade:true,
      station:'地下鉄 栄駅', walk:'徒歩5分程度',
      hours:'17:00-翌5:00（料理L.O. 翌4:00）',
      closed:'年中無休',
      fee:'串焼き・親子丼など 1,000-3,000円程度', stay:90,
      lat:35.1697, lng:136.9086,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('伍味酉 本店 名古屋'),
      official:'https://gomiyu.co.jp/',
      trivia:[
        '純系名古屋コーチンの串焼きが名物',
        '贅沢親子丼や味噌おでんなど名古屋メシを一通り揃える',
        '骨董品で埋め尽くされた内装が名物で、店内を見て回るだけでも楽しい',
        '深夜5時まで営業しており、盆踊りが20時に終わってからでも余裕をもって入れる'
      ],
      tips:[
        '本店は栄エリアにあり、行程の締めくくりに使いやすい'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'tokugawa', name:'徳川美術館', area:'覚王山・東部', category:'博物館',
      indoor:true, shade:true,
      station:'JR大曽根駅 / 地下鉄大曽根駅', walk:'徒歩10分程度（基幹バス「徳川園新出来」下車すぐ）',
      hours:'10:00-17:00（入館は16:30まで）',
      closed:'月曜休館（祝日の場合は翌平日）',
      fee:'一般2,000円', stay:90,
      lat:35.1770, lng:136.9370,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('徳川美術館 名古屋'),
      official:'https://www.tokugawa-art-museum.jp/',
      trivia:[
        '尾張徳川家に伝わる大名道具、約1万件を収蔵する',
        '国宝「源氏物語絵巻」は保存のため原本非公開が基本で、通常は複製での展示',
        '2026年7月25日から9月27日まで夏季特別展「武芸 サムライ・アスリート」を開催',
        '隣接する徳川園は日本庭園で、美術館とは別料金',
        '屋内展示のため、猛暑日の休憩先として使える'
      ],
      tips:[
        '月曜休館だが行程日（火・水）は開館日',
        '徳川園とセットで回ると滞在時間が延びるので時間配分に注意'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'maruya-esca', name:'まるや本店 名駅店', area:'名古屋駅', category:'食事',
      indoor:true, shade:true,
      station:'JR・地下鉄・名鉄・近鉄 名古屋駅', walk:'太閤通口地下街エスカ内',
      hours:'11:00-22:00 頃（エスカ営業時間に準ずる）',
      closed:'年中無休',
      fee:'ひつまぶし 3,000-4,500円程度', stay:50,
      lat:35.1700, lng:136.8827,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('まるや本店 名駅店 エスカ'),
      official:'https://www.maruya-honten.com/',
      trivia:[
        '備長炭で焼く関西風の「地焼き」が特徴。関東風は一度蒸してから焼くが、地焼きは蒸さずに直火で仕上げるため皮が香ばしくパリッとする',
        '名古屋駅太閤通口の地下街エスカ内にあり、新幹線改札からのアクセスが良い',
        '年中無休のため、復路当日でも確実に立ち寄れる',
        'エスカは新幹線口（太閤通口）に直結する地下街で、荷物を持ったままでも移動しやすい'
      ],
      tips:[
        '駅直結なので、帰りの新幹線までの時間調整に組み込みやすい'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'sumiyoshi', name:'住よし', area:'名古屋駅', category:'食事',
      indoor:true, shade:true,
      station:'JR名古屋駅 新幹線ホーム上', walk:'改札内、乗り換え動線上',
      hours:'7:00-22:00 頃（ホームにより異なる）',
      closed:'年中無休',
      fee:'きしめん 400-600円程度', stay:10,
      lat:35.1706, lng:136.8816,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('住よし 名古屋駅 新幹線ホーム'),
      official:'',
      trivia:[
        '新幹線ホーム上にある立ち食いきしめん店で、改札を出ずに食べられる',
        '濃口のだしに花かつおがたっぷり乗るのが特徴',
        '提供が早く、3-5分程度で食べ終えられる',
        'きしめんは幅広で薄い平打ち麺のため茹で時間が短く、立ち食いのスピード提供に向いている'
      ],
      tips:[
        '乗り換えの合間に寄れるので、復路の時間調整に便利'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    /* ===== 代替・周辺 20件 ===== */
    { id:'houraiken-jingu', name:'あつた蓬莱軒 神宮店', area:'熱田', category:'食事',
      indoor:true, shade:true,
      station:'名鉄 神宮前駅', walk:'徒歩5分程度',
      hours:'11:30-14:30(L.O.) / 16:30-20:30',
      closed:'火曜・第2第4月曜（祝日は営業、その場合は振替休あり）',
      fee:'ひつまぶし 4,000-5,500円程度', stay:70,
      lat:35.1275, lng:136.9090, tel:'052-682-5598',
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('あつた蓬莱軒 神宮店'),
      official:'https://www.houraiken.com/',
      trivia:[
        'あつた蓬莱軒の支店のひとつで、熱田神宮参拝とセットで寄りやすい',
        '祝日は営業するが振替休が発生することがあり、8/12は休みになる可能性が拭えない'
      ],
      tips:[
        '出発前に電話で8/12の営業有無を確認するのが確実'
      ],
      verifiedOn:'2026-08-08', unverified:true },

    { id:'houraiken-honten', name:'あつた蓬莱軒 本店', area:'熱田', category:'食事',
      indoor:true, shade:true,
      station:'名鉄 神宮前駅 / 地下鉄 神宮西駅', walk:'徒歩7分程度',
      hours:'11:30-14:00(L.O.) / 16:30-20:30 頃',
      closed:'水曜・第2第4木曜',
      fee:'ひつまぶし 4,000-5,500円程度', stay:70,
      lat:35.1236, lng:136.9106, tel:'052-671-8686',
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('あつた蓬莱軒 本店'),
      official:'https://www.houraiken.com/',
      trivia:[
        'ひつまぶしの元祖を名乗り、「ひつまぶし」は登録商標として蓬莱軒が持つ',
        '本店は木造建築の趣ある佇まいで、行列ができることが多い'
      ],
      tips:[
        '8/12(水)は定休日にあたるため、本店狙いなら別日か他店に振り替える'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'houraiken-matsuzakaya', name:'あつた蓬莱軒 松坂屋店', area:'栄・大須', category:'食事',
      indoor:true, shade:true,
      station:'地下鉄 矢場町駅', walk:'松坂屋名古屋店内、徒歩1分',
      hours:'土日祝 11:00-20:30 通し営業（平日はL.O.に空き時間あり）',
      closed:'火曜（祝日は営業、振替休あり）、松坂屋の休館日に準ずる',
      fee:'ひつまぶし 4,000-5,500円程度', stay:70,
      lat:35.1637, lng:136.9068, tel:'050-5785-4308',
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('あつた蓬莱軒 松坂屋店'),
      official:'https://www.houraiken.com/',
      trivia:[
        '松坂屋名古屋店内にあり、土日祝は11:00-20:30の通し営業でL.O.の谷間がない',
        '矢場町駅直結で、ポケモンセンターや矢場とんと合わせて回りやすい立地'
      ],
      tips:[
        '定休は火曜だが祝日は営業、振替休が発生しうるため8/12の営業有無は要確認'
      ],
      verifiedOn:'2026-08-08', unverified:true },

    { id:'yabaton', name:'矢場とん 矢場町本店', area:'栄・大須', category:'食事',
      indoor:true, shade:true,
      station:'地下鉄 矢場町駅', walk:'徒歩3分',
      hours:'11:00-21:00 頃',
      closed:'年中無休',
      fee:'わらじとんかつ 1,500-2,500円程度', stay:50,
      lat:35.1636, lng:136.9068,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('矢場とん 矢場町本店'),
      official:'https://www.yabaton.com/',
      trivia:[
        '看板メニューの「わらじとんかつ」は名前どおり草履のように大きい',
        '味噌だれは他店より甘めに仕上げてあるのが特徴'
      ],
      tips:[],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'suzuya', name:'すゞ家', area:'栄・大須', category:'食事',
      indoor:true, shade:true,
      station:'地下鉄 大須観音駅 / 上前津駅', walk:'徒歩5分程度',
      hours:'11:00-21:00 頃',
      closed:'不定休',
      fee:'味噌カツ・味噌串カツ 1,000-2,000円程度', stay:45,
      lat:35.1608, lng:136.8996,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('すゞ家 大須'),
      official:'',
      trivia:[
        '大須で長く続く老舗の味噌カツ店',
        '味噌串カツなど、つまみ感覚で食べられるメニューもある'
      ],
      tips:[
        '大須商店街を歩く動線上にあるので気軽に寄れる'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'tonpachi', name:'とん八', area:'その他', category:'食事',
      indoor:true, shade:true,
      station:'JR中央線 鶴舞駅', walk:'徒歩7分',
      hours:'昼・夜の営業（詳細は店舗に要確認）',
      closed:'定休日は店舗に要確認',
      fee:'味噌カツ 1,200-2,000円程度', stay:45,
      lat:35.1564, lng:136.9268,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('とん八 鶴舞'),
      official:'',
      trivia:[
        'カツ全体をたれで覆う「ドロドロ系」の味噌カツで知られる',
        '鶴舞駅からやや離れており、他の名所からも動線を外れる'
      ],
      tips:[
        '行程の主動線から外れるため、味噌カツを食べ比べたい場合の三番手候補'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'sekaino-yamachan', name:'世界の山ちゃん 本店', area:'栄・大須', category:'食事',
      indoor:true, shade:true,
      station:'地下鉄 栄駅 / 伏見駅', walk:'徒歩5-10分程度',
      hours:'17:00-24:00 頃',
      closed:'年中無休 頃',
      fee:'手羽先など 2,000-3,500円程度', stay:60,
      lat:35.1656, lng:136.9098,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('世界の山ちゃん 本店 名古屋'),
      official:'https://yamachan.co.jp/',
      trivia:[
        '「幻の手羽先」で知られ、こしょうを効かせた辛口の味付けが特徴',
        '深夜まで営業しており、夜の締めの一軒として使いやすい'
      ],
      tips:[
        '本店は栄・伏見エリアにあり、他の飲食店と合わせて食べ歩きしやすい'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'furaibou', name:'風来坊 栄店', area:'栄・大須', category:'食事',
      indoor:true, shade:true,
      station:'地下鉄 栄駅', walk:'徒歩5分程度',
      hours:'17:00-24:00 頃',
      closed:'年中無休 頃',
      fee:'手羽先など 2,000-3,000円程度', stay:60,
      lat:35.1683, lng:136.9088,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('風来坊 栄店'),
      official:'https://www.furaibou.com/',
      trivia:[
        '手羽先唐揚げの元祖を名乗る名古屋の名物店',
        '甘辛いたれとごまの風味が効いた味付けが特徴'
      ],
      tips:[
        '栄エリアに複数店舗があり、行程に合わせて店舗を選びやすい'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'yamamotoya', name:'山本屋総本家', area:'栄・大須', category:'食事',
      indoor:true, shade:true,
      station:'地下鉄 栄駅 / 矢場町駅', walk:'徒歩5-10分程度',
      hours:'11:00-21:00 頃',
      closed:'店舗により異なる',
      fee:'味噌煮込みうどん 1,300-2,000円程度', stay:50,
      lat:35.1668, lng:136.9080,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('山本屋総本家 名古屋'),
      official:'https://www.yamamotoya.co.jp/',
      trivia:[
        '味噌煮込みうどんの老舗で、麺の芯が残る固さが仕様として供される',
        '土鍋の蓋を取り皿代わりに使うのが名古屋流の食べ方'
      ],
      tips:[
        '土鍋のまま出てくるので、猫舌の人は少し冷ましてから食べるとよい'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'misen', name:'味仙 今池本店', area:'覚王山・東部', category:'食事',
      indoor:true, shade:true,
      station:'地下鉄 今池駅', walk:'徒歩5分程度',
      hours:'11:30-翌3:00 頃',
      closed:'年中無休 頃',
      fee:'台湾ラーメンなど 800-1,500円程度', stay:45,
      lat:35.1667, lng:136.9436,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('味仙 今池本店'),
      official:'https://www.misen.ne.jp/',
      trivia:[
        '台湾ラーメンの発祥の店。実は台湾に「台湾ラーメン」というメニューは存在せず、名古屋生まれ',
        '辛さは注文時に「小辛」「大辛」など調整できる店舗が多い'
      ],
      tips:[
        '深夜まで営業しているため、行程が押しても寄りやすい'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'yoshikawa', name:'ヨコイ 住吉店', area:'栄・大須', category:'食事',
      indoor:true, shade:true,
      station:'地下鉄 栄駅 / 矢場町駅', walk:'徒歩5-10分程度',
      hours:'11:00-21:00 頃',
      closed:'店舗により異なる',
      fee:'あんかけスパゲッティ 900-1,500円程度', stay:40,
      lat:35.1650, lng:136.9070,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('ヨコイ 住吉店 名古屋'),
      official:'https://www.pasta-yokoi.co.jp/',
      trivia:[
        'あんかけスパゲッティの元祖を名乗る「ヨコイ」の一店舗',
        '極太麺に黒胡椒の効いたどろっとしたソースを絡めるのが特徴'
      ],
      tips:[
        '一皿のボリュームが大きいので、他の食べ歩きと組み合わせるならシェアがおすすめ'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'kissa-tanaka', name:'コンパル 大須本店', area:'栄・大須', category:'喫茶',
      indoor:true, shade:true,
      station:'地下鉄 大須観音駅 / 上前津駅', walk:'徒歩5分程度',
      hours:'8:00-21:00 頃',
      closed:'年中無休 頃',
      fee:'えびフライサンド 800-1,200円程度', stay:40,
      lat:35.1600, lng:136.8987,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('コンパル 大須本店'),
      official:'https://konparu.co.jp/',
      trivia:[
        '名古屋の老舗喫茶チェーン「コンパル」の大須本店',
        'えびフライサンドが看板メニューで、モーニングと小倉トーストも人気'
      ],
      tips:[
        '大須散策の合間に軽食休憩として使いやすい'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'konparu-meieki', name:'コンパル メイチカ店', area:'名古屋駅', category:'喫茶',
      indoor:true, shade:true,
      station:'地下鉄 名古屋駅（メイチカ内）', walk:'駅地下街内すぐ',
      hours:'8:00-21:00 頃',
      closed:'年中無休 頃',
      fee:'モーニング・喫茶メニュー 500-1,200円程度', stay:30,
      lat:35.1705, lng:136.8823,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('コンパル メイチカ店'),
      official:'https://konparu.co.jp/',
      trivia:[
        '名古屋駅地下街「メイチカ」にあるコンパルの支店',
        '8時台から開いているので、Day2の朝食候補にしやすい'
      ],
      tips:[
        '駅直結なので、集合前や出発前の朝食に組み込みやすい'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'kissa-mountain', name:'喫茶マウンテン', area:'その他', category:'喫茶',
      indoor:true, shade:true,
      station:'地下鉄 本山駅', walk:'徒歩15分程度',
      hours:'11:00-21:00 頃',
      closed:'不定休 頃',
      fee:'甘口抹茶スパなど 1,000-1,800円程度', stay:45,
      lat:35.1533, lng:136.9666,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('喫茶マウンテン 名古屋'),
      official:'',
      trivia:[
        '激甘の「甘口抹茶スパ」など、常識を超えた盛り付けで知られる名物喫茶',
        '名古屋大学に近く、他の名所からは大きく離れている'
      ],
      tips:[
        '行程の動線から大きく外れるため、専用に時間を確保する場合のみ候補に'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'oasis21', name:'オアシス21', area:'栄・大須', category:'公園・広場',
      indoor:false, shade:true,
      station:'地下鉄 栄駅', walk:'徒歩1分（直結）',
      hours:'施設により異なる（水の宇宙船は10:00-21:00 頃）',
      closed:'無休 頃',
      fee:'入場無料（屋上の水盤も無料）', stay:30,
      lat:35.1697, lng:136.9086,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('オアシス21 名古屋'),
      official:'https://www.sakaepark.co.jp/',
      trivia:[
        '「水の宇宙船」と呼ばれるガラスの大屋根が栄のシンボル',
        '地下街・バスターミナルと直結しており、猛暑や雨の際の避難先として使える'
      ],
      tips:[
        '屋上の水盤は無料で歩ける。栄散策の休憩ポイントに最適'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'sunshine-sakae', name:'サンシャインサカエ', area:'栄・大須', category:'商業施設',
      indoor:true, shade:true,
      station:'地下鉄 栄駅', walk:'徒歩3分程度',
      hours:'10:00-21:00 頃（観覧車は別途営業時間あり）',
      closed:'不定休 頃',
      fee:'観覧車Sky-Boat 700円程度', stay:40,
      lat:35.1704, lng:136.9107,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('サンシャインサカエ'),
      official:'https://sunshine-sakae.jp/',
      trivia:[
        '観覧車「Sky-Boat」が屋上にあり、栄のランドマークのひとつ',
        'SKE48劇場が館内に入っている'
      ],
      tips:[
        '観覧車は夕方以降に乗ると夜景が楽しめる'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'noritake', name:'ノリタケの森', area:'名古屋駅', category:'博物館',
      indoor:true, shade:true,
      station:'JR名古屋駅', walk:'徒歩15分程度',
      hours:'10:00-17:00 頃（施設により異なる）',
      closed:'月曜休み 頃（祝日の場合は翌平日）',
      fee:'クラフトセンター 一般500円程度', stay:60,
      lat:35.1745, lng:136.8791,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('ノリタケの森'),
      official:'https://www.noritake.co.jp/mori/',
      trivia:[
        '洋食器メーカー・ノリタケの旧工場跡地を再開発した複合施設',
        '赤レンガの工場棟や煙突が残り、産業遺産としての趣がある',
        '絵付け体験ができる工房もある'
      ],
      tips:[
        '屋内展示が中心なので、猛暑日や雨天の代替候補として使いやすい'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'toyota-sangyo', name:'トヨタ産業技術記念館', area:'名古屋駅', category:'博物館',
      indoor:true, shade:true,
      station:'名鉄 栄生駅', walk:'徒歩3分程度',
      hours:'9:30-17:00 頃（入館は16:30まで）',
      closed:'月曜休館 頃（祝日の場合は翌平日）',
      fee:'一般1,000円程度', stay:90,
      lat:35.1811, lng:136.8814,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('トヨタ産業技術記念館'),
      official:'https://www.tcmit.org/',
      trivia:[
        'トヨタグループ発祥の地である旧本社工場を利用した博物館',
        '豊田自動織機の実機が動くデモンストレーションが見られる',
        '繊維機械の歴史から自動車産業への発展を辿れる展示構成'
      ],
      tips:[
        '屋内で涼しく、雨天時の代替プランとして優秀'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'kinshachi-yokocho', name:'金シャチ横丁', area:'名古屋城', category:'屋台街',
      indoor:false, shade:true,
      station:'地下鉄 市役所駅', walk:'徒歩5分程度（名古屋城正門・東門付近）',
      hours:'11:00-21:00 頃（店舗により異なる）',
      closed:'店舗により異なる',
      fee:'天むす・どて煮など 500-1,500円程度', stay:40,
      lat:35.1848, lng:136.9000,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('金シャチ横丁'),
      official:'https://kinshachi-yokocho.com/',
      trivia:[
        '名古屋城の正門側「義直ゾーン」と東門側「宗春ゾーン」の2エリアで構成される',
        '天むすやどて煮、味噌おでんなど名古屋めしの屋台・店舗が並ぶ'
      ],
      tips:[
        '名古屋城観光の前後に立ち寄りやすい位置にある'
      ],
      verifiedOn:'2026-08-08', unverified:false },

    { id:'esca', name:'エスカ地下街', area:'名古屋駅', category:'商業施設',
      indoor:true, shade:true,
      station:'JR名古屋駅 太閤通口', walk:'徒歩1分（直結）',
      hours:'10:00-20:30 頃（飲食店は21:00頃まで、店舗により異なる）',
      closed:'1/1・2月第3木曜・9月第2木曜（全館休業、公式サイト調べ）',
      fee:'入場無料', stay:40,
      lat:35.1699, lng:136.8823,
      map:'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('エスカ地下街'),
      official:'https://www.esca-sc.com/',
      trivia:[
        '新幹線口（太閤通口）直結の地下街で、名古屋土産と名古屋めしの店が集まる',
        '復路の新幹線出発前に、買い物と食事をまとめて済ませられる'
      ],
      tips:[
        '新幹線改札から近いので、出発直前の駆け込み利用にも向く'
      ],
      verifiedOn:'2026-08-08', unverified:false }
  ];

  NT.spotById = function (id) {
    for (var i = 0; i < NT.spots.length; i++) if (NT.spots[i].id === id) return NT.spots[i];
    return undefined;
  };
})(window);
