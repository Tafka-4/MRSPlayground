import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const copyDir = async (src, dest) => {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
};

const main = async () => {
    const srcDir = path.join(__dirname, '..', 'src');
    const distDir = path.join(__dirname, '..', 'dist');

    try {
        await fs.mkdir(distDir, { recursive: true });

        await copyDir(
            path.join(srcDir, 'views'),
            path.join(distDir, 'views')
        );
        console.log('✅ Views copied');

        await copyDir(
            path.join(srcDir, 'public'),
            path.join(distDir, 'public')
        );
        console.log('✅ Public files copied');

        console.log('🎉 Static files copy completed!');
    } catch (error) {
        console.error('❌ Error copying static files:', error);
        process.exit(1);
    }
};

main();
