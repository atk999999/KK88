import type { PowerState, PowerRules, TravelContext } from '../shared/multiverse';


// Enums and Interfaces

export enum GameGenre {
  CULTIVATION = "Tu Tiên",
  FANTASY = "Huyền Huyễn",
  SCIFI = "Khoa Huyễn",
  HORROR = "Linh Dị",
  DETECTIVE = "Trinh Thám",
  SLICE_OF_LIFE = "Đời Thường",
  HISTORICAL = "Cổ Trang",
  POST_APOCALYPTIC = "Mạt Thế",
  ANIME_CROSSOVER = "Anime Đồng Nhân",
  ALL_ANIME = "Tổng Mạn",
  REAL_LIFE = "Đời Thực / Showbiz",
}

export type StoryLength = 'short' | 'medium' | 'long' | 'epic';
export type NSFWIntensity = 'soft' | 'extreme';
export type WritingStyle = 'convert' | 'smooth' | 'anime';
export type NSFWFocus = 'body' | 'emotion' | 'dialogue' | 'action' | 'vulgar' | 'roleplay';

// NEW TYPES FOR WORLD GEN OPTIONS
export type AIStyle = 'balanced' | 'strict' | 'creative' | 'hardcore';
export type EventFrequency = 'none' | 'low' | 'medium' | 'high';

export interface GameMechanics {
  reputation: boolean;
  survival: boolean;
  crafting: boolean;
  combat: boolean;
  time: boolean;
  currency: boolean;
  backpack: boolean; // Advanced backpack logic
  autoCodex: boolean; // Auto update wiki
  livingWorld: boolean; // NEW: Enable/Disable Off-screen world simulation
}

export interface GameOption {
  label: string;
  action: string; 
  type: 'safe' | 'risky' | 'social' | 'custom';
}

// NEW MAP DATA STRUCTURE
export interface FloorLayout {
  floorName: string; // Vd: "Tầng 1", "Tầng 2", "Sân Thượng"
  rooms: string[]; // Vd: ["Phòng Khách", "Bếp", "Toilet"]
}

export interface MapData {
  locationName: string; // Tên khu vực lớn (Vd: Nhà Kasumigaoka, Trường Học)
  currentFloor: string; // Tên tầng/khu vực con hiện tại nhân vật đang đứng (Vd: Tầng 2)
  layout: FloorLayout[]; // Cấu trúc toàn bộ tòa nhà/khu vực
  isInterior: boolean; // Có phải là trong nhà (để vẽ bản đồ blueprint) hay ngoài trời
}

export interface GameStats {
  name: string;
  realm: string;
  status: string;
  inventory: string[];
  spiritualRoot?: string;
  talents?: string[];
  currentTime?: string;
  // NEW ATTRIBUTES & CURRENCY
  attributes?: { key: string; value: string | number }[]; // Sức mạnh, Tốc độ, v.v.
  currency?: string; // Tiền tệ (Vd: 100 Linh Thạch, 5000 Gold)
  // NEW MAP FIELDS
  currentLocation?: string; // Mô tả chi tiết phòng (Vd: Phòng Ngủ Tầng 2)
  nearbyLocations?: string[]; // Các phòng lân cận (Legacy support or quick move)
  mapData?: MapData; // Dữ liệu cấu trúc bản đồ
  visitedLocations?: string[]; // Danh sách các địa điểm lớn đã mở khóa (Fast Travel)
}

export interface RegistryEntry {
  id?: number;
  sessionId: number;
  name: string;
  type: 'NPC' | 'LOCATION' | 'FACTION' | 'ITEM' | 'KNOWLEDGE' | 'SKILL';
  description: string;
  status?: string;
  firstSeenTurn: number;
  powerLevel?: string;
  affiliation?: string;
  appearance?: string;
  personality?: string;
  secrets?: string;
  embedding?: number[]; // ADDED: Vector embedding for semantic search
}

export interface AIResponseSchema {
  powerProposal?: {level: number; reason: string};
  narrative: string;
  worldEvents?: string[]; // NEW: For Living World simulation (Proposal 5)
  stats: GameStats;
  options?: GameOption[];
  isGameOver: boolean;
  newRegistry?: {
    name: string;
    type: 'NPC' | 'LOCATION' | 'FACTION' | 'ITEM' | 'KNOWLEDGE' | 'SKILL';
    description: string;
    status: string;
    powerLevel?: string;
    affiliation?: string;
    appearance?: string;
    personality?: string;
    secrets?: string;
  }[];
}

export interface FusionTemplate {
  storyProgress?: { journeyId: string; stats: GameStats; traits?: CharacterTraits; summary: string; travel?: TravelContext; genre: string };
  id: string; name: string; description: string; personality: string;
  imageUrl?: string; rank?: string; level?: number; powerLevel?: number;
  dna_analysis?: string; dna_components?: {race: string; percentage: number}[];
  fusion_logic?: string; quote?: string; power_comparison?: string;
  baseCharacters?: {name: string; era: string; state: string}[];
}

export interface WorldSettings {
  powerRules?: PowerRules;
  powerContext?: {power:PowerState; rules:PowerRules};
  travelContext?: TravelContext;
  currentCharacter?: GameStats;
  fusionTemplate?: FusionTemplate;
  worldContext: string;
  plotDirection: string;
  majorFactions: string;
  keyNpcs: string;
  openingStory?: string;
  crossoverWorlds?: string;
  referenceContext?: string; // NEW: Content from uploaded .txt file
}

export interface CharacterTraits {
  spiritualRoot: string;
  talents: string[];
  personality: string;
}

export interface GameSession {
  journeyId?: string;
  power?: PowerState;
  powerHistory?: {from:PowerState; to:PowerState; reason:string; at:number}[];
  id?: number;
  heroName: string;
  customTitle?: string; // Tên tùy chỉnh cho file save
  gender: string;
  genre: GameGenre;
  worldSettings: WorldSettings;
  characterTraits?: CharacterTraits;
  avatarUrl?: string;
  backgroundImageUrl?: string;
  backgroundType?: 'image' | 'video'; 
  fontFamily?: string; 
  textColor?: string;
  createdAt: number;
  isNSFW?: boolean;
  nsfwIntensity: NSFWIntensity;
  writingStyle?: WritingStyle;
  nsfwFocus?: NSFWFocus[];
  pronounRules?: string;
  summary?: string;
  // NEW FIELDS
  aiStyle?: AIStyle;
  eventFrequency?: EventFrequency;
  mechanics?: GameMechanics;
  aiModel?: string; // e.g., 'gemini-3-pro-preview'
  memoryDepth?: 'standard' | 'high'; // NEW: Memory setting
}

export interface Turn {
  memoryBefore?: import("../shared/storyMemory").MemoryCheckpoint;
  id?: number;
  sessionId: number;
  turnIndex: number;
  role: 'user' | 'model';
  userPrompt?: string;
  narrative?: string;
  rawResponseJSON?: string;
  embedding?: number[];
  thoughtSignature?: string;
}

export interface RagContext {
  text: string;
  relevance: number;
}
export type WorldTextKey = { [K in keyof WorldSettings]: WorldSettings[K] extends string ? K : never }[keyof WorldSettings];
