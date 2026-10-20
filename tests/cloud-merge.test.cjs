"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","cloud-merge.js"),"utf8"),ctx);
const {combine}=ctx.window.RKBOCloudMerge;
const remote={
 p1:{id:"p1",name:"Player One",kind:"pitcher",team:"LG",latestYear:2009,
     seasons:{2009:{year:2009,team:"LG",stats:{G:"22",IP:"90.0"}}},
     postSeasons:{2009:{year:2009,team:"LG",stats:{G:"2",ERA:"2.40"}}}},
 p2:{id:"p2",name:"Remote Only",kind:"batter",seasons:{2008:{year:2008,team:"NC",stats:{G:20}}}}
};
const local={
 p1:{id:"p1",name:"Player One",kind:"pitcher",team:"SAM",latestYear:2010,
     seasons:{2010:{year:2010,team:"SAM",stats:{G:"30",IP:"100.0"}}},
     postSeasons:{2010:{year:2010,team:"SAM",stats:{G:"3",ERA:"3.10"}}}},
 p3:{id:"p3",name:"Local Only",kind:"batter",team:"KIA",
    seasons:{2010:{year:2010,team:"KIA",stats:{G:"1"}}},
    postSeasons:{2010:{year:2010,team:"KIA",stats:{G:"3",AVG:".333"}}}}
};
const merged=combine(remote,local);
assert.equal(Object.keys(merged.players).length,3);
assert.equal(merged.players.p1.seasons[2009].team,"LG");
assert.equal(merged.players.p1.seasons[2010].team,"SAM");
assert.equal(merged.players.p1.postSeasons[2009].stats.ERA,"2.40");
assert.equal(merged.players.p1.postSeasons[2010].stats.ERA,"3.10");
assert.equal(merged.players.p2.name,"Remote Only");
assert.equal(merged.players.p3.postSeasons[2010].team,"KIA");
assert.equal(merged.addedPlayers,1);
assert.equal(merged.addedPostseason,2);
assert.equal(merged.conflicts.length,0);
const mismatch=combine(remote,{p1:{...local.p1,postSeasons:{
  2009:{year:2009,team:"LG",stats:{G:"2",ERA:"9.99"}}
}}});
assert.equal(mismatch.conflicts.filter(x=>x.type==="postseason").length,1);
assert.equal(mismatch.players.p1.postSeasons[2009].stats.ERA,"9.99");
assert.equal(remote.p1.postSeasons[2009].stats.ERA,"2.40","merge must not mutate stored GitHub snapshot");
const differentKind=combine(remote,{p1:{id:"p1",kind:"batter",seasons:{}}});
assert.equal(differentKind.conflicts[0].type,"player-kind");
assert.equal(differentKind.players.p1.kind,"pitcher");
console.log("Cloud merge preserves remote+local regular and postseason records, warns on conflicts.");
