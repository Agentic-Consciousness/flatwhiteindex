// Exercise the release's failure boundaries with mocked providers only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { parseStagedDeployment } from './capture-staged-deployment.mjs';

const code = readFileSync(new URL('./accept-promote-production.mjs', import.meta.url), 'utf8');
const team = 'team_xyQ79UW6Bz7wt6O8KsL2NuRO';
const project = 'prj_Y3gIgq8bSrJ60hjhxDJs28yw63gP';
const sha = 'a'.repeat(40);
const next = 'dpl_TestNext';
const old = 'dpl_TestPrevious';
const other = 'dpl_ConcurrentRelease';
const allContent = "Flat White Index Sydney Flat White Index A city, measured Flat White Index One question. methodology";
const aliases = ["flatwhiteindex.com.au", "www.flatwhiteindex.com.au", "flatwhiteindex-delta.vercel.app", "flatwhiteindex-danieljhall-mecoms-projects.vercel.app"];
const cliOutput={status:'ok',deployment:{id:next,url:'https://flatwhiteindex-test.vercel.app',readyState:'READY',target:'production'}};
assert.deepEqual(parseStagedDeployment(JSON.stringify(cliOutput)),{id:next,url:cliOutput.deployment.url});
for(const mutate of [
  value=>{value.status='error';},
  value=>{value.deployment.readyState='BUILDING';},
  value=>{value.deployment.target='preview';},
  value=>{value.deployment.url='https://other-project.vercel.app';},
  value=>{value.deployment.url='https://flatwhiteindex-test.vercel.app/extra';},
  value=>{value.deployment.id='not-a-deployment';},
]) {
  const value=structuredClone(cliOutput);mutate(value);
  assert.throws(()=>parseStagedDeployment(JSON.stringify(value)));
}
assert.throws(()=>parseStagedDeployment('https://flatwhiteindex-test.vercel.app'));

async function exercise(fault) {
  let serving = old;
  const promotions = [];
  const requests = [];
  const env = {
    GITHUB_SERVER_URL:'http://192.168.1.130:3000',GITHUB_REPOSITORY:'hallyaus/flatwhiteindex',GITHUB_REF:'refs/heads/master',
    VERCEL_ORG_ID:team,VERCEL_PROJECT_ID:project,VERCEL_TOKEN:'mock-only-not-a-credential',SOURCE_TOKEN:'mock-job-only',
    GITHUB_EVENT_NAME:fault==='initial-cutover'?'workflow_dispatch':'push',GITHUB_SHA:sha,DEPLOYMENT_URL:'https://flatwhiteindex-test.vercel.app',
  };
  const spawnSync = (executable, args) => {
    assert.equal(executable,'vercel');
    const response = value => ({status:0,stdout:typeof value==='string'?value:JSON.stringify(value),stderr:''});
    if(args[0]==='api') {
      if(args[1].startsWith('/v13/deployments/')) return response({
        id:next,readyState:'READY',target:'production',projectId:fault==='wrong-project'?'prj_Other':project,
        ownerId:team,url:'flatwhiteindex-test.vercel.app',regions:fault==='wrong-region'?['iad1']:['syd1'],
        meta:{giteaCommitSha:fault==='wrong-sha'?'b'.repeat(40):sha,giteaRepository:'hallyaus/flatwhiteindex',source:'vm300-gitea'},
      });
      if(args[1].startsWith('/v9/projects/')) return response({id:project,name:'flatwhiteindex',accountId:team,nodeVersion:'22.x',crons:{disabledAt:null,deploymentId:serving,definitions:[{"path": "/api/cron/dispatch", "schedule": "*/15 23 * * 1-5"}, {"path": "/api/cron/dispatch", "schedule": "*/15 0-5 * * 1-5"}]},link:fault==='github-trigger'?{}:fault==='initial-cutover'?{type:'github',org:'HallyAus',repo:'flatwhiteindex',repoId:1191498679,productionBranch:'master'}:null,targets:{production:{id:serving}}});
      if(args[1].startsWith('/v4/aliases?')) return response({aliases:aliases.map(alias=>({alias,deploymentId:serving}))});
    }
    if(args[0]==='curl') {
      assert.ok(["/", "/sydney-coffee-price-report-2026", "/press.html"].includes(args[1]));
      return response(fault==='bad-stage-content'?'Unexpected deployment':allContent);
    }
    if(args[0]==='promote') {promotions.push(args[1]);serving=args[1];return response('');}
    if(args[0]==='logs') return response((fault==='runtime-errors'&&serving===next)?'{}\n':'');
    throw new Error(`Unexpected mocked CLI operation: ${args[0]}`);
  };
  const fetch = async (url, options={}) => {
    requests.push({url,method:options.method??'GET'});
    if(url.startsWith('http://192.168.1.130:3000/api/')) return {status:200,json:async()=>({name:'master',commit:{id:fault==='newer-source'?'b'.repeat(40):sha}})};
    assert.ok(url.startsWith('https://www.flatwhiteindex.com.au')||url==='https://www.flatwhiteindex.vercel.app/');
    if(fault==='concurrent-release') serving=other;
    if(url==='https://www.flatwhiteindex.vercel.app/') return {status:308,headers:{get:()=> 'https://flatwhiteindex.vercel.app/'}};
    return {status:['public-failure','concurrent-release'].includes(fault)?500:200,text:async()=>allContent};
  };
  const context=createContext({process:{env},console:{log(){}},URL,AbortSignal,fetch});
  const releaseModule=new SourceTextModule(code,{context});
  await releaseModule.link(specifier=>{
    const value=specifier==='node:assert/strict'?{default:assert}:specifier==='node:child_process'?{spawnSync}:null;
    assert.ok(value,`Unexpected import ${specifier}`);
    return new SyntheticModule(Object.keys(value),function(){for(const [k,v]of Object.entries(value))this.setExport(k,v);},{context});
  });
  let failed=false;
  try {await releaseModule.evaluate();} catch {failed=true;}
  return {failed,promotions,serving,requests};
}

const initial=await exercise('initial-cutover'); assert.equal(initial.failed,true); assert.deepEqual(initial.promotions,[]);
const success=await exercise('none');
assert.equal(success.failed,false);
assert.deepEqual(success.promotions,[next]);
assert.equal(success.serving,next);
assert.ok(success.requests.every(r=>['GET','HEAD'].includes(r.method)));
for(const fault of ['wrong-project','wrong-region','wrong-sha','github-trigger','newer-source','bad-stage-content']) {
  const result=await exercise(fault);
  assert.equal(result.failed,true,fault);
  assert.deepEqual(result.promotions,[],fault);
  assert.equal(result.serving,old,fault);
}
for(const fault of ['public-failure','runtime-errors']) {
  const result=await exercise(fault);
  assert.equal(result.failed,true,fault);
  assert.deepEqual(result.promotions,[next,old],fault);
  assert.equal(result.serving,old,fault);
}
const concurrent=await exercise('concurrent-release');
assert.equal(concurrent.failed,true);
assert.deepEqual(concurrent.promotions,[next]);
assert.equal(concurrent.serving,other,'Never roll back over a concurrent release');
console.log('Release gates passed: success, six pre-promotion refusals, two rollback cases, concurrent-release preservation. Providers were mocked; no network request or secret was used.');
