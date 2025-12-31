/**
 * 资源管理助手
 * 简化主题配置中的图片路径管理
 */

// ===== 配置 =====

// 资源基础路径配置
const ASSET_CONFIG = (() => {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // 检测是否是本地开发
    const isLocalhost = hostname === 'localhost' 
                     || hostname === '127.0.0.1'
                     || hostname === '';
    
    // 检测是否在 GitHub Pages (chihhsiangchien.github.io)
    const isGitHubPages = hostname.includes('github.io');
    
    let basePath = '';
    
    if (isLocalhost) {
        // 本地开发环境 - 相对路径
        basePath = 'assets/themes';
    } else if (isGitHubPages) {
        // GitHub Pages 环境 - 使用相对路径
        // 个人 GitHub Pages (chihhsiangchien.github.io) 的路径是 /VR/... (不包含 repo 名)
        // 项目 GitHub Pages (user.github.io/project) 的路径是 /project/... 
        basePath = 'assets/themes';
    } else {
        // 其他情况 - 尝试使用相对路径
        basePath = 'assets/themes';
    }
    
    console.log(`🔍 资源路径配置:`, {
        hostname,
        pathname,
        basePath,
        environment: isLocalhost ? 'localhost' : (isGitHubPages ? 'GitHub Pages' : 'other')
    });
    
    return {
        basePath: basePath,
        format: 'png'  // 或 'webp'
    };
})();

// ===== 核心函数 =====

/**
 * 获取单个资源的完整路径
 * @param {string} themeName - 主题名称
 * @param {string} fileName - 文件名（可带或不带扩展名）
 * @returns {string} 完整资源路径
 * 
 * 示例：
 * getAssetPath('digestive-system', 'mouth')
 * → 'assets/themes/digestive-system/mouth.png'
 */
function getAssetPath(themeName, fileName) {
    // 如果文件名中已经有扩展名，直接使用
    const hasExtension = /\.\w+$/.test(fileName);
    const fullFileName = hasExtension ? fileName : `${fileName}.${ASSET_CONFIG.format}`;
    
    return `${ASSET_CONFIG.basePath}/${themeName}/${fullFileName}`;
}

/**
 * 获取资源URL（支持格式降级）
 * 如果WebP不支持，自动降级到PNG
 * @param {string} themeName - 主题名称
 * @param {string} fileName - 文件名
 * @returns {string} 资源URL
 */
function getAssetPathWithFallback(themeName, fileName) {
    if (ASSET_CONFIG.format === 'webp' && !supportsWebP()) {
        return getAssetPath(themeName, fileName.replace(/\.webp$/, '') + '.png');
    }
    return getAssetPath(themeName, fileName);
}

/**
 * 批量获取多个场景的资源映射
 * @param {string} themeName - 主题名称
 * @param {array} sceneNames - 场景名称数组
 * @returns {object} 资源映射对象
 * 
 * 示例：
 * const assets = getAssetMap('digestive-system', 
 *     ['mouth', 'pharynx', 'esophagus']
 * );
 * assets.mouth → 'assets/themes/digestive-system/mouth.png'
 */
function getAssetMap(themeName, sceneNames) {
    const map = {};
    sceneNames.forEach(scene => {
        map[scene] = getAssetPath(themeName, scene);
    });
    return map;
}

/**
 * 预加载资源（提高首屏速度）
 * @param {array} paths - 资源路径数组
 * @returns {Promise} 加载完成Promise
 * 
 * 示例：
 * preloadAssets([asset.mouth, asset.pharynx])
 */
function preloadAssets(paths) {
    const promises = paths.map(path => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;  // 即使失败也继续
            img.src = path;
        });
    });
    return Promise.all(promises);
}

/**
 * 检测浏览器是否支持WebP格式
 * @returns {boolean}
 */
function supportsWebP() {
    if (typeof supportsWebP.cached === 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        supportsWebP.cached = canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
    }
    return supportsWebP.cached;
}

/**
 * 获取资源的CDN URL（如果配置了CDN）
 * @param {string} themeName - 主题名称
 * @param {string} fileName - 文件名
 * @param {string} cdnUrl - CDN基础URL
 * @returns {string} CDN资源URL
 * 
 * 示例：
 * getAssetCdnPath('digestive-system', 'mouth', 
 *     'https://cdn.example.com/vr-assets'
 * )
 */
function getAssetCdnPath(themeName, fileName, cdnUrl) {
    const hasExtension = /\.\w+$/.test(fileName);
    const fullFileName = hasExtension ? fileName : `${fileName}.${ASSET_CONFIG.format}`;
    return `${cdnUrl}/${themeName}/${fullFileName}`;
}

/**
 * 获取资源的备用路径（fallback）
 * 用于在资源加载失败时重试
 * @param {string} themeName - 主题名称
 * @param {string} fileName - 文件名
 * @returns {object} 包含主路径和备用路径
 */
function getAssetWithFallback(themeName, fileName) {
    return {
        primary: getAssetPath(themeName, fileName),
        fallback: getAssetPath(themeName, fileName.replace(/\.webp$/, '') + '.png')
    };
}

/**
 * 验证主题配置中的所有资源是否可访问
 * @param {object} themeConfig - 主题配置对象
 * @returns {Promise<object>} 验证结果报告
 */
async function validateThemeAssets(themeConfig) {
    const report = {
        total: 0,
        loaded: 0,
        failed: 0,
        failures: []
    };
    
    const hotspots = themeConfig.hotspots || {};
    
    for (const [sceneKey, sceneData] of Object.entries(hotspots)) {
        if (!sceneData.texture) continue;
        
        report.total++;
        
        try {
            const response = await fetch(sceneData.texture, { method: 'HEAD' });
            if (response.ok) {
                report.loaded++;
                console.log(`✓ ${sceneKey}: ${sceneData.texture}`);
            } else {
                report.failed++;
                report.failures.push({
                    scene: sceneKey,
                    path: sceneData.texture,
                    status: response.status
                });
                console.warn(`✗ ${sceneKey}: ${sceneData.texture} (HTTP ${response.status})`);
            }
        } catch (error) {
            report.failed++;
            report.failures.push({
                scene: sceneKey,
                path: sceneData.texture,
                error: error.message
            });
            console.error(`✗ ${sceneKey}: ${sceneData.texture}`, error);
        }
    }
    
    return report;
}

/**
 * 生成资源统计信息
 * @param {object} themeConfig - 主题配置对象
 * @returns {object} 统计信息
 */
function getAssetStats(themeConfig) {
    const hotspots = themeConfig.hotspots || {};
    const stats = {
        scenes: 0,
        portals: 0,
        assets: []
    };
    
    for (const [sceneKey, sceneData] of Object.entries(hotspots)) {
        stats.scenes++;
        if (sceneData.texture) {
            stats.assets.push({
                scene: sceneKey,
                texture: sceneData.texture
            });
        }
        if (sceneData.portals) {
            stats.portals += sceneData.portals.length;
        }
    }
    
    return stats;
}

// ===== 工具函数 =====

/**
 * 清空资源缓存
 */
function clearAssetCache() {
    if ('caches' in window) {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                caches.delete(cacheName);
            });
        });
    }
}

/**
 * 打印资源配置信息（调试用）
 */
function printAssetConfig() {
    console.log('%c=== VR Asset Configuration ===', 'color: #00aaff; font-weight: bold;');
    console.log('Base Path:', ASSET_CONFIG.basePath);
    console.log('Format:', ASSET_CONFIG.format);
    console.log('WebP Support:', supportsWebP());
    console.log('Environment:', window.location.hostname);
}

// 初始化时打印配置
if (window.location.hash.includes('debug')) {
    printAssetConfig();
}
