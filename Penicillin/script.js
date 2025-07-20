const timelineList = document.getElementById('timeline-list');
const mainHeading = document.getElementById('main-heading'); // 選取 H1

// Function to fetch data and build the timeline
async function initializeTimeline() {
    try {
        const response = await fetch('penicillin_data.json'); // Fetch the JSON file
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const pageData = await response.json(); // 現在讀取的是整個物件

        // --- 設定頁面標題和主標題 ---
        if (pageData.pageTitle) {
            document.title = pageData.pageTitle;
        }
        if (pageData.mainHeading && mainHeading) {
            mainHeading.innerHTML = pageData.mainHeading; // 使用 innerHTML 以支援 emoji span
        }
        // --- ---

        // 檢查 timelineEvents 是否存在且為陣列
        if (!pageData.timelineEvents || !Array.isArray(pageData.timelineEvents)) {
            console.error("JSON data does not contain a valid 'timelineEvents' array.");
            timelineList.innerHTML = '<li>時間軸事件資料格式錯誤。</li>';
            return; // 停止執行後續代碼
       }

       const timelineData = pageData.timelineEvents; // 取得事件陣列

        // Populate the timeline using the fetched data
        timelineData.forEach(item => {
            const li = document.createElement('li');
            li.className = 'timeline-item';
            li.setAttribute('data-icon', item.icon); // Set icon for the ::before pseudo-element

            const yearSpan = document.createElement('span');
            yearSpan.className = 'timeline-year';
            yearSpan.textContent = item.year;

            const descP = document.createElement('p');
            descP.className = 'event-description';
            descP.innerHTML = item.description; // Use innerHTML for potential italics

            const vizContainer = document.createElement('div');
            vizContainer.className = 'visualization';
            vizContainer.style.display = 'none'; // Initially hidden

            li.appendChild(yearSpan);
            li.appendChild(descP);
            li.appendChild(vizContainer);

            // Add click listener to toggle visualization
            li.addEventListener('click', () => {
                // Close other visualizations first
                if (vizContainer.style.display === 'none') {
                // vvv--- 讀取陣列或字串 ---vvv
                let rawHtmlOrArray = item.visualization.htmlContent || ['視覺化內容待定'];
                let rawHtml = '';

                // vvv--- 如果是陣列，合併成字串 ---vvv
                if (Array.isArray(rawHtmlOrArray)) {
                    rawHtml = rawHtmlOrArray.join(''); // 合併陣列元素
                } else {
                    rawHtml = rawHtmlOrArray; // 如果原本就是字串 (為了兼容舊格式或未修改的項目)
                }
                // ^^^--------------------------^^^
                    let finalHtml = rawHtml;

                    // 如果此項目有圖片和替代文字，則替換佔位符
                    if (item.visualization.image && item.visualization.altText) {
                        finalHtml = rawHtml.replace('{imageUrl}', item.visualization.image)
                                           .replace('{altText}', item.visualization.altText);
                    } else if (item.visualization.image) {
                        // 如果只有圖片，沒有 altText (雖然不建議)
                        finalHtml = rawHtml.replace('{imageUrl}', item.visualization.image)
                                           .replace('{altText}', ''); // 替換成空字串
                    }

                    vizContainer.innerHTML = finalHtml; // 使用替換後的 HTML
                    vizContainer.style.display = 'flex'; // Or 'block', 'flex' used for centering
                } else {
                    vizContainer.style.display = 'none';
                    vizContainer.innerHTML = ''; // Clear content when hiding
                }
            });

            timelineList.appendChild(li);
        });

    } catch (error) {
        console.error("無法載入或解析頁面資料:", error);
        if (mainHeading) mainHeading.textContent = '錯誤'; // 更新標題顯示錯誤
        document.title = '錯誤';
        timelineList.innerHTML = '<li>載入頁面資料時發生錯誤。</li>';
    }
}

// Initialize the timeline when the page loads
document.addEventListener('DOMContentLoaded', initializeTimeline);