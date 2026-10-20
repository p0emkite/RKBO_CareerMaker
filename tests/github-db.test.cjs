"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const initial={schema:2,players:{"42":{id:"42",name:"김츠키",team:"KIA",seasons:{"2010":{year:2010}}}},currentSeason:60,champions:{}};
let serverContent=initial,sha="before",lastPut=null,allowAuth=false;
function response(status,json){
 return {ok:status>=200&&status<300,status,statusText:status===404?"Not Found":"Error",json:async()=>json};
}
function mockFetch(url,options={}){
 const method=options.method||"GET";
 if(url.endsWith("/repos/p0emkite/RKBO_CareerMaker"))return Promise.resolve(response(200,{full_name:"p0emkite/RKBO_CareerMaker"}));
 if(url.includes("/contents/data/career-db.json")){
  if(method==="GET")return Promise.resolve(response(200,{type:"file",sha,content:Buffer.from(JSON.stringify(serverContent),"utf8").toString("base64")}));
  if(method==="PUT"){
   if(!options.headers.Authorization)return Promise.resolve(response(401,{message:"Unauthorized"}));
   const data=JSON.parse(options.body);
   assert.equal(data.sha,sha);
   assert.equal(data.branch,"main");
   assert.equal(data.message,"data: update RKBO career database");
   lastPut=data;serverContent=JSON.parse(Buffer.from(data.content,"base64").toString("utf8"));
   sha="after";return Promise.resolve(response(200,{content:{sha},commit:{sha:"commit-sha"}}));
  }
 }
 throw Error("unexpected mock URL "+url);
}
const ctx={
 window:{},fetch:mockFetch,
 atob:s=>Buffer.from(s,"base64").toString("binary"),
 btoa:s=>Buffer.from(s,"binary").toString("base64"),
 TextEncoder,TextDecoder,Uint8Array,Date
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","github-db.js"),"utf8"),ctx);
const db=ctx.window.RKBOGitHubDB;
(async()=>{
 const loaded=await db.read();
 assert.equal(loaded.data.currentSeason,60);
 assert.equal(loaded.data.players[42].name,"김츠키");
 assert.equal(db.getKnownSha(),"before");
 await assert.rejects(()=>db.save(initial),/토큰/);
 await db.connect("github_pat_FAKE_FOR_TESTING");
 assert.equal(db.isConnected(),true);
 const saved=await db.save({...initial,currentSeason:61});
 assert.equal(saved.sha,"after");
 assert.equal(serverContent.currentSeason,61);
 assert.equal(serverContent.players[42].name,"김츠키");
 assert.ok(lastPut.content);
 sha="externally-updated";
 await assert.rejects(()=>db.save(initial),/변경/);
 db.disconnect();
 assert.equal(db.isConnected(),false);
 console.log("GitHub DB sync smoke tests passed.");
})().catch(error=>{console.error(error);process.exitCode=1});
