// 將關卡資料設為全域變數，以便 game.js 可以存取
window.gameLevels = [
    {
        levelId: "第一關：基礎瞄準",
        maxMissiles: 3,
        maxAdvancedMissiles: 1,
        missileRadius: 1, // 一般飛彈的轟炸半徑
        advancedMissileRadius: 2,
        maxInequalitiesPerShot: 4,
        availableTerms: ["x","y"],
        allowedOperators: [">", "<", "≥", "≤"],
        targetBuildings: [
            {x: 3, y: 0, z: 0, color: 0xA5A5A5, height: 2}
        ],
        description: "使用一元不等式瞄準建築物"
    },
    {
        levelId: "第二關：多重目標",
        maxMissiles: 4,
        maxAdvancedMissiles: 1,
        missileRadius: 1, // 一般飛彈的轟炸半徑
        advancedMissileRadius: 2,
        maxInequalitiesPerShot: 4,
        availableTerms: ["-x","-y"],
        allowedOperators: [">", "<", "≥", "≤", "="],
        targetBuildings: [
            {x: -2, y: 0, z: 0, color: 0xA5A5A5, height: 2},
            {x: 4, y: 0, z: 0, color: 0xA5A5A5, height: 3}
        ],
        description: "使用單一不等式同時瞄準多個建築"
    },
    {
        levelId: "第三關：二元座標",
        maxMissiles: 4,
        maxAdvancedMissiles: 2,
        missileRadius: 1, 
        advancedMissileRadius: 3,
        maxInequalitiesPerShot: 4,
        availableTerms: ["x", "2y", "x + y", "x - y"],
        allowedOperators: [">", "<", "≥", "≤", "="],
        targetBuildings: [
            {x: 2, y: 2, z: 0, color: 0xA5A5A5, height: 2},
            {x: -3, y: 1, z: 0, color: 0xA5A5A5, height: 3},
            {x: 0, y: -2, z: 0, color: 0xA5A5A5, height: 2}
        ],
        description: "使用二元不等式進行精確打擊"
    },
    {
        levelId: "第四關：精準打擊",
        maxMissiles: 5,
        maxAdvancedMissiles: 2,
        missileRadius: 1, 
        advancedMissileRadius: 2.5,
        maxInequalitiesPerShot: 3,
        availableTerms: ["x", "y", "x + y", "x - y"],
        allowedOperators: [">", "<", "≥", "≤", "="],
        targetBuildings: [
            {x: 2, y: 2, z: 0, color: 0xA5A5A5, height: 2},
            {x: -2, y: -2, z: 0, color: 0xA5A5A5, height: 3},
            {x: 0, y: 0, z: 0, color: 0xA5A5A5, height: 2}
        ],
        description: "使用等號運算子打擊對角線上的目標"
    },
    {
        levelId: "第五關：複雜區域",
        maxMissiles: 6,
        maxAdvancedMissiles: 2,
        missileRadius: 1, 
        advancedMissileRadius: 3,
        maxInequalitiesPerShot: 5,
        availableTerms: ["x", "y", "2x", "2y", "x + y", "x - y"],
        allowedOperators: [">", "<", "≥", "≤", "="],
        targetBuildings: [
            {x: 1, y: 4, z: 0, color: 0xA5A5A5, height: 2},
            {x: 4, y: 1, z: 0, color: 0xA5A5A5, height: 3},
            {x: -1, y: -4, z: 0, color: 0xA5A5A5, height: 2},
            {x: -4, y: -1, z: 0, color: 0xA5A5A5, height: 2}
        ],
        description: "結合多個不等式，定義複雜區域"
    },
    {
        levelId: "第六關：環形區域",
        maxMissiles: 5,
        maxAdvancedMissiles: 3,
        missileRadius: 1,
        advancedMissileRadius: 2,
        maxInequalitiesPerShot: 2,
        availableTerms: ["x", "y", "x^2+y^2"],
        allowedOperators: [">", "<", "≥", "≤", "="],
        targetBuildings: [
            {x: 4, y: 0, z: 0, color: 0xA5A5A5, height: 2},
            {x: -4, y: 0, z: 0, color: 0xA5A5A5, height: 2},
            {x: 0, y: 4, z: 0, color: 0xA5A5A5, height: 3},
            {x: 0, y: -4, z: 0, color: 0xA5A5A5, height: 3}
        ],
        description: "利用圓形不等式，打擊環形區域內的目標"
    },
    {
        levelId: "第七關：象限作戰",
        maxMissiles: 4,
        maxAdvancedMissiles: 2,
        missileRadius: 1,
        advancedMissileRadius: 3.5, // 增加半徑，讓高級飛彈策略更可行
        maxInequalitiesPerShot: 4,
        availableTerms: ["x", "y", "abs(x)", "abs(y)"],
        allowedOperators: [">", "<", "≥", "≤", "="],
        targetBuildings: [
            {x: 3, y: 3, z: 0, color: 0xA5A5A5, height: 2},
            {x: -3, y: 3, z: 0, color: 0xA5A5A5, height: 2},
            {x: 3, y: -3, z: 0, color: 0xA5A5A5, height: 2},
            {x: -3, y: -3, z: 0, color: 0xA5A5A5, height: 2}
        ],
        description: "使用絕對值，一次瞄準對稱的多個象限"
    },
    {
        levelId: "第八關：狹長通道",
        maxMissiles: 6,
        maxAdvancedMissiles: 1,
        missileRadius: 0.8,
        advancedMissileRadius: 2,
        maxInequalitiesPerShot: 4,
        availableTerms: ["x", "y", "y-2x", "2x-y"],
        allowedOperators: [">", "<"],
        targetBuildings: [
            {x: 1, y: 2, z: 0, color: 0xA5A5A5, height: 2},
            {x: 2, y: 4, z: 0, color: 0xA5A5A5, height: 2},
            {x: 3, y: 6, z: 0, color: 0xA5A5A5, height: 3},
            {x: -1, y: -2, z: 0, color: 0xA5A5A5, height: 2}
        ],
        description: "精準設定邊界，摧毀狹窄通道內的敵軍"
    },
    {
        levelId: "第九關：菱形包圍",
        maxMissiles: 4,
        maxAdvancedMissiles: 2,
        missileRadius: 1,
        advancedMissileRadius: 2.5, // 縮小半徑，避免一發通關，增加挑戰
        maxInequalitiesPerShot: 4,
        availableTerms: ["x", "y", "abs(x)+abs(y)"],
        allowedOperators: ["<", "≤"],
        targetBuildings: [
            {x: 2, y: 0, z: 0, color: 0xA5A5A5, height: 2},
            {x: -2, y: 0, z: 0, color: 0xA5A5A5, height: 2},
            {x: 0, y: 2, z: 0, color: 0xA5A5A5, height: 2},
            {x: 0, y: -2, z: 0, color: 0xA5A5A5, height: 2}
        ],
        description: "利用菱形區域，將分散的目標一網打盡"
    },
    {
        levelId: "第十關：中心開花",
        maxMissiles: 5, // 減少一般飛彈，鼓勵使用不等式
        maxAdvancedMissiles: 2,
        missileRadius: 1,
        advancedMissileRadius: 2.5,
        maxInequalitiesPerShot: 4,
        availableTerms: ["x", "y", "x^2+y^2"],
        allowedOperators: [">", "<", "≥", "≤", "="],
        targetBuildings: [
            {x: 3, y: 4, z: 0, color: 0xA5A5A5, height: 2},
            {x: -4, y: -3, z: 0, color: 0xA5A5A5, height: 3},
            {x: 5, y: 0, z: 0, color: 0xA5A5A5, height: 2},
            {x: 0, y: -5, z: 0, color: 0xA5A5A5, height: 2}
        ],
        description: "建立一個中空的目標區域，避開中心點"
    },
    {
        levelId: "第十一關：遠程狙擊",
        maxMissiles: 2, // 減少飛彈，匹配目標數量
        maxAdvancedMissiles: 1, // 減少飛彈，匹配目標數量
        missileRadius: 1,
        advancedMissileRadius: 2,
        maxInequalitiesPerShot: 4,
        availableTerms: ["x", "y"],
        allowedOperators: ["=", "≥", "≤"],
        targetBuildings: [
            {x: 9, y: 9, z: 0, color: 0xA5A5A5, height: 4},
            {x: -9, y: -9, z: 0, color: 0xA5A5A5, height: 4}
        ],
        description: "目標距離遙遠，需要精確的常數計算"
    },
    {
        levelId: "第十二關：雙重夾擊",
        maxMissiles: 6,
        maxAdvancedMissiles: 2,
        missileRadius: 1,
        advancedMissileRadius: 3,
        maxInequalitiesPerShot: 4,
        availableTerms: ["x", "y", "abs(y)"],
        allowedOperators: [">", "<", "≥", "≤", "="],
        targetBuildings: [
            {x: -8, y: 4, z: 0, color: 0xA5A5A5, height: 3},
            {x: -6, y: 4, z: 0, color: 0xA5A5A5, height: 2},
            {x: 6, y: -4, z: 0, color: 0xA5A5A5, height: 3},
            {x: 8, y: -4, z: 0, color: 0xA5A5A5, height: 2}
        ],
        description: "用一套不等式同時涵蓋兩個分離的區域"
    },
    {
        levelId: "第十三關：拋物線轟炸",
        maxMissiles: 5,
        maxAdvancedMissiles: 2,
        missileRadius: 1,
        advancedMissileRadius: 2.5,
        maxInequalitiesPerShot: 4,
        availableTerms: ["x", "y", "y-x^2", "x^2-y"],
        allowedOperators: [">", "<", "="],
        targetBuildings: [
            {x: 0, y: 0, z: 0, color: 0xA5A5A5, height: 2},
            {x: 1, y: 1, z: 0, color: 0xA5A5A5, height: 2},
            {x: -1, y: 1, z: 0, color: 0xA5A5A5, height: 2},
            {x: 2, y: 4, z: 0, color: 0xA5A5A5, height: 3},
            {x: -2, y: 4, z: 0, color: 0xA5A5A5, height: 3}
        ],
        description: "利用拋物線，打擊曲線排列的目標"
    },
    {
        levelId: "第十四關：困難的抉擇",
        maxMissiles: 10,
        maxAdvancedMissiles: 1,
        missileRadius: 1,
        advancedMissileRadius: 4,
        maxInequalitiesPerShot: 5,
        availableTerms: ["x", "y", "x+y", "x-y"],
        allowedOperators: [">", "<", "≥", "≤", "="],
        targetBuildings: [
            {x: 5, y: 5, z: 0, color: 0xA5A5A5, height: 3},
            {x: 6, y: 6, z: 0, color: 0xA5A5A5, height: 3},
            {x: 5, y: 6, z: 0, color: 0xA5A5A5, height: 3},
            {x: -5, y: -5, z: 0, color: 0xA5A5A5, height: 2},
            {x: -5, y: -6, z: 0, color: 0xA5A5A5, height: 2},
            {x: -6, y: -5, z: 0, color: 0xA5A5A5, height: 2},
            {x: -6, y: -6, z: 0, color: 0xA5A5A5, height: 2}
        ],
        description: "合理分配普通和高級飛彈，應對不同防禦的目標"
    },
    {
        levelId: "第十五關：終極挑戰",
        maxMissiles: 6, // 減少飛彈，增加最終關卡的挑戰性
        maxAdvancedMissiles: 2, // 減少飛彈，增加最終關卡的挑戰性
        missileRadius: 1,
        advancedMissileRadius: 2,
        maxInequalitiesPerShot: 6,
        availableTerms: ["x", "y", "x^2+y^2", "abs(x)", "abs(y)", "x+y", "x-y"],
        allowedOperators: [">", "<", "≥", "≤", "="],
        targetBuildings: [
            {x: 0, y: 8, z: 0, color: 0xA5A5A5, height: 4},
            {x: 8, y: 0, z: 0, color: 0xA5A5A5, height: 4},
            {x: 0, y: -8, z: 0, color: 0xA5A5A5, height: 4},
            {x: -8, y: 0, z: 0, color: 0xA5A5A5, height: 4},
            {x: 4, y: 4, z: 0, color: 0xA5A5A5, height: 2},
            {x: -4, y: 4, z: 0, color: 0xA5A5A5, height: 2},
            {x: 4, y: -4, z: 0, color: 0xA5A5A5, height: 2},
            {x: -4, y: -4, z: 0, color: 0xA5A5A5, height: 2}
        ],
        description: "綜合運用所有知識，完成最複雜的打擊任務"
    }
];
