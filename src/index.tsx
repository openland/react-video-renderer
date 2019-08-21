import { XStyleFactoryRegistry, XView } from 'react-mental';
import { css } from 'glamor';
XStyleFactoryRegistry.registerFactory({
    createStyle: styles => {
        return css(styles).toString();
    },
});
import { renderStaticOptimized } from 'glamor/server';
import * as React from 'react';
import * as ReactDOM from 'react-dom/server';
import * as P from 'puppeteer';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import * as ffmpeg from 'fluent-ffmpeg';
import { Example } from './example';

(async () => {
    if (fs.existsSync('output')) {
        rimraf.sync('./output');
    }
    fs.mkdirSync('output');

    let frames: any[] = [];
    for (let j = 0; j < 10; j++) {
        frames.push((async () => {
            let browser = await P.launch();
            let page = await browser.newPage();
            await page.setViewport({ width: 375, height: 375, deviceScaleFactor: 1 });

            for (let i = 0; i < 24; i++) {
                let time = j + i / 24.0;
                const body = renderStaticOptimized(() => ReactDOM.renderToStaticMarkup(<XView width="100vh" height="100vw" backgroundColor="white"><Example time={time} /></XView>));
                await page.setContent(`
                    <!DOCTYPE html>
                    <head>
                    <style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif}</style>
                    <style>${body.css}</style>
                    </head>
                    <body>
                    ${body.html}
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

    // rimraf.sync('./output/image*');
})();