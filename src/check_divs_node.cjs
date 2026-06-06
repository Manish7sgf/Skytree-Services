
const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
let errors = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Simple regex to find open and close div tags
    const tags = line.matchAll(/<(div|\/div)([^>]*?)>/g);
    
    for (const match of tags) {
        const fullTag = match[0];
        const isClose = fullTag.startsWith('</');
        const isSelfClosing = fullTag.endsWith('/>');
        
        if (isSelfClosing) continue;
        
        if (isClose) {
            if (stack.length === 0) {
                errors.push(`Extra closing </div> at line ${lineNum}`);
            } else {
                stack.pop();
            }
        } else {
            stack.push(lineNum);
        }
    }
}

stack.forEach(ln => {
    errors.push(`Unclosed <div> starting at line ${ln}`);
});

errors.forEach(err => console.log(err));
