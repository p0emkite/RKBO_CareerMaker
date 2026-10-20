const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ctx = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'rkbo-xls.js'), 'utf8'), ctx);
const {same, match, reconcile, outs} = ctx.window.RKBOXls;

const stats = Object.fromEntries(['G','AVG','OBP','SLG','AB','H','2B','3B','HR','R','RBI','BB','K','SB','CS']
  .map((key, index) => [key, String(index + 1)]));
assert.equal(same(stats, {...stats}, 'batter'), true);
assert.equal(same(stats, {...stats, HR: '99'}, 'batter'), false);
assert.equal(outs('38.67'), 116);
assert.equal(outs('38.7'), 116);
const hh = {
  id: '42', name: 'Old Name', kind: 'batter', team: 'LG', number: '5',
  latestYear: 2010, hhLatestYear: 2010,
  seasons: {2010: {year: 2010, team: 'LG', stats}},
  career: stats
};
const renamed = {
  id: 'xls:batter:newname', name: 'New Name', kind: 'batter', team: 'KIA',
  number: '', latestYear: 2011,
  seasons: {
    2010: {year: 2010, team: 'LG', stats},
    2011: {year: 2011, team: 'KIA', stats}
  }
};
assert.equal(match(renamed, {'42': hh}).id, '42');
const merged = reconcile({'42': hh}, [renamed]);
assert.equal(Object.keys(merged.players).length, 1);
assert.equal(merged.players['42'].name, 'New Name');
assert.equal(merged.players['42'].seasons[2010].team, 'LG');
assert.equal(merged.players['42'].seasons[2011].team, 'KIA');
assert.equal(match(renamed, {'42': hh, '77': {...hh, id: '77'}}).why, 'ambiguous');
const pitcherKeys = ['ERA','W','L','SV','BS','G','GS','CG','SHO','IP','K','BB','H','2B','3B','HR','SB','CS','BK','WP','R','ER','AVG','OBP','SLG'];
const hhp = Object.fromEntries(pitcherKeys.map((k,i)=>[k,k==='IP'?'92.33':k==='WP'?'14':String(i+1)]));
const xlsp = {...hhp,IP:'92.3',WP:'7'};
const pitcher = {id:'160',name:'Tsuki Fukutomi',kind:'pitcher',team:'SAM',number:'16',latestYear:2010,hhLatestYear:2010,seasons:{1997:{year:1997,team:null,stats:hhp}},career:hhp};
const teamHistory = {id:'xls:pitcher:tsukifukutomi',name:'Tsuki Fukutomi',kind:'pitcher',team:'KIA',latestYear:1997,seasons:{1997:{year:1997,team:'KIA',stats:xlsp}}};
assert.equal(match(teamHistory,{'160':pitcher}).why,'same-name');
const linked = reconcile({'160':pitcher},[teamHistory]);
assert.equal(linked.players['160'].seasons[1997].team,'KIA');
assert.equal(linked.players['160'].seasons[1997].stats.WP,'14');
console.log('Importer smoke tests passed.');
