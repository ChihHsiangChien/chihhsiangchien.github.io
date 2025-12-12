// 台灣各縣市地圖資料（簡化版 SVG 路徑）
const TAIWAN_MAP_DATA = {
  counties: [
    {
      id: 'taipei-city',
      name: '台北市',
      path: 'M 280,120 L 300,115 L 310,125 L 305,140 L 285,145 L 275,135 Z',
      correctX: 280,
      correctY: 120,
      color: '#FF6B6B'
    },
    {
      id: 'new-taipei-city',
      name: '新北市',
      path: 'M 260,100 L 280,120 L 275,135 L 285,145 L 305,140 L 320,150 L 315,170 L 290,180 L 270,175 L 250,160 L 245,140 L 255,120 Z',
      correctX: 260,
      correctY: 100,
      color: '#4ECDC4'
    },
    {
      id: 'keelung-city',
      name: '基隆市',
      path: 'M 310,90 L 325,85 L 330,95 L 325,105 L 310,110 L 300,100 Z',
      correctX: 310,
      correctY: 90,
      color: '#95E1D3'
    },
    {
      id: 'taoyuan-city',
      name: '桃園市',
      path: 'M 240,140 L 260,135 L 270,145 L 275,160 L 260,170 L 245,165 L 235,155 Z',
      correctX: 240,
      correctY: 140,
      color: '#F38181'
    },
    {
      id: 'hsinchu-city',
      name: '新竹市',
      path: 'M 235,175 L 245,170 L 250,180 L 245,190 L 235,185 Z',
      correctX: 235,
      correctY: 175,
      color: '#AA96DA'
    },
    {
      id: 'hsinchu-county',
      name: '新竹縣',
      path: 'M 220,165 L 240,160 L 250,170 L 255,185 L 245,200 L 230,205 L 215,195 L 210,180 Z',
      correctX: 220,
      correctY: 165,
      color: '#FCBAD3'
    },
    {
      id: 'miaoli-county',
      name: '苗栗縣',
      path: 'M 210,200 L 230,195 L 245,205 L 250,220 L 240,235 L 220,240 L 205,230 L 200,215 Z',
      correctX: 210,
      correctY: 200,
      color: '#FFFFD2'
    },
    {
      id: 'taichung-city',
      name: '台中市',
      path: 'M 200,235 L 220,230 L 240,240 L 250,255 L 245,275 L 230,285 L 210,280 L 195,265 L 190,250 Z',
      correctX: 200,
      correctY: 235,
      color: '#A8D8EA'
    },
    {
      id: 'changhua-county',
      name: '彰化縣',
      path: 'M 210,285 L 230,280 L 240,290 L 235,305 L 220,310 L 205,300 Z',
      correctX: 210,
      correctY: 285,
      color: '#FFAAA5'
    },
    {
      id: 'nantou-county',
      name: '南投縣',
      path: 'M 230,250 L 250,245 L 265,255 L 270,270 L 265,290 L 250,300 L 235,295 L 225,280 L 220,265 Z',
      correctX: 230,
      correctY: 250,
      color: '#FFD3B6'
    },
    {
      id: 'yunlin-county',
      name: '雲林縣',
      path: 'M 205,305 L 225,300 L 240,310 L 235,325 L 220,330 L 200,320 Z',
      correctX: 205,
      correctY: 305,
      color: '#DCEDC1'
    },
    {
      id: 'chiayi-city',
      name: '嘉義市',
      path: 'M 215,335 L 225,330 L 230,340 L 225,350 L 215,345 Z',
      correctX: 215,
      correctY: 335,
      color: '#A8E6CF'
    },
    {
      id: 'chiayi-county',
      name: '嘉義縣',
      path: 'M 200,325 L 220,320 L 240,330 L 245,345 L 235,360 L 215,365 L 195,355 L 190,340 Z',
      correctX: 200,
      correctY: 325,
      color: '#FFD6A5'
    },
    {
      id: 'tainan-city',
      name: '台南市',
      path: 'M 195,360 L 215,355 L 235,365 L 240,380 L 230,395 L 210,400 L 190,390 L 185,375 Z',
      correctX: 195,
      correctY: 360,
      color: '#FDCAE1'
    },
    {
      id: 'kaohsiung-city',
      name: '高雄市',
      path: 'M 190,395 L 210,390 L 230,400 L 245,415 L 250,435 L 240,450 L 220,455 L 200,445 L 185,430 L 180,415 Z',
      correctX: 190,
      correctY: 395,
      color: '#C7CEEA'
    },
    {
      id: 'pingtung-county',
      name: '屏東縣',
      path: 'M 200,450 L 220,445 L 235,455 L 240,470 L 235,490 L 220,500 L 205,495 L 190,485 L 185,470 Z',
      correctX: 200,
      correctY: 450,
      color: '#B5EAD7'
    },
    {
      id: 'yilan-county',
      name: '宜蘭縣',
      path: 'M 320,110 L 340,105 L 355,115 L 360,130 L 355,150 L 340,160 L 325,155 L 315,140 L 310,125 Z',
      correctX: 320,
      correctY: 110,
      color: '#FFDAC1'
    },
    {
      id: 'hualien-county',
      name: '花蓮縣',
      path: 'M 325,160 L 345,155 L 360,165 L 370,180 L 375,200 L 370,225 L 360,245 L 345,255 L 330,250 L 320,235 L 315,215 L 310,195 L 310,175 Z',
      correctX: 325,
      correctY: 160,
      color: '#FF9AA2'
    },
    {
      id: 'taitung-county',
      name: '台東縣',
      path: 'M 330,255 L 345,250 L 355,260 L 360,280 L 360,305 L 350,330 L 335,345 L 320,340 L 310,325 L 305,305 L 305,285 L 310,270 Z',
      correctX: 330,
      correctY: 255,
      color: '#E2F0CB'
    },
    {
      id: 'penghu-county',
      name: '澎湖縣',
      path: 'M 120,310 L 135,305 L 145,315 L 140,330 L 125,335 L 115,325 Z',
      correctX: 120,
      correctY: 310,
      color: '#B4F8C8'
    },
    {
      id: 'kinmen-county',
      name: '金門縣',
      path: 'M 50,280 L 65,275 L 75,285 L 70,300 L 55,305 L 45,295 Z',
      correctX: 50,
      correctY: 280,
      color: '#FBE7C6'
    },
    {
      id: 'lienchiang-county',
      name: '連江縣',
      path: 'M 80,80 L 95,75 L 105,85 L 100,100 L 85,105 L 75,95 Z',
      correctX: 80,
      correctY: 80,
      color: '#A0E7E5'
    }
  ]
};
