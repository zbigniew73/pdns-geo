const fs = require('fs');

function setEnvValues(filePath, updates) {
  const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').split('\n') : [];
  const seen = new Set();

  const newLines = lines.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (match && Object.prototype.hasOwnProperty.call(updates, match[1])) {
      seen.add(match[1]);
      return `${match[1]}=${updates[match[1]]}`;
    }
    return line;
  });

  while (newLines.length && newLines[newLines.length - 1] === '') newLines.pop();

  Object.keys(updates).forEach((key) => {
    if (!seen.has(key)) {
      newLines.push(`${key}=${updates[key]}`);
    }
  });

  fs.writeFileSync(filePath, newLines.join('\n') + '\n');
}

module.exports = { setEnvValues };
