import { setupUIControls } from './script.js';

/**
 * @jest-environment jsdom
 */


describe('setupUIControls', () => {
    let mockVirusManager;

    beforeEach(() => {
        // Set up the DOM elements
        document.body.innerHTML = `
            <input id="opacitySlider" type="range" min="0" max="1" step="0.1" value="0.5">
            <input id="clippingSlider" type="range" min="0" max="100" step="1" value="50">
        `;

        // Mock the VirusManager instance
        mockVirusManager = {
            setOpacity: jest.fn(),
            adjustClippingPlane: jest.fn(),
        };

        // Assign the mock instance to the global variable
        global.virusManager = mockVirusManager;

        // Call the function to set up event listeners
        setupUIControls();
    });

    afterEach(() => {
        // Clean up the DOM and global variables
        document.body.innerHTML = '';
        delete global.virusManager;
    });

    test('should call virusManager.setOpacity when opacitySlider value changes', () => {
        const opacitySlider = document.getElementById('opacitySlider');
        opacitySlider.value = '0.8';
        opacitySlider.dispatchEvent(new Event('input'));

        expect(mockVirusManager.setOpacity).toHaveBeenCalledWith(0.8);
    });

    test('should call virusManager.adjustClippingPlane when clippingSlider value changes', () => {
        const clippingSlider = document.getElementById('clippingSlider');
        clippingSlider.value = '75';
        clippingSlider.dispatchEvent(new Event('input'));

        expect(mockVirusManager.adjustClippingPlane).toHaveBeenCalledWith(75);
    });

    test('should not throw an error if sliders are not present in the DOM', () => {
        document.body.innerHTML = ''; // Remove sliders from the DOM
        expect(() => setupUIControls()).not.toThrow();
    });
});