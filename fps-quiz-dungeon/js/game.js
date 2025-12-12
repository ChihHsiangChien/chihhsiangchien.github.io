import * as THREE from 'three';
import { Player } from './player.js';
import { questions } from './data.js';
import { Enemy } from './enemy.js';
import { levels } from './levels.js';

export class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); 
        this.scene.fog = new THREE.Fog(0x87CEEB, 0, 80); 

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = 1.6; 

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.player = new Player(this.camera, this.renderer.domElement);
        
        this.raycaster = new THREE.Raycaster();
        
        this.isRunning = false;
        this.score = 0;
        this.hp = 100;
        this.timeElapsed = 0;
        
        this.currentLevelIndex = 0;

        this.walls = [];
        this.enemies = []; 

        this.init();
        
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    init() {
        this.createLights();
        this.createClouds(); // Add clouds
        this.loadLevel(this.currentLevelIndex);
        this.setupMobileControls();

        this.renderer.setAnimationLoop(this.animate.bind(this));
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.clock.start();
        try {
            this.player.controls.lock();
        } catch (e) {
            console.warn("Pointer lock failed:", e);
        }
    }

    reset() {
        this.score = 0;
        this.hp = 100;
        this.timeElapsed = 0;
        this.currentLevelIndex = 0;
        this.loadLevel(0);
        this.updateHUD();
    }
    
    loadLevel(index) {
        // Clear old
        this.enemies.forEach(e => this.scene.remove(e.mesh));
        this.enemies = [];
        this.walls.forEach(w => this.scene.remove(w));
        this.walls = [];
        
        // Remove floor/ceiling to rebuild with theme? 
        // For now, just keep same floor/ceiling or rebuild them if we want to change colors.
        // Let's remove them to be safe if we want theme support.
        const children = [...this.scene.children];
        children.forEach(c => {
           if (c.userData.isEnvironment) this.scene.remove(c); 
        });

        if (index >= levels.length) {
            // All levels done
            this.spawnMessage("ALL LEVELS CLEARED!", "gold");
            setTimeout(() => this.endGame(), 2000);
            return;
        }

        const level = levels[index];
        this.createEnvironment(level.theme);
        this.createMaze(level.map, level.theme);
        
        // Reset player pos
        // (Handled in createMaze where '3' is found)
        
        this.updateHUD();
        this.spawnMessage(`Level ${index + 1} Start!`, "white");
    }

    // ...

    createEnvironment(theme) {
        // Floor
        const floorGeo = new THREE.PlaneGeometry(200, 200); 
        const floorMat = new THREE.MeshLambertMaterial({ color: theme ? theme.floorColor : 0x555555 }); 
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.userData.isEnvironment = true;
        this.scene.add(floor);

        // Ceiling - Removed to show Sky/Clouds/Sun
        // If we really want a "ceiling" structure inside, it should be walls or separate. 
        // For now, removing the solid lid to satisfy "Design clouds & sun in sky".
    }

    createClouds() {
        if (this.cloudsCreated) return;
        
        const cloudGeo = new THREE.BoxGeometry(10, 4, 10);
        const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        
        for (let i = 0; i < 20; i++) {
            const cloud = new THREE.Mesh(cloudGeo, cloudMat);
            
            // Random position high in the sky
            cloud.position.set(
                (Math.random() - 0.5) * 400,
                30 + Math.random() * 20,
                (Math.random() - 0.5) * 400
            );
            
            // Random scale for variation
            cloud.scale.set(
                1 + Math.random() * 2,
                1 + Math.random() * 0.5,
                1 + Math.random() * 2
            );
            
            this.scene.add(cloud);
        }
        this.cloudsCreated = true;
    }

    createMaze(map, theme) {
        const UNIT_SIZE = 10; 
        const wallGeo = new THREE.BoxGeometry(UNIT_SIZE, 8, UNIT_SIZE); 
        
        const wallColors = theme ? theme.wallColors : [0xaa7755];

        for (let z = 0; z < map.length; z++) {
            for (let x = 0; x < map[z].length; x++) {
                const type = map[z][x];
                const realX = x * UNIT_SIZE;
                const realZ = z * UNIT_SIZE;

                if (type === 1) {
                    const color = wallColors[Math.floor(Math.random() * wallColors.length)];
                    const wallMat = new THREE.MeshLambertMaterial({ color: color });
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set(realX, 4, realZ); 
                    this.scene.add(wall);
                    this.walls.push(wall); 
                } else if (type === 3) {
                    this.camera.position.set(realX, 1.6, realZ);
                    this.player.velocity.set(0,0,0);
                } else if (type === 2) {
                    this.spawnEnemy(realX, realZ);
                }
            }
        }
    }

    spawnEnemy(x, z) {
        // Pick random question
        const q = questions[Math.floor(Math.random() * questions.length)];
        const enemy = new Enemy(this.scene, x, z, q);
        this.enemies.push(enemy);
    }

    createLights() {
        if (this.lightsCreated) return;
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2); 
        dirLight.position.set(50, 100, 50); 
        this.scene.add(dirLight);

        // Sun Visual (Made larger and brighter)
        const sunGeo = new THREE.SphereGeometry(20, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(100, 100, -100); 
        this.scene.add(sun);
        this.lightsCreated = true;
    }

    // ... setupMobileControls / onWindowResize ...
    
    shoot() {
        if (!this.isRunning) return;
        
        this.playSound('shoot');

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        const enemyMeshes = this.enemies.filter(e => !e.isDead).map(e => e.mesh);
        const allMeshes = [...enemyMeshes, ...this.walls];
        const intersects = this.raycaster.intersectObjects(allMeshes);

        if (intersects.length > 0) {
            const hit = intersects[0];
            
            if (this.walls.includes(hit.object)) return;

            const enemy = this.enemies.find(e => e.mesh === hit.object);
            
            if (enemy) {
                const partIndex = enemy.checkHit(hit.point);
                if (partIndex !== -1) {
                    const result = enemy.takeDamage(partIndex);
                    if (result.correct) {
                        this.score += 100;
                        this.playSound('correct');
                        this.spawnMessage("Correct! +100", "green");
                        
                        this.enemies = this.enemies.filter(e => e !== enemy);
                        
                        // Check Level Clear
                        if (this.enemies.length === 0) {
                            this.spawnMessage("Level Clear!", "gold");
                            setTimeout(() => {
                                this.currentLevelIndex++;
                                this.loadLevel(this.currentLevelIndex);
                            }, 2000);
                        }
                    } else {
                        this.hp -= 10;
                        this.playSound('wrong');
                        this.spawnMessage("Wrong! -10 HP", "red");
                        if (this.hp <= 0) this.endGame();
                    }
                    this.updateHUD(); // Now it exists
                }
            }
        }
    }

    updateHUD() {
        document.getElementById('score').innerText = `分數: ${this.score}`;
        document.getElementById('health').innerText = `生命: ${this.hp}`;
        const enemyCount = this.enemies.length;
        document.getElementById('enemy-count').innerText = `敵人剩餘: ${enemyCount}`;
    }

    setupMobileControls() {
        const joystick = document.getElementById('joystick-zone');
        const shootBtn = document.getElementById('shoot-btn');
        
        let startX, startY;
        
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startX = e.changedTouches[0].clientX;
            startY = e.changedTouches[0].clientY;
        }, {passive: false});

        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const currentX = e.changedTouches[0].clientX;
            const currentY = e.changedTouches[0].clientY;
            
            const deltaX = (currentX - startX) / 75;
            const deltaY = (currentY - startY) / 75;
            
            this.player.handleVirtualJoystick(
                Math.max(-1, Math.min(1, deltaX)), 
                Math.max(-1, Math.min(1, deltaY))
            );
        }, {passive: false});

        joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.player.handleVirtualJoystick(0, 0);
        });

        // Touch Look
        let lookTouchId = null;
        let lastLookX, lastLookY;

        document.addEventListener('touchstart', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                // Right half of screen for look
                if (t.clientX > window.innerWidth / 2 && t.target !== shootBtn) {
                    lookTouchId = t.identifier;
                    lastLookX = t.clientX;
                    lastLookY = t.clientY;
                }
            }
        });

        document.addEventListener('touchmove', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === lookTouchId) {
                    const dx = t.clientX - lastLookX;
                    const dy = t.clientY - lastLookY;
                    this.player.handleTouchLook(dx, dy);
                    lastLookX = t.clientX;
                    lastLookY = t.clientY;
                    e.preventDefault();
                }
            }
        }, {passive: false});

        document.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === lookTouchId) {
                    lookTouchId = null;
                }
            }
        });
        
        shootBtn.addEventListener('touchstart', (e) => {
             e.preventDefault(); // Prevent click emulation
             this.shoot();
        });
        
        // Mouse click shoot for PC
        document.addEventListener('mousedown', (e) => {
            if (this.isRunning && document.pointerLockElement) {
                this.shoot();
            }
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    spawnMessage(text, color) {
        const msg = document.getElementById('message');
        if (msg) {
            msg.innerText = text;
            msg.style.color = color;
            setTimeout(() => {
                msg.innerText = "任務目標: 找出正確答案並射擊敵人弱點!";
                msg.style.color = "white";
            }, 2000);
        }
    }
    
    playSound(type) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        
        if (!this.audioCtx) this.audioCtx = new AudioContext();
        
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        if (type === 'shoot') {
            osc.index = 'square';
            osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.1);
        } else if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
            osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.3);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, this.audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, this.audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.3);
        }
    }

    endGame() {
        this.isRunning = false;
        document.getElementById('game-over-screen').style.display = 'flex';
        document.getElementById('final-score').innerText = `得分: ${this.score}`;
        document.exitPointerLock();
    }
    animate() {
        if (!this.isRunning) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        const delta = this.clock.getDelta();
        this.timeElapsed += delta;
        
        let min = Math.floor(this.timeElapsed / 60);
        let sec = Math.floor(this.timeElapsed % 60);
        document.getElementById('timer').innerText = `時間: ${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;

        // Keep track of old pos for collision resolution
        const oldPos = this.player.getPosition().clone();

        this.player.update(delta);
        
        // Lock player Y to prevent flying
        this.player.camera.position.y = 1.6;

        // Wall Collision
        const pPos = this.player.getPosition();
        const UNIT_SIZE = 10;
        
        // Helper to check wall
        const isWall = (gx, gz) => {
             // Simple bounds check for map array
             if (gz < 0 || gz >= 10 || gx < 0 || gx >= 10) return true; 
             // Logic: Check if map[gz][gx] == 1 in our conceptual map.
             // But we didn't save map. So rely on bounding box.
             // Or better: Just use bounding boxes.
             return false;
        };
        
        const playerBox = new THREE.Box3();
        const size = new THREE.Vector3(1, 4, 1);
        playerBox.setFromCenterAndSize(pPos, size);
        
        let collided = false;
        for (const wall of this.walls) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            if (playerBox.intersectsBox(wallBox)) {
                collided = true;
                break;
            }
        }
        
        if (collided) {
            // Revert to oldPos
            this.player.camera.position.copy(oldPos);
            // Ensure Y is still correct
            this.player.camera.position.y = 1.6;
            this.player.velocity.set(0,0,0);
        }
        
        // Update Enemies
        this.enemies.forEach(e => e.update(delta, pPos));

        this.renderer.render(this.scene, this.camera);
    }
}
