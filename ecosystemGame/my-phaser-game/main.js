const config = {
  type: Phaser.AUTO,
  width: 500,
  height: 500,
  backgroundColor: '#87ceeb',
  physics: {
    default: 'arcade',
  },
  scene: {
    preload,
    create,
  }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image('pondTiles', 'assets/tilesets/pond_03.png');
  this.load.tilemapTiledJSON('pondMap', 'assets/maps/pond.tmj');
}

function create() {
  const map = this.make.tilemap({ key: 'pondMap' });

  // 名稱要與你在 Tiled 裡 tileset 取的名稱一致！
  const tileset = map.addTilesetImage('pond_03', 'pondTiles');

  // 嘗試建立所有 layer（也可以只取特定 layer）
  map.layers.forEach(layerData => {
    map.createLayer(layerData.name, tileset, 0, 0);
  });

  this.add.text(10, 10, 'Pond map loaded!', { font: '16px sans-serif', fill: '#000' });
}
