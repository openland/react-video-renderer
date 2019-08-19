import * as P from 'puppeteer';
import * as fs from 'fs';

(async () => {
    
    let frames: any[] = [];
    for (let j = 0; j < 15; j++) {
        frames.push((async () => {
            let browser = await P.launch();
            let page = await browser.newPage();
            await page.setViewport({ width: 200, height: 200 });

            for (let i = 0; i < 24; i++) {
                await page.setContent(`
        <!DOCTYPE html>
        <body>
        <div style="background-color:white">hello-${j}-${i}</div>
        </body>
        `);
                const result = await page.screenshot({
                    type: 'png',
                    omitBackground: true
                });

                fs.writeFileSync('output/image-' + String(j * 24 + i).padStart(5, '0') + '.png', result);
            }

            await browser.close();
        })());
    }

    await Promise.all(frames);
})();