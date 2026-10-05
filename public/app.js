(function(){
'use strict';
const E=globalThis.ForgeEngine,S=globalThis.ForgeStudio,B=globalThis.ForgeBackend,$=id=>document.getElementById(id);
let project=null,result=null,view='idea',toastTimer,researchController,connectionReady=false,connectionCheck=0,connectionError='',checkingAuto=false;
const fields=['kind','delivery','siteLanguage','audience','objective','visual','layout','theme','accent','motion','density','customFeatures','storage','auth','integration','rules','flow','references','requirements','constraint','hosting','inputs','output'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.remove('hidden');toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),4200);}
function show(next){view=next;for(const k of ['idea','shape','output'])$(k+'View').classList.toggle('hidden',k!==next);document.querySelectorAll('[data-step]').forEach(b=>b.classList.toggle('active',b.dataset.step===next));window.scrollTo({top:0,behavior:'auto'});}
function brief(){return{name:$('projectName').value.trim(),idea:$('projectIdea').value.trim(),outputLanguage:$('outputLanguage').value};}
function check(){const b=brief();if(!b.idea){$('ideaError').textContent='اكتب وصفًا للفكرة حتى نضمّنه في برومبت مشروعك.';$('ideaError').classList.remove('hidden');$('projectIdea').focus();return null;}$('ideaError').classList.add('hidden');return b;}
function collect(){if(!project)return;for(const id of fields)project[id]=$(id).value;}
function populate(){for(const id of fields)$(id).value=project[id];renderPages();renderFeatures();renderPreview();}
function start(){const b=check();if(!b)return;if(project){collect();if(project.idea!==b.idea||project.name!==b.name)project.aiStale=true;project={...project,...b,name:b.name||project.name};populate();}else{project=S.auto(b);populate();}renderResearch();show('shape');$('autoSummary').textContent='تخصيص مشروعك: '+E.KINDS[project.kind];}
function renderResearch(){
 const x=project?.research;$('researchPanel').classList.toggle('hidden',!x);
 if(!x)return;
 const link=id=>{const v=x.sources.find(v=>v.id===id);return v?'<a href="'+esc(v.url)+'" target="_blank" rel="noopener noreferrer">['+esc(id)+'] '+esc(v.title)+'</a>':'';};
 $('researchResults').innerHTML='<p>'+esc(x.searched_at)+' · مصادر جُمعت ببحث ويب</p>'+x.similar_products.map(v=>'<article class="research-card"><strong>'+esc(v.name)+'</strong><p>'+esc(v.similarity)+'</p><p>'+esc(v.lesson)+'</p>'+link(v.source_id)+'</article>').join('')+'<h3>اللغات والمكوّنات المقترحة</h3><p dir="ltr">'+esc(x.languages.join(', '))+'</p>'+x.components.map(v=>'<p><strong>'+esc(v.name)+'</strong> · '+esc(v.version||'إصدار غير متحقق')+' — '+esc(v.purpose)+' '+link(v.source_id)+'</p>').join('')+'<details><summary>كل مصادر البحث</summary>'+x.sources.map(v=>'<p>'+link(v.id)+'</p>').join('')+'</details>';
}
async function research(){
 const b=check();if(!b||researchController||checkingAuto)return;
 if(!connectionReady){
  checkingAuto=true;$('autoStart').disabled=true;$('autoAll').disabled=true;
  try{await checkConnection();}finally{checkingAuto=false;$('autoStart').disabled=false;$('autoAll').disabled=false;}
  if(!connectionReady){$('ideaError').textContent=connectionError;$('ideaError').classList.remove('hidden');$('backendSettings').open=true;toast(connectionError);return;}
 }
 const controller=new AbortController();researchController=controller;
 $('researchBusy').classList.remove('hidden');$('autoStart').disabled=true;$('autoAll').disabled=true;
 const timer=setTimeout(()=>controller.abort(),240000);
 try{
  const response=await B.request('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project:b}),signal:controller.signal});
  const data=await response.json();if(!response.ok)throw Error(data.error||'تعذّر إكمال البحث.');
  if(controller.signal.aborted)return;
  const candidate=S.fromResearch(b,data);project=candidate;result=null;populate();renderResearch();show('shape');toast('اكتمل التحليل والبحث. جميع الاختيارات مقترحات قابلة للتعديل.');
 }catch(e){const message=controller.signal.aborted?'أُلغي البحث أو انتهت المهلة؛ اختياراتك السابقة محفوظة.':e.message;$('ideaError').textContent=message;$('ideaError').classList.remove('hidden');toast(message);}
 finally{clearTimeout(timer);researchController=null;$('researchBusy').classList.add('hidden');$('autoStart').disabled=false;$('autoAll').disabled=false;}
}
function showBackendSettings(){const c=B.get();$('backendProvider').value=c.provider;$('supabaseUrl').value=c.provider==='supabase'?c.url+'/functions/v1/'+c.functionName:c.url;$('supabasePublicKey').value=c.key;$('supabaseSettings').classList.toggle('hidden',c.provider!=='supabase');}
async function checkConnection(){
 const current=++connectionCheck,c=B.get(),controller=new AbortController();let message='';connectionReady=false;
 const setup='Auto غير مفعّل على الخادم الحالي. افتح إعداد اتصال الخلفية، اختر Supabase، وأدخل Project URL والمفتاح العام ثم اضغط حفظ وفحص الاتصال.';
 const origin=window.location?.origin;
 const originHint=window.location?.protocol==='file:'||origin==='null'||origin==='file://'?' افتح الواجهة المنشورة بدل فتح index.html مباشرة.':origin?' أضف '+origin+' إلى FORGE_ALLOWED_ORIGINS في Secrets.':' راجع FORGE_ALLOWED_ORIGINS في Secrets.';
 $('connectionStatus').textContent='جارٍ فحص اتصال الخلفية…';
 const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await B.request('/api/status',{headers:{Accept:'application/json'},signal:controller.signal});
  let data;try{data=await r.json();}catch{data={};}
  if(current!==connectionCheck)return;
  connectionReady=r.ok&&data.ready===true&&data.research===true;
  if(!connectionReady){
   if(c.provider==='auto')message=data.error||setup;
   else if(r.status===401)message='Supabase رفض الاتصال. تأكد أن المفتاح العام من نفس المشروع، وعطّل Verify JWT لوظيفة '+c.functionName+'.';
   else if(r.status===404)message='وظيفة '+c.functionName+' غير موجودة على هذا المسار. انسخ رابط الوظيفة الكامل من Edge Functions وأدخله في إعداد الاتصال.';
   else if(data.error)message=data.error;
   else message=r.ok?'الخلفية وصلت، لكن إعداد AI غير مكتمل. راجع OPENAI_API_KEY وOPENAI_MODEL وFORGE_ALLOWED_ORIGINS في Secrets، ثم أعد الفحص.':'تعذّر فحص الخلفية (HTTP '+r.status+'). راجع نشر وظيفة '+c.functionName+' وإعداداتها.';
  }
 }catch{if(current!==connectionCheck)return;message=c.provider==='auto'?setup:'تعذّر الوصول إلى Supabase. راجع رابط وظيفة '+c.functionName+' ونشرها.'+originHint;}
 finally{clearTimeout(timer);}
 connectionError=message;
 $('connectionStatus').textContent=connectionReady?'الخلفية مهيأة. اضغط Auto لتنفيذ بحث فعلي وفحص خدمة AI.':message;
 $('backendError').textContent=message;$('backendError').classList.toggle('hidden',!message||c.provider!=='supabase');
}
$('backendProvider').addEventListener('change',()=>{$('supabaseSettings').classList.toggle('hidden',$('backendProvider').value!=='supabase');});
$('saveBackend').addEventListener('click',async()=>{
 try{B.set({provider:$('backendProvider').value,url:$('supabaseUrl').value,key:$('supabasePublicKey').value});researchController?.abort();$('backendError').classList.add('hidden');showBackendSettings();await checkConnection();toast(connectionReady?'حُفظ اتصال الخلفية. جرّب Auto.':'حُفظ الإعداد؛ الخلفية تحتاج مراجعة.');}catch(e){$('backendError').textContent=e.message;$('backendError').classList.remove('hidden');}
});
$('resetBackend').addEventListener('click',async()=>{researchController?.abort();B.clear();$('backendError').classList.add('hidden');showBackendSettings();await checkConnection();});
showBackendSettings();
$('kind').innerHTML=Object.entries(E.KINDS).map(([v,label])=>'<option value="'+v+'">'+esc(label)+'</option>').join('');
function renderFeatures(){$('featureEditor').innerHTML=Object.entries(S.features).map(([id,v])=>'<label class="feature-choice"><input type="checkbox" data-feature="'+id+'" '+(project.features.includes(id)?'checked':'')+'><span>'+esc(v[0])+'</span></label>').join('');}
function renderPages(){$('pageEditor').innerHTML=project.pages.map((p,i)=>'<article class="page-edit"><div class="page-edit-top"><span class="screen-number">'+String(i+1).padStart(2,'0')+'</span><div class="button-group"><button type="button" class="icon-button" data-page-action="up" data-index="'+i+'" aria-label="نقل الصفحة '+(i+1)+' للأعلى" '+(!i?'disabled':'')+'>أعلى</button><button type="button" class="icon-button" data-page-action="down" data-index="'+i+'" aria-label="نقل الصفحة '+(i+1)+' للأسفل" '+(i===project.pages.length-1?'disabled':'')+'>أسفل</button><button type="button" class="text-button danger" data-page-action="remove" data-index="'+i+'" '+(project.pages.length===1?'disabled':'')+'>حذف</button></div></div><label for="pageName'+i+'">اسم الصفحة / مساحة العمل</label><input id="pageName'+i+'" data-page-field="name" data-index="'+i+'" value="'+esc(p.name)+'" maxlength="200"><label for="pageComponents'+i+'">مكوّناتها وما يحدث فيها</label><textarea id="pageComponents'+i+'" data-page-field="components" data-index="'+i+'" rows="3" maxlength="3000">'+esc(p.components)+'</textarea></article>').join('');$('addPage').disabled=project.pages.length>=12;}
function renderPreview(){collect();const p=project,r=E.recommend(p,p.aiStale?null:p.ai),marketing=p.layout==='narrative'||p.layout==='single';$('accentLabel').textContent=p.accent;$('autoSummary').textContent=E.KINDS[p.kind]+' · '+p.pages.length+' صفحات / مساحات';const box=$('mockPreview');box.style.setProperty('--project-accent',p.accent);box.dataset.theme=p.theme;box.dataset.layout=p.layout;box.dataset.visual=p.visual;box.dataset.density=p.density;
 const page=project.pages[0],bits=String(page?.components||'').split(/[\n،,]+/).map(x=>x.trim()).filter(Boolean).slice(0,4);
 box.innerHTML='<div class="mock-browser"><i></i><i></i><i></i><span>'+esc(p.name)+'</span></div><div class="mock-nav">'+p.pages.slice(0,5).map((x,i)=>'<span class="'+(!i?'selected':'')+'">'+esc(x.name)+'</span>').join('')+'</div><div class="mock-body"><span class="mock-kicker">'+esc(E.KINDS[p.kind])+'</span><h3>'+esc(page?.name||p.name)+'</h3><p>'+esc(p.objective||'المهمة الرئيسية حسب وصف مشروعك')+'</p>'+(marketing?'<div class="mock-hero"><span>'+esc(bits[0]||'المحتوى الرئيسي')+'</span></div>':'')+'<div class="mock-cards">'+bits.map(x=>'<div>'+esc(x)+'<span class="mock-line"></span><span class="mock-line short"></span></div>').join('')+'</div><span class="mock-action">'+esc(marketing?'الإجراء الرئيسي':'تنفيذ المهمة')+'</span></div>';
 $('techSummary').innerHTML='<span class="mini-label">البنية المقترحة</span><strong dir="ltr">'+esc(r.front)+'</strong><p dir="ltr">Backend: '+esc(r.back)+'</p><p>'+esc(r.why)+'</p><p>'+esc(r.server?'يحتاج خدمات خلفية للحفظ أو الحسابات أو التنفيذ.':'يمكن تشغيل الواجهة على استضافة ويب؛ التكاملات تتحدد حسب الوظائف.')+'</p>'+(r.warnings.length?'<p class="tech-warning">'+esc(r.warnings[0])+'</p>':'');
}
function generate(){collect();try{result=S.create(project);}catch(error){toast(error.message);return;}const en=project.outputLanguage==='en';$('prdOutput').value=result.prd;$('prdOutput').dir=en?'ltr':'rtl';$('resultSummary').innerHTML='<div class="classification-icon">▦</div><div><h2>'+esc(project.name)+'</h2><p>'+esc(E.KINDS[project.kind])+' · '+project.pages.length+' صفحات / مساحات · '+esc(result.rec.front)+'</p></div>';$('resultWarnings').innerHTML=result.rec.warnings.length?'<div class="warning"><strong>قرارات لازم تنتبه لها عند البناء</strong><ul>'+result.rec.warnings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'';show('output');}
async function copy(id){try{await navigator.clipboard.writeText($(id).value);toast('تم النسخ. الصقه كاملًا في أداة البناء.');}catch{$(id).focus();$(id).select();toast('تعذّر النسخ التلقائي. النص محدد؛ انسخه من المتصفح.');}}
function download(id,extension){const b=new Blob([$(id).value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='project-'+(id==='buildOutput'?'build-prompt':'prd')+'.'+extension;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('تم تجهيز التنزيل.');}
$('ideaForm').addEventListener('submit',event=>{event.preventDefault();return research();});$('customStart').addEventListener('click',()=>start(false));$('editIdea').addEventListener('click',()=>{collect();show('idea');});$('autoAll').addEventListener('click',()=>{collect();return research();});$('generate').addEventListener('click',generate);$('backShape').addEventListener('click',()=>show('shape'));
for(const id of fields)$(id).addEventListener('input',()=>{collect();if(['kind','delivery','siteLanguage','storage','auth','integration','rules','flow','inputs','output','requirements','constraint','hosting','customFeatures'].includes(id))project.aiStale=true;if(id==='kind'){const suggested=S.auto(project,project.kind);project.pages=suggested.pages;project.flow=suggested.flow;$('flow').value=project.flow;renderPages();toast('تغيّر اقتراح الصفحات مع النوع. بقية اختياراتك محفوظة.');}renderPreview();});
$('pageEditor').addEventListener('input',event=>{const el=event.target,i=Number(el.dataset.index),f=el.dataset.pageField;if(!f||!project.pages[i])return;project.aiStale=true;project.pages[i][f]=el.value;if(f==='name'){project.pages[i].nameEn='';project.pages[i].purpose='حسب وصف المشروع';project.pages[i].purposeEn='According to the project brief';}if(f==='components')project.pages[i].componentsEn='';renderPreview();});
$('pageEditor').addEventListener('click',event=>{const b=event.target.closest('[data-page-action]');if(!b||b.disabled)return;project.aiStale=true;const i=Number(b.dataset.index),action=b.dataset.pageAction;if(action==='remove')project.pages.splice(i,1);else{const j=i+(action==='up'?-1:1);if(j<0||j>=project.pages.length)return;[project.pages[i],project.pages[j]]=[project.pages[j],project.pages[i]];}renderPages();renderPreview();});
$('addPage').addEventListener('click',()=>{if(project.pages.length>=12)return;project.aiStale=true;project.pages.push({name:'صفحة جديدة',purpose:'مساحة يحددها المستخدم',components:'المحتوى أو الإجراء المطلوب'});renderPages();renderPreview();});
$('featureEditor').addEventListener('change',event=>{const k=event.target.dataset.feature;if(!S.features[k])return;project.aiStale=true;project.features=event.target.checked?[...new Set([...project.features,k])]:project.features.filter(x=>x!==k);renderPreview();});
$('copyPrd').addEventListener('click',()=>copy('prdOutput'));$('downloadPrd').addEventListener('click',()=>download('prdOutput','md'));$('cancelResearch').addEventListener('click',()=>researchController?.abort());
const examples={company:['موقع شركة مقاولات','موقع لشركة مقاولات يعرض خدماتها وأعمالها بصور حقيقية، ويتيح التواصل وطلب عرض سعر. أريد شكلًا صناعيًا راقيًا، يعمل على الكمبيوتر والموبايل.'],calculator:['أداة مقارنة استهلاك الطاقة','حاسبة طاقة: المستخدم يدخل قدرة الجهاز بالكيلوواط وساعات التشغيل. المعادلة الطاقة بالكيلوواط ساعة = القدرة × الساعات. أريد مقارنة سيناريوهات ورسومًا وتنزيل النتائج. دون تسجيل دخول؛ الحفظ على هذا الجهاز فقط.'],workflow:['متابعة أوامر العمل','نظام داخلي للفنيين والمدير: إنشاء أمر عمل، تعيين فني، تنفيذ، مراجعة المدير، ثم إغلاق. بيانات مشتركة وأدوار وصلاحيات، بحث وفلترة وسجل إجراءات. لا أريد دفعًا أو اشتراكات.'],control:['لوحة تشغيل أوامر','واجهة تحكم لضبط إعدادات أوامر ترسل إلى API، مع مراجعة قبل الإرسال ومتابعة قيد التنفيذ أو النجاح أو الفشل. أريد مساحة عمل بسيطة، وليست موقعًا تسويقيًا.']};
document.querySelectorAll('[data-example]').forEach(b=>b.addEventListener('click',()=>{const v=examples[b.dataset.example];project=null;result=null;$('projectName').value=v[0];$('projectIdea').value=v[1];show('idea');$('projectIdea').focus();}));
document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.step==='idea')show('idea');else if(b.dataset.step==='shape'){if(project)show('shape');else start(false);}else if(project)generate();else toast('اكتب فكرتك وشكّل مشروعك أولًا.');}));
checkConnection();
})();
