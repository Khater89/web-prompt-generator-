import {copyFile,readdir} from 'node:fs/promises';
for(const file of await readdir('public'))await copyFile('public/'+file,file);
console.log('Root browser files updated from public/.');
