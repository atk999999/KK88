import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Turn, GameSession, StoryLength, RegistryEntry, GameOption, GameStats, NSFWFocus } from '../types';
import { db } from '../db';

interface GameUIProps {
  session: GameSession;
  turns: Turn[];
  currentStats: GameStats | null;
  currentOptions: GameOption[] | null;
  loading: boolean;
  onOptionClick: (action: string, lengthMode: StoryLength) => void;
  onRegenerate: (turnIndex: number, newPrompt: string, lengthMode: StoryLength) => void;
  onUndo: () => void;
  avatarUrl?: string;
  genre: string;
  onExit: () => void;
  onMultiverse: () => void;
  onDelete: () => void;
  onExport: () => void; // JSON Export
  onExportText: () => void; // NEW: TXT Export
  onSave: () => void; 
  onUpdateSession: (field: keyof GameSession, value: any) => void;
}

const FONTS = [
    { name: 'Mặc định (Serif)', value: "'Merriweather', serif", class: 'font-serif' },
    { name: 'Hiện đại (Sans)', value: "'Roboto', sans-serif", class: 'font-sans' },
    { name: 'Cổ điển (Display)', value: "'Playfair Display', serif", class: 'font-display' },
    { name: 'Máy đánh chữ', value: "'Source Code Pro', monospace", class: 'font-mono' },
    { name: 'Thư pháp', value: "'Dancing Script', cursive", class: 'font-cursive' },
];

const TEXT_COLORS = [
    { name: 'Giấy Cũ', value: '#fffbeb', bg: 'bg-[#fffbeb]' }, 
    { name: 'Vàng Kim', value: '#fde047', bg: 'bg-yellow-300' },
    { name: 'Trắng Tinh', value: '#ffffff', bg: 'bg-white' },
    { name: 'Xanh Matrix', value: '#4ade80', bg: 'bg-green-400' },
    { name: 'Hồng Phấn', value: '#f9a8d4', bg: 'bg-pink-300' },
    { name: 'Xám Bạc', value: '#cbd5e1', bg: 'bg-slate-300' },
];

// --- HELPER FOR MAP ---
const getRoomIcon = (name: any) => {
    if (typeof name !== 'string') return 'fa-door-open';
    const n = name.toLowerCase();
    if (n.includes('ngủ') || n.includes('bed') || n.includes('phòng')) return 'fa-bed';
    if (n.includes('bếp') || n.includes('kitchen') || n.includes('ăn')) return 'fa-utensils';
    if (n.includes('tắm') || n.includes('bath')) return 'fa-bath';
    if (n.includes('vệ sinh') || n.includes('toilet') || n.includes('wc')) return 'fa-toilet';
    if (n.includes('khách') || n.includes('living') || n.includes('sảnh')) return 'fa-couch';
    if (n.includes('sách') || n.includes('thư') || n.includes('library') || n.includes('học')) return 'fa-book';
    if (n.includes('kho') || n.includes('storage')) return 'fa-boxes';
    if (n.includes('vườn') || n.includes('sân') || n.includes('garden')) return 'fa-tree';
    if (n.includes('thờ') || n.includes('đền') || n.includes('điện')) return 'fa-vihara';
    if (n.includes('đường') || n.includes('phố') || n.includes('chợ')) return 'fa-road';
    if (n.includes('cổng') || n.includes('gate')) return 'fa-torii-gate';
    return 'fa-door-open';
};

// --- USER MESSAGE COMPONENT (COLLAPSIBLE) ---
const UserMessage: React.FC<{ text: string }> = ({ text }) => {
    const [expanded, setExpanded] = useState(false);
    
    // Safety check for empty text
    const rawText = text || "";
    
    // REMOVE SYSTEM TAGS FROM DISPLAY (HIDE 1200 REQ)
    const displayText = rawText
        .replace(/\[YÊU CẦU ĐỘ DÀI\]:\s*\d+/gi, '') // Hide specific length tag
        .replace(/\[\w+\]:/g, (match) => {
             // Optional: You can hide prompt tags here too if desired, e.g. [HÀNH ĐỘNG]:
             return match; 
        })
        .trim();

    // Threshold length to decide if we need to truncate
    const THRESHOLD = 80; 
    const isLong = displayText.length > THRESHOLD;

    return (
        <div 
            onClick={() => isLong && setExpanded(!expanded)} 
            className={`text-parchment-100 text-lg font-display font-medium leading-relaxed italic text-center transition-all ${isLong ? 'cursor-pointer hover:text-gold-200' : ''}`}
            title={isLong ? (expanded ? "Thu gọn" : "Xem chi tiết") : ""}
        >
            {expanded || !isLong ? displayText : `${displayText.substring(0, THRESHOLD)}...`}
            
            {isLong && !expanded && (
                <div className="text-[10px] text-gold-500/70 mt-1 uppercase tracking-widest font-sans not-italic">
                    <i className="fas fa-chevron-down mr-1"></i> Nhấn để xem chi tiết
                </div>
            )}
        </div>
    );
};

// --- WIKI DETAILED CARD ---
const WikiQuickCard: React.FC<{ entry: RegistryEntry; onClose: () => void; onDelete: (id: number) => void }> = ({ entry, onClose, onDelete }) => {
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (entry.id) onDelete(entry.id);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
            <div 
                className="bg-ink-950/90 border border-gold-500/30 rounded-2xl w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col max-h-[85vh] animate-slide-up" 
                onClick={e => e.stopPropagation()}
            >
                <div className="h-32 bg-gradient-to-r from-ink-900 via-ink-800 to-ink-900 relative border-b border-white/10">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
                    <div className="absolute -bottom-10 left-8 flex items-end">
                        <div className="w-24 h-24 rounded-xl bg-ink-950 border-2 border-gold-500 shadow-xl flex items-center justify-center text-gold-500 text-4xl overflow-hidden">
                             {entry.type === 'NPC' && <i className="fas fa-user-circle"></i>}
                             {entry.type === 'LOCATION' && <i className="fas fa-map-marked-alt"></i>}
                             {entry.type === 'FACTION' && <i className="fas fa-users"></i>}
                             {entry.type === 'ITEM' && <i className="fas fa-khanda"></i>}
                             {entry.type === 'KNOWLEDGE' && <i className="fas fa-book-dead"></i>}
                             {entry.type === 'SKILL' && <i className="fas fa-bolt"></i>}
                        </div>
                    </div>
                    
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                            onClick={handleDelete}
                            className="w-8 h-8 rounded-full bg-crimson-900/80 hover:bg-crimson-600 text-white transition-colors flex items-center justify-center border border-crimson-500"
                            title="Xóa mục này"
                        >
                            <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/50 hover:bg-ink-700 text-white transition-colors flex items-center justify-center border border-white/10">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pt-12 px-8 pb-8 scrollbar-thin scrollbar-thumb-gold-500/20">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-200 to-parchment-100">
                                {entry.name}
                            </h3>
                            <div className="flex gap-2 mt-2">
                                <span className="bg-ink-800 text-ink-400 text-[10px] font-bold px-2 py-0.5 rounded border border-ink-700 uppercase tracking-wider">{entry.type}</span>
                                {entry.powerLevel && (
                                    <span className="bg-crimson-900/30 text-crimson-300 text-[10px] font-bold px-2 py-0.5 rounded border border-crimson-500/30 uppercase tracking-wider flex items-center gap-1">
                                        <i className="fas fa-fist-raised text-[8px]"></i> {entry.powerLevel}
                                    </span>
                                )}
                                {entry.affiliation && (
                                    <span className="bg-blue-900/30 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30 uppercase tracking-wider flex items-center gap-1">
                                        <i className="fas fa-flag text-[8px]"></i> {entry.affiliation}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {entry.status && (
                        <div className="mb-6 bg-gradient-to-r from-ink-900 to-ink-900/50 p-4 rounded-lg border-l-4 border-spirit-500 shadow-inner">
                            <h4 className="text-[10px] font-bold text-spirit-400 uppercase tracking-wider mb-1"><i className="fas fa-heart-pulse mr-1"></i> Trạng Thái / Cảm Xúc</h4>
                            <p className="text-parchment-100 italic font-serif leading-relaxed">{entry.status}</p>
                        </div>
                    )}

                    <div className="prose-content text-parchment-300 leading-loose text-justify mb-8 font-serif">
                        {entry.description || "Chưa có mô tả chi tiết."}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-6">
                        {entry.appearance && (
                            <div className="bg-ink-900/30 p-4 rounded-lg border border-white/5">
                                <h5 className="text-gold-500 text-xs font-bold uppercase mb-2"><i className="fas fa-eye mr-1"></i> Ngoại Hình</h5>
                                <p className="text-sm text-ink-300">{entry.appearance}</p>
                            </div>
                        )}
                        {entry.personality && (
                            <div className="bg-ink-900/30 p-4 rounded-lg border border-white/5">
                                <h5 className="text-gold-500 text-xs font-bold uppercase mb-2"><i className="fas fa-brain mr-1"></i> Tính Cách</h5>
                                <p className="text-sm text-ink-300">{entry.personality}</p>
                            </div>
                        )}
                        {entry.secrets && (
                            <div className="col-span-1 md:col-span-2 bg-ink-900/30 p-4 rounded-lg border border-arcane-500/20 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-black/90 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-500 z-10 cursor-pointer">
                                    <span className="text-arcane-400 text-xs font-bold uppercase tracking-widest"><i className="fas fa-lock mr-2"></i> Bí Mật (Rê chuột để xem)</span>
                                </div>
                                <h5 className="text-arcane-400 text-xs font-bold uppercase mb-2"><i className="fas fa-key mr-1"></i> Bí Mật</h5>
                                <p className="text-sm text-parchment-200 italic">{entry.secrets}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- NARRATIVE DISPLAY ---
const NarrativeDisplay: React.FC<{ text: string; worldEvents?: string[]; wikiEntries: RegistryEntry[]; onWikiClick: (entry: RegistryEntry) => void; style?: React.CSSProperties; isLivingWorldEnabled: boolean }> = ({ text, worldEvents, wikiEntries, onWikiClick, style, isLivingWorldEnabled }) => {
  const [isEventsExpanded, setIsEventsExpanded] = useState(true);

  const validEntries = useMemo(() => {
     return wikiEntries
        .filter(e => e.name && e.name.trim().length > 0)
        .sort((a, b) => b.name.length - a.name.length);
  }, [wikiEntries]);

  const parseText = (content: string) => {
    if (!content || validEntries.length === 0) return content;
    
    try {
        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(${validEntries.map(e => escapeRegExp(e.name)).join('|')})`, 'gi');
        const parts = content.split(pattern);
        
        return parts.map((part, index) => {
            const lowerPart = part.toLowerCase();
            const entry = validEntries.find(e => e.name.toLowerCase() === lowerPart);
            if (entry) {
                return (
                    <span 
                        key={index} 
                        onClick={(e) => { e.stopPropagation(); onWikiClick(entry); }} 
                        className="font-bold text-gold-400 hover:text-gold-200 hover:bg-gold-500/10 cursor-pointer transition-colors border-b border-gold-500/30 hover:border-gold-500 px-0.5 rounded" 
                        title="Xem chi tiết"
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    } catch (e) {
        console.warn("Narrative parse failed, rendering raw text", e);
        return content;
    }
  };

  const paragraphs = text.split('\n\n').filter(p => p.trim());
  return (
    <div className="prose-content leading-loose text-justify whitespace-pre-wrap" style={style}>
      {paragraphs.map((p, idx) => <p key={idx} className="mb-4 animate-fade-in drop-shadow-sm">{parseText(p)}</p>)}
      
      {/* ONLY RENDER IF ENABLED AND HAS EVENTS. ANTI-CRASH: Check Array.isArray */}
      {isLivingWorldEnabled && Array.isArray(worldEvents) && worldEvents.length > 0 && (
          <div className="mt-8 mb-4 bg-ink-950/60 border-l-4 border-arcane-500 rounded-r-lg shadow-lg relative overflow-hidden transition-all group">
             <div 
                className="flex items-center justify-between p-3 bg-arcane-900/10 cursor-pointer hover:bg-arcane-900/20 transition-colors select-none"
                onClick={() => setIsEventsExpanded(!isEventsExpanded)}
             >
                 <div className="flex items-center gap-2">
                     <i className="fas fa-globe-americas text-arcane-500"></i>
                     <h4 className="text-arcane-400 font-bold text-xs uppercase">
                         Tin Tức Thế Giới (Living World)
                     </h4>
                 </div>
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] text-ink-500 group-hover:text-arcane-400 transition-colors">
                        {isEventsExpanded ? 'Thu gọn' : 'Hiển thị'}
                     </span>
                     <button className="text-arcane-500 hover:text-arcane-300 transition-colors">
                         <i className={`fas ${isEventsExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                     </button>
                 </div>
             </div>

             {isEventsExpanded && (
                 <div className="p-4 pt-2 border-t border-arcane-500/10 animate-slide-up">
                     <ul className="space-y-2">
                        {worldEvents.map((event, idx) => {
                            let eventText = "";
                            if (typeof event === 'string') {
                                eventText = event;
                            } else if (typeof event === 'object' && event !== null) {
                                // Fix for React Error #31: Handle objects if AI returns structured events
                                const e = event as any;
                                eventText = e.description || e.text || e.eventName || JSON.stringify(e);
                            } else {
                                eventText = String(event);
                            }
                            
                            return (
                                <li key={idx} className="text-sm text-parchment-200 flex items-start gap-2">
                                    <i className="fas fa-caret-right text-arcane-500 mt-1 flex-shrink-0"></i>
                                    <span className="italic">{parseText(eventText)}</span>
                                </li>
                            );
                        })}
                     </ul>
                 </div>
             )}
          </div>
      )}
    </div>
  );
};

export const GameUI: React.FC<GameUIProps> = ({ 
  session,
  turns, 
  currentStats, 
  currentOptions, 
  loading, 
  onOptionClick,
  onRegenerate,
  onUndo,
  avatarUrl,
  genre,
  onExit,
  onMultiverse,
  onDelete,
  onExport,
  onExportText, // NEW
  onSave, 
  onUpdateSession
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  
  // States
  const [showStatsMobile, setShowStatsMobile] = useState(false);
  const [showWiki, setShowWiki] = useState(false);
  const [wikiEntries, setWikiEntries] = useState<RegistryEntry[]>([]);
  const [wikiTab, setWikiTab] = useState<'NPC' | 'LOCATION' | 'FACTION' | 'ITEM' | 'SKILL' | 'ALL'>('ALL');
  const [showSummary, setShowSummary] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showGameConfig, setShowGameConfig] = useState(false); 
  const [showExportModal, setShowExportModal] = useState(false); // NEW STATE FOR EXPORT MODAL
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWikiIds, setSelectedWikiIds] = useState<Set<number>>(new Set());

  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      message: React.ReactNode;
      onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  const [cinemaMode, setCinemaMode] = useState(false);
  const [inputMode, setInputMode] = useState<'action' | 'system'>('action');
  const [force1200, setForce1200] = useState(false);
  const [viewingFloor, setViewingFloor] = useState<string | null>(null);

  const [tempBgUrl, setTempBgUrl] = useState('');
  const [tempBgType, setTempBgType] = useState<'image' | 'video'>('image'); 
  const [tempFont, setTempFont] = useState(session.fontFamily || "'Merriweather', serif");
  const [tempColor, setTempColor] = useState(session.textColor || "#fffbeb");
  const [tempAiModel, setTempAiModel] = useState(session.aiModel || 'gemini-3-pro-preview');

  const [selectedWikiEntry, setSelectedWikiEntry] = useState<RegistryEntry | null>(null);
  const [lengthMode, setLengthMode] = useState<StoryLength>('medium');
  const [showSaveToast, setShowSaveToast] = useState(false);

  const ITEMS_PER_PAGE = 6; 
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(turns.length / ITEMS_PER_PAGE) || 1;

  useEffect(() => {
      setCurrentPage(Math.ceil(turns.length / ITEMS_PER_PAGE) || 1);
  }, [turns.length]);

  useEffect(() => {
    if (session.id) {
        db.encyclopedia.where('sessionId').equals(session.id).toArray().then(setWikiEntries);
    }
  }, [session.id, turns.length, showWiki]); 

  useEffect(() => {
      if (currentStats?.mapData) {
          if (currentStats.mapData.currentFloor) {
              setViewingFloor(currentStats.mapData.currentFloor);
          } else if (currentStats.mapData.layout && currentStats.mapData.layout.length > 0) {
              setViewingFloor(currentStats.mapData.layout[0].floorName);
          }
      }
  }, [currentStats?.mapData?.locationName]);

  const displayedTurns = turns.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
          if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = 0;
          }
      }
  };

  // ... (Other handlers like confirm, wiki selection, delete remain same) ...
  const requestConfirm = (message: React.ReactNode, action: () => void) => {
      setConfirmModal({ isOpen: true, message, onConfirm: action });
  };

  const closeConfirm = () => {
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfirmAction = () => {
      confirmModal.onConfirm();
      closeConfirm();
  };

  const toggleWikiSelection = (id: number) => {
      setSelectedWikiIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
          return newSet;
      });
  };

  const toggleSelectionMode = () => {
      setIsSelectionMode(!isSelectionMode);
      setSelectedWikiIds(new Set()); 
  };

  const handleBatchDelete = () => {
      if (selectedWikiIds.size === 0) return;
      requestConfirm(
          <span>Bạn có chắc muốn xóa vĩnh viễn <span className="text-crimson-400 font-bold">{selectedWikiIds.size}</span> mục đã chọn không?</span>,
          async () => {
               try {
                    const ids = Array.from(selectedWikiIds);
                    await db.encyclopedia.bulkDelete(ids);
                    setWikiEntries(prev => prev.filter(e => !selectedWikiIds.has(e.id!)));
                    setSelectedWikiIds(new Set());
                    setIsSelectionMode(false); 
               } catch (e) {
                    console.error("Batch delete failed", e);
                    alert("Lỗi khi xóa hàng loạt.");
               }
          }
      );
  };

  const handleDeleteWikiEntryRequest = (id: number, name: string) => {
      requestConfirm(
          <span>Bạn có chắc muốn xóa vĩnh viễn mục "<span className="text-gold-400 font-bold">{name}</span>" không?</span>,
          async () => {
              try {
                  await db.encyclopedia.delete(id);
                  setWikiEntries(prev => prev.filter(e => e.id !== id));
                  if (selectedWikiEntry?.id === id) {
                      setSelectedWikiEntry(null);
                  }
              } catch (e) {
                  console.error("Failed to delete wiki entry", e);
                  alert("Lỗi khi xóa mục Wiki.");
              }
          }
      );
  };

  const handleUpdateAppearance = () => {
      if (onUpdateSession) {
          if (tempBgUrl !== '') {
              onUpdateSession('backgroundImageUrl', tempBgUrl);
              onUpdateSession('backgroundType', tempBgType);
          }
          onUpdateSession('fontFamily', tempFont);
          onUpdateSession('textColor', tempColor);
          onUpdateSession('aiModel', tempAiModel);
          setShowAppearance(false);
          setTempBgUrl('');
      }
  };

  const toggleNsfwFocus = (focus: NSFWFocus) => {
      const current = session.nsfwFocus || [];
      const updated = current.includes(focus) 
          ? current.filter(f => f !== focus) 
          : [...current, focus];
      onUpdateSession('nsfwFocus', updated);
  };

  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setTempBgUrl(reader.result as string);
              if (file.type.startsWith('video/')) {
                  setTempBgType('video');
              } else {
                  setTempBgType('image');
              }
          };
          reader.readAsDataURL(file);
      }
  };

  // Helper to handle turn submission with modifiers
  const submitTurnWithModifiers = (basePrompt: string, selectedLength: StoryLength) => {
      let finalPrompt = basePrompt;
      let finalLength = selectedLength;

      if (force1200) {
          finalPrompt += `\n\n[YÊU CẦU ĐỘ DÀI]: 1200`;
          finalLength = 'epic'; 
      }

      onOptionClick(finalPrompt, finalLength);
  };

  const handleInputSubmit = (value: string) => {
    if (!value.trim()) return;
    
    let finalPrompt = value;
    if (inputMode === 'system') {
        finalPrompt = `[HỆ THỐNG/THIÊN ĐẠO]: ${value}`;
    } else {
        if (!value.startsWith('[')) {
            finalPrompt = `[HÀNH ĐỘNG]: ${value}`;
        }
    }

    submitTurnWithModifiers(finalPrompt, lengthMode);
  };

  const cycleLengthMode = () => {
    if (lengthMode === 'short') setLengthMode('medium');
    else if (lengthMode === 'medium') setLengthMode('long');
    else if (lengthMode === 'long') setLengthMode('epic');
    else setLengthMode('short');
  };
  
  const lengthInfo = (() => {
    switch (lengthMode) {
      case 'short': return { icon: 'fa-align-left', label: 'Ngắn' };
      case 'medium': return { icon: 'fa-align-justify', label: 'Vừa' };
      case 'long': return { icon: 'fa-align-center', label: 'Dài' };
      case 'epic': return { icon: 'fa-book-open', label: 'Cực Dài' };
    }
  })();

  const handleMoveLocation = (location: string) => {
      setShowMap(false);
      if(!loading) submitTurnWithModifiers(`[HÀNH ĐỘNG]: Di chuyển tới ${location}.`, lengthMode);
  };

  const handlePlotTwist = () => {
      if (loading) return;
      submitTurnWithModifiers(`[PLOT TWIST]: Hãy tạo ra một tình tiết bất ngờ, kịch tính làm thay đổi cục diện hiện tại!`, lengthMode);
  };

  const handleAutoStory = () => {
      if (loading) return;
      submitTurnWithModifiers(`[AUTO]: Tiếp tục diễn biến câu chuyện. Nếu đây là thế giới Anime/Manga, hãy bám sát cốt truyện gốc. Nếu không, hãy tự phát triển tình tiết một cách hợp lý và lôi cuốn.`, lengthMode);
  };
  
  const handleContinue = () => {
      if (loading) return;
      submitTurnWithModifiers(`[TIẾP TỤC]: Viết tiếp...`, lengthMode);
  }

  const handleSaveGame = () => {
      if (onSave) {
          onSave();
          setShowSaveToast(true);
          setTimeout(() => setShowSaveToast(false), 3000);
      }
  }

  const toggleInputMode = () => {
      setInputMode(prev => prev === 'action' ? 'system' : 'action');
  }

  const getCurrentViewRooms = () => {
      if (!currentStats?.mapData?.layout) return [];
      const floorData = currentStats.mapData.layout.find(f => f.floorName === viewingFloor);
      if (!floorData && currentStats.mapData.layout.length > 0) return currentStats.mapData.layout[0].rooms;
      return floorData ? floorData.rooms : [];
  };

  const updateMechanics = (key: string, value: boolean) => {
      const currentMechanics = session.mechanics || {
          reputation: false, survival: false, crafting: false, combat: false, 
          time: false, currency: false, backpack: false, autoCodex: true, livingWorld: false
      };
      
      onUpdateSession('mechanics', { ...currentMechanics, [key]: value });
  };

  return (
    <div className="flex h-screen bg-transparent font-serif overflow-hidden relative selection:bg-gold-500/30 selection:text-gold-200"
         style={{
             backgroundImage: (!session.backgroundType || session.backgroundType === 'image') && session.backgroundImageUrl ? `url(${session.backgroundImageUrl})` : 'none',
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundAttachment: 'fixed',
         }}
    >
      {/* ... (Background layers same as before) ... */}
      {session.backgroundType === 'video' && session.backgroundImageUrl && (
          <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0" src={session.backgroundImageUrl} />
      )}
      <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 transition-all duration-1000 ${session.backgroundImageUrl && !cinemaMode ? 'bg-black/60 backdrop-blur-[2px]' : 'bg-transparent backdrop-blur-0'}`}>
        {!session.backgroundImageUrl && (
            <>
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-spirit-500/5 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-arcane-500/5 rounded-full blur-[100px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
            </>
        )}
      </div>

      {showSaveToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-fade-in bg-ink-900/95 border border-gold-500/50 text-gold-300 px-6 py-3 rounded-full shadow-lg backdrop-blur flex items-center gap-2">
              <i className="fas fa-check-circle text-gold-500"></i>
              <span className="text-sm font-bold tracking-wide">Đã lưu thành công!</span>
          </div>
      )}

      {/* RESTORE UI BUTTON FOR CINEMA MODE */}
      {cinemaMode && (
          <button 
            onClick={() => setCinemaMode(false)}
            className="fixed top-6 right-6 z-[100] w-12 h-12 bg-black/40 hover:bg-black/80 text-parchment-200 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-110"
            title="Hiện lại Giao Diện"
          >
              <i className="fas fa-eye text-xl"></i>
          </button>
      )}

      {/* EXPORT OPTIONS MODAL (NEW) */}
      {showExportModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowExportModal(false)}>
              <div className="bg-ink-900 border border-jade-500/30 rounded-xl w-full max-w-sm shadow-2xl p-6 relative animate-slide-up" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-jade-400 mb-4 text-center border-b border-white/5 pb-2">
                      <i className="fas fa-file-export mr-2"></i> Xuất Dữ Liệu
                  </h3>
                  <div className="space-y-3">
                      <button 
                          onClick={() => { onExport(); setShowExportModal(false); }}
                          className="w-full p-4 bg-ink-950 border border-ink-700 hover:border-jade-500 hover:bg-jade-900/20 rounded-lg flex items-center gap-4 transition-all group"
                      >
                          <div className="w-10 h-10 rounded-full bg-ink-800 flex items-center justify-center text-jade-500 group-hover:scale-110 transition-transform">
                              <i className="fas fa-database"></i>
                          </div>
                          <div className="text-left">
                              <div className="text-sm font-bold text-parchment-100 group-hover:text-jade-400">File Save (.json)</div>
                              <div className="text-[10px] text-ink-500">Sao lưu toàn bộ dữ liệu game để chơi tiếp sau này.</div>
                          </div>
                      </button>

                      <button 
                          onClick={() => { onExportText(); setShowExportModal(false); }}
                          className="w-full p-4 bg-ink-950 border border-ink-700 hover:border-parchment-500 hover:bg-ink-800 rounded-lg flex items-center gap-4 transition-all group"
                      >
                          <div className="w-10 h-10 rounded-full bg-ink-800 flex items-center justify-center text-parchment-400 group-hover:scale-110 transition-transform">
                              <i className="fas fa-file-alt"></i>
                          </div>
                          <div className="text-left">
                              <div className="text-sm font-bold text-parchment-100 group-hover:text-parchment-300">File Truyện (.txt)</div>
                              <div className="text-[10px] text-ink-500">Chỉ xuất nội dung cốt truyện để đọc (Không bao gồm dữ liệu game).</div>
                          </div>
                      </button>
                  </div>
                  <button onClick={() => setShowExportModal(false)} className="mt-4 w-full py-2 text-xs text-ink-500 hover:text-white">Đóng</button>
              </div>
          </div>
      )}

      {/* GAME CONFIG MODAL */}
      {showGameConfig && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
              {/* ... (Existing Game Config Content) ... */}
              <div className="bg-ink-900 border border-gold-500/30 rounded-xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden">
                  <button onClick={() => setShowGameConfig(false)} className="absolute top-4 right-4 text-ink-500 hover:text-white"><i className="fas fa-times"></i></button>
                  <h3 className="text-xl font-display font-bold text-gold-400 mb-6 flex items-center gap-2">
                      <i className="fas fa-cogs"></i> Cấu Hình Trò Chơi
                  </h3>
                  
                  <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 scrollbar-thin scrollbar-thumb-ink-700">
                      {/* GAMEPLAY SETTINGS */}
                      <div className="bg-ink-950/50 p-4 rounded-lg border border-ink-800 space-y-4">
                          <h4 className="text-xs font-bold text-ink-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">Hệ Thống</h4>
                          
                          {/* Living World Toggle */}
                          <div className="flex justify-between items-start">
                              <div>
                                  <h4 className="text-sm font-bold text-parchment-200 flex items-center gap-2">
                                      <i className="fas fa-globe-americas text-arcane-400"></i> Thông Tin Thế Giới
                                  </h4>
                                  <p className="text-[10px] text-ink-500 mt-1">
                                      {session.mechanics?.livingWorld 
                                        ? "Đang Bật: Hệ thống sẽ tự động tạo sự kiện ngẫu nhiên cho các phe phái (Living World)." 
                                        : "Đang Tắt: Chỉ tập trung vào nhân vật chính, không mô phỏng thế giới nền."}
                                  </p>
                              </div>
                              <button
                                 onClick={() => updateMechanics('livingWorld', !(session.mechanics?.livingWorld))}
                                 className={`w-12 h-6 rounded-full relative transition-colors border ${session.mechanics?.livingWorld ? 'bg-arcane-600 border-arcane-400' : 'bg-ink-900 border-ink-600'}`}
                              >
                                 <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-md ${session.mechanics?.livingWorld ? 'translate-x-7' : 'translate-x-1'}`}></div>
                              </button>
                          </div>

                          {/* Fixed Length 1200+ Toggle */}
                          <div className="flex justify-between items-start pt-2 border-t border-white/5">
                              <div>
                                  <h4 className="text-sm font-bold text-parchment-200 flex items-center gap-2">
                                      <i className="fas fa-file-alt text-spirit-400"></i> Cố định 1200 từ (Epic Mode)
                                  </h4>
                                  <p className="text-[10px] text-ink-500 mt-1">
                                      Luôn yêu cầu AI viết ít nhất 1200 chữ mỗi lượt (Bỏ qua chế độ Ngắn/Vừa).
                                  </p>
                              </div>
                              <button
                                 onClick={() => setForce1200(!force1200)}
                                 className={`w-12 h-6 rounded-full relative transition-colors border ${force1200 ? 'bg-spirit-600 border-spirit-400' : 'bg-ink-900 border-ink-600'}`}
                              >
                                 <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-md ${force1200 ? 'translate-x-7' : 'translate-x-1'}`}></div>
                              </button>
                          </div>
                      </div>

                      {/* CHỌN MÔ HÌNH AI */}
                      <div className="bg-ink-950/50 p-4 rounded-lg border border-ink-800 space-y-3">
                          <h4 className="text-xs font-bold text-ink-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">Mô Hình AI</h4>
                          <div className="grid grid-cols-3 gap-2">
                              {[
                                  { id: 'gemini-3-pro-preview', label: 'Pro 3.0', sub: 'Mạnh Nhất', icon: 'fa-brain', color: 'text-purple-400' },
                                  { id: 'gemini-3-flash-preview', label: 'Flash 3.0', sub: 'Nhanh', icon: 'fa-bolt', color: 'text-yellow-400' },
                                  { id: 'gemini-flash-lite-latest', label: 'Flash Lite', sub: 'Tiết Kiệm', icon: 'fa-feather', color: 'text-blue-400' },
                              ].map((m) => (
                                  <button
                                      key={m.id}
                                      onClick={() => onUpdateSession('aiModel', m.id)}
                                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all ${
                                          (session.aiModel || 'gemini-3-pro-preview') === m.id
                                          ? 'bg-ink-800 border-gold-500/50 shadow-sm'
                                          : 'bg-ink-900 border-ink-700 hover:border-ink-500'
                                      }`}
                                  >
                                      <i className={`fas ${m.icon} ${m.color} text-sm mb-1`}></i>
                                      <span className={`text-[10px] font-bold ${(session.aiModel || 'gemini-3-pro-preview') === m.id ? 'text-parchment-100' : 'text-ink-500'}`}>{m.label}</span>
                                      <span className="text-[8px] text-ink-600">{m.sub}</span>
                                  </button>
                              ))}
                          </div>
                          <p className="text-[9px] text-ink-600 italic mt-1">* Lưu ý: Pro 3.0 thông minh hơn nhưng phản hồi chậm hơn Flash.</p>
                      </div>

                      {/* SUPER MEMORY SECTION */}
                      <div className="bg-ink-950/50 p-4 rounded-lg border border-ink-800">
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <h4 className="text-sm font-bold text-parchment-200 flex items-center gap-2">
                                      <i className="fas fa-brain text-jade-400"></i> Siêu Trí Nhớ (Super Memory)
                                  </h4>
                                  <p className="text-[10px] text-ink-500 mt-1">
                                      {session.memoryDepth === 'high' 
                                          ? "Đang Bật: AI quét toàn bộ lịch sử để nhớ lại chi tiết cũ (Tốn token hơn)." 
                                          : "Đang Tắt: AI chỉ nhớ ngữ cảnh gần đây (Tốc độ nhanh hơn)."}
                                  </p>
                              </div>
                              <button
                                 onClick={() => onUpdateSession('memoryDepth', session.memoryDepth === 'high' ? 'standard' : 'high')}
                                 className={`w-12 h-6 rounded-full relative transition-colors border ${session.memoryDepth === 'high' ? 'bg-jade-600 border-jade-400' : 'bg-ink-900 border-ink-600'}`}
                              >
                                 <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-md ${session.memoryDepth === 'high' ? 'translate-x-7' : 'translate-x-1'}`}></div>
                              </button>
                          </div>
                      </div>

                      {/* NSFW SETTINGS SECTION */}
                      <div className={`bg-ink-950/50 p-4 rounded-lg border transition-colors ${session.isNSFW ? 'border-crimson-500/30' : 'border-ink-800'}`}>
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <h4 className="text-sm font-bold text-parchment-200 flex items-center gap-2">
                                      <i className="fas fa-exclamation-triangle text-crimson-400"></i> Chế độ NSFW (18+)
                                  </h4>
                                  <p className="text-[10px] text-ink-500 mt-1">Bật/Tắt nội dung người lớn.</p>
                              </div>
                              <button
                                 onClick={() => onUpdateSession('isNSFW', !session.isNSFW)}
                                 className={`w-12 h-6 rounded-full relative transition-colors border ${session.isNSFW ? 'bg-crimson-600 border-crimson-400' : 'bg-ink-900 border-ink-600'}`}
                              >
                                 <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-md ${session.isNSFW ? 'translate-x-7' : 'translate-x-1'}`}></div>
                              </button>
                          </div>

                          {session.isNSFW && (
                              <div className="space-y-4 pt-4 border-t border-white/5 animate-slide-up">
                                  {/* Intensity Toggle */}
                                  <div>
                                      <div className="text-[10px] font-bold text-ink-500 uppercase tracking-wide mb-2">Mức độ chi tiết</div>
                                      <div className="flex gap-2">
                                          <button 
                                              onClick={() => onUpdateSession('nsfwIntensity', 'soft')}
                                              className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${session.nsfwIntensity === 'soft' ? 'bg-crimson-500/20 border-crimson-500 text-crimson-200' : 'bg-ink-900 border-ink-700 text-ink-500'}`}
                                          >
                                              Vừa Phải (Soft)
                                          </button>
                                          <button 
                                              onClick={() => onUpdateSession('nsfwIntensity', 'extreme')}
                                              className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${session.nsfwIntensity === 'extreme' ? 'bg-crimson-600 border-crimson-400 text-white shadow-lg' : 'bg-ink-900 border-ink-700 text-ink-500'}`}
                                          >
                                              Cực Hạn (Extreme)
                                          </button>
                                      </div>
                                  </div>

                                  {/* Detailed Options (Only for Extreme) */}
                                  {session.nsfwIntensity === 'extreme' && (
                                      <div>
                                          <div className="text-[10px] font-bold text-ink-500 uppercase tracking-wide mb-2">Tùy chọn trọng tâm (Chọn nhiều)</div>
                                          <div className="grid grid-cols-2 gap-2">
                                              {[
                                                  { id: 'body', label: 'Miêu tả Cơ Thể', icon: 'fa-venus' },
                                                  { id: 'action', label: 'Hành Động Trần Trụi', icon: 'fa-hand-rock' },
                                                  { id: 'emotion', label: 'Cảm Xúc/Khoái Cảm', icon: 'fa-heart-pulse' },
                                                  { id: 'dialogue', label: 'Lời Thoại Dâm Tục', icon: 'fa-comments' },
                                                  { id: 'vulgar', label: 'Từ Ngữ Thô Tục', icon: 'fa-pepper-hot' },
                                                  { id: 'roleplay', label: 'Giữ Đúng Tính Cách', icon: 'fa-user-check' },
                                              ].map((opt) => (
                                                  <button
                                                      key={opt.id}
                                                      onClick={() => toggleNsfwFocus(opt.id as NSFWFocus)}
                                                      className={`
                                                          p-2 rounded border text-xs font-bold flex items-center gap-2 transition-all
                                                          ${(session.nsfwFocus || []).includes(opt.id as NSFWFocus)
                                                              ? 'bg-crimson-900/60 border-crimson-500 text-crimson-100 shadow-sm'
                                                              : 'bg-ink-900 border-ink-800 text-ink-500 hover:border-crimson-500/30'
                                                          }
                                                      `}
                                                  >
                                                      <i className={`fas ${opt.icon} w-4 text-center`}></i>
                                                      {opt.label}
                                                  </button>
                                              ))}
                                          </div>
                                          <div className="mt-2 text-[10px] text-ink-500 italic">
                                              *Lưu ý: Chọn "Giữ Đúng Tính Cách" để tránh AI biến nhân vật thành bạo dâm/tàn nhẫn vô lý.
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
                      <button onClick={() => setShowGameConfig(false)} className="px-6 py-2 bg-gold-600 hover:bg-gold-500 text-ink-950 font-bold rounded shadow-lg text-sm">
                          Đóng & Áp Dụng
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* ... (Existing Wiki Modals) ... */}
      {showWiki && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowWiki(false)}>
              <div className="bg-ink-900 border border-gold-500/30 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-ink-950/50">
                      <div className="flex items-center gap-4">
                          <h3 className="text-xl font-display font-bold text-gold-400">
                              <i className="fas fa-book-open mr-2"></i> Bách Khoa Toàn Thư
                          </h3>
                          {/* Selection Mode Toggle */}
                          <button 
                              onClick={toggleSelectionMode}
                              className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${isSelectionMode ? 'bg-crimson-900/50 text-crimson-400 border-crimson-500' : 'bg-ink-800 text-ink-500 border-ink-700 hover:text-white'}`}
                          >
                              {isSelectionMode ? 'Hủy chọn' : 'Chọn nhiều (Xóa)'}
                          </button>
                          {isSelectionMode && selectedWikiIds.size > 0 && (
                              <button 
                                  onClick={handleBatchDelete}
                                  className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-crimson-600 text-white border border-crimson-500 hover:bg-crimson-500 transition-all animate-fade-in"
                              >
                                  <i className="fas fa-trash-alt mr-1"></i> Xóa ({selectedWikiIds.size})
                              </button>
                          )}
                      </div>
                      <button onClick={() => setShowWiki(false)} className="text-ink-500 hover:text-white text-xl"><i className="fas fa-times"></i></button>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex bg-ink-950/30 px-6 pt-4 gap-2 border-b border-white/5 overflow-x-auto scrollbar-none">
                      {['ALL', 'NPC', 'LOCATION', 'FACTION', 'ITEM', 'SKILL'].map(tab => (
                          <button 
                              key={tab}
                              onClick={() => setWikiTab(tab as any)}
                              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${wikiTab === tab ? 'border-gold-500 text-gold-400 bg-gold-500/5' : 'border-transparent text-ink-500 hover:text-ink-300'}`}
                          >
                              {tab === 'ALL' ? 'Tất cả' : tab}
                          </button>
                      ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-ink-700 bg-ink-900/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {wikiEntries
                              .filter(e => wikiTab === 'ALL' || e.type === wikiTab)
                              .map(entry => (
                              <div 
                                  key={entry.id} 
                                  onClick={() => isSelectionMode ? toggleWikiSelection(entry.id!) : setSelectedWikiEntry(entry)}
                                  className={`
                                      group bg-ink-950 border rounded-lg p-4 cursor-pointer transition-all hover:-translate-y-1 relative overflow-hidden
                                      ${isSelectionMode && selectedWikiIds.has(entry.id!) ? 'border-crimson-500 bg-crimson-900/20' : 'border-ink-800 hover:border-gold-500/50 hover:shadow-lg'}
                                  `}
                              >
                                  {isSelectionMode && (
                                      <div className={`absolute top-2 right-2 w-4 h-4 rounded border flex items-center justify-center ${selectedWikiIds.has(entry.id!) ? 'bg-crimson-500 border-crimson-500' : 'border-ink-600 bg-ink-900'}`}>
                                          {selectedWikiIds.has(entry.id!) && <i className="fas fa-check text-[8px] text-white"></i>}
                                      </div>
                                  )}
                                  <div className="flex justify-between items-start mb-2">
                                      <h4 className="font-bold text-parchment-200 group-hover:text-gold-400 transition-colors truncate pr-6">{entry.name}</h4>
                                      {!isSelectionMode && (
                                          <button 
                                              onClick={(e) => { e.stopPropagation(); handleDeleteWikiEntryRequest(entry.id!, entry.name); }}
                                              className="opacity-0 group-hover:opacity-100 text-ink-600 hover:text-crimson-500 transition-all"
                                          >
                                              <i className="fas fa-trash-alt text-xs"></i>
                                          </button>
                                      )}
                                  </div>
                                  <span className="text-[9px] bg-ink-900 px-2 py-0.5 rounded text-ink-500 font-bold uppercase tracking-wider">{entry.type}</span>
                                  <p className="text-xs text-ink-400 mt-2 line-clamp-2">{entry.description}</p>
                              </div>
                          ))}
                      </div>
                      {wikiEntries.length === 0 && <div className="text-center text-ink-600 mt-20 italic">Chưa có dữ liệu tri thức.</div>}
                  </div>
              </div>
          </div>
      )}

      {/* DETAILED WIKI CARD */}
      {selectedWikiEntry && (
          <WikiQuickCard 
              entry={selectedWikiEntry} 
              onClose={() => setSelectedWikiEntry(null)} 
              onDelete={(id) => { handleDeleteWikiEntryRequest(id, selectedWikiEntry.name); }}
          />
      )}

      {/* SUMMARY MODAL */}
      {showSummary && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowSummary(false)}>
              <div className="bg-ink-900 border border-spirit-500/30 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-ink-950/50">
                      <h3 className="text-xl font-display font-bold text-spirit-400"><i className="fas fa-scroll mr-2"></i> Tóm Tắt Cốt Truyện</h3>
                      <button onClick={() => setShowSummary(false)} className="text-ink-500 hover:text-white"><i className="fas fa-times"></i></button>
                  </div>
                  <div className="p-8 overflow-y-auto font-serif text-parchment-200 leading-loose text-justify whitespace-pre-wrap scrollbar-thin scrollbar-thumb-spirit-900/50">
                      {session.summary || "Chưa có tóm tắt nào được ghi lại."}
                  </div>
              </div>
          </div>
      )}

      {/* APPEARANCE MODAL */}
      {showAppearance && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowAppearance(false)}>
              <div className="bg-ink-900 border border-pink-500/30 rounded-xl w-full max-w-md shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-display font-bold text-pink-400"><i className="fas fa-palette mr-2"></i> Giao Diện</h3>
                      <button onClick={() => setShowAppearance(false)} className="text-ink-500 hover:text-white"><i className="fas fa-times"></i></button>
                  </div>
                  
                  <div className="space-y-6">
                      <div>
                          <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider block mb-2">Hình Nền / Video URL</label>
                          <div className="flex gap-2">
                              <input 
                                  type="text" 
                                  value={tempBgUrl} 
                                  onChange={(e) => setTempBgUrl(e.target.value)} 
                                  placeholder="Nhập URL ảnh hoặc video..." 
                                  className="flex-1 bg-ink-950 border border-ink-700 rounded p-2 text-sm text-parchment-200 focus:border-pink-500 outline-none" 
                              />
                              <button onClick={() => bgInputRef.current?.click()} className="bg-ink-800 border border-ink-600 px-3 rounded text-ink-400 hover:text-pink-400"><i className="fas fa-upload"></i></button>
                              <input type="file" ref={bgInputRef} onChange={handleBgFileChange} accept="image/*,video/*" className="hidden" />
                          </div>
                          <div className="flex gap-2 mt-2">
                              <button onClick={() => setTempBgType('image')} className={`text-[10px] px-3 py-1 rounded border ${tempBgType === 'image' ? 'bg-pink-600 text-white border-pink-500' : 'bg-ink-950 text-ink-500 border-ink-700'}`}>Ảnh</button>
                              <button onClick={() => setTempBgType('video')} className={`text-[10px] px-3 py-1 rounded border ${tempBgType === 'video' ? 'bg-pink-600 text-white border-pink-500' : 'bg-ink-950 text-ink-500 border-ink-700'}`}>Video</button>
                          </div>
                      </div>

                      <div>
                          <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider block mb-2">Font Chữ</label>
                          <div className="grid grid-cols-2 gap-2">
                              {FONTS.map(f => (
                                  <button 
                                      key={f.value} 
                                      onClick={() => setTempFont(f.value)} 
                                      style={{ fontFamily: f.value }}
                                      className={`p-2 rounded border text-xs ${tempFont === f.value ? 'bg-pink-900/30 border-pink-500 text-pink-300' : 'bg-ink-950 border-ink-700 text-ink-400'}`}
                                  >
                                      {f.name}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider block mb-2">Màu Chữ Chính</label>
                          <div className="flex flex-wrap gap-2">
                              {TEXT_COLORS.map(c => (
                                  <button 
                                      key={c.value} 
                                      onClick={() => setTempColor(c.value)} 
                                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${c.bg} ${tempColor === c.value ? 'border-white shadow-lg scale-110' : 'border-transparent opacity-70'}`}
                                      title={c.name}
                                  />
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
                      <button onClick={handleUpdateAppearance} className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-2 px-6 rounded shadow-lg transition-all text-sm">
                          Áp Dụng
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MAP MODAL */}
      {showMap && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setShowMap(false)}>
              <div className="bg-ink-900 border border-blue-500/30 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-ink-950/50">
                      <div>
                          <h3 className="text-xl font-display font-bold text-blue-400 flex items-center gap-2">
                              <i className="fas fa-map-marked-alt"></i> Bản Đồ Khu Vực
                          </h3>
                          <p className="text-xs text-ink-500 mt-1 uppercase tracking-widest">{currentStats?.mapData?.locationName || "Không rõ địa điểm"}</p>
                      </div>
                      <button onClick={() => setShowMap(false)} className="text-ink-500 hover:text-white"><i className="fas fa-times"></i></button>
                  </div>

                  <div className="flex flex-1 overflow-hidden">
                      {/* Floor Selector (Left) */}
                      <div className="w-48 bg-ink-950/50 border-r border-white/5 p-4 flex flex-col gap-2 overflow-y-auto">
                          <label className="text-[10px] font-bold text-ink-500 uppercase tracking-wider mb-2">Tầng / Khu Vực</label>
                          {currentStats?.mapData?.layout?.map((floor, idx) => (
                              <button 
                                  key={idx}
                                  onClick={() => setViewingFloor(floor.floorName)}
                                  className={`p-3 rounded-lg text-left text-sm font-bold transition-all border ${viewingFloor === floor.floorName ? 'bg-blue-900/30 border-blue-500 text-blue-300' : 'bg-ink-900 border-ink-800 text-ink-500 hover:text-ink-300'}`}
                              >
                                  {floor.floorName}
                                  {currentStats.mapData?.currentFloor === floor.floorName && (
                                      <i className="fas fa-map-pin float-right text-crimson-500 animate-bounce mt-1"></i>
                                  )}
                              </button>
                          ))}
                          {(!currentStats?.mapData?.layout || currentStats.mapData.layout.length === 0) && (
                              <div className="text-xs text-ink-600 italic">Chưa có dữ liệu bản đồ chi tiết.</div>
                          )}
                      </div>

                      {/* Map Grid (Right) */}
                      <div className="flex-1 p-8 overflow-y-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                              {getCurrentViewRooms().map((room, idx) => {
                                  const isCurrentRoom = currentStats?.currentLocation?.includes(room);
                                  return (
                                      <div 
                                          key={idx}
                                          onClick={() => handleMoveLocation(room)}
                                          className={`
                                              aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-xl relative group
                                              ${isCurrentRoom ? 'bg-blue-900/20 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-ink-900 border-ink-700 hover:border-gold-500/50'}
                                          `}
                                      >
                                          {isCurrentRoom && (
                                              <div className="absolute top-2 right-2 w-3 h-3 bg-crimson-500 rounded-full animate-ping"></div>
                                          )}
                                          <i className={`fas ${getRoomIcon(room)} text-3xl mb-3 ${isCurrentRoom ? 'text-blue-400' : 'text-ink-600 group-hover:text-gold-400'}`}></i>
                                          <span className={`text-sm font-bold ${isCurrentRoom ? 'text-blue-200' : 'text-ink-400 group-hover:text-parchment-100'}`}>{room}</span>
                                          
                                          {!isCurrentRoom && (
                                              <span className="absolute bottom-2 text-[10px] text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity">Nhấn để đi</span>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* CONFIRM MODAL - ADDED HERE TO FIX DELETE BUG */}
      {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in" onClick={closeConfirm}>
              <div className="bg-ink-900 border border-gold-500/30 rounded-xl w-full max-w-sm shadow-2xl p-6 relative animate-slide-up" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-bold text-gold-400 mb-4 text-center border-b border-white/5 pb-2">Xác Nhận</h3>
                  <div className="text-parchment-200 text-center mb-6 text-sm leading-relaxed">{confirmModal.message}</div>
                  <div className="flex justify-center gap-4">
                      <button onClick={closeConfirm} className="px-5 py-2 rounded bg-ink-800 text-ink-400 hover:text-white text-xs font-bold border border-ink-700 hover:border-ink-500 transition-all">Hủy</button>
                      <button onClick={handleConfirmAction} className="px-5 py-2 rounded bg-crimson-600 hover:bg-crimson-500 text-white text-xs font-bold shadow-lg border border-crimson-400 transition-all">Xác Nhận</button>
                  </div>
              </div>
          </div>
      )}
      
      {/* LEFT PANEL: MAIN STORY */}
      <div className={`flex-1 flex flex-col h-full relative z-10 transition-all duration-700 ${cinemaMode ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
        
        {/* HEADER - Keep existing */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-ink-950/80 backdrop-blur-md z-50 shadow-sm relative">
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 via-crimson-500 to-arcane-600 flex items-center justify-center text-ink-950 shadow-[0_0_15px_rgba(234,179,8,0.3)]"><i className="fas fa-yin-yang fa-spin-slow text-sm text-white"></i></div>
             <div className="flex flex-col">
                 <h1 className="font-display font-bold text-lg md:text-xl text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-parchment-100 to-spirit-300 tracking-wide drop-shadow-sm truncate max-w-[200px] md:max-w-none">{currentStats?.name || "Thiên Đạo Simulator"}</h1>
                 
                 {/* Time Display */}
                 <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-ink-500 font-bold">
                     {currentStats?.currentTime && (
                         <div className="flex items-center gap-1">
                             <i className="far fa-clock text-gold-500/70"></i> {currentStats.currentTime}
                         </div>
                     )}
                 </div>
             </div>
          </div>
          <div className="flex gap-2">
            <button disabled={loading} onClick={onMultiverse} title="Hành trình đa thế giới" className="p-2 text-violet-300"><i className="fas fa-globe" /></button>
            {/* NEW BUTTON */}
            <button onClick={() => setCinemaMode(true)} className="p-2 rounded-full transition-all duration-300 flex items-center gap-2 text-ink-500 hover:text-parchment-100 hover:bg-ink-800/50" title="Chế độ Điện Ảnh (Ẩn UI)">
                <i className="fas fa-eye-slash text-lg"></i>
            </button>
            <button onClick={onExit} className="p-2 rounded-full transition-all duration-300 flex items-center gap-2 text-crimson-500/80 hover:text-crimson-400 hover:bg-ink-800/50" title="Về màn hình chính">
                <i className="fas fa-home text-lg"></i>
            </button>
            <button onClick={() => setShowStatsMobile(!showStatsMobile)} className="md:hidden text-parchment-400 p-2 w-10 hover:bg-ink-800/50 rounded-full transition-colors flex items-center justify-center relative z-50"><i className={`fas ${showStatsMobile ? 'fa-times' : 'fa-scroll'} text-xl`}></i></button>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 md:px-20 lg:px-32 py-8 scroll-smooth scrollbar-thin scrollbar-thumb-gold-500/10 pb-[220px]">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
                <div className="flex justify-center mb-6 animate-fade-in sticky top-0 z-20">
                    <div className="flex items-center gap-2 bg-ink-900/90 rounded-full px-2 py-1.5 border border-ink-700/50 backdrop-blur-md shadow-lg">
                        <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="w-8 h-8 rounded-full flex items-center justify-center text-ink-500 hover:text-gold-400 hover:bg-ink-800 transition-colors disabled:opacity-30"><i className="fas fa-angle-double-left text-xs"></i></button>
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="w-8 h-8 rounded-full flex items-center justify-center text-ink-500 hover:text-gold-400 hover:bg-ink-800 transition-colors disabled:opacity-30"><i className="fas fa-chevron-left text-xs"></i></button>
                        
                        <span className="text-[10px] font-bold text-gold-500 uppercase tracking-widest px-2 min-w-[80px] text-center">
                            Trang {currentPage} / {totalPages}
                        </span>
                        
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="w-8 h-8 rounded-full flex items-center justify-center text-ink-500 hover:text-gold-400 hover:bg-ink-800 transition-colors disabled:opacity-30"><i className="fas fa-chevron-right text-xs"></i></button>
                        <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} className="w-8 h-8 rounded-full flex items-center justify-center text-ink-500 hover:text-gold-400 hover:bg-ink-800 transition-colors disabled:opacity-30"><i className="fas fa-angle-double-right text-xs"></i></button>
                    </div>
                </div>
            )}

            {/* RENDER TURNS (PAGINATED) */}
            {displayedTurns.map((turn, idx) => {
               let worldEvents: string[] | undefined = undefined;
               if (turn.role === 'model' && turn.rawResponseJSON) {
                   try {
                       const json = JSON.parse(turn.rawResponseJSON);
                       if (Array.isArray(json.worldEvents)) {
                           worldEvents = json.worldEvents;
                       }
                   } catch {}
               }

               return (
                  <div key={idx} className="relative group">
                    {turn.role === 'model' ? (
                        <div className="pl-4 md:pl-0 border-l-2 border-transparent md:border-none">
                          <NarrativeDisplay 
                            text={turn.narrative || ''} 
                            worldEvents={worldEvents} 
                            wikiEntries={wikiEntries} 
                            onWikiClick={setSelectedWikiEntry} 
                            style={{ fontFamily: session.fontFamily || "'Merriweather', serif", color: session.textColor || "#fffbeb" }} 
                            isLivingWorldEnabled={session.mechanics?.livingWorld ?? false} 
                          />
                        </div>
                    ) : (
                        <div className="flex justify-center my-8 animate-slide-up">
                          <div className="relative max-w-2xl w-full group">
                            <div className="px-8 py-6 rounded-xl border backdrop-blur-md relative overflow-hidden bg-ink-900/60 border-gold-500/20 shadow-xl">
                              <div className="absolute inset-0 bg-gradient-to-r pointer-events-none from-transparent via-gold-500/5 to-transparent"></div>
                              <i className="fas fa-pen absolute top-4 right-4 text-ink-600 text-xs"></i>
                              
                              <div className="text-[10px] font-bold mb-3 uppercase tracking-[0.2em] flex items-center gap-2 text-gold-500">
                                <i className="fas fa-comment-alt"></i> Mệnh Lệnh
                              </div>
                              {/* Use Collapsible Component */}
                              <UserMessage text={turn.userPrompt || ''} />
                            </div>
                          </div>
                        </div>
                    )}
                  </div>
               );
            })}
            
            {loading && (
              <div className="flex flex-col items-center justify-center space-y-4 py-8 opacity-90">
                <div className="relative w-16 h-16"><div className="absolute inset-0 border-2 border-gold-500/10 rounded-full"></div><div className="absolute inset-0 border-2 border-t-gold-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div><div className="absolute inset-2 border-2 border-t-transparent border-r-crimson-400 border-b-transparent border-l-transparent rounded-full animate-spin-slow direction-reverse"></div><div className="absolute inset-0 flex items-center justify-center"><i className="fas fa-feather-alt text-gold-500/50 animate-pulse"></i></div></div>
                <span className="text-gold-400 text-xs tracking-[0.3em] uppercase animate-pulse font-display">Thiên Đạo Diễn Sinh...</span>
              </div>
            )}
            
            <div ref={bottomRef} className="h-6" />
          </div>
        </div>

        {/* INPUT & CONTROLS - FIXED BOTTOM */}
        <div className={`fixed bottom-0 left-0 right-0 p-4 md:p-6 z-40 transition-all duration-500 border-t border-white/5 backdrop-blur-xl shadow-[0_-5px_30px_rgba(0,0,0,0.5)] ${inputMode === 'system' ? 'bg-indigo-950/95 border-t-purple-500/20' : 'bg-ink-900/95 border-t-gold-500/10'}`}>
          <div className="max-w-4xl mx-auto relative flex flex-col gap-3">
            
            {/* BUTTONS MOVED INSIDE THE FOOTER CONTAINER - FIXED LAYOUT */}
            <div className="flex justify-end gap-3 mb-1">
                <button 
                    onClick={handleAutoStory} 
                    disabled={loading}
                    className="bg-purple-900/50 hover:bg-purple-800 text-white border border-purple-500/30 hover:border-purple-500/70 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-2 transition-all"
                >
                    <i className="fas fa-route"></i> Đi Theo Cốt Truyện
                </button>
                <button 
                    onClick={handlePlotTwist} 
                    disabled={loading}
                    className="bg-crimson-900/50 hover:bg-crimson-800 text-white border border-crimson-500/30 hover:border-crimson-500/70 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wide flex items-center gap-2 transition-all"
                >
                    <i className="fas fa-bolt"></i> PLOT TWIST
                </button>
            </div>

            <div className="flex gap-2 mb-1">
                <button onClick={onUndo} disabled={loading} className="px-4 py-2 bg-ink-900/50 border border-ink-700/50 rounded text-[10px] font-bold text-ink-400 hover:text-white hover:border-ink-500 uppercase tracking-wider flex items-center gap-2 transition-colors">
                    <i className="fas fa-undo"></i> Hoàn Tác
                </button>
                <button onClick={handleContinue} disabled={loading} className="px-4 py-2 bg-ink-900/50 border border-ink-700/50 rounded text-[10px] font-bold text-ink-400 hover:text-white hover:border-ink-500 uppercase tracking-wider flex items-center gap-2 transition-colors">
                    <i className="fas fa-forward"></i> Tiếp Tục
                </button>
                <div className="flex-1 text-right text-[10px] text-ink-500 italic pt-2">
                    {inputMode === 'system' ? 'Chế độ Thiên Đạo' : 'Chế độ Nhập Vai'} • {force1200 ? 'Epic 1200+ (Khóa)' : (lengthMode === 'epic' ? 'Cực Dài (1200+)' : lengthInfo.label)}
                </div>
            </div>

            <div className="flex gap-2 relative items-stretch">
                <button 
                    onClick={toggleInputMode}
                    className={`w-12 border rounded-xl flex items-center justify-center transition-all shadow-inner ${inputMode === 'system' ? 'bg-purple-900/40 border-purple-500 text-purple-300' : 'bg-gold-900/20 border-gold-500/30 text-gold-400 hover:text-white hover:bg-gold-900/40'}`}
                    title={inputMode === 'system' ? "Chuyển sang chế độ Hành Động" : "Chuyển sang chế độ Thiên Đạo"}
                >
                    <i className={`fas ${inputMode === 'system' ? 'fa-eye' : 'fa-user'} text-lg`}></i>
                </button>

                <div className={`flex-1 relative group flex items-center border rounded-xl overflow-hidden shadow-inner transition-all ${inputMode === 'system' ? 'bg-indigo-900/40 border-purple-500/50 focus-within:bg-indigo-900/60' : 'bg-ink-900/60 border-ink-700 focus-within:border-gold-500/50 focus-within:bg-ink-800/80'}`}>
                    
                    {/* LENGTH SELECTOR */}
                    <button onClick={cycleLengthMode} disabled={force1200} className={`pl-4 pr-3 h-full transition-colors flex items-center gap-2 border-r border-white/5 min-w-[100px] ${inputMode === 'system' ? 'text-purple-300 hover:text-purple-200' : 'text-ink-400 hover:text-gold-400'} ${force1200 ? 'opacity-50 cursor-not-allowed' : ''}`} title="Độ dài câu chuyện">
                         <i className="fas fa-bars"></i>
                         <span className="text-xs font-bold whitespace-nowrap">{force1200 ? '1200+' : (lengthMode === 'epic' ? `Cực Dài` : lengthInfo.label)}</span>
                    </button>
                    
                    <input 
                        ref={inputRef} 
                        type="text" 
                        placeholder={inputMode === 'system' ? "Nhập ý chí của Thiên Đạo..." : "Nhập hành động..."}
                        className={`flex-1 bg-transparent px-4 py-4 focus:outline-none font-serif h-full text-lg ${inputMode === 'system' ? 'text-purple-100 placeholder-purple-400/50' : 'text-parchment-100 placeholder-ink-600'}`}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !loading) { handleInputSubmit(e.currentTarget.value); e.currentTarget.value = ''; }}} 
                    />
                </div>
                
                <button onClick={() => { if(inputRef.current) { handleInputSubmit(inputRef.current.value); inputRef.current.value = ''; } }} disabled={loading} className={`w-16 rounded-xl flex items-center justify-center text-xl shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 border ${inputMode === 'system' ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-400/50 hover:shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-gradient-to-br from-gold-500 to-amber-600 text-white border-gold-400/50 hover:shadow-[0_0_15px_rgba(234,179,8,0.4)]'}`}>
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-bolt'}`}></i>
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: STATS SIDEBAR */}
      {/* ... (Existing code for Right Panel) ... */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-ink-950/95 backdrop-blur-2xl border-l border-white/5 transform transition-transform duration-300 z-[60] shadow-2xl md:relative md:transform-none md:w-80 md:bg-ink-950/30 md:shadow-none md:z-20 ${showStatsMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} ${cinemaMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button onClick={() => setShowStatsMobile(false)} className="md:hidden absolute top-4 left-4 text-parchment-300 hover:text-white p-2"><i className="fas fa-times text-xl"></i></button>
        {currentStats ? (
          <div className="h-full overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-ink-700 flex flex-col relative pb-[100px]">
            {/* AVATAR & NAME */}
            <div className="flex flex-col items-center mb-8 relative">
              <div className="relative group cursor-pointer animate-float">
                <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-tr from-gold-400 via-crimson-500 to-spirit-500 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                   <div className="w-full h-full rounded-full overflow-hidden bg-ink-950 border-2 border-ink-900"><img src={avatarUrl || `https://ui-avatars.com/api/?name=${currentStats.name}&background=random`} alt="Avatar" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500 hover:scale-110" /></div>
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-ink-900 border border-gold-500/50 px-3 py-1 rounded-full text-[9px] font-bold text-gold-300 uppercase whitespace-nowrap shadow-lg tracking-widest font-display">{currentStats.realm?.split(' ')[0] || 'Phàm Nhân'}</div>
              </div>
              <h2 className="mt-6 text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-parchment-100 to-parchment-300 text-center drop-shadow">{currentStats.name}</h2>
              <div className="text-ink-500 text-[9px] uppercase tracking-[0.2em] mt-1 font-bold">Địa Vị</div>
              <div className="text-gold-300 text-sm mt-0.5 font-bold drop-shadow-sm font-display">{currentStats.realm}</div>
            </div>

            <div className="space-y-3">
              {/* STATUS & TIME */}
              <div className="bg-ink-900/40 border border-ink-700/50 rounded-xl p-3 hover:border-crimson-500/30 transition-colors">
                <div className="flex items-center gap-2 mb-1"><i className="fas fa-heart-pulse text-crimson-400 text-xs"></i><span className="text-[9px] font-bold text-ink-500 uppercase tracking-wide">Trạng Thái</span></div>
                <div className="text-sm text-parchment-200 font-display">{currentStats.status}</div>
              </div>

              <div className="bg-ink-900/40 border border-ink-700/50 rounded-xl p-3 hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center gap-2 mb-1"><i className="far fa-clock text-blue-400 text-xs"></i><span className="text-[9px] font-bold text-ink-500 uppercase tracking-wide">Thời Gian</span></div>
                    <div className="text-sm text-parchment-200 font-display">{currentStats.currentTime || <span className="text-ink-600 italic text-xs">...</span>}</div>
              </div>

              {/* GIA THẾ / CĂN CƠ */}
              <div className="bg-ink-900/40 border border-ink-700/50 rounded-xl p-3 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-1 opacity-10"><i className="fas fa-atom text-4xl"></i></div>
                   <div className="flex items-center gap-2 mb-2"><i className="fas fa-dna text-gold-400 text-xs"></i><span className="text-[9px] font-bold text-ink-500 uppercase tracking-wide">Gia Thế / Căn Cơ</span></div>
                   <div className="text-sm font-bold text-gold-400 mb-2">{currentStats.spiritualRoot || currentStats.realm}</div>
                   
                   {/* ANTI-CRASH: Check if talents is array */}
                   {Array.isArray(currentStats.talents) && (
                       <div className="flex flex-wrap gap-1.5">
                           {currentStats.talents.map((t, i) => (
                               <span key={i} className="text-[10px] bg-ink-950 border border-ink-700 px-2 py-0.5 rounded text-ink-400">{t}</span>
                           ))}
                       </div>
                   )}
              </div>
              
              {/* ATTRIBUTE TABLE */}
              <div className="bg-ink-900/40 border border-ink-700/50 rounded-xl p-3 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-2">
                        <i className="fas fa-chart-bar text-jade-400 text-xs"></i>
                        <span className="text-[9px] font-bold text-ink-500 uppercase tracking-wide">Chỉ Số Cơ Bản</span>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                      {/* ANTI-CRASH: Check if attributes is array and length > 0 */}
                      {Array.isArray(currentStats.attributes) && currentStats.attributes.length > 0 ? (
                          currentStats.attributes.map((attr, idx) => (
                              <div key={idx} className="bg-ink-950/50 border border-ink-800 rounded px-2 py-1.5 flex flex-col items-center justify-center">
                                  <span className="text-[8px] text-ink-500 uppercase font-bold">{attr.key}</span>
                                  <span className="text-xs font-bold text-parchment-100">{attr.value}</span>
                              </div>
                          ))
                      ) : (
                          <div className="col-span-2 text-[10px] text-ink-600 italic text-center py-2">Chưa có dữ liệu...</div>
                      )}
                  </div>
                  
                  <div className="bg-ink-950/80 border border-gold-500/20 rounded px-3 py-2 flex items-center justify-between">
                       <span className="text-[9px] text-gold-500 uppercase font-bold"><i className="fas fa-coins mr-1"></i> Tài Sản</span>
                       <span className="text-xs font-bold text-gold-300">{currentStats.currency || "0"}</span>
                  </div>
              </div>

              {/* INVENTORY & BUTTONS - Keep existing structure */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-[10px] font-bold text-gold-500 uppercase tracking-wide"><i className="fas fa-box-open mr-1"></i> Hành Trang</h3>
                    <span className="text-[9px] text-ink-600 bg-ink-900 px-1.5 rounded">{currentStats.inventory?.length || 0}</span>
                </div>
                <ul className="space-y-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-ink-800 bg-ink-900/20 rounded-lg p-1">
                  {/* ANTI-CRASH: Check if inventory is array and length > 0 */}
                  {Array.isArray(currentStats.inventory) && currentStats.inventory.length > 0 ? currentStats.inventory.map((item, i) => <li key={i} className="flex items-center group p-2 rounded hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5"><div className="w-5 h-5 rounded bg-ink-950 border border-ink-800 flex items-center justify-center mr-2 text-ink-600 group-hover:text-gold-500"><i className="fas fa-cube text-[8px]"></i></div><span className="text-xs text-parchment-300 font-serif">{item}</span></li>) : <li className="text-center py-4 text-ink-700 italic text-[10px]">Trống</li>}
                </ul>
                
                {/* BUTTON GRID */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <button onClick={() => setShowWiki(true)} className="bg-ink-900 border border-ink-700 hover:border-arcane-500 hover:text-arcane-400 text-ink-500 rounded p-3 flex flex-col items-center justify-center gap-1 transition-all">
                        <i className="fas fa-book text-sm"></i>
                        <span className="text-[8px] font-bold uppercase">Wiki</span>
                    </button>
                    <button onClick={() => setShowSummary(true)} className="bg-ink-900 border border-ink-700 hover:border-spirit-500 hover:text-spirit-400 text-ink-500 rounded p-3 flex flex-col items-center justify-center gap-1 transition-all">
                        <i className="fas fa-list-alt text-sm"></i>
                        <span className="text-[8px] font-bold uppercase">Cốt Truyện</span>
                    </button>
                    <button onClick={handleSaveGame} className="bg-ink-900 border border-ink-700 hover:border-emerald-500 hover:text-emerald-400 text-ink-500 rounded p-3 flex flex-col items-center justify-center gap-1 transition-all">
                        <i className="fas fa-save text-sm"></i>
                        <span className="text-[8px] font-bold uppercase">Lưu</span>
                    </button>
                    {/* CONFIG BUTTON */}
                    <button onClick={() => setShowGameConfig(true)} className="bg-ink-900 border border-ink-700 hover:border-gold-500 hover:text-gold-400 text-ink-500 rounded p-3 flex flex-col items-center justify-center gap-1 transition-all">
                        <i className="fas fa-cog text-sm"></i>
                        <span className="text-[8px] font-bold uppercase">Cấu Hình</span>
                    </button>
                    <button onClick={() => setShowAppearance(true)} className="bg-ink-900 border border-ink-700 hover:border-pink-500 hover:text-pink-400 text-ink-500 rounded p-3 flex flex-col items-center justify-center gap-1 transition-all">
                        <i className="fas fa-pen-nib text-sm"></i>
                        <span className="text-[8px] font-bold uppercase">Giao Diện</span>
                    </button>
                    <button 
                        onClick={() => setShowExportModal(true)} 
                        className="bg-ink-900 border border-ink-700 hover:border-jade-500 hover:text-jade-400 text-ink-500 rounded p-3 flex flex-col items-center justify-center gap-1 transition-all"
                    >
                        <i className="fas fa-file-export text-sm"></i>
                        <span className="text-[8px] font-bold uppercase">Xuất</span>
                    </button>
                    <button onClick={onDelete} className="bg-ink-900 border border-ink-700 hover:border-crimson-500 hover:text-crimson-400 text-ink-500 rounded p-3 flex flex-col items-center justify-center gap-1 transition-all">
                        <i className="fas fa-trash-alt text-sm"></i>
                        <span className="text-[8px] font-bold uppercase">Xóa</span>
                    </button>
                    
                    <button onClick={() => setShowMap(true)} className="bg-blue-900/20 border border-blue-700/50 hover:border-blue-400 hover:text-blue-300 text-blue-500 rounded p-3 flex flex-col items-center justify-center gap-1 transition-all col-span-1 mt-1">
                        <i className="fas fa-map-marked-alt text-sm"></i>
                        <span className="text-[8px] font-bold uppercase">Bản Đồ</span>
                    </button>
                </div>
              </div>
              
              {/* SYSTEM INFO SECTION */}
              <div className="mt-4 pt-4 border-t border-ink-800">
                  <div className="text-[9px] font-bold text-ink-600 uppercase tracking-widest mb-2 text-center">Thông Tin Hệ Thống</div>
                  <div className="bg-ink-950/60 border border-ink-800 rounded-lg p-3 space-y-2">
                       <div className="flex justify-between items-center">
                           <span className="text-[10px] text-ink-500 font-bold">Model:</span>
                           <span className="text-[10px] text-parchment-300 font-mono bg-ink-900 px-1.5 py-0.5 rounded border border-ink-700">
                               {session.aiModel || 'gemini-3-pro-preview'}
                           </span>
                       </div>
                       <div className="flex justify-between items-center">
                           <span className="text-[10px] text-ink-500 font-bold">Memory:</span>
                           <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${session.memoryDepth === 'high' ? 'bg-jade-900/30 border-jade-500/30 text-jade-400' : 'bg-ink-900 border-ink-700 text-ink-500'}`}>
                               <div className={`w-1.5 h-1.5 rounded-full ${session.memoryDepth === 'high' ? 'bg-jade-500 animate-pulse' : 'bg-ink-600'}`}></div>
                               <span className="text-[9px] font-bold uppercase">{session.memoryDepth === 'high' ? 'HIGH' : 'STD'}</span>
                           </div>
                       </div>
                  </div>
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-white/5 text-center pb-2">
                <div className="text-[8px] text-ink-700 uppercase tracking-widest font-bold font-display opacity-50">Thien Dao Simulator • By Zesty</div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-ink-600 p-6 text-center"><div className="w-16 h-16 rounded-full border-2 border-ink-800 flex items-center justify-center mb-4 opacity-50"><i className="fas fa-scroll text-2xl"></i></div><p className="text-xs mt-2 font-display uppercase tracking-widest">Đang tải dữ liệu...</p></div>
        )}
      </div>
      
      {showStatsMobile && <div className="fixed inset-0 bg-black/80 z-50 md:hidden backdrop-blur-sm" onClick={() => setShowStatsMobile(false)}/>}
    </div>
  );
};