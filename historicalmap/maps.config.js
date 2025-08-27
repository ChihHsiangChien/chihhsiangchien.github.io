// maps.config.js
export const mapsData = {
  'chutung-history': {
    name: '竹東歷史互動地圖',
    dataPath: './data/chutung.json', 
    /*
    regionColorConfig: {
      '新竹': { name: 'hsinchu', bgColor: '#dbeafe', borderColor: '#60a5fa', textColor: '#1e40af', mapBgColor: 'rgba(219, 234, 254, 0.9)' },
      '竹東': { name: 'chutung', bgColor: '#dcfce7', borderColor: '#4ade80', textColor: '#166534', mapBgColor: 'rgba(220, 252, 231, 0.9)' },
      '竹北': { name: 'chubei', bgColor: '#ffedd5', borderColor: '#fb923c', textColor: '#9a3412', mapBgColor: 'rgba(255, 237, 213, 0.9)' },
      '員崠': { name: 'yuantung', bgColor: '#fef9c3', borderColor: '#facc15', textColor: '#854d0e', mapBgColor: 'rgba(254, 249, 195, 0.9)' },
      '寶山': { name: 'paoshan', bgColor: 'rgba(224, 231, 255, 1)', borderColor: '#818CF8', textColor: '#3730A3', mapBgColor: 'rgba(224, 231, 255, 0.9)' },
      'default': { name: 'default', bgColor: '#ffffff', borderColor: '#d1d5db', textColor: '#1f2937', mapBgColor: 'rgba(255, 255, 255, 0.9)' }
    },
    */
    yearRanges: [
      { start: 1683, end: 1894, color: '#6bbaffff', label: '清領' },
      { start: 1895, end: 1945, color: '#ff8c00ff', label: '日治' },
      { start: 1946, end: 2100, color: '#07adbcff', label: '戰後' }
      // 其他年段可再加
    ]    
  },
  'hsinchu-history': {
    name: '新竹歷史',
    dataPath: 'data/hsinchu.json',
    /*
    regionColorConfig: {
      // 依需求設定顏色
      '新竹': { bgColor: '#f0f8ff', borderColor: '#4682b4', textColor: '#222', mapBgColor: 'rgba(240,248,255,0.9)' },
      // 其他區域...
      'default': { bgColor: '#fff', borderColor: '#aaa', textColor: '#222', mapBgColor: 'rgba(255,255,255,0.9)' }
    },
    */
    yearRanges: [
      { start: 1683, end: 1894, color: '#6bbaffff', label: '清領' },
      { start: 1895, end: 1945, color: '#ff8c00ff', label: '日治' },
      { start: 1946, end: 2100, color: '#07adbcff', label: '戰後' }
      // 其他年段可再加
    ]      
  }
  // ...未來可以繼續增加更多地圖
};
