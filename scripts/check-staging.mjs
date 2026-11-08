import { spawn } from 'node:child_process';
import net from 'node:net';
import { once } from 'node:events';
import assert from 'node:assert/strict';
assert.equal(process.env.SAAS_TEST_ISOLATED,'1');
const db=new URL(process.env.DATABASE_URL);
assert.ok(['127.0.0.1','localhost'].includes(db.hostname));
assert.match(db.pathname,/^\/quanlihocau_(staging_saas|ci)$/);
const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
const origin=`http://127.0.0.1:${port}`;
const env={...process.env,NEXTAUTH_URL:origin,NEXT_PUBLIC_APP_URL:origin,TEST_BASE_URL:origin,GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:''};
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let logs='';
for(const stream of [server.stdout,server.stderr])stream.on('data',chunk=>{logs=(logs+chunk).slice(-5000);});
const run=(file)=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[file],{env,windowsHide:true,stdio:'inherit'});
  child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`${file} failed (${code})`)));
});
try {
  let ready=false;
  for(let i=0;i<60;i++){
    if(server.exitCode!==null)throw new Error('Staging server exited before readiness');
    try{const r=await fetch(origin+'/api/ping',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.ok(ready,'Staging server did not become ready');
  await run('scripts/test-staging.mjs');
  await run('scripts/verify-staging-recovery.mjs');
} catch(error) {
  console.error(error.message);console.error(logs);process.exitCode=1;
} finally {
  server.kill();
  await Promise.race([once(server,'exit'),new Promise(resolve=>setTimeout(resolve,3000))]);
}
