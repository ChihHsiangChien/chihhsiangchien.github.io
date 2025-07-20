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
    update // Add the update function to the scene lifecycle
  }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image('alpineTiles', 'assets/tilesets/alpine.png');
  this.load.image('plainTiles', 'assets/tilesets/plain.png');  
 
  this.load.tilemapTiledJSON('alpineMap', 'assets/maps/alpine.tmj');
  this.load.tilemapTiledJSON('plainMap', 'assets/maps/plain.tmj');
}

function create() {
  this.mapKeys = ['alpineMap', 'plainMap'];
  // Store tileset information for each map.
  // IMPORTANT: The 'name' property must match the tileset name used in your Tiled editor.
  this.tilesetData = {
    'alpineMap': { name: 'alpine', image: 'alpineTiles' },
    'plainMap': { name: 'plain', image: 'plainTiles' } // Assuming 'plain' is the tileset name in Tiled for plainMap
  };
  this.currentMapIndex = 0; // Start with the first map
  this.currentMapInstance = null; // To store the current Phaser Tilemap object
  this.mapText = null; // To store the text object displaying the map name

  // Helper function to load a map by its index in this.mapKeys
  this.loadMapByIndex = function(index) {
    // Clear previous map instance if it exists
    if (this.currentMapInstance) {
      this.currentMapInstance.destroy();
    }
    // Clear previous map text
    if (this.mapText) {
      this.mapText.destroy();
    }

    this.currentMapIndex = index;
    const mapKey = this.mapKeys[this.currentMapIndex];
    const tilesetInfo = this.tilesetData[mapKey];

    if (!tilesetInfo) {
      console.error(`Tileset data not found for map: ${mapKey}`);
      this.mapText = this.add.text(10, 10, `Error: Tileset info missing for ${mapKey}`, { font: '16px sans-serif', fill: '#ff0000' });
      return;
    }

    // Create the new tilemap
    this.currentMapInstance = this.make.tilemap({ key: mapKey });

    // Add the tileset image to the map
    // The first argument 'tilesetInfo.name' MUST match the name given to the tileset in Tiled
    const tileset = this.currentMapInstance.addTilesetImage(tilesetInfo.name, tilesetInfo.image);

    if (!tileset) {
      console.error(`Failed to add tileset "${tilesetInfo.name}" with image "${tilesetInfo.image}" for map "${mapKey}". Check Tiled configuration and asset keys.`);
      this.mapText = this.add.text(10, 10, `Error loading tileset for ${mapKey}`, { font: '16px sans-serif', fill: '#ff0000' });
      return;
    }

    // Create all layers from the Tiled map
    this.currentMapInstance.layers.forEach(layerData => {
      const layer = this.currentMapInstance.createLayer(layerData.name, tileset, 0, 0);
      if (!layer) {
        console.error(`Failed to create layer "${layerData.name}" for map "${mapKey}".`);
      }
    });

    this.mapText = this.add.text(10, 10, `Map: ${mapKey} (Use Left/Right arrows to switch)`, { font: '16px sans-serif', fill: '#000' });
  }

  // Load the initial map
  this.loadMapByIndex(this.currentMapIndex);

  // Setup cursor keys for input
  this.cursors = this.input.keyboard.createCursorKeys();
}

function update() {
  if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
    let newIndex = (this.currentMapIndex - 1 + this.mapKeys.length) % this.mapKeys.length; // Decrement and wrap around
    this.loadMapByIndex(newIndex);
  } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
    let newIndex = (this.currentMapIndex + 1) % this.mapKeys.length; // Increment and wrap around
    this.loadMapByIndex(newIndex);
  }
}
