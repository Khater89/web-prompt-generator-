import {researchProject,ResearchError} from './research.mjs';

function publicKey(key){
 if(typeof key!=='string')return false;
 if(key.startsWith('sb_publishable_'))return true;
 try{const p=key.split('.');return p.length===3&&JSON.parse(atob(p[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{return false;}
}
function mapValues(raw){try{return Object.values(JSON.parse(raw||'{}')).filter(v=>typeof v==='string');}catch{return [];}}
function credentials(env){return {
 publicKeys:[env.FORGE_PUBLIC_KEY,env.SUPABASE_ANON_KEY,env.SUPABASE_PUBLISHABLE_KEY,...mapValues(env.SUPABASE_PUBLISHABLE_KEYS)].filter(publicKey),
 adminKey:env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SECRET_KEY||mapValues(env.SUPABASE_SECRET_KEYS)[0]||''
};}
function projectInput(raw){
 if(!raw||typeof raw!=='object'||typeof raw.idea!=='string'||!raw.idea.trim()||raw.idea.length>12000||!['ar','en'].includes(raw.outputLanguage))throw new ResearchError('اكتب وصف المشروع ولغة الوثيقة.',400);
 if(raw.name!==undefined&&(typeof raw.name!=='string'||raw.name.length>100))throw new ResearchError('اسم المشروع طويل أو غير صالح.',400);
 return {name:String(raw.name||'').trim(),idea:raw.idea.trim(),outputLanguage:raw.outputLanguage};
}
async function quota(request,env,adminKey,fetcher,signal){
 const ip=(request.headers.get('x-forwarded-for')||request.headers.get('x-real-ip')||'unknown').slice(0,500);
 const bytes=new TextEncoder().encode((env.FORGE_RATE_SALT||env.OPENAI_API_KEY)+'\n'+ip);
 const digest=await crypto.subtle.digest('SHA-256',bytes),hash=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
 const headers={'Content-Type':'application/json',apikey:adminKey};if(!adminKey.startsWith('sb_secret_'))headers.Authorization='Bearer '+adminKey;
 const r=await fetcher(env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/rpc/consume_forge_research_quota',{method:'POST',headers,body:JSON.stringify({p_client_hash:hash,p_global_limit:20,p_client_limit:5,p_window_seconds:600}),signal});
 if(!r.ok){await r.arrayBuffer().catch(()=>{});throw new ResearchError('إعداد الخلفية غير مكتمل. شغّل ملف SQL الموجود في supabase/migrations أولًا.',503);}
 const allowed=await r.json();if(allowed!==true)throw new ResearchError('وصلت الأداة لحد طلبات البحث خلال عشر دقائق. حاول لاحقًا.',429);
}
export function createSupabaseHandler(env,dependencies={}){
 const runResearch=dependencies.researchProject||researchProject,fetcher=dependencies.fetch||fetch;
 const allowedOrigins=String(env.FORGE_ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean);
 const {publicKeys,adminKey}=credentials(env);
 return async request=>{
  const origin=request.headers.get('origin');
  const cors={'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'apikey, authorization, content-type, x-client-info','Access-Control-Max-Age':'600'};
  const send=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  if(origin){if(!allowedOrigins.includes(origin))return send({error:'رابط الواجهة غير مسموح في FORGE_ALLOWED_ORIGINS.'},403);cors['Access-Control-Allow-Origin']=origin;}
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  try{
   if(!['GET','POST'].includes(request.method))return send({error:'طريقة الطلب غير مدعومة.'},405);
   if(!publicKeys.length)throw new ResearchError('أضف المفتاح العام للمشروع في FORGE_PUBLIC_KEY ضمن Secrets.',503);
   if(!publicKeys.includes(request.headers.get('apikey')))throw new ResearchError('المفتاح العام لـSupabase غير صالح لهذا المشروع.',401);
   const missing=[];
   if(!env.OPENAI_API_KEY?.trim())missing.push('OPENAI_API_KEY');
   if(!env.OPENAI_MODEL?.trim())missing.push('OPENAI_MODEL');
   if(!allowedOrigins.length)missing.push('FORGE_ALLOWED_ORIGINS');
   if(!env.SUPABASE_URL)missing.push('SUPABASE_URL');
   if(!adminKey)missing.push('SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEYS');
   const configured=missing.length===0;
   const configurationError='إعداد الخلفية غير مكتمل. الإعدادات الناقصة: '+missing.join(', ')+'. راجع Secrets في Supabase ثم أعد الفحص.';
   if(request.method==='GET'){
    if(new URL(request.url).searchParams.get('action')!=='status')return send({error:'المسار غير موجود.'},404);
    return send({ready:configured,research:configured,provider:'supabase',configuration_only:true,missing_configuration:missing,...(!configured?{error:configurationError}:{})});
   }
   if(!configured)throw new ResearchError(configurationError,503);
   if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ResearchError('الطلب غير صالح.',415);
   if(Number(request.headers.get('content-length')||0)>70000)throw new ResearchError('وصف المشروع طويل جدًا.',413);
   const text=await request.text();if(text.length>70000)throw new ResearchError('وصف المشروع طويل جدًا.',413);
   let body;try{body=JSON.parse(text);}catch{throw new ResearchError('صيغة الطلب غير صالحة.',400);}
   const p=projectInput(body.project),controller=new AbortController(),cancel=()=>controller.abort();
   request.signal.addEventListener('abort',cancel,{once:true});if(request.signal.aborted)controller.abort();
   // Leave time to return an explicit error before Supabase's 150s request limit.
   const timer=setTimeout(cancel,125000);
   try{await quota(request,env,adminKey,fetcher,controller.signal);return send(await runResearch(p,env,controller.signal));}
   finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);}
  }catch(error){const known=error instanceof ResearchError;return send({error:known?error.message:'تعذّر إكمال البحث. اختياراتك السابقة محفوظة.'},known?error.status:502);}
 };
}
