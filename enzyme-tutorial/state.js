export const state = {
  enzymes: [],
  molecules: [],
  enzymeCount: {},
  moleculeCount: {},
  activationSites: [],
  dragging: null,
  dragType: null,
  dragIndex: -1,
  autoDetectBatchIndex: 0,
  grid: {},
  bindingDetectFrame: 0,
  bindingDetectInterval: 1,
  offsetX: 0,
  offsetY: 0,
  pendingToolboxItem: null,
  chartPaused: false,
  chartTime: 0,
  charts: { concentration: null },
  chartData: {
    concentration: { labels: [], datasets: [] },
  },
  currentChartType: "concentration",
  draggingGhost: null,
  draggingType: null,
  draggingEnzymeType: null,
  draggingMoleculeType: null,
};

export const ENZYME_BROWNIAN_SPEED_RATIO = 0.03;
export const ACTIVATION_SITE_RADIUS = 35;
export const GRID_SIZE = 80;
export const AUTO_DETECT_BATCH = 4;