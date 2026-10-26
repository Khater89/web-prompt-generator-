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
 $('researchResults').innerHTML='<p>'+esc(x.searched_at)+' · مصادر جُمعت ببحث ويب</p>'+x.similar_products.map(v=>'<article class="research-card"><strong>'+esc(v.name)+'</strong><p>'+esc(v.similarity)+'</p><p>'+esc(v.lesson)+'</p>'+link(v.source_id)+'</article>').join('')+githubResults(x.github)+'<h3>اللغات والمكوّنات المقترحة</h3><p dir="ltr">'+esc(x.languages.join(', '))+'</p>'+x.components.map(v=>'<p><strong>'+esc(v.name)+'</strong> · '+esc(v.version||'إصدار غير متحقق')+' — '+esc(v.purpose)+' '+link(v.source_id)+'</p>').join('')+'<details><summary>كل مصادر البحث</summary>'+x.sources.map(v=>'<p>'+link(v.id)+'</p>').join('')+'</details>';
}
function githubResults(gh){
 if(!gh)return '';
 return '<h3>مستودعات GitHub المشابهة</h3><p><strong>'+esc(({matched:'مستودعات مقترحة حسب صلتها بالمشروع',no_match:'لم يُعثر على مستودعات مناسبة',unavailable:'تعذّر إكمال بحث GitHub'})[gh.status]||'')+'</strong></p><p>'+esc(gh.summary)+'</p>'+(gh.repositories||[]).map(v=>'<article class="research-card"><strong><a href="'+esc(v.url)+'" target="_blank" rel="noopener noreferrer" dir="ltr">'+esc(v.name)+'</a></strong><p><b>سبب الملاءمة:</b> '+esc(v.similarity)+'</p><p><b>ما يمكن الاستفادة منه:</b> '+esc(v.reuse)+'</p><p><b>الترخيص:</b> '+esc(v.license)+'</p><p><b>النشاط والصيانة:</b> '+esc(v.activity)+'</p><p><b>حدود الاستخدام:</b> '+esc(v.cautions)+'</p></article>').join('');
}
function researchProgress(){
 const started=Date.now();
 $('researchStatus').textContent='الطلب جارٍ — ننتظر نتيجة التحليل والبحث.';
 $('researchWaitNote').textContent='تظهر المصادر والمقترحات عند اكتمال النتيجة. اختياراتك الحالية محفوظة.';
 function update(){const seconds=Math.floor((Date.now()-started)/1000);$('researchElapsed').textContent=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');if(seconds>=90)$('researchWaitNote').textContent='الطلب أخذ وقتًا أطول. ما زلنا ننتظر الرد؛ يمكنك إلغاء الطلب مع الاحتفاظ باختياراتك.';}
 update();const interval=setInterval(update,1000);
 return ()=>clearInterval(interval);
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
 const stopProgress=researchProgress();
 const timer=setTimeout(()=>controller.abort('client-timeout'),540000);
 try{
  const data=await B.research(b,controller.signal,stage=>{
   $('researchStatus').textContent=stage==='search'?'جارٍ بحث الويب ومستودعات GitHub عبر OpenAI…':'اكتمل بحث الويب — جارٍ تحليل المصادر وتوليد مواصفات المشروع.';
   $('researchWaitNote').textContent=stage==='search'?'نبحث عن مشاريع ومستودعات GitHub مشابهة وتقنيات مناسبة. يمكنك إلغاء الطلب.':'تُعتمد المقترحات بعد اكتمال التحليل. اختياراتك الحالية محفوظة.';
  });
  if(controller.signal.aborted)return;
  const candidate=S.fromResearch(b,data);project=candidate;result=null;populate();renderResearch();show('shape');toast('اكتمل التحليل والبحث. جميع الاختيارات مقترحات قابلة للتعديل.');
 }catch(e){const message=controller.signal.aborted?(controller.signal.reason==='client-timeout'?'انتهت مهلة انتظار الرد من OpenAI؛ اختياراتك السابقة محفوظة.':'أُلغيت العملية؛ اختياراتك السابقة محفوظة.'):e.message;$('ideaError').textContent=message;$('ideaError').classList.remove('hidden');toast(message);}
 finally{clearTimeout(timer);stopProgress();researchController=null;$('researchBusy').classList.add('hidden');$('autoStart').disabled=false;$('autoAll').disabled=false;}
}
function showBackendSettings(){const c=B.get();$('openaiModel').value=c.model;$('openaiKey').value='';$('openaiKey').placeholder=c.configured?'المفتاح مفعّل لهذه الصفحة — أدخل مفتاحًا لتغييره':'مفتاحك الشخصي — لا يُحفظ بالملفات';}
async function checkConnection(){
 const current=++connectionCheck;connectionReady=false;
 if(!B.get().configured){connectionError='أدخل مفتاح OpenAI في إعداد الاتصال المباشر لتشغيل Auto. التشكيل اليدوي وتصدير PRD متاحان الآن.';$('connectionStatus').textContent=connectionError;return;}
 $('connectionStatus').textContent='جارٍ فحص الوصول إلى نموذج OpenAI…';
 try{await B.check();if(current!==connectionCheck)return;connectionReady=true;connectionError='';$('connectionStatus').textContent='OpenAI متصل مباشرة. اضغط Auto لبدء البحث والتحليل.';}
 catch(e){if(current!==connectionCheck)return;connectionError=e.message;$('connectionStatus').textContent=connectionError;}
 $('backendError').textContent=connectionError;$('backendError').classList.toggle('hidden',!connectionError);
}
$('saveBackend').addEventListener('click',async()=>{
 if(researchController)return;
 try{B.set({key:$('openaiKey').value,model:$('openaiModel').value});$('backendError').classList.add('hidden');showBackendSettings();await checkConnection();toast(connectionReady?'تم تفعيل المفتاح لهذه الصفحة. جرّب Auto.':connectionError);}
 catch(e){$('backendError').textContent=e.message;$('backendError').classList.remove('hidden');}
});
$('resetBackend').addEventListener('click',async()=>{researchController?.abort();B.clear();$('backendError').classList.add('hidden');showBackendSettings();await checkConnection();toast('تم مسح المفتاح من ذاكرة الصفحة.');});
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
