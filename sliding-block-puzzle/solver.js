// solver.js

// Direction mapping
const DIRS = [
    { dx: 0, dy: -1, name: 'U' }, // Up
    { dx: 0, dy: 1, name: 'D' }, // Down
    { dx: -1, dy: 0, name: 'L' }, // Left
    { dx: 1, dy: 0, name: 'R' }  // Right
];

// Helper to encode state to string for Set/Map
// Format: "id:x,y|id:x,y|..." ordered by ID to ensure uniqueness for same config
function encodeState(blocks) {
    // Sort blocks by ID to ensure canonical checking
    // But our IDs are fixed (main, v1, s1, etc...)
    // A simple way is to map the board grid
    // But grid ID mapping is better.
    // Let's just create a compact string: "r1,3|y0,0|..."
    // Using grid occupancy array might be even better for symmetry, 
    // but blocks have identities (colors/sizes matter slightly less, but here specific blocks matter).
    // Let's stick to sorted block positions.
    return blocks
        .map(b => `${b.id}:${b.x},${b.y}`)
        .sort()
        .join('|');
}

// Check if a move is valid
function isValidMove(block, dx, dy, allBlocks) {
    const newX = block.x + dx;
    const newY = block.y + dy;
    
    // Bounds
    if (newX < 0 || newX + block.w > 4) return false;
    if (newY < 0 || newY + block.h > 5) return false;
    
    // Collision
    // Check against all OTHER blocks
    // intersect logic duplicates script.js but we need it self-contained or passed in.
    // Let's reimplement simple rect collision here for speed.
    for (let other of allBlocks) {
        if (other.id === block.id) continue;
        if (!(
            newX + block.w <= other.x ||
            newX >= other.x + other.w ||
            newY + block.h <= other.y ||
            newY >= other.y + other.h
        )) {
            return false; // Collision
        }
    }
    return true;
}

function solvePuzzle(initialBlocks) {
    // BFS
    // Queue item: { blocks: [], path: [] }
    // path contains the moves to get here: { id, dx, dy }
    
    // Deep copy initial
    const startBlocks = JSON.parse(JSON.stringify(initialBlocks));
    const startState = encodeState(startBlocks);
    
    const queue = [];
    queue.push({ blocks: startBlocks, path: [] });
    
    const visited = new Set();
    visited.add(startState);
    
    // Safety break
    let iterations = 0;
    const MAX_ITERATIONS = 200000; // Adjust based on performance needed
    
    while (queue.length > 0) {
        iterations++;
        if (iterations > MAX_ITERATIONS) {
            console.log("Solver timed out or hit max depth.");
            return null; // Too deep/long
        }
        
        const { blocks, path } = queue.shift();
        
        // Check Win (Main block '2x2' at 1,3)
        const main = blocks.find(b => b.id === 'main');
        if (main.x === 1 && main.y === 3) {
            return path;
        }
        
        // Generate Moves
        // For each block, try 4 directions
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            
            for (let d = 0; d < DIRS.length; d++) {
                const dir = DIRS[d];
                
                // Can we move?
                if (isValidMove(block, dir.dx, dir.dy, blocks)) {
                    // Create new state
                    // optimization: don't full clone array unless valid
                    const newBlocks = JSON.parse(JSON.stringify(blocks));
                    newBlocks[i].x += dir.dx;
                    newBlocks[i].y += dir.dy;
                    
                    const stateStr = encodeState(newBlocks);
                    
                    if (!visited.has(stateStr)) {
                        visited.add(stateStr);
                        // Add move to path
                        const newPath = [...path, { id: block.id, dx: dir.dx, dy: dir.dy }];
                        queue.push({ blocks: newBlocks, path: newPath });
                    }
                }
            }
        }
    }
    
    return null; // No solution found
}

// Ensure function is exposed
window.solvePuzzle = solvePuzzle;
