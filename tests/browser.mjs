import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({server:{host:'127.0.0.1',port:3015,strictPort:true,hmr:false}});await server.listen();
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'],headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
let embeddings=0;page.on('request',r=>{if(r.url().includes(':embedContent'))embeddings++});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
try {
await page.goto('http://127.0.0.1:3015/story/index.html',{waitUntil:'domcontentloaded'});
await page.evaluate(()=>localStorage.setItem('fusion_history',JSON.stringify([{id:'legacy',name:'Lữ khách thử',description:'Huyết thống Saiyan',level:350,powerLevel:35000,rank:'CHIẾN BINH PHÀM NHÂN',baseCharacters:[],quote:'Bảo vệ đồng đội',compatibility_score:100,compatibility_status:'Stable',imageUrl:''}])));
await page.goto('http://127.0.0.1:3015/story/index.html?fusion=legacy',{waitUntil:'domcontentloaded'});
await page.locator('#fusion-personality').waitFor();assert.equal(await page.locator('#fusion-personality').inputValue(),'');
await page.route('**/models/**:generateContent**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:'Điềm tĩnh và bảo vệ đồng đội.'}],role:'model'},finishReason:'STOP'}]})}));
await page.evaluate(()=>sessionStorage.setItem('multiverse_api_key','test-only-placeholder'));
await page.getByText('✨ AI gợi ý tính cách',{exact:true}).click();
await page.waitForFunction(()=>document.querySelector('#fusion-personality').value==='Điềm tĩnh và bảo vệ đồng đội.');
await page.getByText('Lưu tính cách vào thẻ gốc',{exact:true}).click();
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fusion_history'))[0].personality),'Điềm tĩnh và bảo vệ đồng đội.');
await page.evaluate(async()=>{
 const {geminiService}=await import('/story/services/geminiService.ts');
 window.testCalls=[];
 geminiService.generateTurn=async(...args)=>{window.testCalls.push(args);const parsed={narrative:'Nhân vật bước vào thế giới mới.',stats:{name:args[3],realm:'AI sai cảnh giới',status:'Khỏe mạnh',inventory:['Kiếm thử'],talents:['Bay'],currentLocation:'Cổng mới'},options:[{label:'Đi tiếp',action:'Đi tiếp',type:'safe'}],isGameOver:false,newRegistry:[{name:'Kiếm khí',type:'SKILL',description:'Chiêu thức đã học',status:'Đã học'}]};return {parsed,raw:JSON.stringify(parsed)}};
});
await page.getByText('Bắt Đầu',{exact:true}).click();await page.getByTitle('Hành trình đa thế giới').waitFor();
let saves=await page.evaluate(async()=>{const {db}=await import('/story/db.ts');return db.sessions.toArray()});assert.equal(saves.length,1);assert.equal(saves[0].power.level,350);
await page.getByTitle('Hành trình đa thế giới').click();await page.getByText('Lưu nhân vật về sổ dung hợp',{exact:true}).click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('fusion_history')).length===2);
let cards=await page.evaluate(()=>JSON.parse(localStorage.getItem('fusion_history')));assert.equal(cards[1].id,'legacy');assert(cards[0].storyProgress.traits.talents.some(x=>x.includes('Kiếm khí')));
await page.getByText('Sang thế giới tiếp theo',{exact:true}).click();await page.getByText('Bắt Đầu',{exact:true}).waitFor();
await page.getByText('Bắt Đầu',{exact:true}).click();await page.getByTitle('Hành trình đa thế giới').waitFor();
saves=await page.evaluate(async()=>{const {db}=await import('/story/db.ts');return db.sessions.toArray()});assert.equal(saves.length,2);assert.equal(saves[0].journeyId,saves[1].journeyId);assert.equal(saves[1].worldSettings.travelContext.visited.length,1);assert(saves[1].worldSettings.travelContext.stats.talents.some(x=>x.includes('Kiếm khí')));
await page.getByTitle('Hành trình đa thế giới').click();await page.getByText('Lưu nhân vật về sổ dung hợp',{exact:true}).click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fusion_history')).length),2);
await page.getByText('Hồ sơ và sức mạnh hiện tại',{exact:true}).click();await page.getByLabel('Cấp sức mạnh gốc',{exact:true}).fill('1000');await page.getByText('Lý do thay đổi',{exact:true}).locator('input').fill('Tu luyện sau hành trình');await page.getByText('Xác nhận sức mạnh mới',{exact:true}).click();await page.getByRole('status').filter({hasText:'Đã lưu.'}).waitFor();
if(process.env.BROWSER_SCREENSHOT_DIR)await page.screenshot({path:process.env.BROWSER_SCREENSHOT_DIR+'/journey.png',fullPage:false});
await page.getByText('Đóng',{exact:true}).click();
if(process.env.BROWSER_SCREENSHOT_DIR)await page.screenshot({path:process.env.BROWSER_SCREENSHOT_DIR+'/mobile.png',fullPage:false});
// Returning through an evolved card restores its carried state and does not modify prior worlds.
const evolvedId=await page.evaluate(()=>JSON.parse(localStorage.getItem('fusion_history'))[0].id);
await page.goto('http://127.0.0.1:3015/story/index.html?fusion='+encodeURIComponent(evolvedId),{waitUntil:'domcontentloaded'});
await page.locator('#fusion-personality').waitFor();
assert.equal(await page.locator('#fusion-personality').inputValue(),'Điềm tĩnh và bảo vệ đồng đội.');
assert(await page.getByText(/Tiếp nối hành trình/).isVisible());
// Independent native character can also become a collection card.
await page.goto('http://127.0.0.1:3015/story/index.html',{waitUntil:'domcontentloaded'});
await page.getByText('Khởi Tạo Thế Giới',{exact:true}).click();await page.getByPlaceholder('Tên nhân vật...').fill('Nhân vật tự tạo');
await page.evaluate(async()=>{const {geminiService}=await import('/story/services/geminiService.ts');geminiService.generateTurn=async(...args)=>{const parsed={narrative:'Khởi hành.',stats:{name:args[3],realm:'Phàm nhân',status:'Khỏe',inventory:[]},options:[],isGameOver:false};return{parsed,raw:JSON.stringify(parsed)}}});
await page.getByText('Bắt Đầu',{exact:true}).click();await page.getByTitle('Hành trình đa thế giới').click();await page.getByText('Lưu nhân vật về sổ dung hợp',{exact:true}).click();
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('fusion_history')).some(c=>c.name==='Nhân vật tự tạo'));
// Exercise the real service/SDK adapter using intercepted network responses, then failure rollback.
await page.route('**/models/**:embedContent**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({embeddings:[]})}));
await page.route('**/models/**:generateContent**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({narrative:'SDK mở cổng.',stats:{name:'SDK',realm:'Sai',status:'Khỏe',inventory:['Vật SDK']},options:[],isGameOver:false})}],role:'model'},finishReason:'STOP'}]})}));
await page.goto('http://127.0.0.1:3015/story/index.html?fusion=legacy',{waitUntil:'domcontentloaded'});await page.getByText('Bắt Đầu',{exact:true}).click();await page.getByTitle('Hành trình đa thế giới').waitFor();
const backup=await page.evaluate(async()=>{const {db}=await import('/story/db.ts');const sessions=await db.sessions.toArray();const session=sessions.at(-1);return{session,turns:await db.turns.where('sessionId').equals(session.id).toArray(),encyclopedia:[],sessionCount:sessions.length}});
await page.getByText('Hoàn Tác',{exact:true}).click();
assert.equal(await page.evaluate(async(id)=>{const {db}=await import('/story/db.ts');return db.turns.where('sessionId').equals(id).count()},backup.session.id),backup.turns.length);
await page.getByTitle('Về màn hình chính').click();
await page.locator(`[data-session-id="${backup.session.id}"]`).click();await page.getByTitle('Hành trình đa thế giới').waitFor();
assert.equal(await page.evaluate(async()=>{const {db}=await import('/story/db.ts');return db.sessions.count()}),backup.sessionCount);
await page.getByTitle('Về màn hình chính').click();
await page.locator('input[type=file]').setInputFiles({name:'save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
await page.getByTitle('Hành trình đa thế giới').waitFor();
assert.equal(await page.evaluate(async()=>{const {db}=await import('/story/db.ts');return db.sessions.count()}),backup.sessionCount+1);
const original=await page.evaluate(async(id)=>{const {db}=await import('/story/db.ts');return db.turns.where('sessionId').equals(id).toArray()},backup.session.id);
assert.equal(original.length,backup.turns.length);assert(original.length>0);
// Five actual SDK turns trigger summarization; undo restores the previous wiki and summary together.
let storyStep=0;
await page.route('**/models/**:generateContent**',route=>{
 const body=route.request().postData()||'';const summarizing=body.includes('Tóm tắt ngắn gọn');
 if(!summarizing)storyStep++;
 const text=summarizing?'Summary after fifth turn':JSON.stringify({narrative:'Step '+storyStep,stats:{name:'SDK',realm:'A',status:'Khỏe',inventory:['Vật SDK']},newRegistry:[{name:'NPC kiểm thử',type:'NPC',description:'wiki-step-'+storyStep,status:'Alive'}],options:[],isGameOver:false});
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text}],role:'model'},finishReason:'STOP'}]})});
});
for(let i=0;i<5;i++){await page.getByText('Tiếp Tục',{exact:true}).click();await page.waitForFunction(()=>!document.querySelector('button[title="Hành trình đa thế giới"]').disabled);}
const activeId=await page.evaluate(async()=>{const {db}=await import('/story/db.ts');return(await db.sessions.toArray()).at(-1).id});
assert.equal(await page.evaluate(async(id)=>{const{db}=await import('/story/db.ts');return(await db.sessions.get(id)).summary},activeId),'Summary after fifth turn');
await page.getByText('Hoàn Tác',{exact:true}).click();
await page.waitForFunction(async id=>{const{db}=await import('/story/db.ts');return(await db.sessions.get(id)).summary!=='Summary after fifth turn'},activeId);
assert(!(await page.evaluate(async id=>{const{db}=await import('/story/db.ts');return JSON.stringify(await db.encyclopedia.where('sessionId').equals(id).toArray())},activeId)).includes('wiki-step-5'));
const countBefore=await page.evaluate(async()=>{const {db}=await import('/story/db.ts');return db.turns.count()});
await page.route('**/models/**:generateContent**',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:{code:400,message:'Mock failed request',status:'INVALID_ARGUMENT'}})}));
let failed=false;page.once('dialog',()=>{failed=true});await page.getByText('Tiếp Tục',{exact:true}).click();await page.waitForFunction(()=>!document.querySelector('button[title="Hành trình đa thế giới"]').disabled);assert(failed);
assert.equal(await page.evaluate(async()=>{const {db}=await import('/story/db.ts');return db.turns.count()}),countBefore);
// Desktop lab can read all exported cards without a runtime error.
await page.setViewportSize({width:1280,height:800});await page.goto('http://127.0.0.1:3015/index.html',{waitUntil:'domcontentloaded'});await page.getByText('BẮT ĐẦU GAME',{exact:true}).click();await page.getByText('Sổ Dung Hợp',{exact:true}).first().click();await page.getByText('Nhân vật tự tạo',{exact:true}).first().waitFor();
// Retry only artwork, leaving the card identity, stats, count and fusion quota intact.
await page.getByText('Nhân vật tự tạo',{exact:true}).first().click();
const cardsBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('fusion_history')));
const quotaBefore=await page.evaluate(()=>localStorage.getItem('fusion_quota_used'));
let imageCalls=0;
await page.route('**/models/**:generateContent**',route=>{imageCalls++;return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:{code:400,message:'Image test failure',status:'INVALID_ARGUMENT'}})})});
await page.getByText('Tạo lại riêng ảnh',{exact:true}).click();await page.getByText('Ảnh nhân vật chưa tạo thành công.',{exact:true}).waitFor();assert.equal(imageCalls,1);
await page.route('**/models/**:generateContent**',route=>{imageCalls++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:'image/svg+xml',data:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="red"/></svg>').toString('base64')}}],role:'model'}}]})})});
await page.getByText('Tạo lại riêng ảnh',{exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('fusion_history')).find(c=>c.name==='Nhân vật tự tạo').imageStatus==='ready');
const cardsAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('fusion_history')));assert.equal(cardsAfter.length,cardsBefore.length);
const before=cardsBefore.find(c=>c.name==='Nhân vật tự tạo'),after=cardsAfter.find(c=>c.name==='Nhân vật tự tạo');assert.equal(before.id,after.id);assert.equal(before.powerLevel,after.powerLevel);assert.equal(before.personality,after.personality);assert.notEqual(before.imageUrl,after.imageUrl);assert.equal(imageCalls,2);assert.equal(await page.evaluate(()=>localStorage.getItem('fusion_quota_used')),quotaBefore);
assert.equal(embeddings,0);assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS new fixes: full undo wiki/summary, zero embedding requests, failed/successful image-only retry without duplicate card or fusion quota increment.');
console.log('PASS browser mobile: AI personality (mocked SDK response), legacy save, native-character export, evolved-card reimport, launch, card export with learned skills, second world, stable journey identity, no duplicate cards, approved power update, opening undo protection, local resume, collision-safe JSON import, failed-request rollback; no page errors. AI mocked.');
}catch(e){console.error(e);console.log((await page.locator('body').innerText()).slice(0,2500));throw e;}finally{await browser.close();await server.close();}
