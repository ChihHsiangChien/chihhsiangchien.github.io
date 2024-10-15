// JSON 資料
/*
const lSystems = [
    {
        axiom: "F-F-F-F",
        rules: [{ input: "F", output: "F+FF-FF-F-F+F+FF-F-F+F+FF+FF-F" }],
        angle: 90
    },
    {
        axiom: "-F",
        rules: [{ input: "F", output: "F+F-F-F+F" }],
        angle: 90
    },
    {
        axiom: "F+F+F+F",
        rules: [
            { input: "F", output: "F+f-FF+F+FF+Ff+FF-f+FF-F-FF-Ff-FFF" },
            { input: "f", output: "ffffff" }
        ],
        angle: 90
    },
    {
        axiom: "F-F-F-F",
        rules: [
            { input: "F", output: "FF-F-F-F-F-F+F" }
        ],
        angle: 90        
    },
    {
        axiom: "F-F-F-F",
        rules: [
            { input: "F", output: "FF-F-F-F-FF" }
        ],
        angle: 90        
    },    
    {
        axiom: "F-F-F-F",
        rules: [
            { input: "F", output: "FF-F+F-F-FF" }
        ],
        angle: 90        
    },    
    {
        axiom: "F-F-F-F",
        rules: [
            { input: "F", output: "FF-F--F-F" }
        ],
        angle: 90        
    },         
    {
        axiom: "F",
        rules: [
            { input: "F", output: "F[+F]F[-F]F" }
        ],
        angle: 25.7        
    },
    {
        axiom: "F",
        rules: [
            { input: "F", output: "FF-[-F+F+F]+[+F-F-F]" }
        ],
        angle: 22.5    
    },      
    {
        axiom: "X",
        rules: [
            { input: "X", output: "F[+X]F[-X]+X" },
            { input: "F", output: "FF" }

        ],
        angle: 20    
    },
    {
        axiom: "Fl",
        rules: [
            { input: "Fl", output: "Fl+Fr++Fr-Fl--FlFl-Fr+" },
            { input: "Fr", output: "-Fl+FrFr++Fr+Fl--Fl-Fr" },
        ],
        angle: 60    
    },
    {
        axiom: "Fl",
        rules: [
            { input: "Fl", output: "FlFl-Fr-Fr+Fl+Fl-Fr-FrFl+Fr+FlFlFr-Fl+Fr+FlFl+Fr-FlFr-Fr-Fl+Fl+FrFr-" },
            { input: "Fr", output: "+FlFl-Fr-Fr+Fl+FlFr+Fl-FrFr-Fl-Fr+FlFrFr-Fl-FrFl+Fl+Fr-Fr-Fl+Fl+FrFr" },
        ],
        angle: 90    
    },
    {
        axiom: "-L",
        rules: [
            { input: "L", output: "LF+RFR+FL-F-LFLFL-FRFR+" },
            { input: "R", output: "-LFLF+RFRFR+F+RF-LFL-FR" },
        ],
        angle: 90    
    },
    {
        axiom: "-L",
        rules: [
            { input: "L", output: "LFLF+RFR+FLFL-FRF-LFL-FR+F+RF-LFL-FRFRFR+" },
            { input: "R", output: "-LFLFLF+RFR+FL-F-LF+RFR+FLF+RFRF-LFL-FRFR" },
        ],
        angle: 90    
    },
    {
        axiom: "L",
        rules: [
            { input: "L", output: "LFRFL-F-RFLFR+F+LFRFL" },
            { input: "R", output: "RFLFR+F+LFRFL-F-RFLFR" },
        ],
        angle: 90    
    },        
    {
        axiom: "L",
        rules: [
            { input: "L", output: "L+F+R-F-L+F+R-F-L-F-R+F+L-F-R-F-L+F+R-F-L-F-R-F-L+F+R+F+L+F+R-F-L+F+R+F+L-R-F+F+L+F+R-F-L+F+R-F-L" },
            { input: "R", output: "R-F-L+F+R-F-L+F+R+F+L-F-R+F+L+F+R-F-L+F+R+F+L+F+R-F-L-F-R-F-L+F+R-F-L-F-R+F+L-F-R-F-L+F+R-F-L+F+R" },
        ],
        angle: 45    
    }    
];
*/

const lSystems = [
    {
        axiom: "F-F-F-F",
        rules: [
            {
                input: "F",
                outputs: [
                    { output: "F+FF-FF-F-F+F+FF-F-F+F+FF+FF-F", probability: 1 }
                ]
            }
        ],
        angle: 90
    },
    {
        axiom: "-F",
        rules: [
            {
                input: "F",
                outputs: [
                    { output: "F+F-F-F+F", probability: 1 }
                ]
            }
        ],
        angle: 90
    },
    {
        axiom: "F+F+F+F",
        rules: [
            {
                input: "F",
                outputs: [
                    { output: "F+f-FF+F+FF+Ff+FF-f+FF-F-FF-Ff-FFF", probability: 1 }
                ]
            },
            {
                input: "f",
                outputs: [
                    { output: "ffffff", probability: 1 }
                ]
            }
        ],
        angle: 90
    },
    {
        axiom: "F-F-F-F",
        rules: [
            {
                input: "F",
                outputs: [
                    { output: "FF-F-F-F-F-F+F", probability: 1 }
                ]
            }
        ],
        angle: 90        
    },
    {
        axiom: "F-F-F-F",
        rules: [
            {
                input: "F",
                outputs: [
                    { output: "FF-F-F-F-FF", probability: 1 }
                ]
            }
        ],
        angle: 90        
    },    
    {
        axiom: "F-F-F-F",
        rules: [
            {
                input: "F",
                outputs: [
                    { output: "FF-F+F-F-FF", probability: 1 }
                ]
            }
        ],
        angle: 90        
    },    
    {
        axiom: "F-F-F-F",
        rules: [
            {
                input: "F",
                outputs: [
                    { output: "FF-F--F-F", probability: 1 }
                ]
            }
        ],
        angle: 90        
    },         
    {
        axiom: "F",
        rules: [
            {
                input: "F",
                outputs: [
                    { output: "F[+F]F[-F]F", probability: 1 }
                ]
            }
        ],
        angle: 25.7        
    },
    {
        axiom: "F",
        rules: [
            {
                input: "F",
                outputs: [
                    { output: "FF-[-F+F+F]+[+F-F-F]", probability: 1 }
                ]
            }
        ],
        angle: 22.5    
    },      
    {
        axiom: "X",
        rules: [
            {
                input: "X",
                outputs: [
                    { output: "F[+X]F[-X]+X", probability: 1 }
                ]
            },
            {
                input: "F",
                outputs: [
                    { output: "FF", probability: 1 }
                ]
            }
        ],
        angle: 20    
    },
    {
        axiom: "Fl",
        rules: [
            {
                input: "Fl",
                outputs: [
                    { output: "Fl+Fr++Fr-Fl--FlFl-Fr+", probability: 1 }
                ]
            },
            {
                input: "Fr",
                outputs: [
                    { output: "-Fl+FrFr++Fr+Fl--Fl-Fr", probability: 1 }
                ]
            }
        ],
        angle: 60    
    },
    {
        axiom: "Fl",
        rules: [
            {
                input: "Fl",
                outputs: [
                    { output: "FlFl-Fr-Fr+Fl+Fl-Fr-FrFl+Fr+FlFlFr-Fl+Fr+FlFl+Fr-FlFr-Fr-Fl+Fl+FrFr-", probability: 1 }
                ]
            },
            {
                input: "Fr",
                outputs: [
                    { output: "+FlFl-Fr-Fr+Fl+FlFr+Fl-FrFr-Fl-Fr+FlFrFr-Fl-FrFl+Fl+Fr-Fr-Fl+Fl+FrFr", probability: 1 }
                ]
            }
        ],
        angle: 90    
    },
    {
        axiom: "-L",
        rules: [
            {
                input: "L",
                outputs: [
                    { output: "LF+RFR+FL-F-LFLFL-FRFR+", probability: 1 }
                ]
            },
            {
                input: "R",
                outputs: [
                    { output: "-LFLF+RFRFR+F+RF-LFL-FR", probability: 1 }
                ]
            }
        ],
        angle: 90    
    },
    {
        axiom: "-L",
        rules: [
            {
                input: "L",
                outputs: [
                    { output: "LFLF+RFR+FLFL-FRF-LFL-FR+F+RF-LFL-FRFRFR+", probability: 1 }
                ]
            },
            {
                input: "R",
                outputs: [
                    { output: "-LFLFLF+RFR+FL-F-LF+RFR+FLF+RFRF-LFL-FRFR", probability: 1 }
                ]
            }
        ],
        angle: 90    
    },
    {
        axiom: "L",
        rules: [
            {
                input: "L",
                outputs: [
                    { output: "LFRFL-F-RFLFR+F+LFRFL", probability: 1 }
                ]
            },
            {
                input: "R",
                outputs: [
                    { output: "RFLFR+F+LFRFL-F-RFLFR", probability: 1 }
                ]
            }
        ],
        angle: 90    
    },        
    {
        axiom: "L",
        rules: [
            {
                input: "L",
                outputs: [
                    { output: "L+F+R-F-L+F+R-F-L-F-R+F+L-F-R-F-L+F+R-F-L-F-R-F-L+F+R+F+L+F+R-F-L+F+R+F+L-R-F+F+L+F+R-F-L+F+R-F-L", probability: 1 }
                ]
            },
            {
                input: "R",
                outputs: [
                    { output: "R-F-L+F+R-F-L+F+R+F+L-F-R+F+L+F+R-F-L+F+R+F+L+F+R-F-L-F-R-F-L+F+R-F-L-F-R+F+L-F-R-F-L+F+R-F-L+F+R", probability: 1 }
                ]
            }
        ],
        angle: 45    
    },
    {
        "axiom": "F",
        "rules": [
            {
                "input": "F",
                "outputs": [
                    { "output": "F[+F]F[-F]F", "probability": 0.34 },
                    { "output": "F[+F]F", "probability": 0.33 },
                    { "output": "F[-F]F", "probability": 0.33 }
                ]
            }
        ],
        "angle": 25
    }        
];

//卷軸問題
window.scrollTo(0,0);
window.addEventListener("scroll", (e) => {
    e.preventDefault();
    window.scrollTo(0, 0);
});

// Sliders and input elements
const xOriginSlider = document.getElementById("xOrigin");
const yOriginSlider = document.getElementById("yOrigin");
const axiomInput = document.getElementById("axiomInput");
const ruleInput = document.getElementById("ruleInput");
const angleInput = document.getElementById("angleInput"); // Angle input
const scaleSlider = document.getElementById("scale"); // Scale slider
const resetBtn = document.getElementById("resetBtn");
const generateBtn = document.getElementById("generateBtn");
//const redrawBtn = document.getElementById("redrawBtn"); // New redraw button

// 動態生成選項
function populateSelect() {
    lSystems.forEach((system, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${index + 1}`;
        lSystemSelect.appendChild(option);
    });
}

// 初始化顯示
function updateDisplay(index) {
    const selectedSystem = lSystems[index];

    // 更新 axiom 和 angle
    axiomInput.value = selectedSystem.axiom;
    angleInput.value = selectedSystem.angle;

    // 格式化並顯示規則
    let rulesText = "";
    selectedSystem.rules.forEach(rule => {
        rule.outputs.forEach(outputRule => {
            // 如果概率是 1，就不顯示概率
            if (outputRule.probability === 1) {
                rulesText += `${rule.input} -> ${outputRule.output} \n`;
            } else {
                rulesText += `${rule.input} ${outputRule.probability}-> ${outputRule.output} \n`;
            }
        });
    });

    ruleInput.value = rulesText.trim(); // 移除最後多餘的換行
}


function updateDisplay2(index) {
    const selectedSystem = lSystems[index];

    // 更新 axiom 和 angle
    axiomInput.value = selectedSystem.axiom;
    angleInput.value = selectedSystem.angle;

    // 格式化並顯示規則
    let rulesText = "";
    selectedSystem.rules.forEach(rule => {
        rulesText += `${rule.input} -> ${rule.output}\n`;
    });
    ruleInput.value = rulesText.trim();
}


// 當下拉選單變更時更新顯示
lSystemSelect.addEventListener("change", function() {
    updateDisplay(this.value);
    //setup();
    reset();        
});

// 預設顯示第一個 L-System
populateSelect();
updateDisplay(0);




// L-System Variables
let axiom = axiomInput.value;; // Initial axiom
let sentence = axiom;
let rules = [];
let len = 50;

// Canvas and context
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;



// drag
let isDragging = false; // To check if we are dragging
let startX, startY; // To store where the drag starts

// Zoom scaling parameters
const zoomFactor = 0.1; // Amount of zoom per scroll step
const minScale = 0.1; // Minimum zoom scale
const maxScale = 10;   // Maximum zoom scale
let scale = 1;

// Default origin
let xOrigin = canvas.width / 2;
let yOrigin = canvas.height / 2;

// Event listener for mouse down - start drag
canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.offsetX - xOrigin; // Calculate the initial offset
    startY = e.offsetY - yOrigin;
});


// Event listener for mouse move - dragging
canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
        xOrigin = e.offsetX - startX; // Adjust the x and y origin
        yOrigin = e.offsetY - startY;
        xOriginSlider.value = xOrigin;
        yOriginSlider.value = yOrigin;
        draw(); // Redraw the L-system as you drag
    }
});

// Event listener for mouse up - stop drag
canvas.addEventListener("mouseup", () => {
    isDragging = false; // Stop dragging
});

// Event listener for mouse leave - stop drag
canvas.addEventListener("mouseleave", () => {
    isDragging = false; // Stop dragging if the mouse leaves the canvas
});


// Event listener for mouse wheel - zoom in/out
canvas.addEventListener("wheel", (e) => {
    e.preventDefault(); // Prevent default scrolling behavior

    const mouseX = e.offsetX; // Get mouse X position
    const mouseY = e.offsetY; // Get mouse Y position

    // Determine the direction of the scroll (positive means zoom out, negative means zoom in)
    if (e.deltaY < 0) {
        // Zoom in
        scale = Math.min(scale + zoomFactor, maxScale);
    } else {
        // Zoom out
        scale = Math.max(scale - zoomFactor, minScale);
    }

    // Adjust the origin to zoom relative to the mouse position
    xOrigin = mouseX - (mouseX - xOrigin) * (scale / (scale - zoomFactor));
    yOrigin = mouseY - (mouseY - yOrigin) * (scale / (scale - zoomFactor));
    scaleSlider.value =scale;

    draw(); // Redraw the canvas with the new scale and origin
}, { passive: true });

// Function to parse rules from the textarea input
function parseRules() {
    // Get the input from the ruleInput textarea
    const ruleInput = document.getElementById("ruleInput").value.trim();
    const ruleLines = ruleInput.split("\n");

    // Clear the existing rules
    rules = [];

    // Process each line
    ruleLines.forEach(line => {
        const parts = line.split("->");
        if (parts.length === 2) {
            const inputWithProbability = parts[0].trim(); // The symbol with probability before '->'
            const output = parts[1].trim();               // The string after '->'

            // Split input and probability (probability is optional)
            let probability = 1;
            let input;

            const inputSplit = inputWithProbability.split(" ");
            if (inputSplit.length === 2) {
                input = inputSplit[0].trim();            // Extract the input symbol
                probability = parseFloat(inputSplit[1].trim()); // Extract probability
            } else {
                input = inputWithProbability.trim(); // No probability, just input symbol
            }

            // Check if the rule for the input already exists, append to outputs array if it does
            let existingRule = rules.find(rule => rule.input === input);
            if (existingRule) {
                existingRule.outputs.push({ output: output, probability: probability });
            } else {
                rules.push({
                    input: input,
                    outputs: [{ output: output, probability: probability }]
                });
            }
        }
    });
    
    //console.log("Parsed Rules:", rules);
}


function parseRules2() {
    // Get the input from the ruleInput textarea
    const ruleInput = document.getElementById("ruleInput").value.trim();
    const ruleLines = ruleInput.split("\n");

    // Clear the existing rules
    rules = [];

    // Process each line
    ruleLines.forEach(line => {
        const parts = line.split("->");
        if (parts.length === 2) {
            const input = parts[0].trim();  // The symbol before '->'
            const output = parts[1].trim(); // The string after '->'
            rules.push({
                input: input,
                output: output
            });
        }
    });
    
    //console.log("Parsed Rules:", rules);
}

function getSymbols(sentence) {
    return sentence.match(/Fl|Fr|F|G|L|R|f|\+|\-|X|\[|\]/g) || []; // 確保返回空數組以防匹配失敗
}

function generate() {
    parseRules(); // Parse rules before generating the L-system

    // Get all symbols in the current sentence
    const symbols = getSymbols(sentence);

    let nextSentence = "";

    // Iterate through each symbol in the sentence
    for (let i = 0; i < symbols.length; i++) {
        let current = symbols[i];

        // Find a matching rule for the current symbol
        let found = false;
        for (let j = 0; j < rules.length; j++) {
            if (current === rules[j].input) {
                const outputs = rules[j].outputs;

                if (outputs.length > 1) {
                    // If there are multiple outputs, randomly select one based on probabilities
                    let chosenOutput = chooseByProbability(outputs);
                    nextSentence += chosenOutput;
                } else {
                    // If only one output, use it directly
                    nextSentence += outputs[0].output;
                }

                found = true;
                break;
            }
        }

        if (!found) {
            nextSentence += current; // If no rule is found, retain the current symbol
        }
    }

    sentence = nextSentence;

    // Shorten the length but keep it dynamic
    len *= 0.6;

    draw();
}

// Helper function to randomly choose an output based on probabilities
function chooseByProbability(outputs) {
    let sum = 0;
    let rand = Math.random();

    // Sum all probabilities
    outputs.forEach(output => {
        sum += output.probability;
    });

    // Normalize if the sum is not exactly 1
    let cumulative = 0;
    for (let i = 0; i < outputs.length; i++) {
        cumulative += outputs[i].probability / sum;
        if (rand < cumulative) {
            return outputs[i].output;
        }
    }

    // Fallback in case of rounding errors
    return outputs[outputs.length - 1].output;
}


function generate2() {
    parseRules(); // Parse rules before generating the L-system

    // 使用正則表達式匹配所有符號
    const symbols = getSymbols(sentence);

    let nextSentence = "";

    for (let i = 0; i < symbols.length; i++) {
        let current = symbols[i];
        
        // 查找匹配的規則
        let found = false;
        for (let j = 0; j < rules.length; j++) {
            if (current === rules[j].input) {
                nextSentence += rules[j].output;
                found = true;
                break;
            }
        }
        if (!found) {
            nextSentence += current; // 如果沒有匹配的規則，保留當前字符
        }
    }

    sentence = nextSentence;
    
    // 縮短長度但保持動態
    len *= 0.6; 
    draw();
}


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Get the updated origin from sliders
    xOrigin = xOriginSlider.value;
    yOrigin = yOriginSlider.value;

    // Convert the angle from degrees to radians
    angle = (parseFloat(angleInput.value) * Math.PI) / 180;

    ctx.translate(xOrigin, yOrigin);
    ctx.strokeStyle = "grey";
    ctx.lineWidth = 1;

    // Apply the current scale
    ctx.scale(scale, scale); // Apply scaling

    // Split the sentence into an array of symbols (e.g., Fl, Fr, F, G, +, -)
    const symbols = getSymbols(sentence);
    for (let i = 0; i < symbols.length; i++) {
        let current = symbols[i];

        switch (current) {
            case "F":
            case "Fl": // Move forward and draw a line
            case "Fr": // Move forward and draw a line
            case "L": // Move forward and draw a line
            case "R": // Move forward and draw a line                        
            case "G": // Move forward and draw a line (G acts the same as F in this context)
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -len);
                ctx.stroke();
                ctx.translate(0, -len);
                break;

            case "X":
                // Draw a circle at the current position for 'X'
                ctx.beginPath();
                ctx.arc(0, 0, len / 4, 0, 2 * Math.PI); // Draw a circle with radius len / 2
                ctx.stroke();
                break;                

            case "f": // Move forward without drawing
                ctx.translate(0, -len); // Just move without drawing
                break;

            case "+": // Turn left (rotate clockwise)
                ctx.rotate(angle);
                break;

            case "-": // Turn right (rotate counterclockwise)
                ctx.rotate(-angle);
                break;

            case "|": // Turn around (180 degrees)
                ctx.rotate(Math.PI); // Rotate by 180 degrees
                break;

            case "[": // Save the current state (start a branch)
                ctx.save(); // Save the current state (position, angle)
                break;

            case "]": // Restore the saved state (complete a branch)
                ctx.restore(); // Restore the previously saved state
                break;

            default:
                // For other symbols (e.g. ∧, &, \, /, $, ., {), which we are ignoring
                break;
        }
    }

    ctx.restore();
}



// Reset the L-System with new axiom and rule
function reset() {
    // Get the values from input fields
    axiom = axiomInput.value;
    sentence = axiom;    
    //rules[0].output = ruleInput.value;
    rules = ruleInput.value;

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


//redrawBtn.addEventListener("click", redraw); // Call redraw when button is clicked
resetBtn.addEventListener("click", reset);
generateBtn.addEventListener("click", generate);

// Update the drawing when sliders or angle change
xOriginSlider.addEventListener("input", draw);
yOriginSlider.addEventListener("input", draw);
angleInput.addEventListener("input", draw);
scaleSlider.addEventListener("input", redraw); // Redraw on scale change

setup();
