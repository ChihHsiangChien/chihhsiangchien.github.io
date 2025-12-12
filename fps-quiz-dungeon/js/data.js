export const levelQuestions = {
    0: [ // Level 1 (Index 0): Biology - Cell
        {
            q: "細胞內進行有氧呼吸的主要場所是？",
            options: ["粒線體", "葉綠體", "高基氏體", "溶體"],
            answerIndex: 0
        },
        {
            q: "下列何者並非植物細胞特有的構造？",
            options: ["細胞壁", "葉綠體", "液泡", "細胞膜"],
            answerIndex: 3
        },
        {
            q: "光合作用的光反應主要發生在葉綠體的哪個部位？",
            options: ["囊狀膜", "基質", "外膜", "內膜"],
            answerIndex: 0
        }
    ],
    1: [ // Level 2 (Index 1): Biology - System
        {
            q: "人體最大的器官是？",
            options: ["肝臟", "皮膚", "大腦", "肺臟"],
            answerIndex: 1
        },
        {
            q: "血液中負責運輸氧氣的主要細胞是？",
            options: ["白血球", "血小板", "紅血球", "淋巴球"],
            answerIndex: 2
        },
        {
            q: "人體進行氣體交換的主要場所是？",
            options: ["氣管", "支氣管", "肺泡", "橫膈"],
            answerIndex: 2
        }
    ],
    2: [ // Level 3 (Index 2): Biology - Genetics & Diversity
        {
            q: "DNA 分子中的含氮鹼基配對，下列何者正確？",
            options: ["A配G", "C配T", "A配T", "G配A"],
            answerIndex: 2
        },
        {
            q: "以下哪種生物屬於原核生物？",
            options: ["酵母菌", "大腸桿菌", "變形蟲", "青黴菌"],
            answerIndex: 1
        },
        {
            q: "人類的染色體總共有幾對？",
            options: ["22對", "23對", "46對", "24對"],
            answerIndex: 1
        }
    ]
};

// Fallback or generic pool if needed
export const questions = levelQuestions[0]; 
