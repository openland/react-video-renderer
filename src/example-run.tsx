import * as React from 'react';
import { XStyleFactoryRegistry, XView } from 'react-mental';
import { css } from 'glamor';
XStyleFactoryRegistry.registerFactory({
    createStyle: styles => {
        return css(styles).toString();
    },
});
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import { renderVideo } from './index';
import { renderStaticOptimized } from 'glamor/server';
import * as ReactDOM from 'react-dom/server';
import { Example } from './example';
import * as util from 'util';
import { exec as execRaw } from 'child_process';
const exec = util.promisify(execRaw);

(async () => {
    if (fs.existsSync('output')) {
        rimraf.sync('./output');
    }
    fs.mkdirSync('output');

    await renderVideo(<XView width={375} height={375} backgroundColor="white"><Example /></XView>, {
        width: 376,
        height: 376,
        scale: 2,
        duration: 30,
        tmpDir: 'output',
        path: './output/video.mp4',
        customRenderer: (el) => {
            let res = renderStaticOptimized(() => ReactDOM.renderToStaticMarkup(el));
            return { body: res.html, css: res.css };
        },
        // customScreenshoter: async (src, dst, width, height, scale) => {
        //     // Firefox way
        //     // await exec(`/Applications/Firefox.app/Contents/MacOS/firefox --headless --screenshot ${dst} file://${src}`)
            
        //     // Chrome without puppeteer
        //     await exec(`/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --disable-gpu --headless --screenshot=${dst} --window-size=${width}x${height} file://${src}`)
        // },
        // customEncoder: async (count, width, height, dir, to) => {
        //     await exec(`/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --disable-gpu --headless --screenshot=${dst} --window-size=${width}x${height} file://${src}`)
        // }
    });
})();