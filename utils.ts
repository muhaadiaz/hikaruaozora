import jsPDF from 'jspdf';
import { CLASS_DATA, ABILITIES, POINT_BUY_TOTAL_POINTS, POINT_BUY_COST, WEAPON_KEYWORDS, ARMOR_KEYWORDS } from './constants';
import { Stats, FinalCharacter, SavedGameState, CharacterOptions } from './types';
import { generateCharacterDetails, generateCharacterImage } from './services/geminiService';

export const getAbilityModifier = (score: number): number => {
    return Math.floor((score - 10) / 2);
};

export const calculateMaxHp = (characterClass: string, conModifier: number): number => {
    const classInfo = CLASS_DATA[characterClass];
    if (!classInfo) return 8 + conModifier; // Default for unknown class
    // Game balance: Double the hit die value for more resilient characters, making the game more forgiving.
    const boostedHitPoints = classInfo.hitDie * 2;
    return boostedHitPoints + conModifier;
};

export const calculateArmorClass = (characterClass: string, dexModifier: number): number => {
    const classInfo = CLASS_DATA[characterClass];
    // This is a simplified AC calculation.
    // Assumes no armor for Monk/Barbarian unarmored defense, and light/no armor for others.
    if (characterClass === "Monk") {
        // Assuming WIS modifier is not available, simplifying. A real implementation would need it.
        return 10 + dexModifier; 
    }
    if (characterClass === "Barbarian") {
        return 10 + dexModifier; // Simplified, doesn't include CON mod
    }
    if (classInfo && classInfo.armor.includes("light")) {
        // Assuming leather armor
        return 11 + dexModifier;
    }
    if (classInfo && classInfo.armor.length === 0) {
        // Sorcerer, Wizard
        return 10 + dexModifier;
    }
    // Default/Fighter/etc. assuming some starting armor not yet equipped
    // Let's default to a basic 10 + dex
    return 10 + dexModifier;
};

export const createFinalCharacter = async (
    generationOptions: CharacterOptions, 
    lang: 'en' | 'id',
    t: (key: string, options?: any) => string
): Promise<FinalCharacter> => {
      const [details, image] = await Promise.all([
        generateCharacterDetails(generationOptions, lang),
        generateCharacterImage(generationOptions, lang)
      ]);
      
      const conModifier = getAbilityModifier(generationOptions.stats.constitution);
      const dexModifier = getAbilityModifier(generationOptions.stats.dexterity);

      const maxHp = calculateMaxHp(generationOptions.characterClass, conModifier);
      const armorClass = calculateArmorClass(generationOptions.characterClass, dexModifier);
      
      let mainWeapon = null;
      let armor = null;
      const remainingItems = [];
      const itemsCopy = [...details.startingItems];

      const weaponIndex = itemsCopy.findIndex(item => WEAPON_KEYWORDS.some(kw => item.toLowerCase().includes(kw)));
      if (weaponIndex > -1) {
          mainWeapon = { name: itemsCopy.splice(weaponIndex, 1)[0] };
      }
      
      const armorIndex = itemsCopy.findIndex(item => ARMOR_KEYWORDS.some(kw => item.toLowerCase().includes(kw)));
      if (armorIndex > -1) {
          armor = { name: itemsCopy.splice(armorIndex, 1)[0] };
      }
      
      remainingItems.push(...itemsCopy);

      const standardIssueItems = [
        { name: 'Potion of Healing', tag: 'Consumable' },
        { name: 'Potion of Healing', tag: 'Consumable' },
        { name: 'Potion of Healing', tag: 'Consumable' },
        { name: 'Potion of Healing', tag: 'Consumable' },
        { name: 'Potion of Healing', tag: 'Consumable' },
        { name: 'Healer\'s Kit', tag: 'Consumable' },
        { name: 'Scroll of Revivify', tag: 'Consumable' }
      ];

      return {
        ...generationOptions,
        generated: details,
        image: image,
        inventory: [
            ...remainingItems.map(item => ({ name: item, tag: t('tagNew') })),
            ...standardIssueItems
        ],
        mainWeapon,
        armor,
        currency: details.currency,
        notes: '',
        status: 'alive',
        maxHp: maxHp,
        currentHp: maxHp,
        armorClass: armorClass,
        regenTurnCounter: 0,
      };
};


export const saveCharacterSheetAsPdf = (character: FinalCharacter | null) => {
    if (!character) {
        console.error("PDF save failed: character data not available.");
        return;
    }

    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    const { generated: data } = character;

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;
    const contentWidth = pageWidth - margin * 2;
    const lineSpacing = 12;
    const sectionSpacing = 20;

    const checkPageBreak = (spaceNeeded: number) => {
        if (y + spaceNeeded > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
    };

    // --- Header ---
    doc.setFontSize(24).setFont('helvetica', 'bold');
    doc.text(character.name, margin, y);
    y += 25;

    doc.setFontSize(12).setFont('helvetica', 'normal');
    const subheader = `${character.gender} ${character.race} ${character.characterClass} | ${character.alignment} | ${character.background} Background`;
    doc.text(subheader, margin, y);
    y += 30;

    doc.setDrawColor(200).line(margin, y, pageWidth - margin, y);
    y += sectionSpacing;

    // --- Stats & Combat ---
    doc.setFontSize(14).setFont('helvetica', 'bold');
    doc.text('Core Attributes', margin, y);
    y += 20;
    
    const statBoxWidth = (contentWidth - 15) / 4; // 4 boxes per row
    const statBoxHeight = 40;
    const allStats = [...ABILITIES, 'armorClass', 'maxHp'];

    allStats.forEach((stat, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const x = margin + col * (statBoxWidth + 5);
        const currentY = y + row * (statBoxHeight + 5);

        let label, value, modifier;

        if (stat === 'armorClass') {
            label = 'AC';
            value = character.armorClass;
        } else if (stat === 'maxHp') {
            label = 'Max HP';
            value = character.maxHp;
        } else {
            label = stat.slice(0, 3).toUpperCase();
            value = character.stats[stat as keyof Stats];
            const mod = getAbilityModifier(value);
            modifier = mod >= 0 ? `+${mod}` : `${mod}`;
        }

        doc.setFontSize(10).setFont('helvetica', 'bold');
        doc.rect(x, currentY, statBoxWidth, statBoxHeight);
        doc.text(label, x + statBoxWidth / 2, currentY + 12, { align: 'center' });
        
        doc.setFontSize(16).setFont('helvetica', 'bold');
        doc.text(`${value}`, x + statBoxWidth / 2, currentY + 30, { align: 'center' });

        if (modifier) {
            doc.setFontSize(8).setFont('helvetica', 'normal');
            doc.setFillColor(255, 255, 255);
            doc.rect(x + statBoxWidth / 2 - 10, currentY + 32, 20, 10, 'F');
            doc.setTextColor(0, 0, 0);
            doc.text(modifier, x + statBoxWidth / 2, currentY + 38, { align: 'center' });
            doc.setTextColor(0, 0, 0); // Reset text color
        }
    });

    const rows = Math.ceil(allStats.length / 4);
    y += rows * (statBoxHeight + 5) + sectionSpacing;
    checkPageBreak(0);

    // --- Helper Functions for sections ---
    const addSection = (title: string, content: string | string[]) => {
        checkPageBreak(40); // Min space for title and some content
        doc.setFontSize(14).setFont('helvetica', 'bold');
        doc.text(title, margin, y);
        y += 20;

        doc.setFontSize(10).setFont('helvetica', 'normal');
        if (Array.isArray(content)) {
            content.forEach(item => {
                const text = `- ${item}`;
                const lines = doc.splitTextToSize(text, contentWidth - 10);
                checkPageBreak(lines.length * lineSpacing);
                doc.text(lines, margin + 10, y);
                y += (lines.length * lineSpacing) + 2;
            });
        } else {
            const lines = doc.splitTextToSize(content, contentWidth);
            checkPageBreak(lines.length * lineSpacing);
            doc.text(lines, margin, y);
            y += lines.length * lineSpacing;
        }
        y += sectionSpacing;
    };

    // --- Sections ---
    addSection('Description', data.characterDescription);
    if (character.backgroundStory) {
        addSection('Background Story', character.backgroundStory);
    }
    
    addSection('Main Weapon', character.mainWeapon?.name || 'None');
    addSection('Armor', character.armor?.name || 'None');
    
    if (character.selectedSkills.length > 0) {
        addSection('Proficiencies', character.selectedSkills);
    }
    if (data.skills.length > 0) {
        addSection('Other Talents', data.skills);
    }
    const specialMoveText = `${data.specialMove.name}\n${data.specialMove.description}`;
    addSection('Special Move', specialMoveText);
    addSection('Favorite Terrain', character.favoriteTerrain);
    addSection('Favorite Enemy', character.favoriteEnemy);

    const inventoryItemsAsStrings = character.inventory.map(item => {
        return item.tag ? `${item.name} [${item.tag}]` : item.name;
    });
    addSection('Inventory', inventoryItemsAsStrings.length > 0 ? inventoryItemsAsStrings : ['Empty']);
    addSection('Currency', `${character.currency.gp} GP, ${character.currency.sp} SP, ${character.currency.cp} CP`);


    // --- Finalize ---
    doc.save(`${character.name.replace(/\s/g, '_') || 'character'}_sheet.pdf`);
};

export const saveCharacterAsJson = (character: FinalCharacter) => {
    if (!character) return;
    const jsonString = JSON.stringify(character, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${character.name.replace(/\s/g, '_') || 'character'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const saveGameStateAsJson = (gameState: SavedGameState) => {
    if (!gameState) return;
    const jsonString = JSON.stringify(gameState, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dnd_story_save_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


export const getRandomElement = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateRandomStats = (): Stats => {
    let points = POINT_BUY_TOTAL_POINTS;
    const stats: Stats = {
        strength: 8, dexterity: 8, constitution: 8,
        intelligence: 8, wisdom: 8, charisma: 8,
    };
    
    let attempts = 0; // Safety break
    while (points > 0 && attempts < 1000) {
        const abilityToIncrease = getRandomElement(ABILITIES);
        const currentScore = stats[abilityToIncrease];
        
        if (currentScore >= 15) {
            attempts++;
            continue;
        };

        const cost = (POINT_BUY_COST[currentScore + 1] - POINT_BUY_COST[currentScore]);

        if (points >= cost) {
            stats[abilityToIncrease]++;
            points -= cost;
        }
        attempts++;
    }
    return stats;
};

export const getRandomSkills = (allSkills: readonly string[], count: number): string[] => {
    const shuffled = [...allSkills].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};