(async()=>{let e=require("./../config.js"),t=e.googleUrl,a=e.dorkQuery,o=e.typingDelay,n=e.sources,i=e.scrapeDepth,r=e.httpPort,l=`
    const topDiv = document.getElementById('top-div');
    const consDiv = document.getElementById('cons-div');
    const ws = new WebSocket('ws://localhost:8080');
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
    `,s=`
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
        <h1>ZoomScraper v1.0.0</h1>
        <p>Passwords may be wrong or may not match up with link. Use common sense or check source page.</p>
        <div class='cont' id='top-div'>
        Waiting for data...
        </div>
        <div class='cont' id='cons-div'>
        </div>
        <script>${l}</script>
    </body>
    </html>
    `,c=require("puppeteer-extra");require("user-agents");let d=require("node:http"),u=require("ws"),p=console.log;function g(e){return new Promise(function(t){setTimeout(t,e)})}console.log(`Waiting for connection at http://localhost:${r}`);let w=await async function(){let e=d.createServer((e,t)=>{t.writeHead(200,{"Content-Type":"text/html"}),t.end(s)}),t=new u.Server({server:e}),a=new Promise(e=>{t.on("connection",t=>e(t))});return e.listen(r),console.log(`Server listening on port ${r}`),a}();function h(e){w&&w.readyState===u.OPEN&&w.send(e)}console.log=function(...e){h(JSON.stringify([1,e.join()])),p(...e)},console.log("Starting web scraping process, prepare to do a captcha."),c.use(require("puppeteer-extra-plugin-stealth")());let m=await c.launch({headless:!1}),f=await m.newPage();await f.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"),await f.setJavaScriptEnabled(!0),await f.setDefaultNavigationTimeout(0),await f.evaluateOnNewDocument(()=>{Object.defineProperty(navigator,"webdriver",{get:()=>!1})}),await f.evaluateOnNewDocument(()=>{window.chrome={runtime:{}}}),await f.evaluateOnNewDocument(()=>{let e=window.navigator.permissions.query;return window.navigator.permissions.query=t=>"notifications"===t.name?Promise.resolve({state:Notification.permission}):e(t)}),await f.evaluateOnNewDocument(()=>{Object.defineProperty(navigator,"plugins",{get:()=>[1,2,3,4,5]})}),await f.evaluateOnNewDocument(()=>{Object.defineProperty(navigator,"languages",{get:()=>["en-US","en"]})}),await f.goto(t,{waitUntil:"domcontentloaded"}),await f.waitForSelector("#APjFqb"),await f.type("#APjFqb",a,{delay:o}),await f.keyboard.press("Enter");let y={};async function v(e){if(await f.waitForNavigation({waitUntil:"domcontentloaded",timeout:8e3}),f.url().includes("google.com/sorry")&&(await f.waitForSelector(".g-recaptcha"),console.log("Waiting for you to click the captcha checkbox..."),await f.waitForNavigation({waitUntil:"domcontentloaded",timeout:0}),f.url().includes("google.com/sorry"))){console.log("Captcha failed try again."),await m.close();return}await f.waitForSelector(".yuRUbf");let t=await f.$$eval(".yuRUbf a",e=>e.map(e=>e.href).filter(e=>e.includes("http")));if(0==e)for(let a of n)t.push(a);for(let o of(console.log(`Found ${t.length} links from search results.`),t))try{console.log(o);let i=await m.newPage();console.log(`Opening link: ${o}`),await i.setRequestInterception(!0),i.on("request",e=>{"stylesheet"==e.resourceType()||"font"==e.resourceType()||"image"==e.resourceType()?e.abort():e.continue()}),await i.goto(o,{waitUntil:"domcontentloaded"});let r=await i.evaluate(()=>{let e=["password","passcode","passphrase"],t=Array.from(document.querySelectorAll("a")),a=t.filter(e=>e.href.includes("zoom.us/j")).map(e=>e.href),o=Array.from(document.querySelectorAll("*")).filter(t=>t.innerText&&e.some(e=>t.innerText.includes(e))).map(t=>{let a=t.innerText.trim(),o=e.find(e=>a.includes(e));return a.substring(a.indexOf(o)+o.length).trim().substring(0,10)});return{zoomLinks:a,pwds:o}});y[o]=r,console.log(r),await i.close()}catch(l){console.warn(`Error processing link ${o}:`,l)}}for(let $=0;$<i;$++)console.log(`Scrape depth of ${$}`),await v($),await f.click("#pnnext");function b(e){let t="<div>";for(let[a,o]of Object.entries(e)){let n=o.zoomLinks||[],i=o.pwds||[],r=Math.max(n.length,i.length);if(t+=`<a href=${a}>${a}</a>`,r>0){t+="<ul>";for(let l=0;l<r;l++){n[l]||(n[l]="Not Found"),i[l]||(i[l]="Not Found");let s=`LINK: <a href=${n[l]}>${n[l]}</a>`,c=`PWD: ${i[l]}`;t+=`<li>${s}${s&&c?", ":""}${c}</li>`}t+="</ul>"}}return t+"</div>"}h(JSON.stringify([0,b(y)])),await m.close()})().catch(e=>{console.warn(e)});