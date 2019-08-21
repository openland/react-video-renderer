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

(async () => {
    if (fs.existsSync('output')) {
        rimraf.sync('./output');
    }
    fs.mkdirSync('output');

    await renderVideo(<XView width={375} height={375} backgroundColor="white"><Example /></XView>, {
        width: 375,
        height: 375,
        scale: 1,
        duration: 5,
        path: './output/video.mp4',
        customRenderer: (el) => {
            let res = renderStaticOptimized(() => ReactDOM.renderToStaticMarkup(el));
            return { body: res.html, css: res.css };
        }
    });
})();