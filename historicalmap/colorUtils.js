// 單一 hash function
function stringHash(str) {
    let hash = 5381; // 使用 djb2 hash
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
    }
    // 取質數間隔，讓色相分布更均勻
    const prime = 137;
    let hue = Math.abs((hash * prime) % 360);
    // 拉開色相間距（例如每隔 20 度）
    hue = Math.round(hue / 20) * 20;
    return hue;
}

// 通用 HSL/HSLA 產生器
function hslFromString(str, { s = 60, l = 92, a = 1 } = {}) {
    const hue = stringHash(str);
    if (a < 1) {
        return `hsla(${hue}, ${s}%, ${l}%, ${a})`;
    }
    return `hsl(${hue}, ${s}%, ${l}%)`;
}

// 封裝各種用途
export function stringToBgColor(str) {
    return hslFromString(str, { s: 70, l: 92, a: 1 }); // 卡片亮背景
}
export function stringToBorderColor(str) {
    return hslFromString(str, { s: 60, l: 60, a: 1 }); // 卡片邊框
}
export function stringToTextColor(str) {
    if (!str || !str.trim()) return '#222'; // 或 '#000'

    return hslFromString(str, { s: 60, l: 30, a: 1 }); // 深色文字
}
export function stringToHslBg(str) {
    return hslFromString(str, { s: 70, l: 92, a: 0.9 }); // 地圖亮背景
}
export function stringToHslBorder(str) {
    return hslFromString(str, { s: 70, l: 60, a: 1 }); // 地圖邊框
}

export function slug(str) {
    // 保留中英文、數字、-，移除其他符號
    let s = (str || '').toString().trim().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '').toLowerCase();
    return s || 'default';

}