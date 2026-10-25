(function(root){
'use strict';
const modelStorage='project-forge-model-v1';
let key='',model='gpt-5.4';
try{const saved=root.localStorage?.getItem(modelStorage);if(saved&&/^[a-zA-Z0-9._:-]{1,120}$/.test(saved))model=saved;root.localStorage?.removeItem('project-forge-backend-v1');}catch{}
const get=()=>({configured:Boolean(key),model});
function set(raw){
 const next=String(raw.key||'').trim()||key,nextModel=String(raw.model||'').trim();
 if(!/^sk-[a-zA-Z0-9_-]{10,}$/.test(next))throw Error('أدخل مفتاح OpenAI API صالحًا. لا تستخدم مفتاح Supabase.');
 if(!/^[a-zA-Z0-9._:-]{1,120}$/.test(nextModel))throw Error('أدخل اسم نموذج OpenAI الصحيح.');
 key=next;model=nextModel;try{root.localStorage?.setItem(modelStorage,model);}catch{}
 return get();
}
function clear(){key='';return get();}
async function check(){
 if(!key)throw Error('أدخل مفتاح OpenAI أولًا.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch('https://api.openai.com/v1/models/'+encodeURIComponent(model),{headers:{Authorization:'Bearer '+key},signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok){await response.arrayBuffer().catch(()=>{});throw Error(response.status===401?'مفتاح OpenAI غير صالح أو منتهي.':response.status===404||response.status===403?'النموذج غير متاح لحسابك. راجع اسم النموذج والصلاحيات.':'تعذّر فحص OpenAI (HTTP '+response.status+').');}
 }catch(error){if(error instanceof TypeError||controller.signal.aborted)throw Error('تعذّر الاتصال بـOpenAI. تحقق من الإنترنت أو إعدادات المتصفح ثم أعد المحاولة.');throw error;}
 finally{clearTimeout(timer);}
}
async function research(project,signal,onStage=()=>{}){
 if(!key)throw Error('أدخل مفتاح OpenAI أولًا.');
 const env={OPENAI_API_KEY:key,OPENAI_MODEL:model};
 async function stage(label,run){
  const controller=new AbortController(),cancel=()=>controller.abort(signal.reason);
  signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  const timer=setTimeout(()=>controller.abort(Object.assign(new Error('Timeout'),{code:'FORGE_TIMEOUT'})),260000);
  try{if(controller.signal.aborted)throw Error('أُلغيت العملية.');onStage(label);const result=await run(controller.signal);if(controller.signal.aborted)throw Error('أُلغيت العملية.');return result;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }
 const evidence=await stage('search',s=>root.ForgeResearch.searchProject(project,env,s));
 return stage('analysis',s=>root.ForgeResearch.analyzeProject(project,evidence,env,s));
}
root.ForgeBackend={get,set,clear,check,research};
})(globalThis);
