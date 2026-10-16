import {db} from '../db';
import React, { useRef, useState, useEffect } from 'react';
import { GameSession, Turn, RegistryEntry, GameGenre, GameMechanics } from '../types';

interface LandingScreenProps {
  onStartNewGame: () => void;
  onLoadGame: (session: GameSession, turns: Turn[], wiki: RegistryEntry[], source?: 'local') => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onStartNewGame, onLoadGame }) => {
  const [savedGames,setSavedGames]=useState<GameSession[]>([]);
  const [saveError,setSaveError]=useState('');
  const [opening,setOpening]=useState<number|null>(null);
  useEffect(()=>{let live=true;db.sessions.orderBy('createdAt').reverse().toArray().then(rows=>{if(live)setSavedGames(rows)}).catch(()=>{if(live)setSaveError('Không đọc được bản lưu trên máy.');});return()=>{live=false};},[]);
  const resume=async (save:GameSession)=>{
    if(!save.id||opening!==null)return;setOpening(save.id);
    try { const [turns,wiki]=await Promise.all([db.turns.where('sessionId').equals(save.id).sortBy('turnIndex'),db.encyclopedia.where('sessionId').equals(save.id).toArray()]);await onLoadGame(save,turns,wiki,'local'); }
    catch(e){setSaveError(e instanceof Error?e.message:'Không mở được bản lưu.');}finally{setOpening(null);}
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        let text = (ev.target?.result as string) || "";
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        text = text.trim();

        if (text.startsWith("TÁC PHẨM:")) {
            alert("Đây là file Cốt Truyện (.txt) chỉ dùng để đọc.\nVui lòng chọn file Save Game (.json) để nhập dữ liệu chơi tiếp.");
            return;
        }

        const data = JSON.parse(text);
        
        // CASE 1: Standard App Format
        if (data.session && data.turns) {
           onLoadGame(data.session, data.turns, data.encyclopedia || []);
           return;
        }
        
        // CASE 2: Legacy/RAG Export Format
        if (data.gameData && data.gameData.settings) {
            const gd = data.gameData;
            const settings = gd.settings;
            
            const mechanics: GameMechanics = {
                reputation: !!settings.reputationSystemEnabled,
                survival: !!settings.survivalElementsEnabled,
                crafting: !!settings.craftingSystemEnabled,
                combat: !!settings.combatSystemEnabled,
                time: !!settings.timeSystemEnabled,
                currency: !!settings.currencySystemEnabled,
                backpack: !!settings.deepInventoryCustomizationEnabled,
                autoCodex: !!settings.autoCodexEnabled,
                livingWorld: false
            };

            const mappedSession: GameSession = {
                heroName: settings.characterName || "Vô Danh",
                customTitle: settings.saveGameName || "RAG Imported",
                gender: settings.characterGender || "Nam",
                genre: (Object.values(GameGenre).includes(settings.genre as any) ? settings.genre : GameGenre.CULTIVATION) as GameGenre,
                worldSettings: {
                    worldContext: settings.initialWorldLore || "",
                    plotDirection: settings.initialPlot || "",
                    majorFactions: settings.factionInput || "",
                    keyNpcs: settings.keyNPCsInput || "",
                    openingStory: ""
                },
                characterTraits: {
                    spiritualRoot: "Không rõ (Imported)",
                    talents: [],
                    personality: settings.characterBackstory || "Bình thường"
                },
                createdAt: Date.now(),
                isNSFW: !!settings.allowNsfw,
                nsfwIntensity: settings.isHardcore ? 'extreme' : 'soft',
                writingStyle: 'convert',
                nsfwFocus: [],
                pronounRules: settings.useConvertStylePronouns ? "Convert style" : "",
                aiModel: 'gemini-3-pro-preview',
                mechanics: mechanics,
                summary: "",
                memoryDepth: 'standard'
            };

            const mappedTurns: Turn[] = (gd.storyHistory || []).map((item: any, idx: number) => {
                let statsSnapshot = undefined;
                if (item.characterStatsSnapshot || item.inventorySnapshot) {
                    const attributes = item.characterStatsSnapshot 
                        ? Object.entries(item.characterStatsSnapshot).map(([k, v]) => ({ key: k, value: String(v) }))
                        : [];
                    const inventory = item.inventorySnapshot ? item.inventorySnapshot.map((i: any) => i.Name) : [];
                    statsSnapshot = {
                        name: mappedSession.heroName,
                        realm: "Unknown", 
                        status: "Active",
                        inventory: inventory,
                        attributes: attributes,
                        currentTime: item.currentTimeOfDaySnapshot || ""
                    };
                }
                return {
                    sessionId: 0,
                    turnIndex: item.originalIndex ?? idx,
                    role: item.type === 'user_custom_action' ? 'user' : 'model',
                    userPrompt: item.type === 'user_custom_action' ? item.content : undefined,
                    narrative: item.type === 'story' ? item.content : undefined,
                    rawResponseJSON: item.type === 'story' ? JSON.stringify({ narrative: item.content, stats: statsSnapshot, isGameOver: false }) : undefined
                };
            });

             const lastModelTurnIndex = mappedTurns.map(t => t.role).lastIndexOf('model');
             if (lastModelTurnIndex !== -1) {
                const targetTurn = mappedTurns[lastModelTurnIndex];
                let jsonBody: any = {};
                try { jsonBody = targetTurn.rawResponseJSON ? JSON.parse(targetTurn.rawResponseJSON) : {}; } catch {}

                const currentInventory = gd.inventoryItems ? gd.inventoryItems.map((i: any) => i.Name) : (jsonBody.stats?.inventory || []);
                const currentAttributes = gd.characterStats ? Object.entries(gd.characterStats).map(([k, v]) => ({ key: k, value: String(v) })) : (jsonBody.stats?.attributes || []);
                const currentCurrency = (gd.currencies && gd.currencies.length > 0) ? `${gd.currencies[0].Amount} ${gd.currencies[0].Name}` : "";

                const latestStats = {
                    ...(jsonBody.stats || {}),
                    name: mappedSession.heroName,
                    inventory: currentInventory,
                    attributes: currentAttributes,
                    currentTime: gd.currentTimeOfDay || jsonBody.stats?.currentTime || "",
                    currency: currentCurrency,
                    status: "Active",
                    mapData: jsonBody.stats?.mapData
                };
                jsonBody.stats = latestStats;
                targetTurn.rawResponseJSON = JSON.stringify(jsonBody);
            }
            
            const mappedWiki: RegistryEntry[] = (gd.knowledgeBase || []).map((kb: any) => ({
                 sessionId: 0,
                 name: kb.name,
                 type: 'KNOWLEDGE',
                 description: kb.description || "",
                 secrets: kb.details || "",
                 firstSeenTurn: 0,
                 status: "Imported"
            }));

            onLoadGame(mappedSession, mappedTurns, mappedWiki);
            return;
        }
        
        alert("File save không hợp lệ.");
      } catch (err) {
        console.error(err);
        alert("Không thể đọc file save.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 text-parchment-100 font-serif relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
      
      <div className="max-w-4xl w-full z-10 flex flex-col md:flex-row shadow-2xl rounded-2xl overflow-hidden border border-gold-500/20 bg-ink-900/80 backdrop-blur-md">
        
        <div className="md:w-1/2 p-10 bg-gradient-to-br from-ink-900 via-ink-800 to-black relative flex flex-col justify-between border-r border-white/5">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-50"></div>
             
             <div>
                 <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-gold-400 to-amber-600 flex items-center justify-center text-ink-950 shadow-[0_0_30px_rgba(234,179,8,0.4)] mb-6 animate-pulse-slow">
                     <i className="fas fa-yin-yang fa-spin-slow text-3xl"></i>
                 </div>
                 <h1 className="text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 to-amber-500 mb-2 drop-shadow-sm">
                     Thiên Đạo
                     <br/>
                     <span className="text-2xl text-parchment-300">Simulator</span>
                 </h1>
                 <p className="text-ink-400 text-sm mt-4 leading-relaxed border-l-2 border-gold-500/30 pl-4">
                     Kiến tạo thế giới. Nhập vai nhân vật.
                     <br/>
                     Viết nên huyền thoại của riêng bạn.
                 </p>
             </div>

             <div className="mt-10">
                 <div className="flex gap-2 text-[10px] text-ink-600 uppercase tracking-widest font-bold">
                     <span>AI Powered</span>
                     <span>•</span>
                     <span>Infinite Story</span>
                     <span>•</span>
                     <span>Roleplay</span>
                 </div>
             </div>
        </div>

        <div className="md:w-1/2 p-10 flex flex-col justify-center gap-6 bg-ink-900/50">
            <section aria-label="Các chuyến đi đã lưu"><h2 className="text-xl font-bold text-gold-300 mb-3">Tiếp tục hành trình</h2>
              {saveError&&<p role="alert">{saveError}</p>}
              {!savedGames.length&&<p className="text-sm">Chưa có chuyến đi lưu trên máy này.</p>}
              <div className="max-h-72 overflow-y-auto space-y-2">{savedGames.map(save=><button key={save.id} disabled={opening!==null} onClick={()=>resume(save)} className="block w-full text-left rounded-lg border border-ink-700 p-3 hover:bg-ink-800" data-session-id={save.id}>
                <strong>{save.customTitle||save.heroName}</strong><span className="block text-xs text-parchment-400">{save.genre} · {new Date(save.createdAt).toLocaleString('vi-VN')}</span>
                <span className="block text-xs truncate">{save.worldSettings.worldContext.slice(0,90)}</span>{opening===save.id&&'Đang mở…'}
              </button>)}</div>
            </section>
            <button 
                onClick={onStartNewGame}
                className="group relative w-full py-4 px-6 rounded-xl bg-gradient-to-r from-gold-600 to-amber-600 hover:from-gold-500 hover:to-amber-500 text-white font-bold shadow-lg transition-all transform hover:-translate-y-1 hover:shadow-gold-500/20 flex items-center justify-between overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <div className="flex flex-col items-start">
                    <span className="text-lg tracking-wide">Khởi Tạo Thế Giới</span>
                    <span className="text-[10px] text-gold-200 font-normal opacity-80 uppercase tracking-wider">New Game</span>
                </div>
                <i className="fas fa-chevron-right text-xl group-hover:translate-x-1 transition-transform"></i>
            </button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-ink-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-ink-900 px-2 text-ink-500 font-bold tracking-widest">Hoặc</span>
                </div>
            </div>

            <button 
                onClick={() => fileInputRef.current?.click()}
                className="group w-full py-4 px-6 rounded-xl bg-ink-800 hover:bg-ink-700 border border-ink-600 hover:border-parchment-500/30 text-parchment-300 font-bold transition-all flex items-center justify-between"
            >
                <div className="flex flex-col items-start">
                    <span className="text-md">Tiếp Tục Hành Trình</span>
                    <span className="text-[10px] text-ink-500 font-normal uppercase tracking-wider">Load Save (.json)</span>
                </div>
                <i className="fas fa-upload text-ink-500 group-hover:text-parchment-300 transition-colors"></i>
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
            />
            
            <div className="mt-8 text-center">
                <p className="text-[10px] text-ink-600">
                    Phiên bản Alpha 3.0 • Powered by Google Gemini
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};