import { VirusManager } from './js/VirusManager.js';

let virusManager;

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create virus visualization manager with default canvas ID
    virusManager = new VirusManager();
    
    // Set up any additional UI controls
    setupUIControls();
});

function setupUIControls() {
    // Add opacity slider functionality
    const opacitySlider = document.getElementById('opacitySlider');
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            virusManager.setOpacity(parseFloat(e.target.value));
        });
    }

    // Add clipping plane slider if needed
    const clippingSlider = document.getElementById('clippingSlider');
    if (clippingSlider) {
        clippingSlider.addEventListener('input', (e) => {
            virusManager.adjustClippingPlane(parseFloat(e.target.value));
        });
    }
}