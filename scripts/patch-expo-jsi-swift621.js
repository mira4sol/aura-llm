const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Compatibility patch for Xcode 26.1.x (Swift < 6.2.2):
 * expo-modules-jsi@56 uses SE-0481 `weak let` syntax which requires Swift 6.2.2+ (Xcode 26.2+).
 * On Xcode 26.2+ (or non-macOS hosts), this script is a no-op and leaves node_modules untouched.
 */
if (process.platform !== 'darwin') {
  process.exit(0);
}

try {
  const out = execSync('swift --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const match = out.match(/Apple Swift version (\d+)\.(\d+)(?:\.(\d+))?/);
  if (match) {
    const major = Number(match[1]);
    const minor = Number(match[2]);
    const patch = Number(match[3] ?? 0);
    // Swift 6.2.2+ natively supports `weak let` (SE-0481) — skip patching
    if (major > 6 || (major === 6 && (minor > 2 || (minor === 2 && patch >= 2)))) {
      process.exit(0);
    }
  }
} catch {
  // If swift isn't installed on this machine, skip
  process.exit(0);
}

const root = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI'
);

if (!fs.existsSync(root)) {
  process.exit(0);
}

let patchedFiles = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith('.swift')) {
      const orig = fs.readFileSync(full, 'utf8');
      const next = orig.replace(/\bweak let runtime:/g, 'nonisolated(unsafe) weak var runtime:');
      if (next !== orig) {
        fs.writeFileSync(full, next, 'utf8');
        patchedFiles += 1;
      }
    }
  }
}

walk(root);
if (patchedFiles > 0) {
  console.log(
    `[aura-os] Patched ${patchedFiles} expo-modules-jsi Swift file(s) for Swift < 6.2.2 compatibility.`
  );
}
