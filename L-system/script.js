// L-System Variables
let axiom = "F-F-F-F"; // Initial axiom
let sentence = axiom;
let rules = [];
let len = 50;

// Canvas and context
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

// Sliders and input elements
const xOriginSlider = document.getElementById("xOrigin");
const yOriginSlider = document.getElementById("yOrigin");
const axiomInput = document.getElementById("axiomInput");
const ruleInput = document.getElementById("ruleInput");
const angleInput = document.getElementById("angleInput"); // Angle input
const scaleSlider = document.getElementById("scale"); // Scale slider
const resetBtn = document.getElementById("resetBtn");
const generateBtn = document.getElementById("generateBtn");
const redrawBtn = document.getElementById("redrawBtn"); // New redraw button



// Default origin
let xOrigin = canvas.width / 2;
let yOrigin = canvas.height / 2;

// Define the rule (F → F−F+F+FF−F−F+F)
rules[0] = {
    input: "F",
    output: "F+F-F-FF+F+F-F"
};

// Generate the next sequence in the L-System
function generate2() {
    let nextSentence = "";
    for (let i = 0; i < sentence.length; i++) {
        let current = sentence[i];
        let found = false;
        for (let j = 0; j < rules.length; j++) {
            if (current === rules[j].input) {
                nextSentence += rules[j].output;
                found = true;
                break;
            }
        }
        if (!found) {
            nextSentence += current; // If no rule matches, keep the character as is
        }
    }
    sentence = nextSentence;
    draw();
    console.log(sentence);
    len *= 0.6; // 縮短線段長度
}


// Redefine the length before drawing each iteration
function generate() {
    let nextSentence = "";
    for (let i = 0; i < sentence.length; i++) {
        let current = sentence[i];
        let found = false;
        for (let j = 0; j < rules.length; j++) {
            if (current === rules[j].input) {
                nextSentence += rules[j].output;
                found = true;
                break;
            }
        }
        if (!found) {
            nextSentence += current; // If no rule matches, keep the character as is
        }
    }
    sentence = nextSentence;
    
    // Shorten the length but keep it dynamic
    len *= 0.6; 

    draw();
}

// Calculate scaling factor to fit the drawing inside the canvas
function calculateScale() {
    let totalF = 0;
    for (let i = 0; i < sentence.length; i++) {
        if (sentence[i] === "F") {
            totalF++;
        }
    }
    
    // Estimate the total drawing length based on the number of "F" and len
    const totalDrawingHeight = totalF * len/20;
    const totalDrawingWidth = totalF * len/20; // Assuming F moves horizontally as well

    // Calculate scale factor to fit drawing within both canvas dimensions
    const heightScaleFactor = (canvas.height * 0.8) / totalDrawingHeight; // 80% of canvas height
    const widthScaleFactor = (canvas.width * 0.8) / totalDrawingWidth; // 80% of canvas width

    // Use the smaller scaling factor to ensure the drawing fits within both dimensions
    const scaleFactor = Math.min(heightScaleFactor, widthScaleFactor, 1);

    console.log(`Height Scale: ${heightScaleFactor}, Width Scale: ${widthScaleFactor}, Final Scale: ${scaleFactor}`);
    //return scaleFactor;
    return 1;
}


// Draw the L-System sentence
function draw2() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Update origin from sliders
    xOrigin = parseInt(xOriginSlider.value, 10);
    yOrigin = parseInt(yOriginSlider.value, 10);

    // Convert the angle from degrees to radians
    angle = (parseInt(angleInput.value) * Math.PI) / 180;

    ctx.translate(xOrigin, yOrigin);
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;

    for (let i = 0; i < sentence.length; i++) {
        let current = sentence[i];

        if (current === "F") {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -len);
            ctx.stroke();
            ctx.translate(0, -len); // Move the drawing position forward
        } else if (current === "+") {
            ctx.rotate(angle); // Rotate clockwise
        } else if (current === "-") {
            ctx.rotate(-angle); // Rotate counterclockwise
        } else if (current === "[") {
            ctx.save(); // Save the current drawing state
        } else if (current === "]") {
            ctx.restore(); // Restore the saved state
        }
    }

    ctx.restore();
}



function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Get the updated origin from sliders
    xOrigin = xOriginSlider.value;
    yOrigin = yOriginSlider.value;

    // Convert the angle from degrees to radians
    angle = (parseInt(angleInput.value) * Math.PI) / 180;

    ctx.translate(xOrigin, yOrigin);
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;

    // Apply the current scale
    ctx.scale(scale, scale); // Apply scaling

    for (let i = 0; i < sentence.length; i++) {
        let current = sentence[i];

        if (current === "F") {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -len);
            ctx.stroke();
            ctx.translate(0, -len); // Move the drawing position forward
        } else if (current === "+") {
            ctx.rotate(angle); // Rotate clockwise
        } else if (current === "-") {
            ctx.rotate(-angle); // Rotate counterclockwise
        } else if (current === "[") {
            ctx.save(); // Save the current drawing state
        } else if (current === "]") {
            ctx.restore(); // Restore the saved state
        }
    }

    ctx.restore();
}

// Reset the L-System with new axiom and rule
function reset() {
    // Get the values from input fields
    axiom = axiomInput.value;
    rules[0].output = ruleInput.value;
    sentence = axiom;
    len = 50; // Reset the length
    
    // Reset sliders to initial positions
    xOriginSlider.value = canvas.width / 2;
    yOriginSlider.value = canvas.height / 2;
    scale = parseFloat(scaleSlider.value); // Reset scale from slider
    draw(); // Redraw the initial state
}

// Redraw function
function redraw() {
    scale = parseFloat(scaleSlider.value); // Get the current scale value
    draw(); // Redraw the current state
}

// Initial setup
function setup() {
    angle = parseFloat(document.getElementById("angleInput").value); // Get angle from input
    draw();
}


redrawBtn.addEventListener("click", redraw); // Call redraw when button is clicked
resetBtn.addEventListener("click", reset);
generateBtn.addEventListener("click", generate);

// Update the drawing when sliders or angle change
xOriginSlider.addEventListener("input", draw);
yOriginSlider.addEventListener("input", draw);
angleInput.addEventListener("input", draw);
scaleSlider.addEventListener("input", redraw); // Redraw on scale change

setup();
