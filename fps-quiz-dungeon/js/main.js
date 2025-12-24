import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    
    // mobile check logic could go here or in Game
    // simple user agent check
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        document.getElementById('mobile-controls').style.display = 'block';
    }

    // Attach button listeners
    document.getElementById('start-btn').addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none';
        game.start();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        document.getElementById('game-over-screen').style.display = 'none';
        game.reset();
        game.start();
    });
});
