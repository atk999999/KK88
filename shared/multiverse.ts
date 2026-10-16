import type { GameSession, GameStats, FusionTemplate, WorldSettings, Turn } from '../story/types';
export interface PowerState { level: number; chaos: boolean; }
export interface PowerBand { minLevel: number; label: string; }
export interface PowerRules { bands: PowerBand[]; chaosLabel: string; }
export interface JourneyRecord { world: string; genre: string; summary: string; departedAt: number; }
export interface TravelContext { stats: GameStats; memories: string; visited: JourneyRecord[]; }
export const defaultRules = (): PowerRules => ({bands:[{minLevel:1,label:'Phàm nhân'},{minLevel:100,label:'Tinh anh'},{minLevel:350,label:'Siêu phàm'},{minLevel:1000,label:'Huyền thoại'},{minLevel:50000,label:'Bán thần'},{minLevel:100000,label:'Thần'},{minLevel:10000000,label:'Thiên sứ'},{minLevel:30000000000,label:'Đại thiên sứ'},{minLevel:3000000000000,label:'Đa vũ trụ'},{minLevel:3e18,label:'Khởi nguyên'}],chaosLabel:'Hỗn Độn Thần'});
export function validatePower(p: PowerState): PowerState {
 if (!Number.isFinite(p.level) || p.level < 1 || p.level > 1e30 || !Number.isInteger(p.level)) throw Error('Cấp sức mạnh phải là số nguyên từ 1 đến 1e30.');
 return {level:p.level,chaos:!!p.chaos};
}
export function powerOf(card?: Partial<FusionTemplate>): PowerState {
 return validatePower({level:Number(card?.level)||1,chaos:/hỗn độn|chaos/i.test(card?.rank||'')});
}
export function validateRules(r:PowerRules):PowerRules {
 if(!r.bands.length || r.bands.length>30 || !r.chaosLabel.trim()) throw Error('Cần 1–30 cảnh giới và tên cảnh giới Hỗn Độn.');
 const bands=r.bands.map(b=>({minLevel:validatePower({level:Number(b.minLevel),chaos:false}).level,label:b.label.trim()})).sort((a,b)=>a.minLevel-b.minLevel);
 if(bands[0].minLevel!==1 || bands.some((b,i)=>!b.label || (i>0 && b.minLevel===bands[i-1].minLevel))) throw Error('Mốc đầu phải là 1; tên không trống và các mốc không trùng nhau.');
 return {bands,chaosLabel:r.chaosLabel.trim()};
}
export function realmOf(p:PowerState,r:PowerRules):string {
 validatePower(p);const rules=validateRules(r);
 return p.chaos?`${rules.chaosLabel} · ${p.level} ⭐`:[...rules.bands].reverse().find(b=>p.level>=b.minLevel)!.label;
}
export function canonicalStats(stats:GameStats,p:PowerState,r:PowerRules):GameStats {
 return {...stats,realm:realmOf(p,r),attributes:[...(stats.attributes||[]).filter(a=>!['Cấp gốc','BP gốc','Sao Hỗn Độn'].includes(a.key)),{key:p.chaos?'Sao Hỗn Độn':'Cấp gốc',value:p.level},...(p.chaos?[]:[{key:'BP gốc',value:p.level*100}])]};
}
export function makeTravel(s:GameSession,stats:GameStats,turns:Turn[]):TravelContext {
 const last=turns.filter(t=>t.role==='model').slice(-3).map(t=>t.narrative||'').join('\n');
 const entry={world:s.worldSettings.worldContext.slice(0,160)||s.genre,genre:s.genre,summary:[s.summary,last].filter(Boolean).join('\n').slice(-10000),departedAt:Date.now()};
 return {stats:structuredClone(stats),memories:entry.summary,visited:[...(s.worldSettings.travelContext?.visited||[]),entry]};
}
export function arrivalStats(aiStats:GameStats,travel?:TravelContext):GameStats {
 if(!travel)return aiStats;
 // Only location/time/realm are new; carried possessions and condition remain exact at arrival.
 const {currentLocation,nearbyLocations,mapData,visitedLocations,currentTime,realm}=aiStats;
 return {...travel.stats,currentLocation,nearbyLocations,mapData,visitedLocations,currentTime,realm};
}
export function makeStoryCard(s:GameSession,stats:GameStats):FusionTemplate & Record<string,any> {
 const p=validatePower(s.power||powerOf(s.worldSettings.fusionTemplate));
 const old=s.worldSettings.fusionTemplate;
 const journeyId=s.journeyId||`legacy-${s.id}`;
 const personality=s.characterTraits?.personality||old?.personality||'Bình thường';
 const name=stats.name||s.heroName;
 const rank=p.chaos?'HỖN ĐỘN THẦN':p.level>=3e18?'KHỞI NGUYÊN THẦN':p.level>=3e12?'VUA VẠN VẬT ZENO':p.level>=3e10?'ĐẠI THIÊN SỨ':p.level>=1e7?'THIÊN SỨ':p.level>=1e5?'THẦN HỦY DIỆT':p.level>=5e4?'BẢN NĂNG VÔ CỰC':p.level>=1000?'SIÊU SAIYAN':'CHIẾN BINH PHÀM NHÂN';
 return {...old,id:`traveler-${journeyId}`,name,description:[old?.description,`Lữ khách: ${stats.realm}. Trạng thái: ${stats.status}.`,[...new Set([...(s.characterTraits?.talents||[]),...(stats.talents||[])])].join('; ')].filter(Boolean).join('\n'),personality,level:p.level,powerLevel:p.chaos?0:p.level*100,rank,imageUrl:s.avatarUrl||old?.imageUrl||portrait(name),quote:old?.quote||personality,baseCharacters:old?.baseCharacters||[],dna_analysis:old?.dna_analysis||s.characterTraits?.spiritualRoot||'',fusion_logic:old?.fusion_logic||'Nhân vật trưởng thành qua hành trình xuyên thế giới.',userId:'local',createdAt:Date.now(),compatibility_score:100,compatibility_status:'Stable',storyProgress:{journeyId,stats:structuredClone(stats),traits:{spiritualRoot:'',personality,...structuredClone(s.characterTraits),talents:[...new Set([...(s.characterTraits?.talents||[]),...(stats.talents||[])])]},summary:s.summary||'',travel:structuredClone(s.worldSettings.travelContext),genre:s.genre},power_comparison:`Sức mạnh gốc ${p.chaos?p.level+' sao':p.level+' cấp / '+p.level*100+' BP'}`};
}
function portrait(name:string):string {
 const initials=Array.from(name).filter(c=>/[\p{L}\p{N}]/u.test(c)).slice(0,2).join('').toUpperCase();
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560"><rect width="400" height="560" fill="#17132f"/><circle cx="200" cy="220" r="120" fill="#6d28d9"/><text x="200" y="250" text-anchor="middle" font-size="80" fill="white">${initials}</text></svg>`);
}
export function upsertCard(storage:Pick<Storage,'getItem'|'setItem'>,card:ReturnType<typeof makeStoryCard>):void {
 const raw=storage.getItem('fusion_history');let cards:any[];
 try { cards=raw?JSON.parse(raw):[]; } catch { throw Error('Sổ dung hợp không đọc được. Hãy xuất bản sao lưu trước khi sửa.'); }
 if(!Array.isArray(cards))throw Error('Sổ dung hợp không đúng định dạng.');
 const next=cards.filter(c=>c.id!==card.id);next.unshift(card);
 try{storage.setItem('fusion_history',JSON.stringify(next));}catch{throw Error('Bộ nhớ sổ dung hợp đã đầy. Hãy xuất bản sao lưu và giải phóng dung lượng.');}
}
export function worldForTurn(s:GameSession,stats:GameStats|null):WorldSettings {
 return {...s.worldSettings,powerContext:{power:s.power||powerOf(s.worldSettings.fusionTemplate),rules:s.worldSettings.powerRules||defaultRules()},currentCharacter:stats||undefined};
}
