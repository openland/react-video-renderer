import * as React from 'react';
import * as ReactDOM from 'react-dom/server';
import * as P from 'puppeteer';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import * as ffmpeg from 'fluent-ffmpeg';
import { ServerStyleSheet } from 'styled-components';
import { Example } from './example';

(async () => {
    if (fs.existsSync('output')) {
        rimraf.sync('./output');
    }
    fs.mkdirSync('output');

    let frames: any[] = [];
    for (let j = 0; j < 15; j++) {
        frames.push((async () => {
            let browser = await P.launch();
            let page = await browser.newPage();
            await page.setViewport({ width: 640, height: 640, deviceScaleFactor: 2 });

            for (let i = 0; i < 24; i++) {
                let time = j + i / 24.0;
                const sheet = new ServerStyleSheet();
                const body = ReactDOM.renderToStaticMarkup(sheet.collectStyles(<Example time={time} />));
                const styleTags = sheet.getStyleTags();
                await page.setContent(`
                    <!DOCTYPE html>
                    <head>
                    <style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif}</style>
                    ${styleTags}
                    </head>
                    <body>
                    ${body}
                    </body>
                `);
                const result = await page.screenshot({
                    type: 'png'
                });

                fs.writeFileSync('output/image-' + String(j * 24 + i).padStart(5, '0') + '.png', result);
            }

            await browser.close();
        })());
    }

    await Promise.all(frames);

    await new Promise((resolve, reject) => {
        ffmpeg('output/image-%05d.png')
            .inputOption('-r 24')
            .outputOption('-pix_fmt yuv420p')
            .outputOption('-r 24')
            .output('output/video.mp4')
            .on('end', () => {
                resolve();
            })
            .on('error', () => {
                reject('')
            })
            .run();
    })

    rimraf.sync('./output/image*');
})();