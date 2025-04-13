// 定義 Elf 類別，繼承自 BaseCreature
class Elf extends BaseCreature {
    // 靜態屬性，定義精靈 (Elf) 的基因庫 (所有精靈實例共享)
    // 每個物件代表一個染色體上的基因位點及其可能的等位基因
    // chromosome: 染色體編號
    // alleles: 該位點可能的等位基因陣列 (陣列中等位基因的出現頻率影響其被選中的機率)
    static genePools = [
        { chromosome: 1, alleles: ["Z", "z"] }, // 範例：染色體1上的基因Z/z
        { chromosome: 1, alleles: ["A", "A", "a", "a", "a"] }, // 範例：染色體1上的基因A/a (a較常見，影響臉色)
        { chromosome: 2, alleles: ["circleEye", "flatEye"] }, // 染色體2：眼睛形狀
        { chromosome: 2, alleles: ["tail", "tailless"] },    // 染色體2：尾巴有無
        { chromosome: 2, alleles: ["horn", ""] }, // 染色體2：角 (存在此等位基因即計數+1)
        { chromosome: 2, alleles: ["horn", ""] }, // 染色體2：角 (重複定義會增加 'horn' 被選中的機率，並影響 setHorns 中的計數)
        { chromosome: 3, alleles: ["roundEar", "roundEarLess"] }, // 染色體3：耳朵形狀
        { chromosome: 4, alleles: ["X"] }, // 染色體4：性染色體相關 (可能是基礎X)
        { chromosome: 4, alleles: ["X", "Y"] } // 染色體4：性染色體相關 (決定性別?)
    ];

    // 靜態方法，為指定的染色體編號隨機生成一組等位基因
    // 用於創建新精靈時初始化其基因
    static getRandomAlleles(chromosomeNumber) {
        // 篩選出屬於該染色體編號的所有基因池
        const genePoolsForChromosome = this.genePools.filter(
            (pool) => pool.chromosome === chromosomeNumber
        );
        // 對於每個符合的基因池，隨機選擇一個等位基因
        return genePoolsForChromosome.map((pool) => {
            // 從該基因池的 alleles 陣列中隨機選一個
            return pool.alleles[Math.floor(Math.random() * pool.alleles.length)];
        });
    }

    // 異步方法，覆寫 BaseCreature 的 createSprite
    // 負責創建精靈的視覺 SVG 表示 (每個精靈實例獨立調用)
    async createSprite(translateX, translateY) {
        try {
            // 1. 異步獲取 SVG 模板文件 ("sprite.svg")
            const response = await fetch("sprite.svg");
            const svgText = await response.text(); // 將回應轉換為文本
            // 2. 使用 DOMParser 解析 SVG 文本為 DOM 結構
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
            // 3. 在解析後的 SVG DOM 中找到 ID 為 "sprite-template" 的元素
            const template = svgDoc.getElementById("sprite-template");
            // 如果找不到模板，拋出錯誤
            if (!template) throw new Error("在 sprite.svg 中找不到模板");

            // 4. 深度複製模板節點 (包括所有子節點)，這樣每個精靈都有獨立的 SVG 結構
            this.group = template.cloneNode(true);
            // 5. 設定精靈 SVG 群組 (<g>) 的各種屬性
            this.group.setAttribute("id", this.id); // 設置唯一 ID
            this.group.setAttribute("class", "sprite"); // 設置 CSS 類別，方便選取和樣式化
            this.group.setAttribute("data-translateX", translateX); // 儲存初始 X 座標 (用於拖曳結束或繁殖區判斷)
            this.group.setAttribute("data-translateY", translateY); // 儲存初始 Y 座標
            // 將染色體數據轉換為 JSON 字符串並儲存，方便後續讀取
            this.group.setAttribute("data-chromosomes", JSON.stringify(this.chromosomes));
            // 使用 transform 屬性設定精靈的初始視覺位置
            this.group.setAttribute("transform", `translate(${translateX},${translateY})`);

            // 6. 呼叫繼承自 BaseCreature 的方法，生成用於顯示等位基因的 <tspan> 元素
            this.setAllelesText();

            // 7. 呼叫此 Elf 類別中定義的方法，根據精靈自身的基因應用視覺特徵 (顏色、眼睛、尾巴等)
            this.applyTraits();

            // 8. 獲取主 SVG 容器元素
            const mainSvgElement = this.getMainSvg();
            // 如果找到了主 SVG 容器，則將創建好的精靈 SVG 群組添加到其中，使其顯示在畫面上
            if (mainSvgElement) {
                mainSvgElement.appendChild(this.group);
            }
        } catch (error) {
            // 如果在上述過程中發生任何錯誤 (例如 fetch 失敗、找不到模板)，則在控制台輸出錯誤信息
            console.error("創建精靈 sprite 時出錯:", error);
        }
    }

    // 應用所有基於基因的視覺特徵
    // 依序呼叫下面定義的各個 set... 方法來修改精靈外觀
    applyTraits() {
        this.setFaceColor(); // 設定臉部顏色
        this.setEyeball();   // 設定眼球樣式
        this.setTail();      // 設定是否有尾巴
        this.setEars();      // 設定耳朵形狀
        this.setHorns();     // 設定角的數量和樣式
    }

    // 根據是否存在顯性等位基因 "A" 來設定臉部顏色
    setFaceColor() {
        // 檢查 this.chromosomes 陣列中，是否有任何一個 chromosome 的 alleles 陣列包含 "A"
        const hasDominantAllele = this.chromosomes.some((chromosome) =>
            chromosome.alleles.includes("A")
        );
        // 如果有 "A" (顯性)，臉色設為 DarkTurquoise；否則 (隱性 a/a)，設為 lightblue
        const faceColor = hasDominantAllele ? "DarkTurquoise" : "lightblue";
        // 在精靈的 SVG 群組 (this.group) 中尋找 ID 為 "face" 的元素
        const faceElement = this.group.querySelector("#face");
        // 如果找到了臉部元素，就設定其 "fill" (填充) 屬性為計算出的顏色
        if(faceElement) faceElement.setAttribute("fill", faceColor);
        // 返回計算出的顏色值，可能被其他 set... 方法 (如 setTail, setEars) 用來保持顏色一致
        return faceColor;
    }

    // 根據 "circleEye" 等位基因的數量設定眼球樣式
    setEyeball() {
        // 將所有染色體的等位基因合併成一個單一陣列
        const alleles = this.chromosomes.flatMap(chromosome => chromosome.alleles);
        // 計算該陣列中 "circleEye" 等位基因的出現次數
        const count = alleles.filter(allele => allele === "circleEye").length;
        // 如果 "circleEye" 的數量為 0 (即基因型為 flatEye/flatEye)
        if (count === 0) {
            // 找到左眼元素 (ID: left-eye)
            const leftEye = this.group.querySelector("#left-eye");
            if (leftEye) {
                // 創建一個 SVG 線條 (<line>) 元素
                const leftLine = document.createElementNS(this.svgNS, "line");
                // 設定線條的起點和終點座標、顏色、寬度
                leftLine.setAttribute("x1", "-12"); leftLine.setAttribute("y1", "-8");
                leftLine.setAttribute("x2", "-2"); leftLine.setAttribute("y2", "-8");
                leftLine.setAttribute("stroke", "black"); leftLine.setAttribute("stroke-width", "1");
                // 使用創建的線條元素替換掉原來的左眼元素 (通常是個圓形 <circle>)
                leftEye.replaceWith(leftLine);
            }
            // 對右眼元素 (ID: right-eye) 執行相同的操作
            const rightEye = this.group.querySelector("#right-eye");
            if (rightEye) {
                const rightLine = document.createElementNS(this.svgNS, "line");
                rightLine.setAttribute("x1", "12"); rightLine.setAttribute("y1", "-8");
                rightLine.setAttribute("x2", "2"); rightLine.setAttribute("y2", "-8");
                rightLine.setAttribute("stroke", "black"); rightLine.setAttribute("stroke-width", "1");
                rightEye.replaceWith(rightLine);
            }
        }
        // 如果 count > 0 (至少有一個 "circleEye" 等位基因)，則不執行任何操作，保留模板中原有的圓形眼睛
    }

    // 根據是否存在顯性等位基因 "tail" 來添加尾巴
    setTail() {
        // 檢查是否有 "tail" 等位基因
        const hasDominantAllele = this.chromosomes.some((chromosome) =>
            chromosome.alleles.includes("tail")
        );
        // 如果存在 "tail" 基因 (顯性表現)
        if (hasDominantAllele) {
            // 找到臉部元素，主要目的是獲取其顏色，並作為插入新元素的參考點
            const faceElement = this.group.querySelector("#face");
            if (faceElement) {
                // 獲取臉部的填充顏色，讓尾巴顏色與臉部一致
                const faceFill = faceElement.getAttribute("fill");
                // 創建尾巴主體的 SVG 路徑 (<path>) 元素
                const tailPath = document.createElementNS(this.svgNS, "path");
                // 設定樣式 (填充色、邊框色、邊框寬度)
                tailPath.setAttribute("style", `fill:${faceFill};stroke:black;stroke-width:2`);
                // 設定路徑數據 (d 屬性)，定義尾巴的形狀
                tailPath.setAttribute("d", "M 5.5673167,8.9411756 C 17.331503,11.46651 27.181949,7.1981385 34.595237,3.6784866 24.412928,11.621994 18.395379,14.988234 6.710685,16.313789");
                tailPath.setAttribute("id", "tail"); // 設定 ID

                // 創建尾巴尖端的 SVG 路徑 (<path>) 元素
                const tailTipPath = document.createElementNS(this.svgNS, "path");
                tailTipPath.setAttribute("style", `fill:${faceFill};stroke:black;stroke-width:2`);
                // 設定尾巴尖端的路徑數據 (一個小橢圓)
                tailTipPath.setAttribute("d", "M 36.651297,4.4896989 A 3.346251,3.0420463 0 0 1 33.305046,7.5317452 3.346251,3.0420463 0 0 1 29.958795,4.4896989 3.346251,3.0420463 0 0 1 33.305046,1.4476526 3.346251,3.0420463 0 0 1 36.651297,4.4896989 Z");
                tailTipPath.setAttribute("id", "tailtip"); // 設定 ID

                // 將尾巴主體和尾巴尖端插入到臉部元素之前。
                // 在 SVG 中，後添加的元素會覆蓋先添加的元素，所以將尾巴放在臉之前可以讓臉疊在尾巴根部之上。
                this.group.insertBefore(tailPath, faceElement);
                this.group.insertBefore(tailTipPath, faceElement);
            }
        }
        // 如果沒有 "tail" 基因 (基因型為 tailless/tailless)，則不執行任何操作，精靈沒有尾巴
    }

    // 根據 "roundEar" 等位基因的數量設定耳朵形狀
    setEars() {
        // 獲取所有等位基因
        const alleles = this.chromosomes.flatMap(chromosome => chromosome.alleles);
        // 計算 "roundEar" 的數量
        const count = alleles.filter(allele => allele === "roundEar").length;
        // 找到臉部元素以獲取顏色
        const faceElement = this.group.querySelector("#face");
        // 如果找不到臉部元素，則無法繼續設定耳朵，直接返回
        if (!faceElement) return;

        // 獲取臉部填充色
        const faceFill = faceElement.getAttribute("fill");
        // 創建左耳的 SVG 路徑 (<path>) 元素
        const leftEar = document.createElementNS(this.svgNS, "path");
        leftEar.setAttribute("style", `fill:${faceFill};stroke:black;stroke-width:2`);
        leftEar.setAttribute("id", "leftEar");

        // 創建右耳的 SVG 路徑 (<path>) 元素
        const rightEar = document.createElementNS(this.svgNS, "path");
        rightEar.setAttribute("style", `fill:${faceFill};stroke:black;stroke-width:2`);
        rightEar.setAttribute("id", "rightEar");

        // 如果 count > 0 (至少有一個 "roundEar" 等位基因，表現為圓耳)
        if (count > 0) {
            // 設定左耳和右耳的路徑數據為圓形耳朵的形狀
            leftEar.setAttribute("d", "M -8,-18 C -20,-25 -27,-13 -18,-5");
            rightEar.setAttribute("d", "M 8,-18 C 20,-25 27,-13 18,-5");
        } else { // 如果 count === 0 (基因型為 roundEarLess/roundEarLess，表現為尖耳)
            // 設定左耳和右耳的路徑數據為尖形耳朵的形狀
            leftEar.setAttribute("d", "M -8,-17 -21,-19 -17,-8");
            rightEar.setAttribute("d", "M 8,-17 21,-19 17,-8");
        }

        // 將創建好的左耳和右耳元素添加到精靈的 SVG 群組 (this.group) 的末尾
        this.group.appendChild(leftEar);
        this.group.appendChild(rightEar);
    }

    // 根據 "horn" 等位基因的數量添加角
    setHorns() {
        // 獲取所有等位基因
        const alleles = this.chromosomes.flatMap(chromosome => chromosome.alleles);
        // 計算 "horn" 等位基因的數量。注意：由於 genePools 中 chromosome 2 有兩個含 "horn" 的條目，
        // 這意味著一個精靈最多可能繼承 4 個 "horn" 等位基因 (如果父母雙方都提供了兩個)。
        const count = alleles.filter(allele => allele === "horn").length;
        // 找到臉部元素以獲取顏色
        const faceElement = this.group.querySelector("#face");
        // 找不到臉部則返回
        if (!faceElement) return;

        // 獲取臉部填充色
        const faceFill = faceElement.getAttribute("fill");
        // 定義一個輔助函數，用於創建單個角的 SVG 路徑元素並添加到群組中
        const createHorn = (d, id) => {
            const horn = document.createElementNS(this.svgNS, "path");
            horn.setAttribute("style", `fill:${faceFill};stroke:black;stroke-width:2`);
            horn.setAttribute("d", d); // 設定角的路徑數據 (形狀)
            horn.setAttribute("id", id); // 設定 ID
            this.group.appendChild(horn); // 添加到 SVG 群組
        };

        // 根據 "horn" 的數量 (count)，逐步添加不同位置/大小的角 (從下往上添加)
        // 至少有 1 個 "horn" 時，添加最下面的一對小角
        if (count >= 1) {
            createHorn("m -8, 16 -1,5 4,-4", "leftHorn4"); // 左下角
            createHorn("m 8, 16 1,5 -4,-4", "rightHorn4"); // 右下角
        }
        // 至少有 2 個 "horn" 時，添加倒數第二對角
        if (count >= 2) {
            createHorn("m -13,13 -3,6 6,-3", "leftHorn3");
            createHorn("m 13,13 3,6 -6,-3", "rightHorn3");
        }
        // 至少有 3 個 "horn" 時，添加第二對角
        if (count >= 3) {
            createHorn("m -16, 9 -4,5 7,-2", "leftHorn2");
            createHorn("m 16,9 4,5 -7,-2", "rightHorn2");
        }
        // 有 4 個 "horn" 時 (最大數量)，添加最上面的一對大角
        if (count >= 4) {
            createHorn("m -18,3 -6,5 h 7", "leftHorn1");
            createHorn("m 18,3 6,5 h -7", "rightHorn1");
        }
    }
}
