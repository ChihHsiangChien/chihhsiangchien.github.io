
// L-System Variables
let axiom = "F-F-F-F"; // Initial axiom
let sentence = axiom;
let rules = [];
let angle;
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
const resetBtn = document.getElementById("resetBtn");
const generateBtn = document.getElementById("generateBtn"); // 新增生成按鈕

// Default origin
let xOrigin = canvas.width / 2;
let yOrigin = canvas.height/ 2;

// Define the rule (F → F−F+F+FF−F−F+F)
rules[0] = {
    input: "F",
    output: "F−F+F+FF−F−F+F"
};

// Generate the next sequence in the L-System
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
    draw();
    len *= 0.6; // 縮短線段長度
}

// Draw the L-System sentence
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Update origin from sliders
    xOrigin = xOriginSlider.value;
    yOrigin = yOriginSlider.value;

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

// Reset the L-System with new axiom and rule
function reset() {
    // Get the values from input fields
    axiom = axiomInput.value;
    rules[0].output = ruleInput.value;
    sentence = axiom;
    len = 50; // Reset the length
    draw(); // Redraw the initial state
}

// Initial setup
function setup() {
    angle = Math.PI / 2; // 90 degrees in radians (based on F-F-F-F)
    draw();
}

// Event listeners for controls
resetBtn.addEventListener("click", reset);

// 按下按鈕時生成新的 L-System 結果
generateBtn.addEventListener("click", generate);

// Update the drawing when sliders change
xOriginSlider.addEventListener("input", draw);
yOriginSlider.addEventListener("input", draw);

setup();