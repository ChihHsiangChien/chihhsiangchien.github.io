const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
canvas.width = 300;
canvas.height = 300;


// 創建物種實例
const leopardCat = new Species("石虎", 30, 0.02, 0.01);
const eagle = new Species("老鷹", 30, 0.02, 0.01);
const snake = new Species("蛇", 30, 0.02, 0.01);
const weasel = new Species("黃鼠狼", 50, 0.03, 0.01);
const rat = new Species("巢鼠", 100, 0.03, 0.01);
const squirrel = new Species("松鼠", 80, 0.03, 0.02);
const pheasant = new Species("環頸雉", 80, 0.03, 0.01);
const sikaDeer = new Species("梅花鹿", 200, 0.02, 0.01);
const rabbit = new Species("野兔", 150, 0.04, 0.03);
const grass = new Species("草", 50000, 0.1, 0.01);

// 更新物種間的捕食關係

// 設定獵物
leopardCat.preysOn = [sikaDeer, weasel, rabbit];
eagle.preysOn = [rat, pheasant, rabbit, squirrel];
snake.preysOn = [rat, squirrel, rabbit];
weasel.preysOn = [pheasant, rat, squirrel, rabbit];
sikaDeer.preysOn = [grass];
squirrel.preysOn = [grass];
pheasant.preysOn = [grass];
rabbit.preysOn = [grass];
rat.preysOn = [grass];

// 設定天敵
sikaDeer.isPreyOf = [leopardCat];
weasel.isPreyOf = [leopardCat];
rabbit.isPreyOf = [leopardCat, weasel, snake, eagle];
squirrel.isPreyOf = [weasel, snake, eagle];
pheasant.isPreyOf = [weasel, eagle];
rat.isPreyOf = [weasel, snake, eagle];
grass.isPreyOf = [sikaDeer, rabbit, squirrel, pheasant, rat];


// 創建生態系統實例
const ecosystem = new Ecosystem([
  leopardCat,
  snake,
  eagle,  
  weasel,  
  sikaDeer,
  rabbit,
  pheasant,
  rat,
  squirrel,
  grass,  
]);

// 模擬生態系統
ecosystem.printPopulation();

for (let i = 0; i < 100; i++) {
  ecosystem.update();
  ecosystem.printPopulation();

}
/*

// 定義顏色和折線圖位置
const colors = ["red", "blue", "green", "orange", "purple", "yellow", "cyan", "magenta", "lime", "pink"];
const chartMargin = { top: 20, right: 20, bottom: 40, left: 40 };
const chartWidth = canvas.width - chartMargin.left - chartMargin.right;
const chartHeight = canvas.height - chartMargin.top - chartMargin.bottom;


// 創建折線圖資料
const chartData = [];
for (const species of ecosystem.species) {
  const data = {
    name: species.name,
    values: [species.population],
  };
  chartData.push(data);
}

// 開始繪製折線圖
updateChart();
*/

