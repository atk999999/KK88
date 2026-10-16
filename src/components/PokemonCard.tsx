import {missingPortrait} from '../../shared/cardImage';
import React, { useState, useRef } from 'react';
import { 
  Zap, 
  Flame, 
  Sparkles, 
  Shield, 
  Activity, 
  RotateCw, 
  Trash2, 
  Plus, 
  Eye, 
  Skull, 
  Dna, 
  Trophy,
  Star,
  Swords,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface DnaComponent {
  race: string;
  percentage: number;
  color: string;
}

export interface BaseCharacter {
  id: string;
  name: string;
  era: string;
  state: string;
  fusionId?: string;
  wish?: string;
}


export interface FusionResult {
  id: string;
  name: string;
  description: string;
  personality?: string;
  dna_analysis?: string;
  dna_components?: DnaComponent[];
  fusion_logic?: string;
  quote: string;
  powerLevel: number;
  level: number;
  rank: string;
  imageUrl: string;
  imageStatus?: "ready" | "failed";
  imageError?: string;
  imagePrompt?: string;
  visual_prompt?: string;
  baseCharacters: BaseCharacter[];
  userId: string;
  createdAt: any;
  zombie_compatibility?: number;
  zombie_multiplier?: number;
  power_comparison?: string;
  compatibility_score: number;
  compatibility_status: "Perfect" | "Stable" | "Unstable" | "Failed" | "Fatal";
}



interface PokemonCardProps {
  fusion: FusionResult;
  size?: 'sm' | 'md' | 'lg';
  isFlipped?: boolean;
  onFlip?: () => void;
  onCompare?: () => void;
  onUpgrade?: () => void;
  onInspect?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  isDeleting?: boolean;
  isSelectedForCompare?: boolean;
  interactive?: boolean;
}

// Pokemon Energy Types matched with DBZ energy realms
export const getEnergyTypeInfo = (rank: string) => {
  const r = (rank || '').toUpperCase();
  if (r.includes('HỖN ĐỘN') || r.includes('CHAOS')) {
    return {
      name: 'Hỗn Độn',
      symbol: '⭐',
      icon: Star,
      color: 'text-white',
      badgeBg: 'bg-white/20 text-white border-white/60 shadow-[0_0_12px_rgba(255,255,255,0.8)]',
      ballColor: 'from-pink-300 via-white to-purple-400',
      type: 'COSMIC'
    };
  }
  if (r.includes('KHỞI NGUYÊN') || r.includes('ORIGIN')) {
    return {
      name: 'Khởi Nguyên',
      symbol: '🌌',
      icon: Sparkles,
      color: 'text-purple-300',
      badgeBg: 'bg-purple-900/60 text-purple-200 border-purple-400/60 shadow-[0_0_10px_rgba(168,85,247,0.5)]',
      ballColor: 'from-purple-500 via-pink-400 to-indigo-600',
      type: 'PSYCHIC'
    };
  }
  if (r.includes('ZENO') || r.includes('ĐẠI THIÊN SỨ')) {
    return {
      name: 'Thần Quyền',
      symbol: '👑',
      icon: Zap,
      color: 'text-cyan-300',
      badgeBg: 'bg-cyan-900/60 text-cyan-200 border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.5)]',
      ballColor: 'from-cyan-400 via-sky-300 to-blue-600',
      type: 'DIVINE'
    };
  }
  if (r.includes('THIÊN SỨ') || r.includes('ANGEL')) {
    return {
      name: 'Thiên Sứ',
      symbol: '✨',
      icon: Sparkles,
      color: 'text-yellow-300',
      badgeBg: 'bg-yellow-900/50 text-yellow-200 border-yellow-400/60 shadow-[0_0_8px_rgba(234,179,8,0.4)]',
      ballColor: 'from-amber-300 via-yellow-200 to-emerald-400',
      type: 'LIGHTNING'
    };
  }
  if (r.includes('HỦY DIỆT') || r.includes('DESTRUCTION')) {
    return {
      name: 'Hakai',
      symbol: '🔮',
      icon: Skull,
      color: 'text-purple-400',
      badgeBg: 'bg-purple-950/70 text-purple-300 border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.4)]',
      ballColor: 'from-purple-700 via-fuchsia-600 to-black',
      type: 'DARKNESS'
    };
  }
  if (r.includes('VÔ CỰC') || r.includes('INSTINCT') || r.includes('BẢN NGÃ')) {
    return {
      name: 'Vô Cực',
      symbol: '⚡',
      icon: Zap,
      color: 'text-cyan-200',
      badgeBg: 'bg-cyan-950/70 text-cyan-200 border-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.4)]',
      ballColor: 'from-cyan-300 via-slate-100 to-blue-500',
      type: 'DRAGON'
    };
  }
  if (r.includes('SAIYAN')) {
    return {
      name: 'Hỏa Ki',
      symbol: '🔥',
      icon: Flame,
      color: 'text-amber-400',
      badgeBg: 'bg-amber-950/70 text-amber-200 border-amber-400/50 shadow-[0_0_6px_rgba(245,158,11,0.3)]',
      ballColor: 'from-amber-500 via-orange-400 to-red-600',
      type: 'FIRE'
    };
  }
  return {
    name: 'Phàm Ki',
    symbol: '⚔️',
    icon: Swords,
    color: 'text-slate-200',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-600',
    ballColor: 'from-slate-400 to-slate-700',
    type: 'COLORLESS'
  };
};

export const getCardStyling = (rank: string) => {
  const r = (rank || '').toUpperCase();
  if (r.includes('HỖN ĐỘN') || r.includes('CHAOS')) {
    return {
      outerBorder: 'border-[6px] sm:border-[8px] border-transparent bg-gradient-to-tr from-pink-500 via-yellow-200 via-cyan-400 to-purple-600 shadow-[0_0_35px_rgba(255,255,255,0.4)]',
      innerBorder: 'border-2 border-white/60 bg-gradient-to-b from-slate-900 via-slate-950 to-purple-950',
      headerBg: 'bg-gradient-to-r from-slate-900/90 via-purple-900/60 to-slate-900/90 border-b border-white/40',
      artworkFrame: 'border-2 border-white/70 shadow-[0_0_15px_rgba(255,255,255,0.3)]',
      stageTag: 'SIÊU THỰC THỂ HỖN ĐỘN V-STAR',
      stageBadge: 'bg-white text-slate-950 font-black',
      isSecretHolo: true,
      cardRarity: '★ SECRET RAINBOW RARE',
      accentColor: 'text-white'
    };
  }
  if (r.includes('KHỞI NGUYÊN') || r.includes('ORIGIN')) {
    return {
      outerBorder: 'border-[6px] sm:border-[8px] border-purple-500/80 shadow-[0_0_25px_rgba(168,85,247,0.4)]',
      innerBorder: 'border-2 border-purple-400/50 bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950',
      headerBg: 'bg-gradient-to-r from-purple-950 via-pink-950/70 to-purple-950 border-b border-purple-500/40',
      artworkFrame: 'border-2 border-purple-400 shadow-[0_0_12px_rgba(192,38,211,0.4)]',
      stageTag: 'GIAI ĐOẠN KHỞI NGUYÊN EX',
      stageBadge: 'bg-purple-500 text-white font-black',
      isSecretHolo: true,
      cardRarity: '★★★ ULTRA FULL-ART',
      accentColor: 'text-purple-300'
    };
  }
  if (r.includes('ZENO') || r.includes('ĐẠI THIÊN SỨ')) {
    return {
      outerBorder: 'border-[6px] sm:border-[8px] border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.4)]',
      innerBorder: 'border-2 border-cyan-400/50 bg-gradient-to-b from-slate-950 via-cyan-950 to-slate-950',
      headerBg: 'bg-gradient-to-r from-cyan-950 via-blue-950 to-cyan-950 border-b border-cyan-400/40',
      artworkFrame: 'border-2 border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]',
      stageTag: 'TỐI CAO THẦN V-MAX',
      stageBadge: 'bg-cyan-500 text-slate-950 font-black',
      isSecretHolo: false,
      cardRarity: '★★ V-MAX APEX',
      accentColor: 'text-cyan-300'
    };
  }
  if (r.includes('THIÊN SỨ') || r.includes('ANGEL')) {
    return {
      outerBorder: 'border-[6px] sm:border-[8px] border-amber-300/80 shadow-[0_0_18px_rgba(245,158,11,0.3)]',
      innerBorder: 'border-2 border-amber-400/50 bg-gradient-to-b from-slate-950 via-amber-950/40 to-slate-950',
      headerBg: 'bg-gradient-to-r from-amber-950 via-yellow-950 to-amber-950 border-b border-amber-400/40',
      artworkFrame: 'border-2 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
      stageTag: 'THIÊN SỨ TOÀN TRI',
      stageBadge: 'bg-yellow-400 text-slate-950 font-black',
      isSecretHolo: false,
      cardRarity: '★ HOLO RARE',
      accentColor: 'text-amber-300'
    };
  }
  if (r.includes('HỦY DIỆT') || r.includes('DESTRUCTION')) {
    return {
      outerBorder: 'border-[6px] sm:border-[8px] border-purple-600/70 shadow-[0_0_15px_rgba(147,51,234,0.3)]',
      innerBorder: 'border-2 border-purple-500/40 bg-gradient-to-b from-slate-950 via-purple-950/40 to-slate-950',
      headerBg: 'bg-gradient-to-r from-purple-950 via-fuchsia-950 to-purple-950 border-b border-purple-500/40',
      artworkFrame: 'border-2 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.25)]',
      stageTag: 'THẦN HỦY DIỆT HAKAI',
      stageBadge: 'bg-purple-600 text-white font-black',
      isSecretHolo: false,
      cardRarity: '★ HOLO RARE',
      accentColor: 'text-purple-300'
    };
  }
  if (r.includes('VÔ CỰC') || r.includes('INSTINCT') || r.includes('BẢN NGÃ')) {
    return {
      outerBorder: 'border-[6px] sm:border-[8px] border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
      innerBorder: 'border-2 border-cyan-400/40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950',
      headerBg: 'bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border-b border-cyan-500/40',
      artworkFrame: 'border-2 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.25)]',
      stageTag: 'CẢNH GIỚI VÔ CỰC',
      stageBadge: 'bg-cyan-400 text-slate-950 font-black',
      isSecretHolo: false,
      cardRarity: '✦ ULTRA RARE',
      accentColor: 'text-cyan-300'
    };
  }
  if (r.includes('SAIYAN')) {
    return {
      outerBorder: 'border-[6px] sm:border-[8px] border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      innerBorder: 'border-2 border-amber-500/40 bg-gradient-to-b from-slate-950 via-amber-950/30 to-slate-950',
      headerBg: 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-b border-amber-500/40',
      artworkFrame: 'border-2 border-amber-400',
      stageTag: 'SIÊU SAIYAN THỂ',
      stageBadge: 'bg-amber-400 text-slate-950 font-black',
      isSecretHolo: false,
      cardRarity: '◆ RARE',
      accentColor: 'text-amber-400'
    };
  }
  return {
    outerBorder: 'border-[6px] sm:border-[8px] border-amber-300/60 shadow-[0_0_10px_rgba(0,0,0,0.5)]',
    innerBorder: 'border-2 border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950',
    headerBg: 'bg-slate-900 border-b border-slate-800',
    artworkFrame: 'border-2 border-slate-700',
    stageTag: 'CHIẾN BINH CƠ BẢN',
    stageBadge: 'bg-slate-700 text-white font-bold',
    isSecretHolo: false,
    cardRarity: '● COMMON',
    accentColor: 'text-slate-300'
  };
};

const formatCardBP = (bp: number, rank?: string, level?: number): string => {
  if (rank && (rank.toUpperCase().includes('HỖN ĐỘN') || rank.toUpperCase().includes('CHAOS'))) {
    return `⭐ x${level || 1}`;
  }
  if (!bp || isNaN(bp)) return "0 BP";
  if (bp >= 1e18) return `${(bp / 1e18).toFixed(1).replace(/\.0$/, '')} Tỷ Tỷ`;
  if (bp >= 1e15) return `${(bp / 1e15).toFixed(1).replace(/\.0$/, '')} Triệu Tỷ`;
  if (bp >= 1e12) return `${(bp / 1e12).toFixed(1).replace(/\.0$/, '')} Nghìn Tỷ`;
  if (bp >= 1e9) return `${(bp / 1e9).toFixed(1).replace(/\.0$/, '')} Tỷ`;
  if (bp >= 1e6) return `${(bp / 1e6).toFixed(1).replace(/\.0$/, '')} Tr`;
  return bp.toLocaleString('vi-VN');
};

const calculateDamageNumber = (level: number, rank: string): string => {
  const r = (rank || '').toUpperCase();
  if (r.includes('HỖN ĐỘN') || r.includes('CHAOS')) return '∞ MAX';
  if (r.includes('KHỞI NGUYÊN')) return '999,999+';
  if (r.includes('ZENO')) return '300,000+';
  if (r.includes('ĐẠI THIÊN SỨ')) return '150,000+';
  if (r.includes('THIÊN SỨ')) return '50,000+';
  if (r.includes('HỦY DIỆT')) return '10,000+';
  if (r.includes('VÔ CỰC')) return '2,500';
  if (level > 1000) return `${Math.round(level * 1.5)}`;
  return `${Math.max(30, Math.round(level * 2))}`;
};

export function PokemonCard({
  fusion,
  size = 'md',
  isFlipped = false,
  onFlip,
  onCompare,
  onUpgrade,
  onInspect,
  onDelete,
  isDeleting,
  isSelectedForCompare,
  interactive = true
}: PokemonCardProps) {
  const [internalFlip, setInternalFlip] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const currentlyFlipped = isFlipped !== undefined ? (onFlip ? isFlipped : internalFlip) : internalFlip;

  const toggleFlip = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onFlip) {
      onFlip();
    } else {
      setInternalFlip(prev => !prev);
    }
  };

  const energy = getEnergyTypeInfo(fusion.rank);
  const style = getCardStyling(fusion.rank);
  const EnergyIcon = energy.icon;
  const isChaos = (fusion.rank || '').toUpperCase().includes('HỖN ĐỘN') || (fusion.rank || '').toUpperCase().includes('CHAOS');

  // Handle 3D perspective tilt on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || currentlyFlipped || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  // Attacks generator
  const move1Name = fusion.baseCharacters.length > 0 
    ? `Tuyệt Kỹ: ${fusion.baseCharacters[0].name} Thần Phạt` 
    : 'Thần Quyền Bộc Phát';
  const move2Name = isChaos 
    ? '⭐ VẠN GIỚI TIÊU BIẾN (HƯ VÔ CHIẾN)' 
    : fusion.baseCharacters.length > 1 
      ? `Chiêu Cuối: ${fusion.baseCharacters.map(c => c.name.slice(0, 3)).join('')} Tối Thượng Quyền`
      : 'Kamehameha Vô Cực Trảm';

  const move1Dmg = calculateDamageNumber(fusion.level, fusion.rank);
  const move2Dmg = isChaos ? '⭐ x∞' : `${parseInt(move1Dmg, 10) ? Math.round(parseInt(move1Dmg, 10) * 2.5) : '999+'}`;

  return (
    <div 
      className={cn(
        "perspective-1000 select-none group w-full",
        interactive && "cursor-pointer"
      )}
      onClick={onInspect}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        ref={cardRef}
        animate={{
          rotateY: currentlyFlipped ? 180 : 0,
          rotateX: currentlyFlipped ? 0 : tilt.x,
          rotateZ: currentlyFlipped ? 0 : tilt.y * 0.15,
        }}
        transition={{ type: "spring", stiffness: 260, damping: 25 }}
        className="w-full transform-style-3d relative rounded-2xl sm:rounded-3xl transition-shadow duration-300"
      >
        {/* ================= CARD FRONT ================= */}
        <div className={cn(
          "backface-hidden w-full rounded-2xl sm:rounded-3xl overflow-hidden relative flex flex-col",
          style.outerBorder,
          isSelectedForCompare && "ring-4 ring-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.6)]"
        )}>
          {/* Inner Card Border Container */}
          <div className={cn(
            "w-full h-full p-2.5 sm:p-3 flex flex-col justify-between rounded-xl sm:rounded-2xl relative overflow-hidden",
            style.innerBorder
          )}>
            {/* Holographic Sheen Layer */}
            {style.isSecretHolo ? (
              <div className="absolute inset-0 holo-foil-rainbow pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity z-10 mix-blend-color-dodge" />
            ) : (
              <div className="absolute inset-0 holo-foil-gold pointer-events-none opacity-20 group-hover:opacity-50 transition-opacity z-10 mix-blend-screen" />
            )}

            {/* Top Shine Bar */}
            <div className="absolute -top-12 -left-12 w-48 h-24 bg-white/10 blur-xl transform -rotate-45 pointer-events-none" />

            {/* Top Header: Evolution Stage, Name, HP/BP, Energy Type */}
            <div className="relative z-20 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className={cn(
                  "text-[8px] sm:text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm truncate max-w-[55%]",
                  style.stageBadge
                )}>
                  {style.stageTag}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="text-right flex items-baseline gap-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400">BP:</span>
                    <span className={cn("text-xs sm:text-sm font-black font-mono tracking-tight", style.accentColor)}>
                      {formatCardBP(fusion.powerLevel, fusion.rank, fusion.level)}
                    </span>
                  </div>
                  {/* Energy Orb Symbol */}
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border shadow-md shrink-0",
                    energy.badgeBg
                  )}>
                    <EnergyIcon className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>
              </div>

              {/* Character Name */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white truncate drop-shadow-sm flex-1">
                  {fusion.name}
                </h3>
                <span className="text-[9px] font-mono font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/30 shrink-0">
                  Lv.{fusion.level || 1}
                </span>
              </div>
            </div>

            {/* Character Artwork Window with Pokemon TCG Frame */}
            <div className="relative z-20 my-2">
              <div className={cn(
                "w-full aspect-[4/3] rounded-lg overflow-hidden relative bg-slate-950",
                style.artworkFrame
              )}>
                {fusion.imageUrl ? (
                  <img 
                    src={fusion.imageUrl} 
                    alt={fusion.name}
                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).onerror = null;
                      (e.target as HTMLImageElement).src = missingPortrait;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500 text-xs">
                    Chưa có ảnh sprite
                  </div>
                )}

                {/* Sub-Artwork Ribbon: Pokédex species & compatibility badge */}
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 backdrop-blur-md px-2 py-0.5 border-t border-slate-800 flex items-center justify-between text-[8px] font-mono text-slate-300">
                  <span className="truncate max-w-[60%]">
                    HT: {fusion.baseCharacters.map(c => c.name).join(' + ')}
                  </span>
                  <span className={cn(
                    "font-bold px-1.5 py-0.2 rounded text-[7px] uppercase",
                    fusion.compatibility_score >= 80 ? "text-emerald-400 bg-emerald-500/20" :
                    fusion.compatibility_score >= 40 ? "text-amber-400 bg-amber-500/20" : "text-red-400 bg-red-500/20"
                  )}>
                    Độ hợp: {fusion.compatibility_score}%
                  </span>
                </div>

                {/* Zombie / DNA Badge */}
                {fusion.baseCharacters.some(c => c.name === "Virus Zombie") && (
                  <div className="absolute top-1.5 left-1.5 bg-red-600/90 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase flex items-center gap-1 shadow-md">
                    <Skull className="w-2.5 h-2.5" /> Zombie x{fusion.zombie_multiplier}
                  </div>
                )}
                {fusion.name.startsWith("Ống DNA:") && (
                  <div className="absolute top-1.5 left-1.5 bg-cyan-600/90 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase flex items-center gap-1 shadow-md">
                    <Dna className="w-2.5 h-2.5" /> DNA Tinh Chất
                  </div>
                )}
              </div>
            </div>

            {/* Mid Section: Ability (ĐẶC TÍNH / NỘI TẠI) */}
            <div className="relative z-20 space-y-1.5 my-1 text-slate-200">
              <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[9px] leading-tight flex items-start gap-1.5">
                <span className="bg-red-600 text-white font-black px-1.5 py-0.5 rounded text-[7px] uppercase tracking-wider shrink-0 mt-0.5 shadow-sm">
                  ĐẶC TÍNH
                </span>
                <div className="min-w-0">
                  <span className="font-bold text-white uppercase text-[8px]">
                    {fusion.compatibility_status} Resonance:
                  </span>{' '}
                  <span className="text-slate-400 line-clamp-1 text-[8px]">
                    {fusion.quote ? `"${fusion.quote}"` : (fusion.power_comparison || fusion.description.slice(0, 60))}
                  </span>
                </div>
              </div>

              {/* Move 1 */}
              <div className="flex items-center justify-between gap-1 p-1 px-1.5 rounded bg-slate-950/40 border border-slate-800/60">
                <div className="flex items-center gap-1 min-w-0">
                  <div className="flex -space-x-1">
                    <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] border", energy.badgeBg)}>
                      <EnergyIcon className="w-2 h-2" />
                    </div>
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-700 flex items-center justify-center text-[7px] text-white">⚡</div>
                  </div>
                  <span className="text-[10px] font-bold text-white truncate">{move1Name}</span>
                </div>
                <span className="text-xs font-mono font-black text-amber-400 shrink-0">{move1Dmg}</span>
              </div>

              {/* Move 2 (V-MAX / GX Attack) */}
              <div className="flex items-center justify-between gap-1 p-1 px-1.5 rounded bg-gradient-to-r from-purple-950/40 to-slate-950/60 border border-purple-500/30">
                <div className="flex items-center gap-1 min-w-0">
                  <div className="flex -space-x-1">
                    <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] border", energy.badgeBg)}>
                      <EnergyIcon className="w-2 h-2" />
                    </div>
                    <div className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] border", energy.badgeBg)}>
                      <EnergyIcon className="w-2 h-2" />
                    </div>
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-[7px] text-black font-bold">★</div>
                  </div>
                  <span className="text-[10px] font-bold text-purple-200 truncate">{move2Name}</span>
                </div>
                <span className="text-xs font-mono font-black text-purple-300 shrink-0">{move2Dmg}</span>
              </div>
            </div>

            {/* Bottom Card Footer: Weakness, Resistance, Retreat & Rarity */}
            <div className="relative z-20 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[8px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span>Yếu: <b className="text-red-400">⚡x2</b></span>
                <span>Kháng: <b className="text-cyan-400">🔮-30</b></span>
                <span>Rút: <b>2 Ki</b></span>
              </div>
              <span className="font-bold text-yellow-500 text-[8px] truncate">
                {style.cardRarity}
              </span>
            </div>

            {/* Action Bar (Flip, Compare, Upgrade, Delete) */}
            <div className="relative z-30 pt-2 flex items-center gap-1 mt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={toggleFlip}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-bold flex items-center justify-center transition-colors"
                title="Lật thẻ bài (Mặt sau)"
              >
                <RotateCw className="w-3 h-3" />
              </button>

              {onCompare && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompare();
                  }}
                  className={cn(
                    "flex-1 py-1 px-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all",
                    isSelectedForCompare 
                      ? "bg-yellow-500 text-slate-950 font-black shadow-md shadow-yellow-500/20"
                      : "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30"
                  )}
                  title="Chọn thẻ này để so sánh"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>{isSelectedForCompare ? "ĐÃ CHỌN" : "SO SÁNH"}</span>
                </button>
              )}

              {onUpgrade && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpgrade();
                  }}
                  className="flex-1 py-1 px-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-400 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-colors"
                  title="Nâng cấp thực thể với vật phẩm"
                >
                  <Plus className="w-3 h-3" />
                  <span>NÂNG CẤP</span>
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className={cn(
                    "p-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center transition-all",
                    isDeleting 
                      ? "bg-red-500 text-white px-2" 
                      : "bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white"
                  )}
                  title={isDeleting ? "Nhấn lần nữa để xóa thẻ" : "Xóa thẻ"}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ================= CARD BACK (POKÉMON STYLE DRAGON BALL BACK) ================= */}
        <div className={cn(
          "backface-hidden rotate-y-180 absolute inset-0 w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden border-[6px] sm:border-[8px] border-amber-400 shadow-2xl flex flex-col items-center justify-between p-4",
          "bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950"
        )}>
          {/* Outer Swirl Ring */}
          <div className="absolute inset-2 border-2 border-amber-400/60 rounded-xl pointer-events-none" />

          {/* Top Back Label */}
          <div className="relative z-10 text-center pt-2">
            <div className="text-[10px] uppercase font-black tracking-[0.25em] text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
              DRAGON BALL TCG
            </div>
            <div className="text-[8px] uppercase tracking-widest text-slate-400">
              FUSION LAB MULTIVERSE
            </div>
          </div>

          {/* Center Poké-DragonBall Emblem */}
          <div className="relative z-10 flex flex-col items-center my-auto">
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.5)] flex items-center justify-center overflow-hidden bg-gradient-to-b from-orange-500 via-amber-400 to-yellow-600 group-hover:scale-105 transition-transform">
              {/* Dragon Ball 4-Stars Core */}
              <div className="grid grid-cols-2 gap-1.5 p-2">
                <Star className="w-5 h-5 text-red-600 fill-current drop-shadow-sm" />
                <Star className="w-5 h-5 text-red-600 fill-current drop-shadow-sm" />
                <Star className="w-5 h-5 text-red-600 fill-current drop-shadow-sm" />
                <Star className="w-5 h-5 text-red-600 fill-current drop-shadow-sm" />
              </div>

              {/* Pokéball Center Horizontal Line */}
              <div className="absolute inset-x-0 h-2 bg-slate-950/80 top-1/2 -translate-y-1/2" />
              <div className="absolute w-7 h-7 rounded-full bg-slate-950 border-2 border-amber-300 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white shadow-inner" />
              </div>
            </div>

            <div className="mt-4 text-center space-y-0.5">
              <span className="text-xs font-black uppercase tracking-wider text-white block">
                {fusion.name}
              </span>
              <span className="text-[10px] font-mono text-cyan-300">
                {fusion.rank} • Cấp {fusion.level}
              </span>
            </div>
          </div>

          {/* Bottom Card Back Controls */}
          <div className="relative z-10 w-full pt-2 border-t border-amber-400/30 flex items-center justify-between text-[9px] text-slate-400">
            <span>OFFICIAL DBZ TCG</span>
            <button
              type="button"
              onClick={toggleFlip}
              className="px-3 py-1 bg-amber-400 text-slate-950 rounded-full font-bold flex items-center gap-1 hover:bg-amber-300 transition-colors shadow-md"
            >
              <RotateCw className="w-3 h-3" />
              <span>Xem mặt trước</span>
            </button>
            <span>#FUS-{fusion.id.slice(0, 4).toUpperCase()}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
