/* Smoke tests for the Maintenance Terminal + state store.
   Usage:  npm i jsdom  &&  node tools/devtools.test.mjs
   No build step required; jsdom is a dev-only, uncommitted dependency. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let JSDOM;
try { ({ JSDOM } = await import('jsdom')); }
catch {
  console.error('This harness needs jsdom:  npm i jsdom');
  process.exit(2);
}

const R = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs') + path.sep;
let fails=0; const ok=(c,m)=>{console.log((c?'  PASS':'  FAIL')+' — '+m); if(!c)fails++;};

function boot(url){
  const dom = new JSDOM(fs.readFileSync(R+'index.html','utf8'), {
    url, runScripts:'outside-only', pretendToBeVisual:true });
  const w = dom.window;
  w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){} });
  const run = f => w.eval(fs.readFileSync(R+f,'utf8'));
  return { w, run, dom };
}

// --- gate logic (mirrors the inline loader in index.html) ---
function gate(w){
  const p = new w.URLSearchParams(w.location.search);
  if (p.get('dev')==='1') w.localStorage.setItem('fr.dev','1');
  if (p.get('dev')==='0') w.localStorage.removeItem('fr.dev');
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(w.location.hostname) ||
    w.location.hostname.endsWith('.local') || w.location.hostname.endsWith('.e2b.app') ||
    w.location.protocol==='file:';
  return local || w.localStorage.getItem('fr.dev')==='1';
}

console.log('dev gate:');
ok(gate(boot('http://localhost:8080/').w)===true, 'localhost   -> ON');
ok(gate(boot('http://8080-abc.e2b.app/').w)===true, 'e2b preview -> ON');
ok(gate(boot('https://mister-g-lu.github.io/arena-ai-sandbox/').w)===false, 'GitHub Pages -> OFF');
{
  const b = boot('https://mister-g-lu.github.io/arena-ai-sandbox/?dev=1');
  ok(gate(b.w)===true, 'prod + ?dev=1 -> ON (opt-in)');
  const b2 = boot('https://mister-g-lu.github.io/arena-ai-sandbox/?dev=0');
  ok(gate(b2.w)===false, 'prod + ?dev=0 -> OFF');
}

console.log('\nterminal boot (localhost):');
const b = boot('http://localhost:8080/');
const errs=[]; b.w.addEventListener('error', e=>errs.push(e.message));
b.run('state.js'); b.run('app.js'); b.run('devtools.js');
const w=b.w, d=w.document;
ok(!!d.getElementById('devt'), 'panel injected into DOM');
ok(!!d.querySelector('.devt-ribbon'), 'DEV ribbon present');
ok(d.getElementById('devt').hidden===true, 'panel starts hidden');
const warps = d.querySelectorAll('.devt-warp');
ok(warps.length===10, 'all 10 warps rendered (got '+warps.length+')');
const rows = d.querySelectorAll('.devt-row');
const schemaCount = w.FR.store.SCHEMA.reduce((n,g)=>n+g.fields.length,0);
ok(rows.length===schemaCount, 'schema drives the UI: '+rows.length+' rows = '+schemaCount+' fields');
ok(!!d.querySelector('.is-hidden-stat'), 'Attention flagged as player-hidden');

console.log('\nwarp behaviour:');
const store = w.FR.store;
const summons = [...warps].find(b => b.textContent.includes('Summons'));
summons.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
ok(store.get('shift.day')===43, 'Summons warp -> day 43');
ok(store.get('shift.arc')===3, 'Summons warp -> arc 3');
ok(store.get('components.chip')===true, 'Summons warp -> components granted');
ok(store.get('zones.rooftop')==='cleared', 'Summons warp -> zones cleared');
ok(store.get('meta.devTouched')===true, 'warp marks save dev-touched');
ok(d.getElementById('day').textContent==='43', 'console readout re-rendered to 43');
ok(d.querySelector('.devt-ribbon').classList.contains('is-touched'), 'ribbon turns red when touched');

console.log('\ninputs reflect + write state:');
const doubtRow=[...d.querySelectorAll('.devt-row')].find(r=>r.textContent.includes('Doubt'));
const inp=doubtRow.querySelector('.devt-input');
ok(inp.value==='10','number input shows current value');
inp.value='3'; inp.dispatchEvent(new w.Event('change'));
ok(store.get('qualities.doubt')===3,'editing an input writes to the store');
inp.value='999'; inp.dispatchEvent(new w.Event('change'));
ok(store.get('qualities.doubt')===10,'values clamp to schema max');

const godRow=[...d.querySelectorAll('.devt-row')].find(r=>r.textContent.includes('God mode'));
const cb=godRow.querySelector('input[type=checkbox]');
cb.checked=true; cb.dispatchEvent(new w.Event('change'));
ok(store.get('toggles.godMode')===true,'checkbox toggles a boolean');

const zoneRow=[...d.querySelectorAll('.devt-row')].find(r=>r.textContent.includes('Vent Network'));
const sel=zoneRow.querySelector('select');
sel.value='closed'; sel.dispatchEvent(new w.Event('change'));
ok(store.get('zones.vents')==='closed','select sets an enum');

console.log('\nshift controls drive real game code:');
store.patch({shift:{day:5,tasks:50,minutes:60}});
const acts=[...d.querySelectorAll('.devt-btn')];
acts.find(b=>b.textContent==='+10 tasks').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
ok(store.get('shift.tasks')===40,'+10 tasks burns 10 tasks');
ok(d.querySelectorAll('#log .log-line').length>=10,'…and writes 10 real log lines');
acts.find(b=>b.textContent==='End shift').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
ok(store.get('shift.minutes')===360,'End shift jumps clock to 06:00');
ok(d.getElementById('next-btn').hidden===false,'End shift reveals the next-shift button');
acts.find(b=>b.textContent==='Next shift').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
ok(store.get('shift.day')===6 && store.get('shift.tasks')===50,'Next shift advances the day');

console.log('\nkeyboard + slots:');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'`',bubbles:true}));
ok(d.getElementById('devt').hidden===false,'backtick opens the terminal');
d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
ok(d.getElementById('devt').hidden===true,'escape closes it');
const ta=d.querySelector('.devt-json');
acts.find(b=>b.textContent.includes('Export')).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
ok(ta.value.includes('"day": 6'),'export dumps JSON');
ok(errs.length===0,'no uncaught errors ('+errs.join('; ')+')');

console.log(fails?`\n${fails} FAILURE(S)`:'\nALL PASS');
process.exit(fails?1:0);
