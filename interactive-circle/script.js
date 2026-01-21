const outerInput = document.getElementById('outerSize');
const innerInput = document.getElementById('innerSize');
const widthInput = document.getElementById('lineWidth');
const fontInput = document.getElementById('fontSize');
const canvas = document.getElementById('protractorCanvas');
const ctx = canvas.getContext('2d');
const printBtn = document.getElementById('printBtn');

// Config
const PIXEL_SCALE = 4; // Internal resolution multiplier for crisp print (approx 384 DPI)
const MM_TO_PX = 3.7795; // 96 DPI standard

function init() {
    addListeners();
    draw();
    window.addEventListener('resize', draw); // Just in case, though usually fixed
}

function addListeners() {
    [outerInput, innerInput, widthInput, fontInput].forEach(input => {
        input.addEventListener('input', draw);
    });

    printBtn.addEventListener('click', () => {
        window.print();
    });
}

function draw() {
    const outerDiameterMM = parseFloat(outerInput.value) || 100;
    const innerDiameterMM = parseFloat(innerInput.value) || 10;
    const lineWidthScale = parseFloat(widthInput.value) || 1;
    const fontScale = parseFloat(fontInput.value) || 1;

    // Safety checks
    if (outerDiameterMM < 1) return;

    // Set Canvas Physical Size (CSS)
    canvas.style.width = `${outerDiameterMM}mm`;
    canvas.style.height = `${outerDiameterMM}mm`;

    // Set Canvas Internal Resolution
    const sizePx = outerDiameterMM * MM_TO_PX * PIXEL_SCALE;
    canvas.width = sizePx;
    canvas.height = sizePx;

    // Scaling context
    ctx.scale(PIXEL_SCALE, PIXEL_SCALE);

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Center point (in 96 DPI pixels)
    const cx = (outerDiameterMM * MM_TO_PX) / 2;
    const cy = cx;
    const radius = cx; // Outer edge
    const innerRadius = (innerDiameterMM * MM_TO_PX) / 2;
    
    // Determine colors based on print state (simple check: usually we just repaint for print, 
    // but here we use matchMedia to detect if we should render black)
    // Actually, handling print via CSS filters is easier, but for Canvas strictly, 
    // we want pure black for print reliability. 
    // Let's check a CSS variable or just default to screen colors and expect CSS filter?
    // No, inverted colors on canvas via CSS filter might invert the white background too if not careful.
    // Better strategy: Always draw in "Ink Color". 
    // Screen: Ink color is Cyan (via CSS var). Print: Ink color is Black.
    // We can interpret the CSS variable in JS?
    
    // Let's accept that for screen we want it cool (Cyan), for print Black.
    // A robust way is to listen to beforeprint.
    const isPrint = window.matchMedia('print').matches; 
    // Note: matchMedia('print') often doesn't trigger inside JS logic synchronously during draw.
    // Simple hack: Draw in a high-contrast color (e.g. Black or White). 
    // If we draw in Black, and use CSS `filter: invert(1)` for screen, we get White lines on Dark bg.
    // That's smart.
    
    // DECISION: Draw in BLACK (rgb(0,0,0)). 
    // CSS for Screen: canvas { filter: invert(1) drop-shadow(0 0 5px cyan); } 
    // CSS for Print: canvas { filter: none; }
    
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw Main Circles
    ctx.beginPath();
    ctx.lineWidth = 1 * lineWidthScale;
    ctx.arc(cx, cy, radius - (1), 0, Math.PI * 2); // Slightly inset to avoid clipping
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Central Crosshair (Optional, helpful for alignment)
    ctx.beginPath();
    ctx.lineWidth = 0.5 * lineWidthScale;
    ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy);
    ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5);
    ctx.stroke();

    // Ticks and Numbers
    // We want numbers every 5 degrees: 0, 5, 10...
    // Ticks every 1 degree?
    
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Font sizing
    const baseFontSize = (outerDiameterMM / 25) * 3.78 * fontScale; // Responsive font
    ctx.font = `bold ${baseFontSize}px 'Outfit', sans-serif`;

    for (let deg = 0; deg < 360; deg++) {
        const rad = (deg - 90) * (Math.PI / 180); // -90 to start at top
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        let tickLen = 0;
        let isMajor = false;

        if (deg % 5 === 0) {
            tickLen = radius * 0.08; // 8% of radius
            isMajor = true;
        } else {
            tickLen = radius * 0.03; // 3%
        }

        // Draw Tick (from outer rim inwards)
        const outerR = radius - 2; // slight padding
        const innerR = outerR - tickLen;

        ctx.beginPath();
        ctx.lineWidth = (isMajor ? 1.5 : 0.5) * lineWidthScale;
        ctx.moveTo(cx + outerR * cos, cy + outerR * sin);
        ctx.lineTo(cx + innerR * cos, cy + innerR * sin);
        ctx.stroke();

        // Draw Text (only every 5 deg)
        if (deg % 5 === 0) {
            // Text position: slightly further in than the tick
            const textR = innerR - (baseFontSize * 0.8);
            
            ctx.save();
            ctx.translate(cx + textR * cos, cy + textR * sin);
            // User requested "From center to circumference" (radial).
            // This prevents crowding.
            // rad is the angle of the radius.
            // rotate(rad) aligns text baseline with the radius vector.
            // Text flows Left->Right. So Center->Out.
            ctx.rotate(rad);
            
            ctx.fillText(deg.toString(), 0, 0);
            ctx.restore();
        }
    }
}

// Handle Print Events to force redraw if needed (not strictly needed with the CSS filter trick, but good practice)
window.addEventListener('beforeprint', draw);

init();
