var cardData = [
  {
    name: "植物",
    canMove: false,
    population: 10,
    reproductionRate: 1,
    requiredFood: [],
    feedingInterval: 0, // 植物不需要進食，時間間隔設為0
  },
  {
    name: "草食動物",
    canMove: true,
    population: 5,
    reproductionRate: 1,
    requiredFood: [{ name: "植物", quantity: 1 }],
    feedingInterval: 3, // 草食動物每隔3個時間單位進食一次
  },
  {
    name: "肉食動物",
    canMove: true,
    population: 3,
    reproductionRate: 2,
    requiredFood: [{ name: "草食動物", quantity: 1 }],
    feedingInterval: 5, // 肉食動物每隔5個時間單位進食一次
  },
  {
    name: "食肉動物",
    canMove: false,
    population: 2,
    reproductionRate: 1,
    requiredFood: [{ name: "肉食動物", quantity: 1 }],
    feedingInterval: 4, // 食肉動物每隔4個時間單位進食一次
  },
];
