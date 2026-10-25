import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
console.log('Static frontend built. Manual PRD works offline; Auto requires a personal OpenAI key entered at runtime.');
