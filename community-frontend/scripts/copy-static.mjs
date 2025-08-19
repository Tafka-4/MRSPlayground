import fs from 'fs';
import path from 'path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

const copyRecursive = (from, to) => {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from)) {
    const srcPath = path.join(from, entry);
    const destPath = path.join(to, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

copyRecursive(path.join(srcDir, 'views'), path.join(distDir, 'views'));
copyRecursive(path.join(srcDir, 'public'), path.join(distDir, 'public'));


