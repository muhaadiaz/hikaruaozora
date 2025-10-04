

export const RACES = ["Human", "Elf", "Dwarf", "Halfling", "Dragonborn", "Gnome", "Half-Elf", "Half-Orc", "Tiefling"];
export const CLASSES = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard"];
export const BACKGROUNDS = ["Acolyte", "Charlatan", "Criminal", "Entertainer", "Folk Hero", "Guild Artisan", "Hermit", "Noble", "Outlander", "Sage", "Sailor", "Soldier", "Urchin"];
export const ALIGNMENTS = ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"];

export const GENDERS = ["Male", "Female"];
export const HAIR_TYPES = ["Short and spiky", "Long and flowing", "Braided", "Bald", "Top-knot", "Wild and untamed", "Other"];
export const ACCESSORIES = ["None", "Mask", "Hat", "Bandana", "Eyeglasses", "Other"];
export const TERRAINS = ["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark", "Urban"];
export const ENEMIES = ["Aberrations", "Beasts", "Celestials", "Constructs", "Dragons", "Elementals", "Fey", "Fiends", "Giants", "Monstrosities", "Oozes", "Plants", "Undead"];

export const ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

export const SKILLS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", 
  "Deception", "History", "Insight", "Intimidation", 
  "Investigation", "Medicine", "Nature", "Perception",
  "Performance", "Persuasion", "Religion", "Sleight of Hand",
  "Stealth", "Survival"
];

export const FIGHTING_STYLES = [
    "None", "Archery", "Defense", "Dueling", "Great Weapon Fighting", 
    "Protection", "Two-Weapon Fighting"
];

// Point-Buy System Constants
export const POINT_BUY_TOTAL_POINTS = 27;
// This object maps a score to the TOTAL points required to reach it from 8.
export const POINT_BUY_COST: { [key: number]: number } = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9,
};


export const SKIN_COLORS = [
  // Humanoid tones
  '#f9d4ab', '#eac086', '#d9ad6b', '#c68642', '#a16638', '#8f563b', '#6E4A2E', '#5C3821', '#3C2E1E',
  // Fantasy tones
  '#d1e4e8', // Pale blue
  '#a3c1ad', // Moss green
  '#e8d1d1', // Faint red/Tiefling
  '#b0a3c1', // Lavender
  '#c0c0c0', // Silver/Metallic
  '#9370DB'  // Medium Orchid/Exotic
];

export const HAIR_COLORS = [
    '#090806', // Black
    '#2C222B', // Dark Brown
    '#5f483c', // Brown
    '#B89778', // Light Brown / Dirty Blonde
    '#fce5ac', // Blonde
    '#E91E63', // Bright Pink
    '#c42222', // Fiery Red
    '#ffffff', // White
    '#607D8B', // Grey
];


export interface Theme {
    name: string;
    color: string;
    from: string;
    via: string;
    to: string;
    accent: string;
    accentDark: string;
    accentLight: string;
    textOnAccent: string;
}

export const CLOTH_THEMES: Theme[] = [
    // Brighter background with a warm, dark golden-brown hue
    { name: 'Adventurer\'s Gold', color: '#f59e0b', from: '#523d14', via: '#3d2d0f', to: '#291e0a', accent: '#f59e0b', accentDark: '#b45309', accentLight: '#fcd34d', textOnAccent: '#000000' },
    // Brighter background with a deep, dark red hue
    { name: 'Blood Red', color: '#dc2626', from: '#4d1f1f', via: '#391717', to: '#260f0f', accent: '#dc2626', accentDark: '#991b1b', accentLight: '#f87171', textOnAccent: '#000000' },
    // Brighter background with a rich, dark forest green hue
    { name: 'Forest Green', color: '#16a34a', from: '#1f4d33', via: '#173926', to: '#0f261a', accent: '#16a34a', accentDark: '#166534', accentLight: '#4ade80', textOnAccent: '#000000' },
    // Brighter background with a majestic, dark purple hue
    { name: 'Royal Purple', color: '#9333ea', from: '#5a3d70', via: '#483059', to: '#362442', accent: '#9333ea', accentDark: '#6b21a8', accentLight: '#c084fc', textOnAccent: '#ffffff' },
    // Unchanged as requested by the user
    { name: 'Ocean Blue', color: '#2563eb', from: '#1e3a8a', via: '#1e293b', to: '#0c121e', accent: '#2563eb', accentDark: '#1d4ed8', accentLight: '#60a5fa', textOnAccent: '#000000' },
    // Brighter, more distinct gray gradient
    { name: 'Shadow Black', color: '#404040', from: '#333333', via: '#292929', to: '#1f1f1f', accent: '#a3a3a3', accentDark: '#737373', accentLight: '#e5e5e5', textOnAccent: '#000000' },
];


export const CLASS_DATA: { [key: string]: { hitDie: number, armor: string[] } } = {
    "Barbarian": { hitDie: 12, armor: ["light", "medium", "shields"] },
    "Bard": { hitDie: 8, armor: ["light"] },
    "Cleric": { hitDie: 8, armor: ["light", "medium", "shields"] },
    "Druid": { hitDie: 8, armor: ["light", "medium", "shields (non-metal)"] },
    "Fighter": { hitDie: 10, armor: ["all", "shields"] },
    "Monk": { hitDie: 8, armor: [] },
    "Paladin": { hitDie: 10, armor: ["all", "shields"] },
    "Ranger": { hitDie: 10, armor: ["light", "medium", "shields"] },
    "Rogue": { hitDie: 8, armor: ["light"] },
    "Sorcerer": { hitDie: 6, armor: [] },
    "Warlock": { hitDie: 8, armor: ["light"] },
    "Wizard": { hitDie: 6, armor: [] }
};

export const MAX_CHARACTERS = 5;

export const WEAPON_KEYWORDS = ['sword', 'axe', 'mace', 'dagger', 'bow', 'staff', 'spear', 'scythe', 'wand', 'flail'];
export const ARMOR_KEYWORDS = ['armor', 'shield', 'plate', 'mail', 'leather', 'robe', 'tunic', 'chain'];