import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputImagePath = 'C:/Users/ADMIN/.gemini/antigravity-ide/brain/827141d6-2a5a-44a3-ab36-2e7117769ce1/app_icon_fishing_pos_1788922318635.jpg';
const outputDir = path.resolve(__dirname, '../public/icons');
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function run() {
    console.log('Generating icons from:', inputImagePath);

    // 1. 512x512 standard
    await sharp(inputImagePath)
        .resize(512, 512, { fit: 'cover' })
        .png({ quality: 95 })
        .toFile(path.join(outputDir, 'icon-512x512.png'));
    console.log('Created icon-512x512.png');

    // 2. 192x192 standard
    await sharp(inputImagePath)
        .resize(192, 192, { fit: 'cover' })
        .png({ quality: 95 })
        .toFile(path.join(outputDir, 'icon-192x192.png'));
    console.log('Created icon-192x192.png');

    // 3. Apple Touch Icon 180x180 (for iOS home screen)
    await sharp(inputImagePath)
        .resize(180, 180, { fit: 'cover' })
        .png({ quality: 95 })
        .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    fs.copyFileSync(
        path.join(outputDir, 'apple-touch-icon.png'),
        path.join(publicDir, 'apple-touch-icon.png')
    );
    console.log('Created apple-touch-icon.png');

    // 4. Maskable 512x512 (with safe zone padding for Android adaptive circular/squircle shapes)
    const innerSize512 = Math.round(512 * 0.82);
    const padding512 = Math.round((512 - innerSize512) / 2);
    const resizedInner512 = await sharp(inputImagePath)
        .resize(innerSize512, innerSize512, { fit: 'cover' })
        .toBuffer();

    await sharp({
        create: {
            width: 512,
            height: 512,
            channels: 4,
            background: { r: 8, g: 38, b: 24, alpha: 1 } // #082618 deep emerald
        }
    })
    .composite([{ input: resizedInner512, top: padding512, left: padding512 }])
    .png()
    .toFile(path.join(outputDir, 'icon-maskable-512x512.png'));
    console.log('Created icon-maskable-512x512.png');

    // 5. Maskable 192x192
    const innerSize192 = Math.round(192 * 0.82);
    const padding192 = Math.round((192 - innerSize192) / 2);
    const resizedInner192 = await sharp(inputImagePath)
        .resize(innerSize192, innerSize192, { fit: 'cover' })
        .toBuffer();

    await sharp({
        create: {
            width: 192,
            height: 192,
            channels: 4,
            background: { r: 8, g: 38, b: 24, alpha: 1 }
        }
    })
    .composite([{ input: resizedInner192, top: padding192, left: padding192 }])
    .png()
    .toFile(path.join(outputDir, 'icon-maskable-192x192.png'));
    console.log('Created icon-maskable-192x192.png');

    // 6. Favicon 32x32 & 16x16
    await sharp(inputImagePath)
        .resize(32, 32, { fit: 'cover' })
        .png()
        .toFile(path.join(publicDir, 'favicon-32x32.png'));

    await sharp(inputImagePath)
        .resize(16, 16, { fit: 'cover' })
        .png()
        .toFile(path.join(publicDir, 'favicon-16x16.png'));

    fs.copyFileSync(
        path.join(publicDir, 'favicon-32x32.png'),
        path.join(publicDir, 'favicon.ico')
    );
    console.log('Created favicons');

    console.log('All icons generated successfully!');
}

run().catch(console.error);
