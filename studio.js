(function(root){
'use strict';
const E=root.ForgeEngine||(typeof require==='function'?require('./engine.js'):null);
const features={search:['بحث وفلترة','Search and filters'],export:['تنزيل النتائج والتقارير','Export results and reports'],compare:['مقارنة سيناريوهات','Scenario comparison'],charts:['رسوم بيانية','Data charts'],upload:['رفع ملفات','File uploads'],notifications:['إشعارات','Notifications'],history:['سجل الإجراءات','Activity history'],contact:['نموذج تواصل / طلب','Contact / request form'],gallery:['معرض صور وأعمال','Work and photo gallery']};
const featureRules={search:['بحث وفلترة بالحقول ذات الصلة، مع حالة لا توجد نتائج وزر مسح الفلاتر.','Search and filter relevant fields, including no-results and clear-filter states.'],export:['تصدير البيانات الفعلية بفترة ووحدات واضحة؛ لا تصدّر بيانات نموذجية باعتبارها بيانات حقيقية.','Export actual data with explicit range and units; never present sample data as real exports.'],compare:['قارن سيناريوهات بنفس القواعد والوحدات، وبيّن المدخلات المتغيرة والافتراضات.','Compare scenarios using identical rules and units, identifying changed inputs and assumptions.'],charts:['اختر الرسوم المناسبة للبيانات، مع وحدات ومفاتيح وتسميات وبديل جدولي مقروء.','Use charts suited to the data, with units, legends, labels and a readable table alternative.'],upload:['حدّد أنواع الملفات وحجمها وتحقق منها؛ أظهر التقدم والفشل ومن يستطيع الوصول إليها.','Define accepted file types and sizes, validate files, and show progress, failures and access permissions.'],notifications:['حدّد الحدث والقناة والمستلم. لا تدّع إرسال إشعار دون تأكيد الخدمة.','Specify each trigger, channel and recipient. Do not claim delivery without service confirmation.'],history:['سجّل الوقت والإجراء والنتيجة والمستخدم عند توفره، دون كشف أسرار أو بيانات حساسة.','Record time, action, outcome and actor where applicable without exposing secrets or sensitive data.'],contact:['نموذج قصير بتحقق ورسائل إرسال ونجاح وفشل. حدّد وجهة استقبال حقيقية قبل اعتباره عاملًا.','Use a short form with validation, sending, success and failure states. Confirm a real receiving destination before claiming it works.'],gallery:['استخدم الصور والأعمال المتوفرة بإذن، مع وصف بديل. لا تختلق مشاريع أو شهادات.','Use supplied authorized images and work, with alt text. Do not invent projects or testimonials.']};
const layouts={narrative:['موقع بصري بأقسام','Visual site with narrative sections'],working:['مساحة عمل مباشرة؛ المدخلات والنتائج أولًا','Direct workspace; inputs and results first'],sidebar:['تنقل جانبي ومساحة عمل؛ يتحول لقائمة ملائمة على الموبايل','Sidebar navigation and workspace; adapt navigation on mobile'],single:['صفحة واحدة مركّزة دون تشتيت','Focused single page']};
const themes={light:['فاتح','Light'],dark:['داكن','Dark'],system:['حسب النظام مع مفتاح تبديل','System preference with toggle']};
const motions={none:['دون حركة','No animation'],subtle:['حركة خفيفة ووظيفية، 150–250ms','Subtle functional motion, 150–250ms'],expressive:['حركة مدروسة تكشف التسلسل، دون إعاقة المهمة','Expressive purposeful transitions that reveal hierarchy without obstructing tasks']};
const densities={comfortable:['مسافات مريحة ومتوازنة','Comfortable balanced spacing'],spacious:['مسافات واسعة وصور محورية عند توفرها','Generous spacing and prominent imagery when available'],compact:['مسافات مكثفة للجداول مع أهداف لمس مريحة','Compact data spacing with comfortable touch targets']};
const norm=s=>String(s||'').toLowerCase().replace(/[\u064b-\u065f\u0670]/g,'');
const parts=s=>String(s||'').split(/[\n،,;؛]+/).map(x=>x.trim()).filter(Boolean);
function auto(brief,kindOverride){
 let kind=kindOverride||E.classify({name:brief.name||'',idea:brief.idea,kind:'auto'}).kind;
 if(!kindOverride&&kind==='general'&&/لحساب|حساب (تكلف|استهلاك|طاقة|طاقه|قدرة|قدره)|compute/.test(norm(brief.idea)))kind='calculator';
 const t=norm(brief.idea),marketing=['company','content','commerce'].includes(kind),inferred=E.inferCapabilities(brief);
 const p={name:brief.name?.trim()||'مشروعي',idea:brief.idea,outputLanguage:brief.outputLanguage||'ar',kind,delivery:/android|iphone|ios|اندرويد|أندرويد|آيفون|ايفون|تطبيق موبايل|تطبيق جوال/.test(t)?(/موقع|website|web/.test(t)?'both':'mobile'):'web',siteLanguage:/english only|بالانجليزي فقط/.test(t)?'en':/عربي.*انجليزي|عربي.*إنجليزي|bilingual/.test(t)?'ar-en':'ar',audience:'',objective:'',inputs:'',output:'',rules:'',flow:'',references:'',requirements:'',storage:inferred.storage||(['workflow','booking','commerce','saas'].includes(kind)?'shared':'unknown'),auth:inferred.auth||'unknown',integration:inferred.integration||'unknown',constraint:'auto',hosting:'auto',visual:marketing?'premium':'technical',accent:marketing?'#16766d':'#2563eb',theme:'light',layout:marketing?'narrative':kind==='calculator'?'working':'sidebar',motion:'subtle',density:marketing?'spacious':'comfortable',features:[],customFeatures:''};
 if(/داكن|dark|أسود|اسود/.test(t))p.theme='dark';
 if(/صناعي|industrial|مقاولات|construction/.test(t)){p.visual='industrial';p.accent='#d97706';}
 if(/بسيط|minimal/.test(t))p.visual='minimal';
 if(/حيوي|جريء|bold/.test(t))p.visual='bold';
 if(/صفحة واحده|صفحة واحدة|صفحه واحده|single.page/.test(t))p.layout='single';
 if(/دون حركة|بدون حركه|بدون حركة|no animation/.test(t))p.motion='none';
 const color=t.match(/#[\da-f]{6}\b/i);if(color)p.accent=color[0];
 const objectives={company:'مقترح: فهم الخدمة والتواصل أو طلب عرض سعر',calculator:'مقترح: إدخال القيم والوصول إلى نتيجة حساب مفهومة',workflow:'مقترح: إنجاز العملية ومتابعة حالتها حتى الإغلاق',control:'مقترح: ضبط الأمر وتنفيذه ومتابعة نتيجته الفعلية',dashboard:'مقترح: قراءة المؤشرات وفحص التفاصيل لاتخاذ القرار',commerce:'مقترح: اختيار المنتج وإتمام الطلب',booking:'مقترح: اختيار موعد متاح وتأكيد الحجز',content:'مقترح: الوصول إلى المحتوى المناسب وقراءته',saas:'مقترح: إنجاز المهمة الأساسية وحفظ الناتج',general:'مقترح: إنجاز المهمة التي يصفها المستخدم'};
 p.objective=objectives[kind];
 const formula=String(brief.idea||'').match(/(?:المعادلة|المعادله|formula)\s*[:：]?\s*([^\n.。]+)/i);
 if(formula)p.rules=formula[1].trim();p.automaticRules=p.rules;
 const matches={search:/بحث|فلترة|فلتر|search|filter/,export:/تصدير|تنزيل.*تقرير|pdf|csv|export/,compare:/مقارن|compare|scenario/,charts:/رسم|رسوم|chart|graph/,upload:/رفع.*ملف|upload/,notifications:/اشعار|إشعار|notification/,history:/سجل.{0,12}(اجر|إجر|عملي)|audit|activity log/,contact:/تواصل|عرض سعر|contact|quote/,gallery:/صور|معرض|أعمال|اعمال|gallery|portfolio/};
 p.features=Object.keys(matches).filter(k=>matches[k].test(t));
 const rec=E.recommend(p),d=E.design(p,rec);
 p.pages=d.screens.map(s=>({name:s.name_ar,nameEn:s.name_en,purpose:s.purpose_ar,purposeEn:s.purpose_en,components:s.components_ar.join('\n'),componentsEn:s.components_en.join('\n')}));
 p.flow=d.flow.join(' → ');
 return p;
}
function create(raw){
 const p={...raw,features:[...(raw.features||[])],pages:(raw.pages||[]).map(s=>({...s}))};
 if(!p.pages.length)throw Error('أضف صفحة أو مساحة عمل واحدة على الأقل.');
 for(const s of p.pages)if(!s.name.trim()||!parts(s.components).length)throw Error('كل صفحة تحتاج اسمًا ومكوّنًا واحدًا على الأقل.');
 if(!/^#[\da-f]{6}$/i.test(p.accent))throw Error('اختر لونًا صالحًا.');
 const en=p.outputLanguage==='en',T=(ar,eng)=>en?eng:ar;
 const rec=E.recommend(p),design=E.design(p,rec);design.layout=p.layout;design.screens=p.pages.map((s,i)=>({id:'S'+(i+1),name_ar:s.name,name_en:s.nameEn||s.name,purpose_ar:s.purpose||'حسب وصف المشروع',purpose_en:s.purposeEn||s.purpose||'According to the project brief',components_ar:parts(s.components),components_en:parts(s.componentsEn||s.components)}));
 const note=[T('توجيه بصري ملزم','Authoritative visual direction'),T('تكوين الواجهة: ','Composition: ')+layouts[p.layout][en?1:0],T('الخلفية: ','Theme: ')+themes[p.theme][en?1:0],T('اللون الأساسي: ','Primary accent: ')+p.accent,T('الحركة: ','Motion: ')+motions[p.motion][en?1:0],T('المسافات: ','Spacing: ')+densities[p.density][en?1:0],T('المرجع يوجّه الأسلوب، ولا يجيز نسخ هوية أو محتوى. لا تدّع فحص الرابط إذا لم تفحصه.','References guide style; they do not authorize copying identity or content. Do not claim a reference was inspected unless you inspected it.'),T('اعتمد تسلسلًا بصريًا واضحًا، وخطًا مناسبًا للغة، ومكوّنات متسقة، وتباينًا مقروءًا. احترم تفضيل تقليل الحركة. لا تضف صورًا زخرفية تعيق الأداة.','Use clear hierarchy, language-appropriate typography, consistent components and readable contrast. Respect reduced motion. Avoid decorative imagery that obstructs the task.')].join('\n');
 const fs=p.features.filter(k=>features[k]);
 const funcs=fs.map(k=>'- '+features[k][en?1:0]+': '+featureRules[k][en?1:0]).join('\n')+(p.customFeatures.trim()?'\n\n'+T('متطلبات خاصة كما كتبها المستخدم:\n','Custom user requirements, verbatim:\n')+p.customFeatures:'');
 p.requirements=[p.requirements,note,funcs].filter(Boolean).join('\n\n');
 let prd=E.generatePRD(p,rec,design);
 prd+='\n## '+T('اختيارات تشكيل المشروع','Project configuration')+'\n\n'+note+'\n\n'+T('الوظائف الإضافية المحددة:','Selected additional capabilities:')+'\n'+(funcs||T('لا إضافات محددة. التزم بمكونات الصفحات والوصف.','No additional capabilities selected. Follow the screen components and original brief.'))+'\n\n'+T('أولوية المواصفات: الوصف والقيود الصريحة أولًا، ثم التخصيص اليدوي. الاقتراحات التلقائية مسودة؛ حل أي تعارض مع الوصف قبل التنفيذ. لا تعتبر التفاصيل غير المذكورة حقائق.','Specification priority: explicit original requirements first, then manual configuration. Automatic suggestions are drafts; resolve conflicts against the original brief before implementation. Do not treat omitted details as confirmed facts.')+'\n';
 const prefix=T('هدفك إنتاج موقع أو تطبيق مكتمل، جذاب ومناسب للغرض، لا مجرد شرح أو وثيقة أخرى. نفّذ البرمجة بعد حسم التفاصيل التي تمنع صحة التنفيذ.\n\n','Your deliverable is a complete, visually polished, purpose-appropriate website or application, not only another document or explanation. Implement it after resolving decisions that block correctness.\n\n');
 return {p,rec,design,prd,build:prefix+E.buildPrompt(p,prd)};
}
const api={auto,create,features,layouts,themes,motions,densities};root.ForgeStudio=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
