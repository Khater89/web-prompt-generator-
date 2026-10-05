const str=(maxLength=12000,minLength=0)=>({type:'string',minLength,maxLength});
const list=(items,maxItems=30,minItems=0)=>({type:'array',items,maxItems,minItems});
const choice=values=>({type:'string',enum:values});
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const kinds=['company','calculator','workflow','control','dashboard','commerce','booking','content','saas','general'];
export const briefSchema=object({audience:str(3000),objective:str(5000),inputs:str(7000),rules:str(7000),output:str(5000),flow:str(5000),requirements:str(7000),delivery:choice(['web','mobile','both']),storage:choice(['unknown','none','local','shared']),auth:choice(['unknown','none','users','roles']),integration:choice(['unknown','none','api','ai','device','payments']),hosting:choice(['auto','file','static','server']),constraint:choice(['auto','html','react','next','angular','php']),visual:choice(['auto','premium','technical','industrial','minimal','bold']),accent:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},siteLanguage:choice(['ar-en','ar','en']),references:str(3000)});
export const discoverySchema=object({understanding:str(4000,1),project_name:str(160,1),kind:choice(kinds),brief:briefSchema,questions:list(object({id:choice(['q1','q2','q3']),question:str(1500,1),options:list(str(400,1),5)}),3)});
export const technologySchema=object({frontend:str(500,1),backend:str(1000,1),server:{type:'boolean'},rationale_ar:str(3000,1),rationale_en:str(3000,1),alternative_ar:str(2000,1),alternative_en:str(2000,1),runtime_ar:str(2000,1),runtime_en:str(2000,1),zip_ar:str(2000,1),zip_en:str(2000,1)});
export const analysisSchema=object({schema_version:{type:'integer',enum:[1]},kind:choice(kinds),summary:str(8000,1),users:list(str(3000,1)),capabilities:object({storage:choice(['unknown','none','local','shared']),auth:choice(['unknown','none','users','roles']),integration:choice(['unknown','none','api','ai','device','payments'])}),screens:list(object({name:str(300,1),purpose:str(3000,1),components:list(str(3000,1),16,1)}),12,1),flow:list(str(3000,1),30,1),functional_requirements:list(str(5000,1),30,1),domain_rules:list(str(5000,1)),data_entities:list(object({name:str(300,1),fields:list(str(3000,1))})),design_notes:str(12000,1),stack_suggestion:str(12000,1),acceptance_criteria:list(str(5000,1),30,1),non_goals:list(str(5000,1)),assumptions:list(str(5000,1)),open_questions:list(str(5000,1)),risks:list(str(5000,1)),technology:technologySchema});
export const blueprintSchema=object({analysis:analysisSchema,resolved_brief:briefSchema,prd_markdown:str(90000,600)});
export function validate(value,schema,path='response'){
 if(schema.enum&&!schema.enum.includes(value))throw Error('Invalid enum at '+path);
 if(schema.type==='string'){if(typeof value!=='string'||value.length<(schema.minLength||0)||value.length>(schema.maxLength||Infinity)||schema.pattern&&!new RegExp(schema.pattern).test(value))throw Error('Invalid string at '+path);}
 else if(schema.type==='boolean'){if(typeof value!=='boolean')throw Error('Invalid boolean at '+path);}
 else if(schema.type==='integer'){if(!Number.isInteger(value))throw Error('Invalid integer at '+path);}
 else if(schema.type==='array'){if(!Array.isArray(value)||value.length<(schema.minItems||0)||value.length>(schema.maxItems||Infinity))throw Error('Invalid list at '+path);value.forEach((v,i)=>validate(v,schema.items,path+'['+i+']'));}
 else if(schema.type==='object'){if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid object at '+path);for(const k of Object.keys(value))if(!Object.hasOwn(schema.properties,k))throw Error('Unknown field at '+path+'.'+k);for(const k of schema.required){if(!Object.hasOwn(value,k))throw Error('Missing field at '+path+'.'+k);validate(value[k],schema.properties[k],path+'.'+k);}}
 return value;
}

export const researchSchema=object({
 project_name:str(100,1),analysis:analysisSchema,resolved_brief:briefSchema,
 shape:object({layout:choice(['narrative','working','sidebar','single']),theme:choice(['light','dark','system']),motion:choice(['subtle','expressive','none']),density:choice(['comfortable','spacious','compact']),features:list(choice(['search','export','compare','charts','upload','notifications','history','contact','gallery']),9),customFeatures:str(4000)}),
 evidence:object({languages:list(str(160,1),8,1),similar_products:list(object({name:str(300,1),source_id:str(30,1),similarity:str(3000,1),lesson:str(3000,1)}),5,2),components:list(object({name:str(300,1),version:str(100),source_id:str(30,1),purpose:str(3000,1)}),12,1)})
});
