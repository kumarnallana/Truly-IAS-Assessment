const fs = require('fs');
const path = require('path');

const filesToFix = ['public/js/registration.js'];

filesToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  let code = fs.readFileSync(fullPath, 'utf8');

  // Regex to replace document.getElementById("X") -> document.querySelector('[data-testid="X"]')
  code = code.replace(/document\.getElementById\((["'])(.*?)\1\)/g, "document.querySelector('[data-testid=\"$2\"]')");

  // Fix template literals: document.getElementById(`step-dot-${i}`) -> document.querySelector(`[data-testid="step-dot-${i}"]`)
  code = code.replace(/document\.getElementById\(`(.*?)`\)/g, "document.querySelector(`[data-testid=\"$1\"]`)");

  // Since we ran the first regex already on template literals if they matched? No, the first one used ["'].

  // Clean up the dynamic ones where we mistakenly created `[data-testid="${X}"]` as a string instead of template
  code = code.replace(/document\.querySelector\('\[data-testid="containerId"\]'\)/g, "document.querySelector(`[data-testid=\"${containerId}\"]`)");
  code = code.replace(/document\.querySelector\('\[data-testid="step-dot-\$\{i\}"\]'\)/g, "document.querySelector(`[data-testid=\"step-dot-${i}\"]`)");
  code = code.replace(/document\.querySelector\('\[data-testid="step-line-\$\{i\}"\]'\)/g, "document.querySelector(`[data-testid=\"step-line-${i}\"]`)");
  code = code.replace(/document\.querySelector\('\[data-testid="rule-\$\{rule\}"\]'\)/g, "document.querySelector(`[data-testid=\"rule-${rule}\"]`)");
  code = code.replace(/document\.querySelector\('\[data-testid="error-\$\{field\}"\]'\)/g, "document.querySelector(`[data-testid=\"error-${field}\"]`)");
  code = code.replace(/document\.querySelector\('\[data-testid="reg-\$\{field\}"\]'\)/g, "document.querySelector(`[data-testid=\"reg-${field}\"]`)");

  fs.writeFileSync(fullPath, code);
  console.log(`Updated ${filePath}`);
});
