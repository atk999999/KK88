import {rollbackCheckpoint, type MemoryCheckpoint} from '../shared/storyMemory';
import {restoreMemory} from '../shared/storyTransactions';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  GameSession, Turn, GameStats, GameOption, StoryLength, 
  RegistryEntry, WorldSettings, CharacterTraits, GameGenre, 
  GameMechanics 
} from './types';
import { db } from './db';
import { defaultRules, powerOf, validatePower, validateRules, canonicalStats, makeTravel, arrivalStats, makeStoryCard, upsertCard, worldForTurn } from '../shared/multiverse';
import type {PowerState, PowerRules} from '../shared/multiverse';
import { PowerEditor, PersonalityEditor, JourneyPanel } from './components/Multiverse';
import { ConnectionSettings } from '../shared/ConnectionSettings';
import { getTextModel } from '../shared/gemini';
import type { FusionTemplate } from './types';
import { geminiService } from './services/geminiService';
import { GameUI } from './components/GameUI';
import { SettingsScreen } from './components/SettingsScreen';
import { LandingScreen } from './components/LandingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentStats, setCurrentStats] = useState<GameStats | null>(null);
  const [currentOptions, setCurrentOptions] = useState<GameOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'landing' | 'settings' | 'game'>('landing');
  const [initialTemplate, setInitialTemplate] = useState<any>(null);

  const [fusionTemplate, setFusionTemplate] = useState<FusionTemplate | null>(null);
  const [fusionError, setFusionError] = useState('');
  const [power, setPower] = useState<PowerState>({level:1,chaos:false});
  const [rules, setRules] = useState<PowerRules>(defaultRules);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [transfer, setTransfer] = useState<ReturnType<typeof makeTravel> | null>(null);
  const [travelSource, setTravelSource] = useState<GameSession | null>(null);
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('fusion');
    if (!id) return;
    try {
      const cards = JSON.parse(localStorage.getItem('fusion_history') || '[]');
      const card = Array.isArray(cards) ? cards.find(c => c.id === id) : null;
      if (!card || typeof card.name !== 'string') throw new Error('Không tìm thấy thẻ. Hãy nhập bản sao lưu sổ dung hợp rồi chọn lại thẻ.');
      const snapshot = JSON.parse(JSON.stringify(card));
      snapshot.personality = typeof card.personality === 'string' ? card.personality : '';
      setFusionTemplate(snapshot);
      setPower(powerOf(snapshot));
      if (snapshot.storyProgress) {
        const pr=snapshot.storyProgress;
        setTransfer({stats:pr.stats,memories:pr.summary||'',visited:pr.travel?.visited||[]});
      }
      setInitialTemplate({basicInfo: {name: card.name}, characterTraits: {
        spiritualRoot: card.dna_components?.map((d: any) => `${d.race} ${d.percentage}%`).join(', ') || card.dna_analysis || 'Huyết thống dung hợp',
        talents: [card.description, card.power_comparison].filter(Boolean), personality: snapshot.personality
      }});
      setView('settings');
    } catch (e) { setFusionError(e instanceof Error ? e.message : 'Không đọc được thẻ dung hợp.'); }
  }, []);

  const handleStartNewGame = () => {
    setFusionTemplate(null);
    setPower({level:1,chaos:false}); setRules(defaultRules()); setTransfer(null);setTravelSource(null);
    setInitialTemplate(null);
    setView('settings');
  };

  const handleLoadGame = async (loadedSession: GameSession, loadedTurns: Turn[], loadedWiki: RegistryEntry[], source?:'local') => {
    try {
      if(!loadedSession?.worldSettings || !Array.isArray(loadedTurns) || !Array.isArray(loadedWiki)) throw Error('Bản lưu không đúng định dạng.');
      const loadedPower=loadedSession.power||powerOf(loadedSession.worldSettings.fusionTemplate);
      validatePower(loadedPower);validateRules(loadedSession.worldSettings.powerRules||defaultRules());
      let next:GameSession={...loadedSession,power:loadedPower};
      const lastInput=[...loadedTurns].reverse().find(t=>t.role==='model'&&t.rawResponseJSON);
      if(lastInput?.rawResponseJSON)JSON.parse(lastInput.rawResponseJSON);
      if(source!=='local') {
        const id=await db.importSession({...next,journeyId:next.journeyId||crypto.randomUUID()},loadedTurns,loadedWiki);
        next=(await db.sessions.get(id))!;
        loadedTurns=await db.turns.where('sessionId').equals(id).sortBy('turnIndex');
      }
      next={...next,journeyId:next.journeyId||`legacy-${next.id}`};
      let stats:GameStats|null=null;let options:GameOption[]|null=null;
      const last=[...loadedTurns].reverse().find(t=>t.role==='model'&&t.rawResponseJSON);
      if(last?.rawResponseJSON){const parsed=JSON.parse(last.rawResponseJSON);if(parsed.stats){stats=canonicalStats(parsed.stats,loadedPower,next.worldSettings.powerRules||defaultRules());options=parsed.options||[];}}
      setSession(next);setTurns(loadedTurns);setCurrentStats(stats);setCurrentOptions(options);
      setTransfer(null);setTravelSource(null);setView('game');
      window.history.replaceState({},'',window.location.pathname);
    }catch(e){alert(e instanceof Error?e.message:'Không mở được bản lưu.');}
  };

  const handleSettingsConfirm = async (
    basicInfo: any,
    world: WorldSettings,
    traits: CharacterTraits,
    gameConfig: { autoCodex: boolean, livingWorld: boolean },
    openingLength: number
  ) => {
    if (starting) return;
    if (fusionTemplate && !fusionTemplate.personality.trim()) {
      alert('Hãy nhập tính cách của mô bản trước khi xuyên qua.'); return;
    }
    if (fusionTemplate) {
      world = { ...world, fusionTemplate: JSON.parse(JSON.stringify(fusionTemplate)) };
      traits = { ...traits, personality: fusionTemplate.personality };
    }
    setLoading(true); setStarting(true);
    try {
        validatePower(power); validateRules(rules);
        world = {...world, powerRules:structuredClone(rules), ...(transfer?{travelContext:structuredClone(transfer)}:{})};
        if (transfer && travelSource?.characterTraits) traits = structuredClone(travelSource.characterTraits);
        if (transfer && fusionTemplate?.storyProgress?.traits) traits = {...structuredClone(fusionTemplate.storyProgress.traits),personality:fusionTemplate.personality};
        if(fusionTemplate)traits={...traits,personality:fusionTemplate.personality};
        const mechanics: GameMechanics = {
            reputation: false, survival: false, crafting: false, combat: false,
            time: true, currency: true, backpack: true,
            autoCodex: gameConfig.autoCodex,
            livingWorld: gameConfig.livingWorld
        };

        const newSession: GameSession = {
            heroName: basicInfo.name,
            avatarUrl: travelSource?.avatarUrl || fusionTemplate?.imageUrl,
            journeyId: travelSource?.journeyId || fusionTemplate?.storyProgress?.journeyId || crypto.randomUUID(),
            power: structuredClone(power),
            powerHistory: travelSource?.powerHistory || [],
            summary: transfer?.memories,
            customTitle: basicInfo.customTitle,
            gender: basicInfo.gender,
            genre: basicInfo.genre,
            worldSettings: world,
            characterTraits: traits,
            createdAt: Date.now(),
            isNSFW: basicInfo.isNSFW,
            nsfwIntensity: basicInfo.nsfwIntensity,
            writingStyle: basicInfo.writingStyle,
            nsfwFocus: basicInfo.nsfwFocus,
            pronounRules: basicInfo.pronounRules,
            aiModel: getTextModel(basicInfo.aiModel),
            backgroundImageUrl: basicInfo.backgroundImageUrl,
            backgroundType: basicInfo.backgroundType,
            fontFamily: basicInfo.fontFamily,
            memoryDepth: basicInfo.memoryDepth,
            mechanics: mechanics,
            aiStyle: 'balanced', // Default
            eventFrequency: 'medium' // Default
        };

        // Create opening prompt
        let openingPrompt = `[HỆ THỐNG]: Khởi tạo thế giới. `;
        if (openingLength > 0) {
             openingPrompt += `Hãy viết phần mở đầu câu chuyện thật ấn tượng (khoảng ${openingLength} từ). `;
        } else {
             openingPrompt += `Hãy bắt đầu câu chuyện. `;
        }
        if (world.openingStory) {
            openingPrompt += `Tình huống khởi đầu: ${world.openingStory}`;
        }

        // Generate first turn
        const result = await geminiService.generateTurn(
            0, // Temp ID
            newSession.aiModel,
            newSession.genre,
            newSession.heroName,
            newSession.gender,
            worldForTurn(newSession,transfer?.stats||null),
            openingPrompt,
            [], // No history
            newSession.characterTraits,
            openingLength >= 1200 ? 'epic' : 'medium',
            newSession.isNSFW,
            newSession.nsfwIntensity,
            newSession.writingStyle,
            newSession.nsfwFocus,
            newSession.summary,
            newSession.pronounRules,
            newSession.aiStyle,
            newSession.eventFrequency,
            newSession.mechanics,
            newSession.memoryDepth
        );

        result.parsed.stats = canonicalStats(arrivalStats(result.parsed.stats,transfer||undefined),power,rules);
        result.parsed.stats.name = newSession.heroName;
        result.raw = JSON.stringify(result.parsed);
        const turn0: Turn = { sessionId:0, turnIndex:0, role:'model', narrative:result.parsed.narrative, rawResponseJSON:result.raw };
        const sessionId = await db.importSession(newSession,[turn0],(result.parsed.newRegistry||[]) as RegistryEntry[]);
        const sessionWithId = { ...newSession, id: sessionId };
        setSession(sessionWithId);
        setTurns(await db.turns.where('sessionId').equals(sessionId).sortBy('turnIndex'));
        setCurrentStats(result.parsed.stats);
        setCurrentOptions(result.parsed.options || []);
        setTransfer(null);setTravelSource(null);
        window.history.replaceState({}, '', window.location.pathname);
        setView('game');

    } catch (e) {
        console.error("Game Start Error", e);
        alert(e instanceof Error ? e.message : "Có lỗi khi khởi tạo game.");
    } finally {
        setLoading(false); setStarting(false);
    }
  };

  const handleTurn = async (prompt: string, lengthMode: StoryLength, restored?: {history:Turn[];stats:GameStats|null;dropIds?:number[];memory:MemoryCheckpoint}) => {
      if (!session || !session.id || loading) return;
      setLoading(true);
      const activeHistory=restored?.history||turns;
      const activeStats=restored?restored.stats:currentStats;

      try {
          const memoryBefore=restored?.memory||{summary:session.summary||'',wiki:await db.encyclopedia.where('sessionId').equals(session.id).toArray()};
          // 1. Create User Turn
          const userTurn: Turn = {
              sessionId: session.id,
              turnIndex: activeHistory.length,
              role: 'user',
              memoryBefore,
              userPrompt: prompt
          };

          // Optimistic Update
          const newHistory = [...activeHistory, userTurn];
          // Persist the complete pair only after a valid AI response. Failed calls leave saves untouched.

          // 2. Call AI
          const result = await geminiService.generateTurn(
              session.id,
              session.aiModel,
              session.genre,
              session.heroName,
              session.gender,
              worldForTurn(session,activeStats),
              prompt,
              activeHistory, 
              session.characterTraits,
              lengthMode,
              session.isNSFW,
              session.nsfwIntensity,
              session.writingStyle,
              session.nsfwFocus,
              memoryBefore.summary,
              session.pronounRules,
              session.aiStyle,
              session.eventFrequency,
              session.mechanics,
              session.memoryDepth,
              memoryBefore.wiki
          );

          result.parsed.stats = canonicalStats({...activeStats,...result.parsed.stats,talents:result.parsed.stats.talents||activeStats?.talents||session.characterTraits?.talents},session.power||powerOf(session.worldSettings.fusionTemplate),session.worldSettings.powerRules||defaultRules());
          result.raw=JSON.stringify(result.parsed);
          // 3. Create Model Turn
          const modelTurn: Turn = {
              sessionId: session.id,
              turnIndex: newHistory.length,
              role: 'model',
              narrative: result.parsed.narrative,
              rawResponseJSON: result.raw
          };

          await db.transaction('rw',db.turns,db.encyclopedia,db.sessions,async()=>{
            if(restored?.dropIds?.length){await db.turns.bulkDelete(restored.dropIds);await restoreMemory(session.id!,memoryBefore);}
            userTurn.id=await db.turns.add(userTurn) as number;
            modelTurn.id=await db.turns.add(modelTurn) as number;
            if(result.parsed.newRegistry?.length)await db.upsertWikiEntries(session.id!,result.parsed.newRegistry as RegistryEntry[]);
          });
          const finalHistory = [...newHistory, modelTurn];
          setTurns(finalHistory);
          if(restored)setSession(prev=>prev?{...prev,summary:memoryBefore.summary}:null);
          setCurrentStats(result.parsed.stats);
          setCurrentOptions(result.parsed.options || []);


          // 5. Update Summary (Every 10 turns or so)
          if ((finalHistory.length - 1) % 10 === 0) {
             const newSummary = await geminiService.summarizeStory(memoryBefore.summary, finalHistory.slice(-10));
             if (newSummary !== memoryBefore.summary) {
                 await db.sessions.update(session.id, { summary: newSummary });
                 setSession(prev => prev ? ({ ...prev, summary: newSummary }) : null);
             }
          }

          // 6. Check Game Over
          if (result.parsed.isGameOver) {
              alert("Kết thúc game!");
          }

      } catch (e) {
          console.error("Turn Generation Error", e);
          alert(e instanceof Error ? e.message : "Có lỗi khi tạo nội dung.");
      } finally {
          setLoading(false);
      }
  };

  const undoState = async () => {
    if(!session||turns.length<=1)return null;
    const count=turns.at(-1)?.role==='model'?2:1;
    const cut=Math.max(1,turns.length-count);
    const history=turns.slice(0,cut);
    const last=[...history].reverse().find(t=>t.role==='model'&&t.rawResponseJSON);
    const data=last?.rawResponseJSON?JSON.parse(last.rawResponseJSON):null;
    const stats=data?.stats?canonicalStats(data.stats,session.power||powerOf(session.worldSettings.fusionTemplate),session.worldSettings.powerRules||defaultRules()):null;
    const memory=rollbackCheckpoint(session,history,turns.slice(cut),await db.encyclopedia.where('sessionId').equals(session.id!).toArray());
    return {history,stats,memory,options:data?.options||[],dropIds:turns.slice(cut).map(t=>t.id).filter((id):id is number=>id!==undefined)};
  };
  const handleUndo = async () => {
    if(loading||!session?.id)return;
    try{const previous=await undoState();if(!previous)return;
      await db.transaction('rw',db.turns,db.encyclopedia,db.sessions,async()=>{await db.turns.bulkDelete(previous.dropIds);await restoreMemory(session.id!,previous.memory);});
      setSession(prev=>prev?{...prev,summary:previous.memory.summary}:null);
      setTurns(previous.history);setCurrentStats(previous.stats);setCurrentOptions(previous.options);
    }catch(e){alert(e instanceof Error?e.message:'Không hoàn tác được.');}
  };
  const handleRegenerate = async (_turnIndex:number,newPrompt:string,lengthMode:StoryLength) => {
    if(loading)return;
    try{const previous=await undoState();if(previous)void handleTurn(newPrompt,lengthMode,previous);}
    catch(e){alert(e instanceof Error?e.message:'Không tạo lại được.');}
  };

  const handleUpdateSession = (field: keyof GameSession, value: any) => {
      if (!session || !session.id) return;
      const updated = { ...session, [field]: value };
      setSession(updated);
      db.sessions.update(session.id, { [field]: value });
  };

  // Export functions
  const handleExportJson = () => {
      if (!session || !session.id) return;
      
      db.encyclopedia.where('sessionId').equals(session.id).toArray().then(wiki => {
           const data = {
               session,
               turns,
               encyclopedia: wiki
           };
           const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
           const url = URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.href = url;
           const rawName = session.customTitle || session.heroName || 'savegame';
           const fileName = rawName.replace(/[^a-z0-9\u00C0-\u017F\s\-_]/gi, '_').replace(/_+/g, '_').trim();
           a.download = `${fileName}_Save.json`;
           a.click();
           URL.revokeObjectURL(url);
      });
  };

  const handleExportText = async () => {
    if (!session) return;
    try {
        const turnsToSave = turns;
        
        if (turnsToSave.length === 0) {
            alert("Chưa có nội dung cốt truyện để xuất.");
            return;
        }
        
        let content = `TÁC PHẨM: ${session.customTitle || session.heroName}\n`;
        content += `THỂ LOẠI: ${session.genre}\n`;
        content += `NHÂN VẬT CHÍNH: ${session.heroName} (${session.gender})\n`;
        content += `NGÀY XUẤT: ${new Date().toLocaleDateString('vi-VN')}\n`;
        content += `=================================================================\n\n`;

        turnsToSave.forEach(t => {
            if (t.role === 'user') {
                const cleanPrompt = (t.userPrompt || "").replace(/\[.*?\]:\s*/g, '');
                if (cleanPrompt.trim()) {
                    content += `> ${cleanPrompt}\n\n`;
                }
            } else {
                content += `${t.narrative || ""}\n\n`;
                content += `--------------------------------------------------\n\n`;
            }
        });

        const blob = new Blob(["\uFEFF" + content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const rawName = session.customTitle || session.heroName || 'nameless';
        const fileName = rawName.replace(/[^a-z0-9\u00C0-\u017F\s\-_]/gi, '_').replace(/_+/g, '_').trim();
        a.download = `${fileName}_Story.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Export Text failed", e);
        alert("Lỗi khi xuất file truyện.");
    }
  };

  const handleExit = () => {
      setView('landing');
      setFusionTemplate(null);setJourneyOpen(false);setTransfer(null);setTravelSource(null);
      window.history.replaceState({}, '', window.location.pathname);
      setSession(null);
      setTurns([]);
      setCurrentStats(null);
  };
  
  const handleDeleteSession = async () => {
      if(!session || !session.id) return;
      if (window.confirm("Bạn có chắc muốn xóa vĩnh viễn file save này?")) {
          await db.sessions.delete(session.id);
          await db.turns.where('sessionId').equals(session.id).delete();
          await db.encyclopedia.where('sessionId').equals(session.id).delete();
          handleExit();
      }
  };

  const beginTravel = async () => {
    if(!session||!currentStats||loading)return;
    try {
    const learned = await db.encyclopedia.where('sessionId').equals(session.id!).filter(e=>e.type==='SKILL').toArray();
    const carried={...currentStats,talents:[...new Set([...(session.characterTraits?.talents||[]),...(currentStats.talents||[]),...learned.map(e=>e.name+': '+e.description)])]};
    setTransfer(makeTravel(session,carried,turns));setTravelSource({...session,characterTraits:{spiritualRoot:'',personality:'',...session.characterTraits,talents:carried.talents}});
    setPower(session.power||powerOf(session.worldSettings.fusionTemplate));
    setRules(session.worldSettings.powerRules||defaultRules());
    setFusionTemplate(session.worldSettings.fusionTemplate?{...session.worldSettings.fusionTemplate,personality:session.characterTraits?.personality||session.worldSettings.fusionTemplate.personality}:null);
    setInitialTemplate({basicInfo:{...session,name:session.heroName},characterTraits:session.characterTraits});
    setJourneyOpen(false);setView('settings');
    } catch(e) {alert(e instanceof Error?e.message:'Không đọc được hành trình.');}
  };
  const saveCard = async () => {
    if(!session||!currentStats)return;
    try{
      const learned=await db.encyclopedia.where('sessionId').equals(session.id!).filter(e=>e.type==='SKILL').toArray();
      const stats={...currentStats,talents:[...new Set([...(session.characterTraits?.talents||[]),...(currentStats.talents||[]),...learned.map(e=>e.name+': '+e.description)])]};
      const travel=makeTravel(session,stats,turns);
      upsertCard(localStorage,makeStoryCard({...session,summary:travel.memories,worldSettings:{...session.worldSettings,travelContext:travel}},stats));alert('Đã lưu thẻ hành trình vào sổ dung hợp.');}
    catch(e){alert(e instanceof Error?e.message:'Không lưu được thẻ.');}
  };
  const updatePower = async (next:PowerState,reason:string) => {
    if(!session?.id||!currentStats||loading)return;
    validatePower(next);if(!reason.trim())throw Error('Cần lý do thay đổi sức mạnh.');
    const updated={...session,power:next,powerHistory:[...(session.powerHistory||[]),{from:session.power||powerOf(session.worldSettings.fusionTemplate),to:next,reason,at:Date.now()}]};
    await db.sessions.put(updated);setSession(updated);
    setCurrentStats(canonicalStats(currentStats,next,session.worldSettings.powerRules||defaultRules()));
  };
  const updatePersonality = async (value:string) => {
    if(!session?.id||loading)return;
    const updated={...session,characterTraits:{spiritualRoot:'',talents:[],...session.characterTraits,personality:value},worldSettings:{...session.worldSettings,...(session.worldSettings.fusionTemplate?{fusionTemplate:{...session.worldSettings.fusionTemplate,personality:value}}:{})}};
    await db.sessions.put(updated);setSession(updated);
  };
  const saveSourcePersonality = () => {
    if(!fusionTemplate)return;
    try{
      const cards=JSON.parse(localStorage.getItem('fusion_history')||'[]');
      if(!Array.isArray(cards)||!cards.some(c=>c.id===fusionTemplate.id))throw Error('Không tìm thấy thẻ nguồn.');
      localStorage.setItem('fusion_history',JSON.stringify(cards.map(c=>c.id===fusionTemplate.id?{...c,personality:fusionTemplate.personality, ...(c.storyProgress?.traits?{storyProgress:{...c.storyProgress,traits:{...c.storyProgress.traits,personality:fusionTemplate.personality}}}:{})}:c)));
      alert('Đã lưu tính cách vào thẻ nguồn.');
    }catch(e){alert(e instanceof Error?e.message:'Không lưu được tính cách.');}
  };
  let proposal: {level:number;reason:string}|undefined;
  try{proposal=JSON.parse([...turns].reverse().find(t=>t.role==='model')?.rawResponseJSON||'{}').powerProposal;}catch{}

  return (
    <ErrorBoundary onReset={handleExit}>
      {view !== 'game' && <div className="p-3 text-sm"><a href="../index.html">← Sổ dung hợp</a></div>}
      {fusionError && <div role="alert" className="p-4 text-red-300">{fusionError}</div>}
      {view === 'settings' && fusionTemplate && <section className="mx-auto max-w-4xl p-4 rounded-xl border border-violet-500 bg-slate-900">
        <h2 className="text-xl font-bold">Mô bản: {fusionTemplate.name}</h2>
        {fusionTemplate.imageUrl && <img src={fusionTemplate.imageUrl} alt={fusionTemplate.name} className="w-24 h-24 object-cover rounded-xl" />}
        <p>{fusionTemplate.description}</p>
        <PersonalityEditor profile={fusionTemplate as unknown as Record<string,unknown>} value={fusionTemplate.personality} onChange={personality=>setFusionTemplate({...fusionTemplate,personality})} onSave={saveSourcePersonality}/>
        <p className="text-sm">Hồ sơ và tính cách này theo bạn suốt chuyến đi. Bạn vẫn quyết định hành động quan trọng. Thẻ gốc được giữ nguyên.</p>
      </section>}
      {view !== 'game' && <ConnectionSettings/>}
      {view === 'settings' && <section className="max-w-4xl mx-auto p-4 text-white space-y-3">
        {transfer&&<p className="rounded bg-violet-900 p-3">Tiếp nối hành trình · giữ hành trang, kỹ năng, trạng thái và ký ức. Hãy chọn thế giới mới bên dưới.</p>}
        <PowerEditor power={power} rules={rules} onPower={setPower} onRules={setRules}/>
      </section>}
      {starting&&<div role="status" className="fixed inset-0 z-[250] bg-slate-950/90 text-white flex items-center justify-center">Đang mở cổng thế giới…</div>}
      {journeyOpen&&session&&<JourneyPanel session={session} stats={currentStats} proposal={proposal} onClose={()=>setJourneyOpen(false)} onTravel={beginTravel} onCard={saveCard} onPower={updatePower} onPersonality={updatePersonality}/>}
      {view === 'landing' && (
          <LandingScreen 
              onStartNewGame={handleStartNewGame}
              onLoadGame={handleLoadGame}
          />
      )}
      
      {view === 'settings' && (
          <SettingsScreen 
              onConfirm={handleSettingsConfirm}
              onBack={() => {setView(travelSource?'game':'landing');setTransfer(null);setTravelSource(null);}}
              initialTemplate={initialTemplate}
          />
      )}

      {view === 'game' && session && (
          <GameUI 
              session={session}
              onMultiverse={() => setJourneyOpen(true)}
              turns={turns}
              currentStats={currentStats}
              currentOptions={currentOptions}
              loading={loading}
              onOptionClick={handleTurn}
              onRegenerate={handleRegenerate}
              onUndo={handleUndo}
              genre={session.genre}
              onExit={handleExit}
              onDelete={handleDeleteSession}
              onExport={handleExportJson}
              onExportText={handleExportText}
              onSave={() => handleUpdateSession('id', session.id)} 
              onUpdateSession={handleUpdateSession}
              avatarUrl={session.avatarUrl} // Added prop
          />
      )}
    </ErrorBoundary>
  );
};

export default App;