import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--use-angle=metal']});
try {
 const page=await browser.newPage({viewport:{width:1000,height:700}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:4354/puppet-studio/experiments/bramble-map/index.html');
 await page.waitForFunction(()=>window.brambleMap,null,{timeout:60000});
 await page.locator('#title-start').click({force:true});
 await page.waitForFunction(()=>brambleMap.snapshot().clock>5);
 const point=await page.evaluate(()=>{const r=brambleMap.snapshot().sunflower,p=new DOMPoint(r.x,r.y-60).matrixTransform(document.querySelector('#map').getScreenCTM());return{x:p.x,y:p.y};});
 await page.mouse.click(point.x,point.y);
 assert.equal(await page.evaluate(()=>brambleMap.snapshot().sunflower.waving),true);
 await page.locator('[data-map-character]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>brambleMap.snapshot().sunflower.waving),true);
 await page.click('#travel',{force:true});
 // Clearing precedes the end of the celebration; map input is inert until done.
 await page.waitForFunction(()=>brambleMap.snapshot().cleared.includes('camp')&&!brambleMap.snapshot().entering,null,{timeout:30000});
 await page.locator('[data-location="shop"]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>brambleMap.snapshot().selected),'shop');
 await page.click('#travel',{force:true});
 await page.waitForFunction(()=>brambleMap.snapshot().current==='shop',null,{timeout:30000});
 await page.screenshot({path:'assets/sunflower-puppet/map-meeting.png'});
 const bases=()=>page.evaluate(()=>({traveller:+document.querySelector('#traveller').dataset.drawBase,sunflower:+document.querySelector('[data-map-character]').dataset.drawBase}));
 let order=await bases();assert.ok(order.sunflower>order.traveller,'flower must cover traveller standing farther back');
 await page.locator('[data-map-character]').focus();await page.keyboard.press('Enter');
 await page.waitForTimeout(600);await page.screenshot({path:'assets/sunflower-puppet/map-wave.png'});
 await page.click('#travel',{force:true});
 await page.waitForFunction(()=>brambleMap.snapshot().cleared.includes('shop')&&!brambleMap.snapshot().entering,null,{timeout:30000});
 await page.locator('[data-location="well"]').focus();await page.keyboard.press('Enter');await page.click('#travel',{force:true});
 await page.waitForFunction(()=>brambleMap.snapshot().current==='well',null,{timeout:30000});
 order=await bases();assert.ok(order.traveller>order.sunflower,'traveller must cover flower when closer to camera');

 assert.deepEqual(errors,[]);
 const report={passed:true,checks:['click wave','keyboard wave','normal unlock progression','traveller reaches sunflower at the tree','character depth swaps in both directions','no page errors']};
 await fs.writeFile('assets/sunflower-puppet/map-verification.json',JSON.stringify(report,null,2));
 console.log(report);
} finally {await browser.close();}
