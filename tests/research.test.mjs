import {test} from 'node:test';import assert from 'node:assert/strict';
import '../public/schema.js';
import '../public/research.js';
import '../public/backend.js';
const {searchProject,analyzeProject,searchEvidence,safeSourceURL}=globalThis.ForgeResearch;
const researchProject=async(project,env,signal)=>analyzeProject(project,await searchProject(project,env,signal),env,signal);
import {createRequire} from 'node:module';const require=createRequire(import.meta.url),fixture=require('./fixtures.cjs'),S=require('../public/studio.js');
const env={OPENAI_API_KEY:'fake-server-test-key',OPENAI_MODEL:'test-model'};
const researched={status:'completed',output:[{type:'web_search_call',status:'completed',action:{type:'search',sources:fixture.sources}},{type:'message',content:[{type:'output_text',text:'Researched two actual similar products and official documentation.',annotations:fixture.sources.map(v=>({type:'url_citation',...v}))}]}]};
const result={project_name:'Energy planner',analysis:fixture.analysis,resolved_brief:fixture.brief,shape:fixture.shape,evidence:fixture.evidence};
const reply=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const modelReply=data=>reply({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(data)}]}]});
test('Research performs a required real search call before structured analysis and grounds source ids',async()=>{const old=globalThis.fetch;const calls=[];globalThis.fetch=async(_,o)=>{calls.push(JSON.parse(o.body));return calls.length===1?reply(researched):modelReply(result);};try{const data=await researchProject(fixture.project,env);assert.equal(calls.length,2);assert.equal(calls[0].tools[0].type,'web_search');assert.equal(calls[0].tool_choice,'required');assert.deepEqual(calls[0].include,['web_search_call.action.sources']);assert.equal(calls[1].text.format.strict,true);assert.equal(data.research.sources.length,2);const p=S.fromResearch(fixture.project,data),doc=S.create(p).prd;assert.match(doc,/https:\/\/example.com\/calculator/);assert.match(doc,/6kWh/);assert.equal((doc.match(/^## /gm)||[]).length,(doc.match(/^### Implementation prompt$/gm)||[]).length);}finally{globalThis.fetch=old;}});
test('Prose claiming research without an actual completed search is rejected',()=>{assert.throws(()=>searchEvidence({output:researched.output.slice(1)}),/بحث ويب فعلي/);assert.throws(()=>searchEvidence({output:[{type:'web_search_call',status:'failed'},...researched.output.slice(1)]}),/بحث ويب فعلي/);});
test('Invented source ids and serverless proposals for shared data are rejected',async()=>{const old=globalThis.fetch;try{for(const data of [{...result,evidence:{...result.evidence,components:[{...result.evidence.components[0],source_id:'R-fake'}]}},{...result,resolved_brief:{...result.resolved_brief,storage:'shared'},analysis:{...result.analysis,capabilities:{...result.analysis.capabilities,storage:'shared'}}}]){let count=0;globalThis.fetch=async()=>++count===1?reply(researched):modelReply(data);await assert.rejects(()=>researchProject(fixture.project,env));}}finally{globalThis.fetch=old;}});
test('Unsafe source links are rejected, duplicate URLs are deduplicated',()=>{for(const url of ['javascript:alert(1)','https://user:pass@example.com','http://localhost','http://127.0.0.1','http://192.168.1.2'])assert.equal(safeSourceURL(url),null);assert.equal(searchEvidence(researched).sources.length,2);});
test('C# and Python backend selections are preserved when supplied by analyzed requirements',()=>{for(const backend of ['C# / ASP.NET Core','Python / FastAPI']){const data=structuredClone(fixture.researchResult);data.analysis.technology={...data.analysis.technology,frontend:'React + TypeScript',backend,server:true};data.analysis.capabilities.storage='shared';data.resolved_brief.storage='shared';const p=S.fromResearch(fixture.project,data),doc=S.create(p);assert.equal(doc.rec.back,backend);assert.match(doc.prd,new RegExp(backend.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));}});
test('Scope edits invalidate prior model assumptions while preserving current pages and research provenance',()=>{const p=S.fromResearch(fixture.project,fixture.researchResult);p.pages[0].name='New manual scope';p.pages[0].nameEn='';p.aiStale=true;p.rules='Approved edited rule';const doc=S.create(p).prd;assert.match(doc,/New manual scope/);assert.match(doc,/Approved edited rule/);assert.match(doc,/Scope changed after research/);assert.ok(!doc.includes('Given 2kW and 3h'));});

test('Each stage identifies timeout without reporting a user cancellation',async()=>{
const old=globalThis.fetch;try{
for(const [run,label]of [[s=>searchProject(fixture.project,env,s),'بحث الويب'],[s=>analyzeProject(fixture.project,{text:'Research',sources:fixture.researchResult.research.sources},env,s),'توليد المواصفات']]){
const controller=new AbortController();globalThis.fetch=async()=>{controller.abort(Object.assign(new Error('Timeout'),{code:'FORGE_TIMEOUT'}));throw Error('Aborted');};await assert.rejects(()=>run(controller.signal),e=>e.status===504&&e.message.includes('انتهت مهلة مرحلة '+label)&&!e.message.includes('أُلغي'));
}
}finally{globalThis.fetch=old;}
});
