import * as React from 'react';
import * as ReactDOM from 'react-dom/server';
import * as P from 'puppeteer';
import * as fs from 'fs';
import * as ffmpeg from 'fluent-ffmpeg';
import * as tmp from 'tmp';
import { VideoTimingContext } from './timing';
import { resolve } from 'path';
import sharp = require('sharp');

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
        customScreenshoter?: (src: string, dst: string, width: number, height: number, scale: number) => Promise<void>,
        customEncoder?: (count: number, width: number, height: number, dir: string, to: string) => Promise<void>
        parallelizm?: number,
        tmpDir?: string,
        batchSize?: number
    }
) {

    //
    // Resolve parameters
    //

    const scale = opts.scale || 1;
    const parallelizm = opts.parallelizm || 10;
    const fps = opts.fps || 24;
    const dir = opts.tmpDir ? resolve(opts.tmpDir) : await new Promise<string>((resolve, reject) => tmp.dir((err, path) => {
        if (err) {
            reject(err);
        } else {
            resolve(path);
        }
    }));
    const framesCount = Math.ceil(opts.duration * fps);
    const batchSize = opts.batchSize || 120;

    //
    // Render batches
    //

    let batchIndex = 0;
    let start = Date.now();
    for (let s = 0; s < framesCount; s += batchSize) {
        const count = Math.min(batchSize, framesCount - s);

        // Render Frames
        const frames: any[] = [];
        for (let f = s; f < s + count; f++) {
            frames.push(
                <div
                    key={'frame-' + f}
                    style={{ position: 'absolute', top: 0, left: (f - s) * opts.width, height: opts.height, width: opts.width, overflow: 'hidden' }}
                >
                    <VideoTimingContext.Provider value={f / fps} key={'frame-' + f}>
                        {element}
                    </VideoTimingContext.Provider>
                </div>
            );
        }
        const el = <div>{frames}</div>

        let html: string = '';
        let css: string = '';
        if (opts.customRenderer) {
            const renderResult = opts.customRenderer(el);
            html = renderResult.body;
            css = renderResult.css;
        } else {
            html = ReactDOM.renderToStaticMarkup(el);
        }

        const content = `<!DOCTYPE html>
<head>
<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif}</style>
<style>
${css}
</style>
</head>
<body>
<div style="background-color:white;">
${html}
</div>
</body>
        `;

        await new Promise<void>((resolve, reject) => fs.writeFile(dir + `/batch-${batchIndex}.html`, content, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        }));
        batchIndex++;
    }
    console.log('Batches rendered in ' + (Date.now() - start) + ' ms');

    //
    // Render Sprites
    //

    batchIndex = 0;
    start = Date.now();
    let pending: Promise<void>[] = [];
    for (let s = 0; s < framesCount; s += batchSize) {
        const count = Math.min(batchSize, framesCount - s);
        const currentBatchIndex = batchIndex;
        batchIndex++;

        pending.push((async () => {
            if (opts.customScreenshoter) {
                await opts.customScreenshoter(
                    dir + `/batch-${currentBatchIndex}.html`,
                    dir + `/batch-${currentBatchIndex}.png`,
                    opts.width * count,
                    opts.height,
                    scale
                );
            } else {
                const browser = await P.launch();
                try {
                    const page = await browser.newPage();
                    await page.setViewport({ width: opts.width * count, height: opts.height, deviceScaleFactor: scale });
                    await page.goto('file://' + dir + `/batch-${currentBatchIndex}.html`, { waitUntil: 'networkidle2' });
                    await page.screenshot({
                        type: 'png',
                        omitBackground: false,
                        path: dir + `/batch-${currentBatchIndex}.png`
                    });
                } finally {
                    await browser.close();
                }
            }
        })())
    }
    await Promise.all(pending);
    console.log('Batches exported in ' + (Date.now() - start) + ' ms');

    if (opts.customEncoder) {
        await opts.customEncoder(batchIndex, opts.width * scale, opts.height * scale, dir, opts.path)
    } else {
        batchIndex = 0;
        start = Date.now();
        pending = [];
        for (let s = 0; s < framesCount; s += batchSize) {
            const count = Math.min(batchSize, framesCount - s);
            const currentBatchIndex = batchIndex;
            const source = sharp(dir + `/batch-${currentBatchIndex}.png`);
            for (let f = s; f < s + count; f++) {
                let paddedId = `${f}`;
                while (paddedId.length < 5) {
                    paddedId = '0' + paddedId;
                }
                pending.push((async () => {
                    await source.clone().extract({
                        left: (f - s) * opts.width * scale, top: 0,
                        width: opts.width * scale,
                        height: opts.height * scale
                    }).toFile(dir + `/frame-${paddedId}.png`);
                })());
            }

            batchIndex++;
        }
        await Promise.all(pending);
        console.log('Batches split in ' + (Date.now() - start) + ' ms');

        start = Date.now();
        await new Promise((resolve, reject) => {
            ffmpeg(dir + '/frame-%05d.png')
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
        let end = Date.now()
        console.log('Video encoded in ' + (end - start) + ' ms');
    }
}