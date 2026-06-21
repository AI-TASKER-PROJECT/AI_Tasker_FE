const fs = require('fs');
const path = require('path');

const WRAPPER_CLASSES = "overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8";

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    let parts = content.split('<PageHeader');
    if (parts.length <= 1) return; // No PageHeader
    
    console.log(`Processing ${filePath}`);
    
    for (let i = 1; i < parts.length; i++) {
        let part = parts[i];
        
        // Find the actual closing /> of PageHeader by tracking brackets and strings
        let endIdx = -1;
        let bracketDepth = 0;
        let inString = false;
        let stringChar = '';
        
        for (let j = 0; j < part.length; j++) {
            let c = part[j];
            if (inString) {
                if (c === stringChar && part[j-1] !== '\\') {
                    inString = false;
                }
            } else {
                if (c === '"' || c === "'" || c === '`') {
                    inString = true;
                    stringChar = c;
                } else if (c === '{') {
                    bracketDepth++;
                } else if (c === '}') {
                    bracketDepth--;
                } else if (c === '/' && part[j+1] === '>' && bracketDepth === 0) {
                    endIdx = j;
                    break;
                }
            }
        }
        
        if (endIdx === -1) {
            console.error(`Could not find closing tag for PageHeader in ${filePath}`);
            continue;
        }
        
        let headerContent = part.substring(0, endIdx + 2); // includes />
        let beforePart = parts[i - 1];
        
        let isWrapped = beforePart.includes('bg-[radial-gradient');
        
        if (isWrapped) {
            let wrapperStartIdx = beforePart.lastIndexOf('<div className="overflow-hidden rounded-[2rem]');
            if (wrapperStartIdx !== -1) {
                parts[i - 1] = beforePart.substring(0, wrapperStartIdx) + `      <div className="${WRAPPER_CLASSES}">\n        `;
                
                let restOfPart = part.substring(endIdx + 2);
                let nextDivIdx = restOfPart.indexOf('<div');
                let firstClosingDivIdx = restOfPart.indexOf('</div>');
                
                if (nextDivIdx !== -1 && nextDivIdx < firstClosingDivIdx) {
                    let divCount = 0;
                    let endOfMetricsIdx = -1;
                    for (let j = nextDivIdx; j < restOfPart.length; j++) {
                        if (restOfPart.substr(j, 4) === '<div') divCount++;
                        if (restOfPart.substr(j, 5) === '</div') {
                            divCount--;
                            if (divCount === 0) {
                                endOfMetricsIdx = j + 6; 
                                break;
                            }
                        }
                    }
                    
                    if (endOfMetricsIdx !== -1) {
                        let afterMetrics = restOfPart.substring(endOfMetricsIdx);
                        let firstClose = afterMetrics.indexOf('</div>');
                        let secondClose = afterMetrics.indexOf('</div>', firstClose + 6);
                        
                        if (firstClose !== -1 && secondClose !== -1) {
                             parts[i] = headerContent + '\n      </div>' + afterMetrics.substring(secondClose + 6);
                        } else {
                             parts[i] = headerContent + '\n      </div>\n' + afterMetrics;
                        }
                    }
                } else {
                    let firstClose = restOfPart.indexOf('</div>');
                    let secondClose = restOfPart.indexOf('</div>', firstClose + 6);
                    if (firstClose !== -1 && secondClose !== -1) {
                         parts[i] = headerContent + '\n      </div>' + restOfPart.substring(secondClose + 6);
                    }
                }
            }
        } else {
            let lines = beforePart.split('\n');
            let lastLine = lines[lines.length - 1];
            let indent = lastLine.match(/^\s*/)[0];
            
            parts[i - 1] = beforePart.substring(0, beforePart.length - indent.length) + 
                           `${indent}<div className="${WRAPPER_CLASSES}">\n${indent}  `;
                           
            parts[i] = headerContent + `\n${indent}</div>` + part.substring(endIdx + 2);
        }
    }
    
    let finalContent = parts.join('<PageHeader');
    if (finalContent !== content) {
        fs.writeFileSync(filePath, finalContent, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walk(dir) {
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        let stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('src/pages');
files.forEach(processFile);
