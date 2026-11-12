import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import assert from 'node:assert/strict';
const urls=new Map();
function moduleUrl(file){
  file=path.resolve(file); if(urls.has(file)) return urls.get(file);
  let code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
  code=code.replace(/from\s*(['"])(\.[^'"]+)\1/g,(_,quote,spec)=>'from '+JSON.stringify(moduleUrl(path.resolve(path.dirname(file),spec+'.ts'))));
  const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');urls.set(file,url);return url;
}
process.env.NODE_ENV='production';
delete process.env.AUTH_PIN_PEPPER;
const pin=await import(moduleUrl('src/lib/auth/pin-service.ts'));
assert.equal((await pin.authenticateStudentPin('SYNTHETIC','7'.repeat(6),'127.0.0.1','SCHOOL')).success,false);
assert.equal((await pin.authenticateParentPin('SYNTHETIC','7'.repeat(6),'127.0.0.1','SCHOOL')).success,false);
await assert.rejects(pin.hashPin('7'.repeat(6)),/unavailable/);
console.log('PASS: production rejects both mock PIN authentication paths and missing production pepper. No native Auth tested.');
