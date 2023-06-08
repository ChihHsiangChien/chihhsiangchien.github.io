const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
canvas.width = 300;
canvas.height = 300;


// 創建物種實例
const stoneLion = new Species("石虎", 100, 0.03, 0.001, 0.01, 0.003);
const sikaDeer = new Species("梅花鹿", 200, 0.02, 0.002, 0.02, 0.001);
const yellowWolf = new Species("黃鼠狼", 50, 0.02, 0.003, 0.03, 0.002);
const wildRabbit = new Species("野兔", 150, 0.04, 0.002, 0.02, 0.001);
const grass = new Species("草", 500, 0.1, 0, 0.05, 0);
const ringNeckPheasant = new Species("環頸雉", 80, 0.02, 0.001, 0.01, 0.001);
const nestRat = new Species("巢鼠", 100, 0.02, 0.004, 0.01, 0.002);
const squirrel = new Species("松鼠", 80, 0.03, 0.002, 0.02, 0.001);
const snake = new Species("蛇", 50, 0.03, 0.005, 0.01, 0.001);
const eagle = new Species("老鷹", 30, 0.02, 0.005, 0.02, 0.003);

// 更新物種間的捕食關係
stoneLion.preysOn = [sikaDeer, yellowWolf, wildRabbit];
sikaDeer.preysOn = [grass];
yellowWolf.preysOn = [ringNeckPheasant, nestRat, squirrel, wildRabbit];
wildRabbit.preysOn = [grass];
snake.preysOn = [nestRat, squirrel, wildRabbit];
eagle.preysOn = [nestRat, ringNeckPheasant, wildRabbit, squirrel];
squirrel.preysOn = [grass];
ringNeckPheasant.preysOn = [grass];
nestRat.preysOn = [grass];


// 創建生態系統實例
const ecosystem = new Ecosystem([
  stoneLion,
  sikaDeer,
  yellowWolf,
  wildRabbit,
  grass,
  ringNeckPheasant,
  nestRat,
  squirrel,
  snake,
  eagle,
]);

// 模擬生態系統
for (let i = 0; i < 10; i++) {
  ecosystem.update();
  ecosystem.printPopulation();

}


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

