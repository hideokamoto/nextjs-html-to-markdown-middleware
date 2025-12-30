#!/usr/bin/env node

/**
 * CJS用のファイルをリネームするスクリプト
 * TypeScriptコンパイラが生成した.jsファイルを.cjsにリネーム
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist');
  process.exit(1);
}

const files = fs.readdirSync(distDir);

for (const file of files) {
  // .jsファイルを.cjsにリネーム（.d.tsは除外）
  if (file.endsWith('.js') && !file.endsWith('.cjs')) {
    const oldPath = path.join(distDir, file);
    const newPath = path.join(distDir, file.replace(/\.js$/, '.cjs'));

    try {
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed: ${file} -> ${path.basename(newPath)}`);
    } catch (error) {
      console.error(`Error renaming ${file}:`, error);
      process.exit(1);
    }
  }
}

console.log('CJS files renamed successfully');

