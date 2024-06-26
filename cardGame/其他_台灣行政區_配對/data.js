var categoryNames = [[]];
var cardData = [
  { name: "中正區", category: "台北市" },
  { name: "大同區", category: "台北市" },
  { name: "中山區", category: "台北市" },
  { name: "松山區", category: "台北市" },
  { name: "大安區", category: "台北市" },
  { name: "萬華區", category: "台北市" },
  { name: "信義區", category: "台北市" },
  { name: "士林區", category: "台北市" },
  { name: "北投區", category: "台北市" },
  { name: "內湖區", category: "台北市" },
  { name: "南港區", category: "台北市" },
  { name: "文山區", category: "台北市" },
  { name: "仁愛區", category: "基隆市" },
  { name: "信義區", category: "基隆市" },
  { name: "中正區(基)", category: "基隆市" },
  { name: "中山區(基)", category: "基隆市" },
  { name: "安樂區", category: "基隆市" },
  { name: "暖暖區", category: "基隆市" },
  { name: "七堵區", category: "基隆市" },
  { name: "萬里區", category: "新北市" },
  { name: "金山區", category: "新北市" },
  { name: "南竿鄉", category: "連江縣" },
  { name: "北竿鄉", category: "連江縣" },
  { name: "莒光鄉", category: "連江縣" },
  { name: "東引鄉", category: "連江縣" },
  { name: "板橋區", category: "新北市" },
  { name: "汐止區", category: "新北市" },
  { name: "深坑區", category: "新北市" },
  { name: "石碇區", category: "新北市" },
  { name: "瑞芳區", category: "新北市" },
  { name: "平溪區", category: "新北市" },
  { name: "雙溪區", category: "新北市" },
  { name: "貢寮區", category: "新北市" },
  { name: "新店區", category: "新北市" },
  { name: "坪林區", category: "新北市" },
  { name: "烏來區", category: "新北市" },
  { name: "永和區", category: "新北市" },
  { name: "中和區", category: "新北市" },
  { name: "土城區", category: "新北市" },
  { name: "三峽區", category: "新北市" },
  { name: "樹林區", category: "新北市" },
  { name: "鶯歌區", category: "新北市" },
  { name: "三重區", category: "新北市" },
  { name: "新莊區", category: "新北市" },
  { name: "泰山區", category: "新北市" },
  { name: "林口區", category: "新北市" },
  { name: "蘆洲區", category: "新北市" },
  { name: "五股區", category: "新北市" },
  { name: "八里區", category: "新北市" },
  { name: "淡水區", category: "新北市" },
  { name: "三芝區", category: "新北市" },
  { name: "石門區", category: "新北市" },
  { name: "宜蘭市", category: "宜蘭縣" },
  { name: "頭城鎮", category: "宜蘭縣" },
  { name: "礁溪鄉", category: "宜蘭縣" },
  { name: "壯圍鄉", category: "宜蘭縣" },
  { name: "員山鄉", category: "宜蘭縣" },
  { name: "羅東鎮", category: "宜蘭縣" },
  { name: "三星鄉", category: "宜蘭縣" },
  { name: "大同鄉", category: "宜蘭縣" },
  { name: "五結鄉", category: "宜蘭縣" },
  { name: "冬山鄉", category: "宜蘭縣" },
  { name: "蘇澳鎮", category: "宜蘭縣" },
  { name: "南澳鄉", category: "宜蘭縣" },
  { name: "東區(竹)", category: "新竹市" },
  { name: "北區(竹)", category: "新竹市" },
  { name: "香山區", category: "新竹市" },
  { name: "竹北市", category: "新竹縣" },
  { name: "湖口鄉", category: "新竹縣" },
  { name: "新豐鄉", category: "新竹縣" },
  { name: "新埔鎮", category: "新竹縣" },
  { name: "關西鎮", category: "新竹縣" },
  { name: "芎林鄉", category: "新竹縣" },
  { name: "寶山鄉", category: "新竹縣" },
  { name: "竹東鎮", category: "新竹縣" },
  { name: "五峰鄉", category: "新竹縣" },
  { name: "橫山鄉", category: "新竹縣" },
  { name: "尖石鄉", category: "新竹縣" },
  { name: "北埔鄉", category: "新竹縣" },
  { name: "峨眉鄉", category: "新竹縣" },
  { name: "中壢區", category: "桃園市" },
  { name: "平鎮區", category: "桃園市" },
  { name: "龍潭區", category: "桃園市" },
  { name: "楊梅區", category: "桃園市" },
  { name: "新屋區", category: "桃園市" },
  { name: "觀音區", category: "桃園市" },
  { name: "桃園區", category: "桃園市" },
  { name: "龜山區", category: "桃園市" },
  { name: "八德區", category: "桃園市" },
  { name: "大溪區", category: "桃園市" },
  { name: "復興區", category: "桃園市" },
  { name: "大園區", category: "桃園市" },
  { name: "蘆竹區", category: "桃園市" },
  { name: "竹南鎮", category: "苗栗縣" },
  { name: "頭份鎮", category: "苗栗縣" },
  { name: "三灣鄉", category: "苗栗縣" },
  { name: "南庄鄉", category: "苗栗縣" },
  { name: "獅潭鄉", category: "苗栗縣" },
  { name: "後龍鎮", category: "苗栗縣" },
  { name: "通霄鎮", category: "苗栗縣" },
  { name: "苑裡鎮", category: "苗栗縣" },
  { name: "苗栗市", category: "苗栗縣" },
  { name: "造橋鄉", category: "苗栗縣" },
  { name: "頭屋鄉", category: "苗栗縣" },
  { name: "公館鄉", category: "苗栗縣" },
  { name: "大湖鄉", category: "苗栗縣" },
  { name: "泰安鄉", category: "苗栗縣" },
  { name: "銅鑼鄉", category: "苗栗縣" },
  { name: "三義鄉", category: "苗栗縣" },
  { name: "西湖鄉", category: "苗栗縣" },
  { name: "卓蘭鎮", category: "苗栗縣" },
  { name: "中區(中)", category: "台中市" },
  { name: "東區(中)", category: "台中市" },
  { name: "南區(中)", category: "台中市" },
  { name: "西區(中)", category: "台中市" },
  { name: "北區(中)", category: "台中市" },
  { name: "北屯區", category: "台中市" },
  { name: "西屯區", category: "台中市" },
  { name: "南屯區", category: "台中市" },
  { name: "太平區", category: "台中市" },
  { name: "大里區", category: "台中市" },
  { name: "霧峰區", category: "台中市" },
  { name: "烏日區", category: "台中市" },
  { name: "豐原區", category: "台中市" },
  { name: "后里區", category: "台中市" },
  { name: "石岡區", category: "台中市" },
  { name: "東勢區", category: "台中市" },
  { name: "和平區", category: "台中市" },
  { name: "新社區", category: "台中市" },
  { name: "潭子區", category: "台中市" },
  { name: "大雅區", category: "台中市" },
  { name: "神岡區", category: "台中市" },
  { name: "大肚區", category: "台中市" },
  { name: "沙鹿區", category: "台中市" },
  { name: "龍井區", category: "台中市" },
  { name: "梧棲區", category: "台中市" },
  { name: "清水區", category: "台中市" },
  { name: "大甲區", category: "台中市" },
  { name: "外埔區", category: "台中市" },
  { name: "大安區", category: "台中市" },
  { name: "彰化市", category: "彰化縣" },
  { name: "芬園鄉", category: "彰化縣" },
  { name: "花壇鄉", category: "彰化縣" },
  { name: "秀水鄉", category: "彰化縣" },
  { name: "鹿港鎮", category: "彰化縣" },
  { name: "福興鄉", category: "彰化縣" },
  { name: "線西鄉", category: "彰化縣" },
  { name: "和美鎮", category: "彰化縣" },
  { name: "伸港鄉", category: "彰化縣" },
  { name: "員林鎮", category: "彰化縣" },
  { name: "社頭鄉", category: "彰化縣" },
  { name: "永靖鄉", category: "彰化縣" },
  { name: "埔心鄉", category: "彰化縣" },
  { name: "溪湖鎮", category: "彰化縣" },
  { name: "大村鄉", category: "彰化縣" },
  { name: "埔鹽鄉", category: "彰化縣" },
  { name: "田中鎮", category: "彰化縣" },
  { name: "北斗鎮", category: "彰化縣" },
  { name: "田尾鄉", category: "彰化縣" },
  { name: "埤頭鄉", category: "彰化縣" },
  { name: "溪州鄉", category: "彰化縣" },
  { name: "竹塘鄉", category: "彰化縣" },
  { name: "二林鎮", category: "彰化縣" },
  { name: "大城鄉", category: "彰化縣" },
  { name: "芳苑鄉", category: "彰化縣" },
  { name: "二水鄉", category: "彰化縣" },
  { name: "南投市", category: "南投縣" },
  { name: "中寮鄉", category: "南投縣" },
  { name: "草屯鎮", category: "南投縣" },
  { name: "國姓鄉", category: "南投縣" },
  { name: "埔里鎮", category: "南投縣" },
  { name: "仁愛鄉", category: "南投縣" },
  { name: "名間鄉", category: "南投縣" },
  { name: "集集鎮", category: "南投縣" },
  { name: "水里鄉", category: "南投縣" },
  { name: "魚池鄉", category: "南投縣" },
  { name: "信義鄉", category: "南投縣" },
  { name: "竹山鎮", category: "南投縣" },
  { name: "鹿谷鄉", category: "南投縣" },
  { name: "東區嘉", category: "嘉義市" },
  { name: "西區嘉", category: "嘉義市" },
  { name: "番路鄉", category: "嘉義縣" },
  { name: "梅山鄉", category: "嘉義縣" },
  { name: "竹崎鄉", category: "嘉義縣" },
  { name: "阿里山鄉", category: "嘉義縣" },
  { name: "中埔鄉", category: "嘉義縣" },
  { name: "大埔鄉", category: "嘉義縣" },
  { name: "水上鄉", category: "嘉義縣" },
  { name: "鹿草鄉", category: "嘉義縣" },
  { name: "太保市", category: "嘉義縣" },
  { name: "朴子市", category: "嘉義縣" },
  { name: "東石鄉", category: "嘉義縣" },
  { name: "六腳鄉", category: "嘉義縣" },
  { name: "新港鄉", category: "嘉義縣" },
  { name: "民雄鄉", category: "嘉義縣" },
  { name: "大林鎮", category: "嘉義縣" },
  { name: "溪口鄉", category: "嘉義縣" },
  { name: "義竹鄉", category: "嘉義縣" },
  { name: "布袋鎮", category: "嘉義縣" },
  { name: "斗南鎮", category: "雲林縣" },
  { name: "大埤鄉", category: "雲林縣" },
  { name: "虎尾鎮", category: "雲林縣" },
  { name: "土庫鎮", category: "雲林縣" },
  { name: "褒忠鄉", category: "雲林縣" },
  { name: "東勢鄉", category: "雲林縣" },
  { name: "台西鄉", category: "雲林縣" },
  { name: "崙背鄉", category: "雲林縣" },
  { name: "麥寮鄉", category: "雲林縣" },
  { name: "斗六市", category: "雲林縣" },
  { name: "林內鄉", category: "雲林縣" },
  { name: "古坑鄉", category: "雲林縣" },
  { name: "莿桐鄉", category: "雲林縣" },
  { name: "西螺鎮", category: "雲林縣" },
  { name: "二崙鄉", category: "雲林縣" },
  { name: "北港鎮", category: "雲林縣" },
  { name: "水林鄉", category: "雲林縣" },
  { name: "口湖鄉", category: "雲林縣" },
  { name: "四湖鄉", category: "雲林縣" },
  { name: "元長鄉", category: "雲林縣" },
  { name: "中西區", category: "台南市" },
  { name: "東區(南)", category: "台南市" },
  { name: "南區(南)", category: "台南市" },
  { name: "北區(南)", category: "台南市" },
  { name: "安平區", category: "台南市" },
  { name: "安南區", category: "台南市" },
  { name: "永康區", category: "台南市" },
  { name: "歸仁區", category: "台南市" },
  { name: "新化區", category: "台南市" },
  { name: "左鎮區", category: "台南市" },
  { name: "玉井區", category: "台南市" },
  { name: "楠西區", category: "台南市" },
  { name: "南化區", category: "台南市" },
  { name: "仁德區", category: "台南市" },
  { name: "關廟區", category: "台南市" },
  { name: "龍崎區", category: "台南市" },
  { name: "官田區", category: "台南市" },
  { name: "麻豆區", category: "台南市" },
  { name: "佳里區", category: "台南市" },
  { name: "西港區", category: "台南市" },
  { name: "七股區", category: "台南市" },
  { name: "將軍區", category: "台南市" },
  { name: "學甲區", category: "台南市" },
  { name: "北門區", category: "台南市" },
  { name: "新營區", category: "台南市" },
  { name: "後壁區", category: "台南市" },
  { name: "白河區", category: "台南市" },
  { name: "東山區", category: "台南市" },
  { name: "六甲區", category: "台南市" },
  { name: "下營區", category: "台南市" },
  { name: "柳營區", category: "台南市" },
  { name: "鹽水區", category: "台南市" },
  { name: "善化區", category: "台南市" },
  { name: "大內區", category: "台南市" },
  { name: "山上區", category: "台南市" },
  { name: "新市區", category: "台南市" },
  { name: "安定區", category: "台南市" },
  { name: "新興區", category: "高雄市" },
  { name: "前金區", category: "高雄市" },
  { name: "苓雅區", category: "高雄市" },
  { name: "鹽埕區", category: "高雄市" },
  { name: "鼓山區", category: "高雄市" },
  { name: "旗津區", category: "高雄市" },
  { name: "前鎮區", category: "高雄市" },
  { name: "三民區", category: "高雄市" },
  { name: "楠梓區", category: "高雄市" },
  { name: "小港區", category: "高雄市" },
  { name: "左營區", category: "高雄市" },
  { name: "仁武區", category: "高雄市" },
  { name: "大社區", category: "高雄市" },
  { name: "東沙群島", category: "南海島" },
  { name: "南沙群島", category: "南海島" },
  { name: "岡山區", category: "高雄市" },
  { name: "路竹區", category: "高雄市" },
  { name: "阿蓮區", category: "高雄市" },
  { name: "田寮區", category: "高雄市" },
  { name: "燕巢區", category: "高雄市" },
  { name: "橋頭區", category: "高雄市" },
  { name: "梓官區", category: "高雄市" },
  { name: "彌陀區", category: "高雄市" },
  { name: "永安區", category: "高雄市" },
  { name: "湖內區", category: "高雄市" },
  { name: "鳳山區", category: "高雄市" },
  { name: "大寮區", category: "高雄市" },
  { name: "林園區", category: "高雄市" },
  { name: "鳥松區", category: "高雄市" },
  { name: "大樹區", category: "高雄市" },
  { name: "旗山區", category: "高雄市" },
  { name: "美濃區", category: "高雄市" },
  { name: "六龜區", category: "高雄市" },
  { name: "內門區", category: "高雄市" },
  { name: "杉林區", category: "高雄市" },
  { name: "甲仙區", category: "高雄市" },
  { name: "桃源區", category: "高雄市" },
  { name: "那瑪夏區", category: "高雄市" },
  { name: "茂林區", category: "高雄市" },
  { name: "茄萣區", category: "高雄市" },
  { name: "馬公市", category: "澎湖縣" },
  { name: "西嶼鄉", category: "澎湖縣" },
  { name: "望安鄉", category: "澎湖縣" },
  { name: "七美鄉", category: "澎湖縣" },
  { name: "白沙鄉", category: "澎湖縣" },
  { name: "湖西鄉", category: "澎湖縣" },
  { name: "金沙鎮", category: "金門縣" },
  { name: "金湖鎮", category: "金門縣" },
  { name: "金寧鄉", category: "金門縣" },
  { name: "金城鎮", category: "金門縣" },
  { name: "烈嶼鄉", category: "金門縣" },
  { name: "烏坵鄉", category: "金門縣" },
  { name: "屏東市", category: "屏東縣" },
  { name: "三地門鄉", category: "屏東縣" },
  { name: "霧台鄉", category: "屏東縣" },
  { name: "瑪家鄉", category: "屏東縣" },
  { name: "九如鄉", category: "屏東縣" },
  { name: "里港鄉", category: "屏東縣" },
  { name: "高樹鄉", category: "屏東縣" },
  { name: "鹽埔鄉", category: "屏東縣" },
  { name: "長治鄉", category: "屏東縣" },
  { name: "麟洛鄉", category: "屏東縣" },
  { name: "竹田鄉", category: "屏東縣" },
  { name: "內埔鄉", category: "屏東縣" },
  { name: "萬丹鄉", category: "屏東縣" },
  { name: "潮州鎮", category: "屏東縣" },
  { name: "泰武鄉", category: "屏東縣" },
  { name: "來義鄉", category: "屏東縣" },
  { name: "萬巒鄉", category: "屏東縣" },
  { name: "崁頂鄉", category: "屏東縣" },
  { name: "新埤鄉", category: "屏東縣" },
  { name: "南州鄉", category: "屏東縣" },
  { name: "林邊鄉", category: "屏東縣" },
  { name: "東港鎮", category: "屏東縣" },
  { name: "琉球鄉", category: "屏東縣" },
  { name: "佳冬鄉", category: "屏東縣" },
  { name: "新園鄉", category: "屏東縣" },
  { name: "枋寮鄉", category: "屏東縣" },
  { name: "枋山鄉", category: "屏東縣" },
  { name: "春日鄉", category: "屏東縣" },
  { name: "獅子鄉", category: "屏東縣" },
  { name: "車城鄉", category: "屏東縣" },
  { name: "牡丹鄉", category: "屏東縣" },
  { name: "恆春鎮", category: "屏東縣" },
  { name: "滿州鄉", category: "屏東縣" },
  { name: "台東市", category: "台東縣" },
  { name: "綠島鄉", category: "台東縣" },
  { name: "蘭嶼鄉", category: "台東縣" },
  { name: "延平鄉", category: "台東縣" },
  { name: "卑南鄉", category: "台東縣" },
  { name: "鹿野鄉", category: "台東縣" },
  { name: "關山鎮", category: "台東縣" },
  { name: "海端鄉", category: "台東縣" },
  { name: "池上鄉", category: "台東縣" },
  { name: "東河鄉", category: "台東縣" },
  { name: "成功鎮", category: "台東縣" },
  { name: "長濱鄉", category: "台東縣" },
  { name: "太麻里鄉", category: "台東縣" },
  { name: "金峰鄉", category: "台東縣" },
  { name: "大武鄉", category: "台東縣" },
  { name: "達仁鄉", category: "台東縣" },
  { name: "花蓮市", category: "花蓮縣" },
  { name: "新城鄉", category: "花蓮縣" },
  { name: "秀林鄉", category: "花蓮縣" },
  { name: "吉安鄉", category: "花蓮縣" },
  { name: "壽豐鄉", category: "花蓮縣" },
  { name: "鳳林鎮", category: "花蓮縣" },
  { name: "光復鄉", category: "花蓮縣" },
  { name: "豐濱鄉", category: "花蓮縣" },
  { name: "瑞穗鄉", category: "花蓮縣" },
  { name: "萬榮鄉", category: "花蓮縣" },
  { name: "玉里鎮", category: "花蓮縣" },
  { name: "卓溪鄉", category: "花蓮縣" },
  { name: "富里鄉", category: "花蓮縣" },
];
