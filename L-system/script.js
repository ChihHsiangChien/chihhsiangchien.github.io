// L-System Variables
let axiom = "F";
let sentence = axiom;
let rules = [];
let angle;
let len = 100;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

// Define the rule (F -> FF+[+F-F-F]-[-F+F+F])
rules[0] = {
    input: "F",
    output: "FF+[+F-F-F]-[-F+F+F]"
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
            nextSentence += current;
        }
    }
    sentence = nextSentence;
    draw();
}

// Draw the L-System sentence
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height);
    ctx.strokeStyle = "green";
    ctx.lineWidth = 2;

    for (let i = 0; i < sentence.length; i++) {
        let current = sentence[i];

        if (current === "F") {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -len);
            ctx.stroke();
            ctx.translate(0, -len);
        } else if (current === "+") {
            ctx.rotate(angle);
        } else if (current === "-") {
            ctx.rotate(-angle);
        } else if (current === "[") {
            ctx.save();
        } else if (current === "]") {
            ctx.restore();
        }
    }

    ctx.restore();
}

// Initial setup
function setup() {
    angle = Math.PI / 6; // 30 degrees in radians
    draw();
}

// Run the system and generate new sequences on click
document.addEventListener("click", () => {
    generate();
    len *= 0.7; // Shorten the length with each iteration
});

setup();
