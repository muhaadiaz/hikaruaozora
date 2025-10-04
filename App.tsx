

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RACES, CLASSES, BACKGROUNDS, SKIN_COLORS, GENDERS, HAIR_TYPES, TERRAINS, ENEMIES, FIGHTING_STYLES, SKILLS, ALIGNMENTS, HAIR_COLORS, CLOTH_THEMES, Theme, MAX_CHARACTERS, ACCESSORIES } from './constants';
import { CharacterOptions, FinalCharacter, StoryEvent, SavedGameState, Campaign } from './types';
import CharacterCustomizer from './components/CharacterCustomizer';
import CharacterSheet from './components/CharacterSheet';
import StoryGame from './components/StoryGame';
import OpeningPage from './components/OpeningPage';
import CharacterTabs from './components/CharacterTabs';
import MainCharacterModal from './components/MainCharacterModal';
import { generateBackgroundStory, generateCharacterName, generateSpecialMove } from './services/geminiService';
import { createFinalCharacter, getRandomElement, generateRandomStats, getRandomSkills, saveGameStateAsJson } from './utils.ts';
import { LocalizationProvider } from './contexts/LocalizationContext';
import { useLocalization } from './contexts/LocalizationContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import EnergyBar from './components/EnergyBar';
import TtsToggle from './components/TtsToggle';
import { ttsService } from './services/ttsService';

const GAME_STATE_VERSION = "1.0";
const DEFAULT_BACKGROUND_URL = 'https://i.pinimg.com/originals/a3/56/d7/a356d773220e55135a16d9aa17387332.jpg';

const defaultOptions: CharacterOptions = {
    name: '',
    race: RACES[0],
    characterClass: CLASSES[0],
    background: BACKGROUNDS[0],
    alignment: ALIGNMENTS[4],
    gender: GENDERS[0],
    age: 25,
    hairType: HAIR_TYPES[0],
    customHairType: '',
    hairColor: HAIR_COLORS[0],
    skinColor: SKIN_COLORS[0],
    clothColor: CLOTH_THEMES[0].name,
    accessories: ACCESSORIES[0],
    customAccessory: '',
    height: 50,
    build: 50,
    muscularity: 50,
    favoriteTerrain: TERRAINS[0],
    favoriteEnemy: ENEMIES[0],
    stats: { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 },
    backgroundStory: '',
    selectedSkills: [],
    fightingStyle: FIGHTING_STYLES[0],
    customSpecialMove: '',
};

const GameContent: React.FC<{ 
    lang: 'en' | 'id'; 
    initialGameState: string | null; 
    t: (key: string, options?: any) => string; 
    setOpeningPageError: (error: string | null) => void;
    campaign: Campaign; 
    onResetGame: () => void;
    onThemeChange: (theme: Theme) => void;
    onAmbianceChange: (imageUrl: string | null) => void;
    isTtsEnabled: boolean;
}> = ({ lang, initialGameState, t, setOpeningPageError, campaign, onResetGame, onThemeChange, onAmbianceChange, isTtsEnabled }) => {
  const [characters, setCharacters] = useState<FinalCharacter[]>([]);
  const [activeCharacterIndex, setActiveCharacterIndex] = useState<number | null>(null);
  const [mainCharacterIndex, setMainCharacterIndex] = useState<number | null>(null);
  const [view, setView] = useState<'dashboard' | 'creator' | 'story'>('dashboard');
  
  const [creatorOptions, setCreatorOptions] = useState<CharacterOptions>(defaultOptions);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRandomizing, setIsRandomizing] = useState<boolean>(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState<boolean>(false);
  const [isGeneratingMove, setIsGeneratingMove] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMainCharModalOpen, setIsMainCharModalOpen] = useState(false);
  const [storyLog, setStoryLog] = useState<StoryEvent[]>([]);
  const gameLoadedRef = useRef(false);

  const handleLoadGame = useCallback((jsonString: string) => {
    try {
      const savedState: SavedGameState = JSON.parse(jsonString);
      if (savedState.version !== GAME_STATE_VERSION || !savedState.characters || !savedState.storyLog) {
          throw new Error("Invalid or incompatible save file.");
      }
      setCharacters(savedState.characters);
      setStoryLog(savedState.storyLog);
      setMainCharacterIndex(savedState.mainCharacterIndex);
      setActiveCharacterIndex(savedState.mainCharacterIndex); // Focus main char on load
      setView('story');
      setError(null);
    } catch (e) {
      console.error("Failed to load game state", e);
      setOpeningPageError(t('errorLoadingGame'));
    }
  }, [t, setOpeningPageError]);

  useEffect(() => {
    if (initialGameState && !gameLoadedRef.current) {
      handleLoadGame(initialGameState);
      gameLoadedRef.current = true;
    }
  }, [initialGameState, handleLoadGame]);
  
  // THEME MANAGEMENT
  useEffect(() => {
    let currentTheme: Theme | undefined;

    if (view === 'creator') {
      currentTheme = CLOTH_THEMES.find(t => t.name === creatorOptions.clothColor);
    } else if (activeCharacterIndex !== null && characters[activeCharacterIndex]) {
      currentTheme = CLOTH_THEMES.find(t => t.name === characters[activeCharacterIndex].clothColor);
    }

    if (!currentTheme) {
      currentTheme = CLOTH_THEMES[0]; // Default theme
    }
    
    onThemeChange(currentTheme);

  }, [view, creatorOptions.clothColor, activeCharacterIndex, characters, onThemeChange]);


  useEffect(() => {
    if (characters.length === 0 && view !== 'creator' && !initialGameState) {
        setView('creator');
        setActiveCharacterIndex(null);
    } else if (characters.length > 0 && view === 'creator' && editingIndex === null) {
        // This logic is tricky. Let's simplify: if we are not in story mode, and characters exist, go to dashboard.
    } else if (characters.length > 0 && view !== 'story') {
       setView('dashboard');
       if (activeCharacterIndex === null || activeCharacterIndex >= characters.length) {
            setActiveCharacterIndex(0);
       }
    }
  }, [characters.length, initialGameState]);

  const handleSaveCharacter = async (optionsToSave: CharacterOptions) => {
    setIsLoading(true);
    setError(null);
    try {
      const finalCharacter = await createFinalCharacter(optionsToSave, lang, t);
      
      let newCharIndex = 0;
      setCharacters(prev => {
          if (editingIndex !== null) {
              const newChars = [...prev];
              newChars[editingIndex] = finalCharacter;
              newCharIndex = editingIndex;
              return newChars;
          } else {
              const newChars = [...prev, finalCharacter];
              newCharIndex = newChars.length - 1;
              return newChars;
          }
      });

      setActiveCharacterIndex(newCharIndex);
      setEditingIndex(null);
      setView('dashboard');

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please check the console.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRandomGenerate = async () => {
    setIsRandomizing(true);
    setError(null);
    try {
      const race = getRandomElement(RACES);
      const characterClass = getRandomElement(CLASSES);
      const gender = getRandomElement(GENDERS);
      const name = await generateCharacterName({ race, characterClass, gender }, lang);

      const randomOptions: CharacterOptions = {
          name, race, characterClass, gender,
          background: getRandomElement(BACKGROUNDS),
          alignment: getRandomElement(ALIGNMENTS),
          age: Math.floor(Math.random() * 40) + 18, // Random age between 18 and 57
          hairType: getRandomElement(HAIR_TYPES.filter(h => h !== 'Other')), // Exclude 'Other' from random
          customHairType: '',
          hairColor: getRandomElement(HAIR_COLORS),
          skinColor: getRandomElement(SKIN_COLORS),
          clothColor: getRandomElement(CLOTH_THEMES).name,
          accessories: getRandomElement(ACCESSORIES.filter(a => a !== 'Other')), // Exclude 'Other' from random
          customAccessory: '',
          height: Math.floor(Math.random() * 101),
          build: Math.floor(Math.random() * 101),
          muscularity: Math.floor(Math.random() * 101),
          favoriteTerrain: getRandomElement(TERRAINS),
          favoriteEnemy: getRandomElement(ENEMIES),
          stats: generateRandomStats(),
          backgroundStory: '', 
          selectedSkills: getRandomSkills(SKILLS, 4),
          fightingStyle: getRandomElement(FIGHTING_STYLES),
          customSpecialMove: '',
      };
      
      setCreatorOptions(randomOptions);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('errorRandomizing'));
    } finally {
      setIsRandomizing(false);
    }
  };

  const handleGenerateStory = useCallback(async () => {
    setIsGeneratingStory(true);
    try {
        const story = await generateBackgroundStory(creatorOptions, lang);
        setCreatorOptions(prev => ({...prev, backgroundStory: story}));
    } catch (err) {
        console.error("Error generating story", err);
    } finally {
        setIsGeneratingStory(false);
    }
  }, [creatorOptions, lang]);

  const handleGenerateMove = useCallback(async () => {
    setIsGeneratingMove(true);
    try {
        const move = await generateSpecialMove(creatorOptions, lang);
        setCreatorOptions(prev => ({...prev, customSpecialMove: move}));
    } catch (err) {
        console.error("Error generating move", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsGeneratingMove(false);
    }
  }, [creatorOptions, lang]);

  const handleUploadCharacter = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const json = event.target?.result;
            if (typeof json === 'string') {
                const loadedCharacter: FinalCharacter = JSON.parse(json);
                if (loadedCharacter.race && loadedCharacter.characterClass && loadedCharacter.stats) {
                    if (!loadedCharacter.inventory) loadedCharacter.inventory = [];
                    if (loadedCharacter.inventory.length > 0 && typeof loadedCharacter.inventory[0] === 'string') {
                        loadedCharacter.inventory = (loadedCharacter.inventory as unknown as string[]).map(name => ({ name }));
                    }
                    if (!loadedCharacter.mainWeapon) loadedCharacter.mainWeapon = null;
                    if (!loadedCharacter.armor) loadedCharacter.armor = null;
                    loadedCharacter.status = 'alive'; // Ensure status is set for combat

                    setCharacters(prev => [...prev, loadedCharacter].slice(0, MAX_CHARACTERS));
                    setActiveCharacterIndex(characters.length);
                    setView('dashboard');
                    setError(null);
                } else {
                    throw new Error(t('errorInvalidCharacterFile'));
                }
            }
        } catch (e) {
            console.error("Failed to load or parse character file", e);
            setError(t('errorLoadingCharacterFile'));
        }
    };
    reader.readAsText(file);
  };
  
  const handleSaveGame = () => {
    if (mainCharacterIndex === null) return;
    const gameState: SavedGameState = {
        version: GAME_STATE_VERSION,
        characters,
        storyLog,
        mainCharacterIndex,
        campaign: campaign,
    };
    saveGameStateAsJson(gameState);
  };

  const handleAddNewCharacter = () => {
      setEditingIndex(null);
      setCreatorOptions(defaultOptions);
      setError(null);
      setView('creator');
  };

  const handleEditCharacter = (index: number) => {
      const charToEdit = characters[index];
      const { 
          generated, image, inventory, mainWeapon, armor, 
          currency, notes, maxHp, currentHp, armorClass, 
          regenTurnCounter, status, ...optionsFromChar 
      } = charToEdit;
      
      // Ensure new fields have default values if they don't exist on the character object
      const fullOptions = {
          ...defaultOptions, // Provides defaults for everything
          ...optionsFromChar // Overwrites with values from the character
      };
      
      setCreatorOptions(fullOptions);
      setEditingIndex(index);
      setError(null);
      setView('creator');
  };
  
  const handleDeleteCharacter = (index: number) => {
    const charName = characters[index].name || 'this character';
    if (window.confirm(`${t('confirmDelete')} ${charName}?`)) {
      setCharacters(prev => prev.filter((_, i) => i !== index));
      if (activeCharacterIndex === index) {
          const newIndex = Math.max(0, index - 1);
          setActiveCharacterIndex(characters.length > 1 ? newIndex : null);
      } else if (activeCharacterIndex && activeCharacterIndex > index) {
          setActiveCharacterIndex(activeCharacterIndex - 1);
      }
    }
  };

  // Removed useCallback to prevent stale state issues on game load.
  const handleCharacterChange = (index: number) => {
      setActiveCharacterIndex(index);
  };
  
  const handleStartStory = (characterIndex: number) => {
    setStoryLog([]); // Clear previous story
    setActiveCharacterIndex(characterIndex);
    if (characters.length > 1) {
        setIsMainCharModalOpen(true);
    } else {
        setMainCharacterIndex(characterIndex);
        setView('story');
    }
  }

  const handleConfirmMainCharacter = (charIndex: number) => {
    setCharacters(prev => {
        const newOrder = [...prev];
        const mainChar = newOrder.splice(charIndex, 1)[0];
        newOrder.unshift(mainChar);
        return newOrder;
    });
    setMainCharacterIndex(0);
    setActiveCharacterIndex(0);
    setIsMainCharModalOpen(false);
    setView('story');
  };

  const renderContent = () => {
    if (view === 'creator') {
      return (
          <div className="max-w-3xl mx-auto animate-fade-in">
              {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-center">{error}</div>}
              <CharacterCustomizer 
                options={creatorOptions}
                setOptions={setCreatorOptions}
                isLoading={isLoading}
                isRandomizing={isRandomizing}
                isGeneratingStory={isGeneratingStory}
                isGeneratingMove={isGeneratingMove}
                onGenerate={() => handleSaveCharacter(creatorOptions)}
                onRandomGenerate={handleRandomGenerate}
                onGenerateStory={handleGenerateStory}
                onGenerateMove={handleGenerateMove}
                onUpload={handleUploadCharacter}
                onBack={() => characters.length > 0 ? setView('dashboard') : null}
                isEditing={editingIndex !== null}
              />
          </div>
      );
    }
    
    if (view === 'dashboard' && activeCharacterIndex !== null && characters[activeCharacterIndex]) {
      const activeCharacter = characters[activeCharacterIndex];
      return <CharacterSheet
              character={activeCharacter}
              onEdit={() => handleEditCharacter(activeCharacterIndex)}
              onStartStory={() => handleStartStory(activeCharacterIndex)}
            />
    }

    if (view === 'story' && activeCharacterIndex !== null && mainCharacterIndex !== null) {
      return <StoryGame 
                characters={characters}
                setCharacters={setCharacters}
                activeCharacterIndex={activeCharacterIndex}
                onCharacterChange={handleCharacterChange}
                mainCharacterIndex={mainCharacterIndex}
                lang={lang}
                storyLog={storyLog}
                setStoryLog={setStoryLog}
                onSaveGame={handleSaveGame}
                onExitStory={onResetGame}
                campaign={campaign}
                onAmbianceChange={onAmbianceChange}
                isTtsEnabled={isTtsEnabled}
             />
    }

    return (
        <div className="text-center py-20 animate-fade-in">
            <h2 className="text-4xl font-bold font-medieval text-text-heading">{t('welcomeAdventurer')}</h2>
            <p className="text-accent-light/80 mt-2 text-lg">{t('journeyBegins')}</p>
            <button onClick={handleAddNewCharacter} className="mt-8 bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold py-3 px-6 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300 text-xl tracking-wider">
                {t('createFirstCharacter')}
            </button>
        </div>
    );
  };

  return (
    <div className="container mx-auto">
      <header className="flex items-center justify-between mb-4">
          <div className="flex-1"></div>
          <div className="text-center">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-wider font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">D&D Story Game</h1>
              <p className="text-accent-light/80 mt-2 text-lg">
                  {characters.length > 0 && view !== 'story' ? t('adventureAwaits') : t('craftYourHero')}
              </p>
          </div>
          <div className="flex-1 flex justify-end">
          </div>
      </header>

      {characters.length > 0 && view === 'dashboard' && (
           <CharacterTabs 
              characters={characters}
              activeIndex={activeCharacterIndex}
              onSelect={(index) => setActiveCharacterIndex(index)}
              onAdd={handleAddNewCharacter}
              onDelete={handleDeleteCharacter}
              addLabel={t('addCharacter')}
              canAdd={characters.length < MAX_CHARACTERS}
           />
      )}
      
      <main>
        {renderContent()}
      </main>
      
      {isMainCharModalOpen && (
          <MainCharacterModal
              characters={characters}
              onConfirm={handleConfirmMainCharacter}
              onCancel={() => setIsMainCharModalOpen(false)}
          />
      )}
    </div>
  );
};

export const App: React.FC = () => {
    const [lang, setLang] = useState<'en' | 'id'>('en');
    const [campaign, setCampaign] = useState<Campaign>('lost-mine-of-phandelver');
    const [isGameActive, setIsGameActive] = useState(false);
    const [initialGameState, setInitialGameState] = useState<string | null>(null);
    const [openingPageError, setOpeningPageError] = useState<string | null>(null);
    const [theme, setTheme] = useState<Theme>(CLOTH_THEMES[0]);
    const [isTtsEnabled, setIsTtsEnabled] = useState(false);
    
    // State for seamless background transitions
    const [bg1, setBg1] = useState(DEFAULT_BACKGROUND_URL);
    const [bg2, setBg2] = useState<string | null>(null);
    const [isBg1Active, setIsBg1Active] = useState(true);


    const handleStartNewGame = (selectedCampaign: Campaign) => {
        setCampaign(selectedCampaign);
        setInitialGameState(null);
        setOpeningPageError(null);
        setIsGameActive(true);
    };

    const handleLoadGame = (jsonString: string) => {
        const savedState: SavedGameState = JSON.parse(jsonString);
        setCampaign(savedState.campaign || 'lost-mine-of-phandelver');
        setInitialGameState(jsonString);
        setOpeningPageError(null);
        setIsGameActive(true);
    };
    
    const handleResetGame = () => {
        ttsService.stop();
        setIsGameActive(false);
        setInitialGameState(null);
        setOpeningPageError(null);
        // Reset background states for seamless transition
        setBg1(DEFAULT_BACKGROUND_URL);
        setBg2(null);
        setIsBg1Active(true);
    };

    const handleAmbianceChange = (imageUrl: string | null) => {
        if (!imageUrl) return; // Do not clear on null
        
        if (isBg1Active) {
            setBg2(imageUrl);
        } else {
            setBg1(imageUrl);
        }
        setIsBg1Active(prev => !prev);
    };

    const toggleTts = () => {
        setIsTtsEnabled(prev => {
            if (!prev === false) { // If turning off
                ttsService.stop();
            }
            return !prev;
        });
    };
    
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--color-accent', theme.accent);
        root.style.setProperty('--color-accent-dark', theme.accentDark);
        root.style.setProperty('--color-accent-light', theme.accentLight);
        root.style.setProperty('--color-text-on-accent', theme.textOnAccent);
        root.style.setProperty('--color-text-heading', theme.accentLight);
    }, [theme]);


    return (
        <LocalizationProvider lang={lang}>
            <div className="relative min-h-screen text-text-main font-sans">
                {/* Static Gradient Background */}
                <div 
                    className="absolute inset-0 -z-20 transition-all duration-500"
                    style={{
                        background: `linear-gradient(to bottom right, ${theme.from}, ${theme.via}, ${theme.to})`
                    }}
                />
                {/* Dynamic Image Background Layer 1 */}
                <div 
                    className="absolute inset-0 -z-10 bg-cover bg-center bg-fixed"
                    style={{
                        backgroundImage: `url(${bg1})`,
                        opacity: isBg1Active ? 0.5 : 0,
                        transition: 'opacity 1.5s ease-in-out',
                    }}
                />
                {/* Dynamic Image Background Layer 2 */}
                <div 
                    className="absolute inset-0 -z-10 bg-cover bg-center bg-fixed"
                    style={{
                        backgroundImage: `url(${bg2 || bg1})`,
                        opacity: !isBg1Active ? 0.5 : 0,
                        transition: 'opacity 1.5s ease-in-out',
                    }}
                />

                <div className="p-4 sm:p-6 lg:p-8">
                    {!isGameActive ? (
                        <OpeningPage onStart={handleStartNewGame} onLoad={handleLoadGame} error={openingPageError} setLang={setLang} />
                    ) : (
                        <>
                            <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
                                <EnergyBar />
                                <LanguageSwitcher setLang={setLang} />
                                <TtsToggle isEnabled={isTtsEnabled} onToggle={toggleTts} />
                            </div>
                            <GameContentWrapper 
                                lang={lang} 
                                campaign={campaign} 
                                initialGameState={initialGameState} 
                                onResetGame={handleResetGame} 
                                onThemeChange={setTheme}
                                onAmbianceChange={handleAmbianceChange}
                                isTtsEnabled={isTtsEnabled}
                                setOpeningPageError={(error) => {
                                    setOpeningPageError(error);
                                    setIsGameActive(false);
                                }} 
                            />
                        </>
                    )}
                </div>
            </div>
        </LocalizationProvider>
    );
};

// This wrapper is needed to use the useLocalization hook for passing 't' to GameContent
const GameContentWrapper: React.FC<{
  lang: 'en' | 'id';
  campaign: Campaign;
  initialGameState: string | null;
  setOpeningPageError: (error: string | null) => void;
  onResetGame: () => void;
  onThemeChange: (theme: Theme) => void;
  onAmbianceChange: (imageUrl: string | null) => void;
  isTtsEnabled: boolean;
}> = ({ lang, campaign, initialGameState, setOpeningPageError, onResetGame, onThemeChange, onAmbianceChange, isTtsEnabled }) => {
  const { t } = useLocalization();
  return <GameContent 
            lang={lang} 
            campaign={campaign} 
            initialGameState={initialGameState} 
            t={t} 
            setOpeningPageError={setOpeningPageError} 
            onResetGame={onResetGame} 
            onThemeChange={onThemeChange}
            onAmbianceChange={onAmbianceChange}
            isTtsEnabled={isTtsEnabled}
        />;
};

// Default export removed