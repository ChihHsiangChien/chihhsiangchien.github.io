
const fs = require('fs');
const path = require('path');

const rawFile = path.join(__dirname, 'raw_idioms.txt');
const content = fs.readFileSync(rawFile, 'utf-8');

// Regex to capture the content blocks.
// We just want all idioms. We can ignore the headers for the final list, 
// unless we want to tag them (but requirement says "convert to data.json", 
// and the game picks random ones, so a flat list or unique list is best).
// The user provided categorization, but many are repeated.
// I will create a unique list of idioms.

// 1. Remove [Header] lines
// 2. Split by '、' and newlines and commas.
// 3. Trim whitespace.
// 4. Filter empty.
// 5. Dedup.

let text = content.replace(/【.*?】/g, ''); // Remove headers
// Replace common separators with a standard one
text = text.replace(/\n/g, '|').replace(/、/g, '|').replace(/,/g, '|').replace(/，/g, '|').replace(/ /g, ''); 

let idioms = text.split('|').map(s => s.trim()).filter(s => s.length > 0);

// Dedup
const uniqueIdioms = [...new Set(idioms)];

// Create JSON
const data = {
  idioms: uniqueIdioms
};

fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 2), 'utf-8');
console.log(`Processed ${uniqueIdioms.length} unique idioms.`);
