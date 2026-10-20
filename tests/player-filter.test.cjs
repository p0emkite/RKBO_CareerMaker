const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','player-filter.js'),'utf8'),ctx);
const filter=ctx.window.RKBOPlayerFilter;
const players={
 a:{id:'a',name:'Active Player',team:'KIA',seasons:{2009:{},2010:{}}},
 b:{id:'b',name:'Retired Player',team:'KIA',seasons:{2008:{},2009:{}}},
 c:{id:'c',name:'Current Pitcher',team:'SAM',aliases:['Earlier Name'],seasons:{2010:{}}},
 d:{id:'d',name:'Older Player',team:'SAM',seasons:{2007:{}}}
};
assert.equal(filter.latestSeason(players),2010);
assert.equal(filter.list(players).length,2);
assert.equal(filter.list(players,{team:'KIA'}).length,1);
assert.equal(filter.list(players,{includeRetired:true}).length,4);
assert.equal(filter.list(players,{team:'KIA',includeRetired:true}).length,2);
assert.equal(filter.list(players,{query:'Earlier'}).length,1);
assert.equal(filter.latestSeason({}),0);
assert.equal(filter.list({}).length,0);
console.log('Player filter smoke tests passed.');
