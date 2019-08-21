import * as React from 'react';
import * as ReactDOM from 'react-dom/server';
import * as P from 'puppeteer';
import * as fs from 'fs';
import * as ffmpeg from 'fluent-ffmpeg';
import * as tmp from 'tmp';
import * as pool from 'generic-pool';
import { VideoTimingContext } from './timing';

export async function renderVideo(
    element: React.ReactElement,
    opts: {
        path: string,
        width: number,
        height: number,
        duration: number,
        scale?: number,
        fps?: number,
        customRenderer?: (element: React.ReactElement) => { css: string, body: string },
        parallelizm?: number
    }
) {
    const scale = opts.scale || 1;
    const parallelizm = opts.parallelizm || 10;
    const fps = opts.fps || 24;
    const dir = await new Promise<string>((resolve, reject) => tmp.dir((err, path) => {
        if (err) {
            reject(err);
        } else {
            resolve(path);
        }
    }));
    const framesCount = Math.ceil(opts.duration * fps);
    const puppeterPool = pool.createPool({
        create: () => P.launch(),
        destroy: (browser) => browser.close()
    }, { max: parallelizm, min: 0 });
    try {
        let pending: Promise<void>[] = [];
        for (let f = 0; f < framesCount; f++) {
            pending.push((async () => {
                const browser = await puppeterPool.acquire();
                try {
                    const page = await browser.newPage();
                    await page.setViewport({ width: opts.width, height: opts.height, deviceScaleFactor: scale });

                    const el = (<VideoTimingContext.Provider value={f / fps}>{element}</VideoTimingContext.Provider>);

                    let html: string = '';
                    let css: string = '';
                    if (opts.customRenderer) {
                        const renderResult = opts.customRenderer(el);
                        html = renderResult.body;
                        css = renderResult.css;
                    } else {
                        html = ReactDOM.renderToStaticMarkup(el);
                    }

                    await page.setContent(`
                    <!DOCTYPE html>
                    <head>
                    <style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif}</style>
                    <style>${css}</style>
                    </head>
                    <body>
                    ${html}
                    </body>
                `, { waitUntil: 'networkidle2' });

                    try {
                        const result = await page.screenshot({
                            type: 'png'
                        });
                        fs.writeFileSync(dir + '/image-' + String(f).padStart(5, '0') + '.png', result);
                    } finally {
                        await page.close();
                    }
                } finally {
                    await puppeterPool.release(browser);
                }
            })());
        }

        await Promise.all(pending);

        await new Promise((resolve, reject) => {
            ffmpeg(dir + '/image-%05d.png')
                .inputOption('-r ' + fps)
                .outputOption('-pix_fmt yuv420p')
                .outputOption('-r ' + fps)
                .output(opts.path)
                .withSize(`${opts.width * scale}x${opts.height * scale}`)
                .on('end', () => {
                    resolve();
                })
                .on('error', (e) => {
                    reject(e)
                })
                .run();
        });
    } finally {
        await puppeterPool.clear();
    }
}