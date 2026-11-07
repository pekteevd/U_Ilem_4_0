'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const html=fs.readFileSync(path.join(__dirname,'..','U_Ilem_4_1_base.html'),'utf8');
const blocks=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=/.test(m[1]))&&m[2].trim());
for(let i=0;i<blocks.length;i++){const file=path.join(os.tmpdir(),'uilem41-inline-'+i+'.js');fs.writeFileSync(file,blocks[i][2]);cp.execFileSync(process.execPath,['--check',file],{stdio:'inherit'});fs.unlinkSync(file);}
console.log('U Ilem 4.1 inline scripts: OK ('+blocks.length+')');
