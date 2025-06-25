// 將關卡資料設為全域變數，以便 game.js 可以存取
window.gameLevels = [
    {
        levelId: "01 simple x",
        maxMissiles: 3,
        maxAdvancedMissiles: 1,
        advancedMissileRadius: 2,
        maxInequalitiesPerShot: 4,
        availableTerms: ["x","y"],
        allowedOperators: [">", "<", ">=", "<=" ],
        targetBuildings: [
            {x: 3, y: 0, z: 0, color: 0xff0000, height: 2}
        ],
        description: "使用一元不等式瞄準建築物"
    },
    {
        levelId: "02 multiple-x",
        maxMissiles: 4,
        maxAdvancedMissiles: 1,
        advancedMissileRadius: 2,
        maxInequalitiesPerShot: 4,
        availableTerms: ["-x","-y"],
        allowedOperators: [">", "<", ">=", "<="],
        targetBuildings: [
            {x: -2, y: 0, z: 0, color: 0xff0000, height: 2},
            {x: 4, y: 0, z: 0, color: 0x00ff00, height: 3}
        ],
        description: "使用多個x不等式同時瞄準多個建築"
    },
    {
        levelId: "level 03 2d-simple",
        maxMissiles: 4,
        maxAdvancedMissiles: 2,
        advancedMissileRadius: 3,
        maxInequalitiesPerShot: 4,
        availableTerms: ["x", "y", "x + y", "x - y"],
        allowedOperators: [">", "<", "="],
        targetBuildings: [
            {x: 2, y: 2, z: 0, color: 0xff0000, height: 2},
            {x: -3, y: 1, z: 0, color: 0x00ff00, height: 3},
            {x: 0, y: -2, z: 0, color: 0x0000ff, height: 2}
        ],
        description: "使用二元不等式進行精確打擊"
    }
    ,
    {
        levelId: "04 precision strike",
        maxMissiles: 5,
        maxAdvancedMissiles: 2,
        advancedMissileRadius: 2.5,
        maxInequalitiesPerShot: 3,
        availableTerms: ["x", "y", "x + y", "x - y"],
        allowedOperators: ["="],
        targetBuildings: [
            {x: 2, y: 2, z: 0, color: 0xff0000, height: 2},
            {x: -2, y: -2, z: 0, color: 0x00ff00, height: 3},
            {x: 0, y: 0, z: 0, color: 0x0000ff, height: 2}
        ],
        description: "使用等號運算子精確打擊對角線上的目標"
    },
    {
        levelId: "05 complex region",
        maxMissiles: 6,
        maxAdvancedMissiles: 2,
        advancedMissileRadius: 3,
        maxInequalitiesPerShot: 5,
        availableTerms: ["x", "y", "2*x", "2*y", "x + y", "x - y"],
        allowedOperators: [">", "<", ">=", "<="],
        targetBuildings: [
            {x: 1, y: 4, z: 0, color: 0xff0000, height: 2},
            {x: 4, y: 1, z: 0, color: 0x00ff00, height: 3},
            {x: -1, y: -4, z: 0, color: 0x0000ff, height: 2},
            {x: -4, y: -1, z: 0, color: 0xffff00, height: 2}
        ],
        description: "結合多個不等式，摧毀複雜區域內的目標"
    }
];
