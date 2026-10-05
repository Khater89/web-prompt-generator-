import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const artifact=new URL('../dist-worker/server/index.js',import.meta.url);
const source=await readFile(artifact,'utf8');
const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
const port=Number(process.env.PORT||3000);
const env={OPENAI_API_KEY:process.env.OPENAI_API_KEY,OPENAI_MODEL:process.env.OPENAI_MODEL};
createServer(async(req,res)=>{try{
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>70000){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
 const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
 const headers=new Headers(req.headers);headers.set('CF-Connecting-IP',req.socket.remoteAddress||'local');
 const body=['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks);
 const request=new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers,body,signal:controller.signal});
 const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Server error');}
}).listen(port,'127.0.0.1',()=>console.log('Project Forge: http://127.0.0.1:'+port));
