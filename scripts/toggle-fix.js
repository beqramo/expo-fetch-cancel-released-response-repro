// Applies (or reverts with --revert) the one-line fix proposed upstream to the installed
// node_modules/expo/build/winter/fetch/FetchResponse.js, so the same test can run both ways.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules/expo/build/winter/fetch/FetchResponse.js');
const original = 'this.cancelStreaming(String(reason));';
const fixed = 'Promise.resolve(this.cancelStreaming(String(reason))).catch(() => { });';

const source = fs.readFileSync(file, 'utf8');
const revert = process.argv.includes('--revert');
const [from, to] = revert ? [fixed, original] : [original, fixed];
if (!source.includes(from)) {
  console.log(revert ? 'Fix is not applied.' : 'Fix is already applied (or the file changed).');
  process.exit(0);
}
fs.writeFileSync(file, source.replace(from, to));
console.log(revert ? 'Reverted the fix.' : 'Applied the fix.');
