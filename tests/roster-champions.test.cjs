"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const base=path.join(__dirname,"..");
function moduleFrom(name,ctx={window:{}}){
 vm.runInNewContext(fs.readFileSync(path.join(base,name),"utf8"),ctx);
 return ctx.window;
}
const champs=moduleFrom("champions.js").RKBOChampions;
assert.equal(Object.keys(champs.DEFAULT).length,39);
assert.equal(champs.DEFAULT[60],"KIA");
assert.equal(champs.DEFAULT[57],"SAM");
assert.equal(champs.DEFAULT[22],"DOO");
const md="| **시즌** | **팀명** |\n| :----: | :-----: |\n| **60** | **KIA** |\n| **57** | **삼성** |\n| **38** | **한화** |";
const parsed=champs.parse(md);
assert.equal(parsed.errors.length,0);
assert.equal(parsed.count,3);
assert.equal(parsed.map[57],"SAM");
assert.equal(parsed.map[38],"HAN");
assert.equal(champs.parse("60,KIA\n57,삼성").errors.length,0);
assert.equal(champs.parse("60,INVALID").errors.length,1);
assert.match(champs.format(champs.DEFAULT),/60,KIA/);
const refCtx={window:{},fetch:async url=>({
 ok:true,status:200,text:async()=>fs.readFileSync(path.join(base,url.replace(/^\.\//,"")),"utf8")
})};
const refs=moduleFrom("roster.js",refCtx).RKBOReference;
(async()=>{
 const stats=await refs.load();
 assert.equal(stats.names,456);
 assert.equal(stats.englishUnique,276);
 assert.equal(stats.jerseyRows,204);
 assert.equal(stats.matchedJerseys,147);
 assert.equal(stats.unmatched.length,43);
 assert.equal(stats.unnamed,14);
 const tsuki={id:"25",name:"Tsuki Fukutomi",number:"16",kind:"pitcher",team:"SAM",seasons:{2010:{year:2010,team:"SAM",stats:{G:"30"}}}};
 const got=refs.get(tsuki);
 assert.equal(got.displayName,"츠키");
 assert.equal(got.number,"28");
 assert.equal(got.jerseyFromCSV,true);
 assert.equal(refs.get({...tsuki,seasons:{2009:{}}}).number,"16"); // 60차 아닌 선수는 배정하지 않음
 assert.equal(refs.get({...tsuki,koreanNameOverride:"사용자 입력",numberOverride:"00"}).displayName,"사용자 입력");
 assert.equal(refs.get({...tsuki,koreanNameOverride:"사용자 입력",numberOverride:"00"}).number,"00");
 assert.equal(refs.get({name:"Unknown Player",number:"15",seasons:{2010:{}}}).displayName,"Unknown Player");
 assert.ok(stats.unmatched.some(r=>r["이름"]==="윤보미"));
 console.log("Champions and Korean roster tests passed.");
})().catch(e=>{console.error(e);process.exitCode=1});
