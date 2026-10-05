(function(root){
'use strict';
const storageKey='project-forge-backend-v1';
let config={provider:'auto',url:'',key:''};
function isPublicKey(key){
 if(typeof key!=='string'||key.startsWith('sk-')||key.startsWith('sb_secret_'))return false;
 if(key.startsWith('sb_publishable_')&&key.length>20)return true;
 try{const token=key.split('.');if(token.length!==3)return false;const data=JSON.parse(atob(token[1].replace(/-/g,'+').replace(/_/g,'/')));return data.role==='anon';}catch{return false;}
}
function validateConfig(raw){
 if(raw.provider==='auto')return {provider:'auto',url:'',key:''};
 if(raw.provider!=='supabase')throw Error('اختر طريقة اتصال صالحة.');
 let u;try{u=new URL(String(raw.url).trim());}catch{throw Error('أدخل Project URL من Supabase.');}
 const local=['localhost','127.0.0.1'].includes(u.hostname)&&u.protocol==='http:';
 const route=u.pathname.match(/^\/functions\/v1\/([a-zA-Z0-9_-]{1,100})\/?$/);
 if(u.username||u.password||u.search||u.hash||(u.pathname!=='/'&&!route)||!(u.protocol==='https:'&&u.hostname.endsWith('.supabase.co')||local))throw Error('أدخل Project URL أو رابط الوظيفة الكامل من Supabase.');
 // Preserve saved connections while using the deployed slug for this project.
 const defaultFunction=u.origin==='https://ofmvqfjsxvqscargxpim.supabase.co'?'super-handler':'ai-assist';
 const functionName=route?.[1]||raw.functionName||defaultFunction;
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(functionName))throw Error('رابط الوظيفة غير صالح.');
 const key=String(raw.key||'').trim();if(!isPublicKey(key))throw Error('أدخل المفتاح العام publishable أو anon key فقط. مفتاح OpenAI وservice_role يوضعان بالخلفية.');
 return {provider:'supabase',url:u.origin,key,functionName};
}
try{const stored=root.localStorage?.getItem(storageKey);if(stored)config=validateConfig(JSON.parse(stored));}catch{}
function get(){return {...config};}
function set(raw){const next=validateConfig(raw);config=next;try{root.localStorage?.setItem(storageKey,JSON.stringify(next));}catch{}return get();}
function clear(){config={provider:'auto',url:'',key:''};try{root.localStorage?.removeItem(storageKey);}catch{}return get();}
function request(path,options={}){
 const c=get();if(c.provider!=='supabase')return fetch(path,options);
 const url=c.url+'/functions/v1/'+c.functionName+(path==='/api/status'?'?action=status':'');
 return fetch(url,{...options,headers:{...options.headers,apikey:c.key}});
}
const api={get,set,clear,request,isPublicKey,validateConfig};root.ForgeBackend=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
