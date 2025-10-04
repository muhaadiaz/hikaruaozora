

export interface Stats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export type Ability = keyof Stats;

export interface CharacterOptions {
  name: string;
  race: string;
  characterClass: string;
  background: string;
  alignment: string;
  gender: string;
  age: number;
  hairType: string;
  customHairType: string;
  hairColor: string;
  skinColor: string;
  clothColor: string;
  accessories: string;
  customAccessory: string;
  height: number;
  build: number;
  muscularity: number;
  favoriteTerrain: string;
  favoriteEnemy: string;
  stats: Stats;
  backgroundStory: string;
  selectedSkills: string[];
  fightingStyle: string;
  customSpecialMove: string;
}

export interface Currency {
    gp: number;
    sp: number;
    cp: number;
}

export interface GeneratedData {
  startingItems: string[];
  skills: string[];
  specialMove: {
    name: string;
    description: string;
  };
  characterDescription: string;
  currency: Currency;
}

export interface InventoryItem {
    name: string;
    tag?: string;
}

export interface FinalCharacter extends CharacterOptions {
  generated: GeneratedData;
  image: string;
  // Dynamic fields for gameplay
  inventory: InventoryItem[];
  mainWeapon: InventoryItem | null;
  armor: InventoryItem | null;
  currency: Currency;
  notes: string;
  status: 'alive' | 'downed';
  maxHp: number;
  currentHp: number;
  armorClass: number;
  regenTurnCounter: number;
}

export interface Invitation {
    name: string;
    race: string;
    characterClass: string;
    gender: string;
    status: 'pending' | 'generating' | 'accepted' | 'declined' | 'error';
}

export type StoryEventType = 'dm' | 'player' | 'system' | 'game-event';
export interface StoryEvent { 
  type: StoryEventType; 
  text: string; 
  invitation?: Invitation;
}

export type Campaign = 'lost-mine-of-phandelver' | 'frozen-sick' | 'beginner-journey' | 'crossroads-of-destiny';

export interface SavedGameState {
    version: string;
    characters: FinalCharacter[];
    storyLog: StoryEvent[];
    mainCharacterIndex: number;
    campaign: Campaign;
}

export interface Combatant {
  type: 'player' | 'enemy' | 'neutral';
  id: string; // The character to display (initial for player, number for enemy)
  pos: {
    x: number;
    y: number;
  };
}