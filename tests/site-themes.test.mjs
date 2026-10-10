import test from 'node:test';
import assert from 'node:assert/strict';
import {savePalettes} from '../lib/site-themes.mjs';

test('an unresponsive theme save aborts instead of leaving the admin waiting indefinitely',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let requestSignal;
 const client={rpc:()=>({abortSignal(signal){
  requestSignal=signal;
  return new Promise(resolve=>signal.addEventListener('abort',()=>resolve({data:null,error:{message:'Request aborted'}}),{once:true}));
 }})};
 const saved=savePalettes(client,{dark_theme:'original',light_theme:'sage'});
 const rejection=assert.rejects(saved,/Saving timed out\. Reload to check/);
 t.mock.timers.tick(10000);
 await rejection;
 assert.equal(requestSignal.aborted,true);
});
