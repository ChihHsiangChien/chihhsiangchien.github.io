import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Player {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        // Physics
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.speed = 15.0; // Movement speed
        this.mass = 100.0; // For damping

        // State
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false; // Not really needed for Doom style but good to have

        // Controls
        this.controls = new PointerLockControls(camera, document.body);
        
        // Touch state
        this.joystickVector = new THREE.Vector2(0, 0); // x, y from -1 to 1

        this.setupListeners();
    }

    setupListeners() {
        // PC Keyboard
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true;
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false;
                    break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Click to lock
        document.addEventListener('click', () => {
            // Only lock if on PC (not touch) and not hitting buttons
            // Simple check: if joystick is hidden
            if (document.getElementById('mobile-controls').style.display === 'none') {
                this.controls.lock();
            }
        });
    }

    handleVirtualJoystick(x, y) {
        // x, y are -1 to 1
        this.joystickVector.set(x, y);
    }

    handleTouchLook(movementX, movementY) {
        // Rotate camera manually
        const sensitivity = 0.002;
        this.camera.rotation.y -= movementX * sensitivity;
        this.camera.rotation.x -= movementY * sensitivity;
        this.camera.rotation.x = Math.max(- Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
    }

    update(delta) {
        // Friction / Damping
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        // Calculate direction
        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize(); // Ensure consistent speed in all directions

        // Add joystick input
        if (this.joystickVector.length() > 0.1) {
            // Joystick y is forward (negative z in local space usually, but logic here calls forward positive for calculation then apply)
            // Actually PointerLockControls moveForward/Right logic:
            // moveForward takes distance. Positive distance = forward (-Z).
            
            // We'll map joystick to velocity directly or mix with direction
            // Let's just add to direction for simplicity
            // Joystick Y+ is Up (Forward in game), X+ is Right
            this.direction.z += this.joystickVector.y; 
            this.direction.x += this.joystickVector.x;
        }

        if (this.moveForward || this.moveBackward || this.moveLeft || this.moveRight || this.joystickVector.length() > 0.1) {
            // Acceleration
            if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * 400.0 * delta; 
            if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * 400.0 * delta;
            
            // Joystick mixed in
            if (Math.abs(this.joystickVector.y) > 0) this.velocity.z -= this.joystickVector.y * 400.0 * delta;
            if (Math.abs(this.joystickVector.x) > 0) this.velocity.x -= this.joystickVector.x * 400.0 * delta;
        }

        // Apply movement via Controls (handling local rotation)
        // PointerLockControls doesn't give direct vector access easily for custom physics without "moveRight/moveForward"
        // So we might manualy move object
        
        this.controls.moveRight(-this.velocity.x * delta);
        this.controls.moveForward(-this.velocity.z * delta);
        
        // Simple floor collision (stay at height)
        if (this.camera.position.y < 1.6) this.camera.position.y = 1.6;
    }

    // Helper to get position for collision checks
    getPosition() {
        return this.camera.position;
    }
}
