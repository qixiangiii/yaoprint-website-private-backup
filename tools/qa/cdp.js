// 极简 CDP 客户端（Node 24 内置 WebSocket）
const http = require('http');
function httpGet(url){return new Promise((res,rej)=>{http.get(url,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d))}).on('error',rej)})}
class CDP {
  constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.handlers={};}
  static async attach(port){
    const list = JSON.parse(await httpGet(`http://127.0.0.1:${port}/json/list`));
    const target = list.find(t=>t.type==='page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej});
    const c = new CDP(ws);
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if(m.id && c.pending.has(m.id)){const {res,rej}=c.pending.get(m.id);c.pending.delete(m.id);m.error?rej(new Error(m.error.message)):res(m.result);}
      else if(m.method){ (c.handlers[m.method]||[]).forEach(f=>f(m.params)); }
    };
    return c;
  }
  send(method,params={}){const id=++this.id;return new Promise((res,rej)=>{this.pending.set(id,{res,rej});this.ws.send(JSON.stringify({id,method,params}))})}
  on(m,f){(this.handlers[m]=this.handlers[m]||[]).push(f)}
}
module.exports = {CDP};
