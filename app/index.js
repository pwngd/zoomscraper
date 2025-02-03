// Dev branch, human readable
(async () => {
    const cfg = require('./../config.js');
    const VERSION = "v1.0.0";
    const googleUrl = cfg.googleUrl;
    const dorkQuery = cfg.dorkQuery;
    const typingDelay = cfg.typingDelay;
    const sources = cfg.sources;
    const scrapeDepth = cfg.scrapeDepth;
    const httpPort = cfg.httpPort;

    const interfaceJs = `
    const topDiv = document.getElementById('top-div');
    const consDiv = document.getElementById('cons-div');
    const ws = new WebSocket('ws://localhost:${8080}');
    ws.onmessage = event => {
        const data = JSON.parse(event.data);
        switch (data[0]) {
            case 0:
                topDiv.innerHTML = data[1];
                break;
            case 1:
                const line = document.createElement('p');
                line.textContent = data[1];
                consDiv.appendChild(line);
                consDiv.scrollTop = consDiv.scrollHeight;
                break;
        }
    };
    `
    const interfaceHtml = `
    <html>
    <head>
        <style>
            .cont {
            height: 43%;
            background-color: grey;
            border: 3px solid black;
            overflow: scroll;
            }
            #cons-div {
            height: 30%;
            }
        </style>
    </head>
    <body>
        <h1>ZoomScraper ${VERSION}</h1>
        <p>Passwords may be wrong or may not match up with link. Use common sense or check source page.</p>
        <div class='cont' id='top-div'>
        Waiting for data...
        </div>
        <div class='cont' id='cons-div'>
        </div>
        <script>${interfaceJs}</script>
    </body>
    </html>
    `

    const puppeteer = require('puppeteer-extra');
    const userAgent = require('user-agents');
    const http = require('node:http');
    const WebSocket = require('ws');
    const oldLog = console.log;

    function delay(time) {return new Promise(function(resolve){setTimeout(resolve, time)});}

    console.log(`Waiting for connection at http://localhost:${httpPort}`);

    const currentWs = await (async function () {
        const server = http.createServer((req,res)=>{
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(interfaceHtml);
        });
        const wss = new WebSocket.Server({server});
        
        const connectionPromise = new Promise(resolve => {
            wss.on('connection', (ws) => resolve(ws));
        });
        
        server.listen(httpPort);
        console.log(`Server listening on port ${httpPort}`);
        
        return connectionPromise;
    })();

    function sendToClient(msg) {
        if (currentWs && currentWs.readyState === WebSocket.OPEN) {
            currentWs.send(msg);
        }
    }

    console.log = function(...args) {
        sendToClient(JSON.stringify([1,args.join()]));
        oldLog(...args);
    }

    console.log('Starting web scraping process, prepare to do a captcha.');

    puppeteer.use(require('puppeteer-extra-plugin-stealth')());
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36');
    await page.setJavaScriptEnabled(true);
    await page.setDefaultNavigationTimeout(0);

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });

    await page.evaluateOnNewDocument(() => {
        window.chrome = {
            runtime: {},
        };
    });

    await page.evaluateOnNewDocument(() => {
        const originalQuery = window.navigator.permissions.query;
        return window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    });

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
    });

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
    });

    await page.goto(googleUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#APjFqb');
    await page.type('#APjFqb', dorkQuery, { delay: typingDelay });
    await page.keyboard.press('Enter');

    const pages = {};

    async function scrape(depth) {
        await page.waitForNavigation({
            waitUntil: 'domcontentloaded',
            timeout: 8000
        });
    
        if (page.url().includes('google.com/sorry')) {
            await page.waitForSelector('.g-recaptcha');
            console.log("Waiting for you to click the captcha checkbox...");
            await page.waitForNavigation({waitUntil: 'domcontentloaded',timeout: 0});

            if (page.url().includes('google.com/sorry')) {
                console.log("Captcha failed try again.");
                await browser.close();
                return;
            }
        }
    
        await page.waitForSelector('.yuRUbf');
        const links = await page.$$eval('.yuRUbf a', (anchors) => 
            anchors
                .map(anchor => anchor.href)
                .filter(href => href.includes('http'))
        );
    
        if (depth==0) {
            for (const source of sources) {
                links.push(source);
            }
        }
    
        console.log(`Found ${links.length} links from search results.`);
    
        for (const link of links) { 
            try {
                console.log(link);
                const newPage = await browser.newPage();
                console.log(`Opening link: ${link}`);
    
                await newPage.setRequestInterception(true);
        
                newPage.on('request', (req) => {
                    if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
                        req.abort();
                    } else {
                        req.continue();
                    }
                });
    
                await newPage.goto(link, { waitUntil: 'domcontentloaded' });
    
                const results = await newPage.evaluate(() => {
                    const keywords = ['password', 'passcode', 'passphrase'];
    
                    const links = Array.from(document.querySelectorAll('a'));
    
                    const zoomLinks = links
                        .filter(link => link.href.includes("zoom.us/j"))
                        .map(link => link.href);
    
                    const pwds = Array.from(document.querySelectorAll('*'))
                        .filter(el =>
                            el.innerText &&
                            keywords.some(keyword => el.innerText.includes(keyword))
                        )
                        .map(el => {
                            const text = el.innerText.trim();
                            const keyword = keywords.find(k => text.includes(k));
                            return (text.substring(text.indexOf(keyword) + keyword.length).trim()).substring(0,10);
                        });
    
                    return {zoomLinks,pwds};
                });
    
                pages[link] = results;

                console.log(results);
    
                await newPage.close();
            } catch (err) {
                console.warn(`Error processing link ${link}:`, err);
            }
        }
    }

    for (let i=0; i<scrapeDepth; i++) {
        console.log(`Scrape depth of ${i}`);
        await scrape(i);
        await page.click('#pnnext');
    }

    function genHtml(data) {
        let html = '<div>';
        
        for (const [pageName, pageData] of Object.entries(data)) {
            const zoomLinks = pageData.zoomLinks || [];
            const pwds = pageData.pwds || [];
            const maxLength = Math.max(zoomLinks.length, pwds.length);
            
            html += `<a href=${pageName}>${pageName}</a>`;
            
            if (maxLength > 0) {
                html += '<ul>';
                for (let i = 0; i < maxLength; i++) {
                    if (!zoomLinks[i]) zoomLinks[i] = 'Not Found';
                    if (!pwds[i]) pwds[i] = 'Not Found';
                    const zoom = `LINK: <a href=${zoomLinks[i]}>${zoomLinks[i]}</a>`;
                    const pwd = `PWD: ${pwds[i]}`;
                    html += `<li>${zoom}${zoom && pwd ? ', ' : ''}${pwd}</li>`;
                }
                html += '</ul>';
            }
        }
        
        html += '</div>';
        return html;
    }

    sendToClient(JSON.stringify([0,genHtml(pages)]));
    
    await browser.close();
})().catch(err=>{
    console.warn(err);
});