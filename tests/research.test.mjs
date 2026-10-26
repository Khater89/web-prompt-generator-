import {test} from 'node:test';import assert from 'node:assert/strict';
import '../public/schema.js';
import '../public/research.js';
import '../public/backend.js';
const {searchProject,analyzeProject,searchEvidence,safeSourceURL,githubRepositoryURL,searchGitHub}=globalThis.ForgeResearch;
const researchProject=async(project,env,signal)=>analyzeProject(project,await searchProject(project,env,signal),env,signal);
import {createRequire} from 'node:module';const require=createRequire(import.meta.url),fixture=require('./fixtures.cjs'),S=require('../public/studio.js');
const env={OPENAI_API_KEY:'fake-server-test-key',OPENAI_MODEL:'test-model'};
const researched={status:'completed',output:[{type:'web_search_call',status:'completed',action:{type:'search',sources:fixture.sources}},{type:'message',content:[{type:'output_text',text:'Researched two actual similar products and official documentation.',annotations:fixture.sources.map(v=>({type:'url_citation',...v}))}]}]};
const githubResearched={status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:[fixture.githubSource]}},{type:'message',content:[{type:'output_text',text:'A real similar repository with unverified license and maintenance.'}]}]};
const result={project_name:'Energy planner',analysis:fixture.analysis,resolved_brief:fixture.brief,shape:fixture.shape,evidence:fixture.evidence};
const reply=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const modelReply=data=>reply({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(data)}]}]});
test('Research performs a required real search call before structured analysis and grounds source ids',async()=>{const old=globalThis.fetch;const calls=[];globalThis.fetch=async(_,o)=>{calls.push(JSON.parse(o.body));return calls.length===1?reply(researched):calls.length===2?reply(githubResearched):modelReply(result);};try{const data=await researchProject(fixture.project,env);assert.equal(calls.length,3);assert.equal(calls[0].tools[0].type,'web_search');assert.equal(calls[0].tool_choice,'required');assert.deepEqual(calls[0].include,['web_search_call.action.sources']);assert.deepEqual(calls[1].tools[0].filters.allowed_domains,['github.com']);assert.equal(calls[1].tool_choice,'required');assert.equal(calls[2].text.format.strict,true);assert.equal(data.research.sources.length,3);assert.equal(data.research.github.repositories[0].url,fixture.githubSource.url);const p=S.fromResearch(fixture.project,data),doc=S.create(p).prd;assert.match(doc,/https:\/\/example.com\/calculator/);assert.match(doc,/6kWh/);assert.equal((doc.match(/^## /gm)||[]).length,(doc.match(/^### Implementation prompt$/gm)||[]).length);}finally{globalThis.fetch=old;}});
test('Prose claiming research without an actual completed search is rejected',()=>{assert.throws(()=>searchEvidence({output:researched.output.slice(1)}),/بحث ويب فعلي/);assert.throws(()=>searchEvidence({output:[{type:'web_search_call',status:'failed'},...researched.output.slice(1)]}),/بحث ويب فعلي/);});
test('Invented source ids and serverless proposals for shared data are rejected',async()=>{const old=globalThis.fetch;try{for(const data of [{...result,evidence:{...result.evidence,components:[{...result.evidence.components[0],source_id:'R-fake'}]}},{...result,resolved_brief:{...result.resolved_brief,storage:'shared'},analysis:{...result.analysis,capabilities:{...result.analysis.capabilities,storage:'shared'}}}]){let count=0;globalThis.fetch=async()=>++count===1?reply(researched):count===2?reply(githubResearched):modelReply(data);await assert.rejects(()=>researchProject(fixture.project,env));}}finally{globalThis.fetch=old;}});
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

test('GitHub recommendations reject topic, organization, spoofed and non-repository sources',async()=>{
 for(const url of ['https://github.com/topics/energy','https://github.com/search?q=energy','https://github.com/example','https://github.com.evil.test/example/tool','https://github.com/orgs/example','https://example.com/example/tool','javascript:alert(1)'])assert.equal(githubRepositoryURL(url),null);
 assert.equal(githubRepositoryURL('https://github.com/example/energy-planner/blob/main/README.md'),'https://github.com/example/energy-planner');
 const old=globalThis.fetch;
 try{globalThis.fetch=async()=>modelReply(result);for(const source of [{...fixture.githubSource,url:'https://github.com/topics/energy'},fixture.githubSource])await assert.rejects(()=>analyzeProject(fixture.project,{text:'Research',sources:[...fixture.sources,source],github_status:'completed',github_source_ids:source.url.includes('/topics/')?['R3']:[]},env));}finally{globalThis.fetch=old;}
});
test('No relevant GitHub matches is explicit and does not invent repositories',async()=>{
 const old=globalThis.fetch;let calls=0;
 try{const data=structuredClone(result);data.evidence.github={status:'no_match',summary:'No sufficiently similar public repository found.',repositories:[]};
 globalThis.fetch=async()=>++calls===1?reply(researched):calls===2?reply({...githubResearched,output:[{type:'web_search_call',status:'completed',action:{sources:[]}},{type:'message',content:[{type:'output_text',text:'No relevant repositories were found after search.'}]}]}):modelReply(data);
 const found=await researchProject(fixture.project,env);assert.equal(calls,3);assert.equal(found.research.github.status,'no_match');assert.equal(found.research.github.repositories.length,0);
 const doc=S.create(S.fromResearch(fixture.project,found)).prd;assert.match(doc,/No sufficiently similar public repository/);
 }finally{globalThis.fetch=old;}
});
test('GitHub outage is distinguished from no matches while general research remains usable',async()=>{
 const old=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;return calls===1?reply(researched):calls===2?new Response('{}',{status:503}):modelReply(result);};
 const data=await researchProject(fixture.project,env);assert.equal(data.research.github.status,'unavailable');assert.equal(data.research.github.repositories.length,0);assert.match(data.research.github.summary,/could not be completed/);
 }finally{globalThis.fetch=old;}
});
test('GitHub references reach PRD with one implementation prompt per section',()=>{
 const doc=S.create(S.fromResearch(fixture.project,fixture.researchResult)).prd;
 for(const text of ['Similar GitHub repositories','https://github.com/example/energy-planner','Inspiration only','Unverified'])assert.ok(doc.includes(text));
 assert.equal((doc.match(/^## /gm)||[]).length,(doc.match(/^### Implementation prompt$/gm)||[]).length);
});
