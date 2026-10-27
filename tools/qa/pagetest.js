const {CDP} = require('./cdp.js');
const http = require('http');

function req(method, path){return new Promise((res,rej)=>{const r=http.request({host:'127.0.0.1',port:(process.env.CDP_PORT||9222),path,method},resp=>{let d='';resp.on('data',c=>d+=c);resp.on('end',()=>res(d))});r.on('error',rej);r.end()})}

const PAGES = process.argv[2] ? process.argv[2].split(',') : null;

(async()=>{
  let tabs=null;
  try{ tabs = JSON.parse(await req('PUT','/json/new?about:blank')); }catch(e){ tabs=null; }
  let c;
  if(tabs && tabs.webSocketDebuggerUrl){
    const ws = new WebSocket(tabs.webSocketDebuggerUrl);
    await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
    const {CDP: C} = require('./cdp.js');
    c = new C(ws);
    // re-wire message handler
    c.ws.onmessage = e => {const m=JSON.parse(e.data); if(m.id&&c.pending.has(m.id)){const{res,rej}=c.pending.get(m.id);c.pending.delete(m.id);m.error?rej(new Error(m.error.message)):res(m.result);} else if(m.method){(c.handlers[m.method]||[]).forEach(f=>f(m.params))}};
  } else {
    c = await CDP.attach((process.env.CDP_PORT||9222));
  }
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Network.enable'); await c.send('Log.enable');
  await c.send('Network.setCacheDisabled', { cacheDisabled: true }).catch(() => {});

  let cur = {console:[],err:[],failed:[],logerr:[]};
  c.on('Runtime.consoleAPICalled', p=>{ if(p.type==='error') cur.console.push(p.args.map(a=>a.value||a.description||a.type).join(' ')) });
  c.on('Runtime.exceptionThrown', p=>{ cur.err.push((p.exceptionDetails.exception&&p.exceptionDetails.exception.description)||p.exceptionDetails.text) });
  c.on('Network.loadingFailed', p=>{ if(!p.blockedReason) cur.failed.push(p.errorText) });
  c.on('Log.entryAdded', p=>{ if(p.entry.level==='error') cur.logerr.push(p.entry.text+' '+(p.entry.url||'')) });

  const pages = PAGES || require('./pages.json');
  const out=[];
  for(const path of pages){
    cur={console:[],err:[],failed:[],logerr:[]};
    try{ await c.send('Page.navigate',{url:'http://127.0.0.1:3000'+path}); }catch(e){ out.push({path,fatal:e.message}); continue; }
    await new Promise(r=>setTimeout(r,1400));
    let probe;
    try{
      const r = await c.send('Runtime.evaluate',{returnByValue:true, awaitPromise:false, expression:`(()=>{
        const imgs=[...document.images];
        const broken=imgs.filter(i=>i.complete&&i.naturalWidth===0&&i.currentSrc&&!i.currentSrc.startsWith('data:')).map(i=>i.currentSrc.replace(location.origin,''));
        const noalt=imgs.filter(i=>!i.hasAttribute('alt')).length;
        const emptyBoxes=[...document.querySelectorAll('[class*="grid"],[class*="list"],[id*="list"],[id*="grid"]')].filter(e=>e.children.length===0&&e.textContent.trim()==='').map(e=>(e.id||e.className).toString().slice(0,50));
        const doc=document.documentElement;
        const overflow = doc.scrollWidth - doc.clientWidth;
        const t=document.title||'';
        const h1=[...document.querySelectorAll('h1')].map(h=>h.textContent.trim());
        const txt=document.body?document.body.innerText:'';
        const undefinedish=(txt.match(/undefined|NaN|\\[object Object\\]|\\$\\{/g)||[]).length;
        const links=[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h&&h!=='#'&&!/^(https?:|mailto:|tel:|javascript:)/.test(h));
        return {title:t, h1, textLen:txt.length, broken, noalt, imgCount:imgs.length, emptyBoxes, overflow, undefinedish, linkCount:links.length};
      })()`});
      probe = r.result.value;
    }catch(e){ probe={probeError:e.message}; }
    out.push({path, ...probe, console:cur.console.slice(0,3), err:cur.err.slice(0,3), failed:[...new Set(cur.failed)].slice(0,4), logerr:cur.logerr.slice(0,3)});
  }
  console.log(JSON.stringify(out,null,1));
  process.exit(0);
})();
