import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Chat } from '@google/genai';
import { FinalCharacter, StoryEvent, InventoryItem, Campaign, CharacterOptions, Invitation, Combatant } from '../types';
import { createStoryChat, generateAmbianceImage } from '../services/geminiService';
import { apiUsageTracker } from '../services/apiUsageTracker';
import { ttsService } from '../services/ttsService';
import FloatingDiceRoller from './FloatingDiceRoller';
import CharacterInfoPanel from './CharacterInfoPanel';
import { useLocalization } from '../contexts/LocalizationContext';
import { createFinalCharacter, getRandomElement, generateRandomStats, getRandomSkills, getAbilityModifier } from '../utils';
import { BACKGROUNDS, ALIGNMENTS, HAIR_TYPES, HAIR_COLORS, SKIN_COLORS, CLOTH_THEMES, TERRAINS, ENEMIES, FIGHTING_STYLES, SKILLS, MAX_CHARACTERS, ACCESSORIES } from '../constants';
import AmbianceDisplay from './AmbianceDisplay';
import Minimap from './Minimap';
import CombatEventModal from './CombatEventModal';
import TransferItemModal from './TransferItemModal';
import GameEventModal from './GameEventModal';


interface StoryGameProps {
  characters: FinalCharacter[];
  setCharacters: React.Dispatch<React.SetStateAction<FinalCharacter[]>>;
  activeCharacterIndex: number;
  onCharacterChange: (index: number) => void;
  mainCharacterIndex: number;
  lang: 'en' | 'id';
  campaign: Campaign;
  storyLog: StoryEvent[];
  setStoryLog: React.Dispatch<React.SetStateAction<StoryEvent[]>>;
  onSaveGame: () => void;
  onExitStory: () => void;
  onAmbianceChange: (imageUrl: string | null) => void;
  isTtsEnabled: boolean;
}

const LOG_CHUNK_SIZE = 15;

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-accent-light" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const INVITE_REGEX = /INVITE_CHARACTER:\s*\[?([^,]+),([^,]+),([^,]+),([^,]+)\s*\]?/g;
const AMBIANCE_REGEX = /AMBIANCE:\[?([^\]\r\n]+)\]?\r?\n?/gi;
const MINIMAP_REGEX = /MINIMAP:\[(.*?)\]/g;
const DISTANCE_REGEX = /DISTANCE_INFO:\[(\d+)\]/g;
const COMBAT_END_REGEX = /COMBAT_END/g;
const DAMAGE_REGEX = /DAMAGE:\[?([^,]+),\s*(\d+)\s*\]?/g;
// More flexible regex to handle AI format variations, e.g., TRANSACTION:[cost],tag,item list
const TRANSACTION_REGEX = /TRANSACTION:\[(\d+),(\d+),(\d+)\]\s*,\s*([^,\[\]]*)\s*(.*)/g;
const REWARD_CURRENCY_REGEX = /REWARD_CURRENCY:\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/g;
const QUEST_COMPLETE_REGEX = /QUEST_COMPLETE:\[(.*?)\]/g;


const StoryGame: React.FC<StoryGameProps> = ({ characters, setCharacters, activeCharacterIndex, onCharacterChange, mainCharacterIndex, lang, campaign, storyLog, setStoryLog, onSaveGame, onExitStory, onAmbianceChange, isTtsEnabled }) => {
    const { t } = useLocalization();
    const chatRef = useRef<Chat | null>(null);
    const [playerInput, setPlayerInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'story' | 'info'>('story');
    const storyContainerRef = useRef<HTMLDivElement>(null);
    const storyEndRef = useRef<HTMLDivElement>(null);
    const prevScrollHeight = useRef<number | null>(null);
    const [displayCount, setDisplayCount] = useState(LOG_CHUNK_SIZE);
    
    const [pendingAction, setPendingAction] = useState<string | null>(null);

    const [isGeneratingAmbiance, setIsGeneratingAmbiance] = useState(false);
    const [ambianceImageUrl, setAmbianceImageUrl] = useState<string | null>(null);
    
    const [minimapData, setMinimapData] = useState<Combatant[] | null>(null);
    const [longRangeDistance, setLongRangeDistance] = useState<number | null>(null);
    const [activeRightPanelTab, setActiveRightPanelTab] = useState<'ambiance' | 'minimap'>('ambiance');
    
    const [combatModalType, setCombatModalType] = useState<'start' | 'end' | null>(null);
    const [transferTarget, setTransferTarget] = useState<{item: InventoryItem; slot: 'inventory' | 'mainWeapon' | 'armor'; itemIndex?: number} | null>(null);
    const inCombatRef = useRef(false);
    const [gameEvent, setGameEvent] = useState<{
        type: 'downed' | 'revived' | 'gameOver' | 'victory';
        title: string;
        subtitle?: string;
    } | null>(null);
    const prevCharactersRef = useRef<FinalCharacter[]>();

    const activeCharacter = characters[activeCharacterIndex];

    useEffect(() => {
        // Don't run on initial load or if a modal is already open
        if (!prevCharactersRef.current || gameEvent) {
            prevCharactersRef.current = characters;
            return;
        }

        // Check for GAME OVER first, as it's the most critical state
        if (characters.length > 0 && characters.every(c => c.currentHp <= 0)) {
            const mainCharacterName = characters[mainCharacterIndex]?.name || t('theParty');
            setGameEvent({
                type: 'gameOver',
                title: t('gameOver'),
                subtitle: t('gameOverSubtitle', { name: mainCharacterName }),
            });
            prevCharactersRef.current = characters;
            return; // Stop further processing
        }

        // Check for individual downed/revived states
        characters.forEach((char, index) => {
            const prevChar = prevCharactersRef.current?.[index];
            if (prevChar) {
                const prevHp = Number(prevChar.currentHp) || 0;
                const currentHp = Number(char.currentHp) || 0;

                if (prevHp > 0 && currentHp <= 0) {
                    setGameEvent({
                        type: 'downed',
                        title: t('characterDowned', { name: char.name }),
                        subtitle: t('characterDownedSubtitle', { name: char.name }),
                    });
                } else if (prevHp <= 0 && currentHp > 0) {
                    setGameEvent({
                        type: 'revived',
                        title: t('characterRevived', { name: char.name }),
                        subtitle: t('characterRevivedSubtitle', { name: char.name }),
                    });
                }
            }
        });
        
        prevCharactersRef.current = characters;
    }, [characters, t, gameEvent, mainCharacterIndex]);


    const handleCharacterUpdate = useCallback((updates: Partial<FinalCharacter>) => {
        setCharacters(prevChars =>
            prevChars.map((char, index) =>
                index === activeCharacterIndex ? { ...char, ...updates } : char
            )
        );
    }, [activeCharacterIndex, setCharacters]);
    
    const handleItemUpdateForCharacter = useCallback((charIndex: number, newItems: InventoryItem[]) => {
        setCharacters(prevChars => {
            const charToUpdate = prevChars[charIndex];
            if (!charToUpdate) return prevChars;
    
            const updatedInventory = [...(charToUpdate.inventory || []), ...newItems];
            return prevChars.map((char, index) => 
                index === charIndex ? { ...char, inventory: updatedInventory } : char
            );
        });
    }, [setCharacters]);

    const processAndLogDMResponse = useCallback(async (
        dmResponsePromise: Promise<{ text: string }>,
        characterIndexToUpdate: number
    ) => {
        try {
            const response = await dmResponsePromise;
            const originalText = response.text;
            let storyText = originalText;
            let parsedInvitation: Invitation | null = null;
            
            // --- MODAL AND STATE CHECKS (on original, unmodified text) ---
            const combatStartedRegex = new RegExp(MINIMAP_REGEX.source, 'g');
            const distanceInfoRegex = new RegExp(DISTANCE_REGEX.source, 'g');
            const combatEndedRegex = new RegExp(COMBAT_END_REGEX.source, 'g');

            if ((combatStartedRegex.test(originalText) || distanceInfoRegex.test(originalText)) && !inCombatRef.current) {
                inCombatRef.current = true;
                setCombatModalType('start');
            }
            if (combatEndedRegex.test(originalText) && inCombatRef.current) {
                inCombatRef.current = false;
                setCombatModalType('end');
            }


            // --- TAG PARSING AND REPLACEMENT (on mutable storyText) ---
            const newItems: InventoryItem[] = [];
            const ITEM_REGEX_CAPTURE = /ITEM:(.+?)\s*\((?:Tag|tag):\s*([^)]+)\)/gi;
            
            storyText = storyText.replace(DAMAGE_REGEX, (match, name, amount) => {
                const damageAmount = parseInt(amount, 10);
                const characterName = name.trim();

                setCharacters(prevChars => {
                    const charIndex = prevChars.findIndex(c => c.name.split(' ')[0].toLowerCase() === characterName.toLowerCase());
                    if (charIndex !== -1) {
                        const newChars = [...prevChars];
                        const charToUpdate = { ...newChars[charIndex] };
                        const currentHp = Number(charToUpdate.currentHp) || 0;
                        charToUpdate.currentHp = Math.max(0, currentHp - damageAmount);
                        newChars[charIndex] = charToUpdate;

                        setStoryLog(prevLog => [...prevLog, { type: 'game-event', text: t('tookDamage', { name: characterName, amount: damageAmount }) }]);
                        return newChars;
                    }
                    return prevChars;
                });
                return ''; // Remove the tag
            });
            
            storyText = storyText.replace(REWARD_CURRENCY_REGEX, (match, gp, sp, cp) => {
                const reward = { gp: parseInt(gp, 10), sp: parseInt(sp, 10), cp: parseInt(cp, 10) };

                setCharacters(prevChars => {
                    const charToUpdate = prevChars[characterIndexToUpdate];
                    if (!charToUpdate) return prevChars;

                    const currentCurrency = charToUpdate.currency || { gp: 0, sp: 0, cp: 0 };
                    const newCurrency = {
                        gp: (currentCurrency.gp || 0) + reward.gp,
                        sp: (currentCurrency.sp || 0) + reward.sp,
                        cp: (currentCurrency.cp || 0) + reward.cp,
                    };

                    let rewardStringParts = [];
                    if (reward.gp > 0) rewardStringParts.push(`${reward.gp} GP`);
                    if (reward.sp > 0) rewardStringParts.push(`${reward.sp} SP`);
                    if (reward.cp > 0) rewardStringParts.push(`${reward.cp} CP`);

                    if (rewardStringParts.length > 0) {
                        setStoryLog(prev => [...prev, { type: 'game-event', text: t('currencyReceived', { amount: rewardStringParts.join(', ') }) }]);
                    }

                    const newChars = [...prevChars];
                    newChars[characterIndexToUpdate] = { ...charToUpdate, currency: newCurrency };
                    return newChars;
                });

                return ''; // Remove the tag
            });

            storyText = storyText.replace(TRANSACTION_REGEX, (match, gp, sp, cp, tag, itemData) => {
                const cost = { gp: parseInt(gp, 10), sp: parseInt(sp, 10), cp: parseInt(cp, 10) };
                const itemTag = tag.trim();
                let itemNamesString = itemData.trim();
            
                // The AI might wrap items in brackets, so we remove them for parsing.
                if (itemNamesString.startsWith('[') && itemNamesString.endsWith(']')) {
                    itemNamesString = itemNamesString.substring(1, itemNamesString.length - 1);
                }
                
                // The AI might output a list of items separated by commas.
                const itemNames = itemNamesString.split(',').map(name => name.trim()).filter(Boolean);
            
                if (itemNames.length === 0) {
                    return ''; // No items to add.
                }
            
                setCharacters(prevChars => {
                    const charToUpdate = prevChars[characterIndexToUpdate];
                    if (!charToUpdate) return prevChars;
            
                    const currentCurrency = charToUpdate.currency || { gp: 0, sp: 0, cp: 0 };
                    const totalCostCp = cost.gp * 100 + cost.sp * 10 + cost.cp;
                    const totalWalletCp = (currentCurrency.gp || 0) * 100 + (currentCurrency.sp || 0) * 10 + (currentCurrency.cp || 0);
            
                    if (totalWalletCp >= totalCostCp) {
                        let newTotalWalletCp = totalWalletCp - totalCostCp;
                        const finalGp = Math.floor(newTotalWalletCp / 100);
                        newTotalWalletCp %= 100;
                        const finalSp = Math.floor(newTotalWalletCp / 10);
                        const finalCp = newTotalWalletCp % 10;
                        const newCurrency = { gp: finalGp, sp: finalSp, cp: finalCp };
            
                        const newItems: InventoryItem[] = itemNames.map(name => ({
                            name: name,
                            tag: itemTag ? itemTag : undefined 
                        }));
            
                        const newInventory = [...(charToUpdate.inventory || []), ...newItems];
                        
                        let costStringParts = [];
                        if(cost.gp > 0) costStringParts.push(`${cost.gp} GP`);
                        if(cost.sp > 0) costStringParts.push(`${cost.sp} SP`);
                        if(cost.cp > 0) costStringParts.push(`${cost.cp} CP`);
            
                        const boughtItemsString = itemNames.join(', ');
                        setStoryLog(prev => [...prev, { type: 'game-event', text: t('itemBought', { itemName: boughtItemsString, cost: costStringParts.join(', ') }) }]);
            
                        const newChars = [...prevChars];
                        newChars[characterIndexToUpdate] = { ...charToUpdate, inventory: newInventory, currency: newCurrency };
                        return newChars;
                    } else {
                        const itemNamesString = itemNames.join(', ');
                        setStoryLog(prev => [...prev, { type: 'system', text: t('youCannotAfford', { itemName: itemNamesString }) }]);
                        return prevChars;
                    }
                });
            
                return ''; // Remove the tag
            });

            storyText = storyText.replace(AMBIANCE_REGEX, (match, description) => {
                setIsGeneratingAmbiance(true);
                setActiveRightPanelTab('ambiance');
                
                generateAmbianceImage(description.trim())
                    .then(imageUrl => {
                        setAmbianceImageUrl(imageUrl);
                        onAmbianceChange(imageUrl);
                    })
                    .catch(err => {
                        // Gracefully fail by only logging to console. Do not show error to user.
                        console.error("Error generating ambiance image:", err);
                    })
                    .finally(() => {
                        setIsGeneratingAmbiance(false);
                    });
                
                setStoryLog(prev => [...prev, { type: 'system', text: t('generatingScene') }]);
                return ''; // Remove the tag from the text
            });


            storyText = storyText.replace(ITEM_REGEX_CAPTURE, (match, name, tagContent) => {
                const itemName = name.trim().replace(/[\[\]]/g, '');
                const tag = tagContent.trim();
                newItems.push({ name: itemName, tag: tag });
                return itemName;
            });
            
            if (newItems.length > 0) {
                handleItemUpdateForCharacter(characterIndexToUpdate, newItems);
                const itemNames = newItems.map(i => i.name).join(', ');
                setStoryLog(prev => [...prev, { type: 'game-event', text: `${t('youAcquired')}: ${itemNames}` }]);
            }
            
            storyText = storyText.replace(MINIMAP_REGEX, (match, dataString) => {
                const combatants: Combatant[] = dataString.split(';')
                    .map((c: string) => {
                        const parts = c.split('/');
                        if (parts.length === 4) {
                            const [type, id, x, y] = parts;
                            return {
                                type: type.trim(),
                                id: id.trim(),
                                pos: { x: parseInt(x, 10), y: parseInt(y, 10) }
                            } as Combatant;
                        }
                        return null;
                    })
                    .filter((c: Combatant | null): c is Combatant => c !== null);
                
                setMinimapData(combatants);
                setLongRangeDistance(null);
                setActiveRightPanelTab('minimap');
                return ''; // Remove tag from story text
            });

            storyText = storyText.replace(DISTANCE_REGEX, (match, distance) => {
                setLongRangeDistance(parseInt(distance, 10));
                setMinimapData(null);
                setActiveRightPanelTab('minimap');
                return '';
            });

            storyText = storyText.replace(COMBAT_END_REGEX, () => {
                setMinimapData(null);
                setLongRangeDistance(null);
                return '';
            });

            storyText = storyText.replace(QUEST_COMPLETE_REGEX, (match, questName) => {
                setGameEvent({
                    type: 'victory',
                    title: t('missionComplete'),
                    subtitle: t('missionCompleteSubtitle', { questName: questName.trim() }),
                });
                return ''; // Remove the tag
            });
    
            storyText = storyText.replace(INVITE_REGEX, (match, name, race, characterClass, gender) => {
                if (characters.length < MAX_CHARACTERS) {
                    parsedInvitation = { 
                        name: name.trim(), 
                        race: race.trim(), 
                        characterClass: characterClass.trim(), 
                        gender: gender.trim(), 
                        status: 'pending' 
                    };
                } else {
                    setStoryLog(prev => [...prev, { type: 'system', text: t('partyFull') }]);
                }
                return ''; 
            });
    
            storyText = storyText.trim();
            if (storyText) {
                 if (isTtsEnabled) {
                    const langCode = lang === 'en' ? 'en-US' : 'id-ID';
                    ttsService.speak(storyText, langCode);
                }
            }
            
            if (storyText || parsedInvitation) {
                 setStoryLog(prev => [...prev, { 
                     type: 'dm', 
                     text: storyText, 
                     invitation: parsedInvitation || undefined 
                }]);
            }
    
        } catch (error) {
            console.error("Error processing DM response:", error);
            setStoryLog(prev => [...prev, { type: 'system', text: t('errorDMConnectionLost') }]);
        }
    }, [handleItemUpdateForCharacter, setStoryLog, t, characters.length, setCharacters, onAmbianceChange, isTtsEnabled, lang]);

    const handlePlayerAction = useCallback(async (actionText: string) => {
        const chat = chatRef.current;
        if (!actionText.trim() || isLoading || !chat) return;

        ttsService.stop();
        setIsLoading(true);
    
        let regenerationEvents: StoryEvent[] = [];
        const updatedChars = characters.map((char): FinalCharacter => {
            const strModifier = getAbilityModifier(char.stats.strength);
    
            const currentHp = Number(char.currentHp) || 0;
            const maxHp = Number(char.maxHp) || 1;
            
            if (strModifier >= 1 && currentHp > 0 && currentHp < maxHp) {
                const regenTurnCounter = (Number(char.regenTurnCounter) || 0) + 1;
    
                if (regenTurnCounter >= 3) {
                    regenerationEvents.push({ type: 'game-event', text: t('hpRegenerated', { name: char.name }) });
                    return {
                        ...char,
                        currentHp: Math.min(maxHp, currentHp + 1),
                        regenTurnCounter: 0,
                    };
                } else {
                    return { ...char, regenTurnCounter: regenTurnCounter };
                }
            }
            return char;
        });
        setCharacters(updatedChars);
    
        setStoryLog(prev => [...prev, { type: 'player', text: actionText }, ...regenerationEvents]);
    
        apiUsageTracker.trackApiCall();
        await processAndLogDMResponse(chat.sendMessage({ message: actionText }), activeCharacterIndex);
    
        setIsLoading(false);
    }, [isLoading, characters, setCharacters, setStoryLog, processAndLogDMResponse, activeCharacterIndex, t]);

    useEffect(() => {
        const initializeOrUpdateChat = async () => {
            if (characters.length === 0 || mainCharacterIndex === null) {
                if (isLoading) setIsLoading(false);
                return;
            }

            chatRef.current = createStoryChat(characters, mainCharacterIndex, lang, campaign, storyLog);

            if (storyLog.length === 0) {
                setIsLoading(true);
                setStoryLog(prev => [...prev, { type: 'system', text: t('dmIsSettingTheScene') }]);
                apiUsageTracker.trackApiCall();
                if(chatRef.current) {
                    await processAndLogDMResponse(chatRef.current.sendMessage({ message: t('begin') }), mainCharacterIndex);
                }
                setIsLoading(false);
            } else if (isLoading) {
                 setIsLoading(false);
            }
        };
        initializeOrUpdateChat();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [characters, storyLog, mainCharacterIndex, lang, campaign]);
    
    useEffect(() => {
        if (pendingAction && !isLoading) {
            handlePlayerAction(pendingAction);
            setPendingAction(null);
        }
    }, [pendingAction, isLoading, handlePlayerAction]);

    useEffect(() => {
        if (prevScrollHeight.current === null) {
            storyEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [storyLog]);

    useEffect(() => {
        // Stop speech on unmount
        return () => {
            ttsService.stop();
        };
    }, []);

    useEffect(() => {
        if (!isTtsEnabled) {
            ttsService.stop();
        }
    }, [isTtsEnabled]);

    useLayoutEffect(() => {
        if (prevScrollHeight.current !== null && storyContainerRef.current) {
            const newScrollHeight = storyContainerRef.current.scrollHeight;
            storyContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight.current;
            prevScrollHeight.current = null;
        }
    }, [displayCount]);

    const handleShowMore = () => {
        if (storyContainerRef.current) {
            prevScrollHeight.current = storyContainerRef.current.scrollHeight;
        }
        setDisplayCount(prev => prev + LOG_CHUNK_SIZE);
    };

    const visibleStoryLog = storyLog.slice(Math.max(0, storyLog.length - displayCount));
    const hasMoreLogs = storyLog.length > displayCount;
    
    const updateInvitationStatus = useCallback((eventIndex: number, newStatus: Invitation['status']) => {
        setStoryLog(prev => {
            const newLog = [...prev];
            const eventToUpdate = newLog[eventIndex];
            if (eventToUpdate && eventToUpdate.invitation) {
                newLog[eventIndex] = {
                    ...eventToUpdate,
                    invitation: { ...eventToUpdate.invitation, status: newStatus }
                };
            }
            return newLog;
        });
    }, [setStoryLog]);

    const handleAcceptInvite = useCallback(async (eventIndex: number, invite: Invitation) => {
        if (!invite) return;
        ttsService.stop();
        updateInvitationStatus(eventIndex, 'generating');
        
        try {
            const randomOptions: CharacterOptions = {
              name: invite.name, 
              race: invite.race,
              characterClass: invite.characterClass,
              gender: invite.gender,
              background: getRandomElement(BACKGROUNDS),
              alignment: getRandomElement(ALIGNMENTS),
              age: Math.floor(Math.random() * 40) + 18,
              hairType: getRandomElement(HAIR_TYPES.filter(h => h !== 'Other')),
              customHairType: '',
              hairColor: getRandomElement(HAIR_COLORS),
              skinColor: getRandomElement(SKIN_COLORS),
              clothColor: getRandomElement(CLOTH_THEMES).name,
              accessories: getRandomElement(ACCESSORIES.filter(a => a !== 'Other')),
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

            const newCharacter = await createFinalCharacter(randomOptions, lang, t);
            setCharacters(prev => [...prev, newCharacter]);
            updateInvitationStatus(eventIndex, 'accepted');
            
            setPendingAction(`(I have accepted. ${newCharacter.name} joins the party.)`);

        } catch (error) {
            console.error("Error generating invited character:", error);
            updateInvitationStatus(eventIndex, 'error');
        }
    }, [updateInvitationStatus, lang, t, setCharacters]);

    const handleDeclineInvite = useCallback((eventIndex: number, invite: Invitation) => {
        if (!invite) return;
        ttsService.stop();
        updateInvitationStatus(eventIndex, 'declined');
        setPendingAction(`(I have declined the invitation for ${invite.name} to join.)`);
    }, [updateInvitationStatus]);

    const handleUseItem = useCallback((item: InventoryItem, itemIndex: number) => {
        let healingAmount: number = 0;
        const name = item.name.toLowerCase();

        if (name.includes('potion of greater healing')) {
            // 4d4+4 healing. More type-safe way to calculate this.
            healingAmount = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4) + 1).reduce((sum, roll) => sum + roll, 4);
        } else if (name.includes('potion of healing')) {
            healingAmount = (Math.floor(Math.random() * 4) + 1) + (Math.floor(Math.random() * 4) + 1) + 2;
        } else if (name.includes('medical kit') || name.includes("healer's kit")) {
            healingAmount = 10;
        }

        if (healingAmount > 0) {
            const characterToHeal = characters[activeCharacterIndex];
            const currentHp = Number(characterToHeal.currentHp) || 0;
            const maxHp = Number(characterToHeal.maxHp) || 1;
            const newHp = Math.min(maxHp, currentHp + healingAmount);
            const actualHealedAmount = newHp - currentHp;

            if (actualHealedAmount > 0) {
                const newInventory = characterToHeal.inventory.filter((_, i) => i !== itemIndex);
                const updatedCharacter = { ...characterToHeal, inventory: newInventory, currentHp: newHp };
                setCharacters(prev => prev.map((char, i) => i === activeCharacterIndex ? updatedCharacter : char));
                
                setStoryLog(prev => [...prev, { type: 'game-event', text: t('itemUsed', { itemName: item.name, amount: actualHealedAmount }) }]);
                
                setPendingAction(`(I use a ${item.name} and recover ${actualHealedAmount} HP.)`);
            }
        }
    }, [activeCharacterIndex, characters, setCharacters, setStoryLog, t]);

    const handleTransferItem = (destIndex: number) => {
        if (transferTarget === null) return;
        const { item, slot, itemIndex } = transferTarget;
    
        setCharacters(prevChars => {
            const newChars = [...prevChars];
            const sourceChar = { ...newChars[activeCharacterIndex] };
            const destChar = { ...newChars[destIndex] };
    
            // Remove from source
            if (slot === 'inventory' && itemIndex !== undefined) {
                sourceChar.inventory = sourceChar.inventory.filter((_, i) => i !== itemIndex);
            } else if (slot === 'mainWeapon') {
                sourceChar.mainWeapon = null;
            } else if (slot === 'armor') {
                sourceChar.armor = null;
            }
    
            // Add to destination's inventory
            destChar.inventory = [...(destChar.inventory || []), item];
    
            newChars[activeCharacterIndex] = sourceChar;
            newChars[destIndex] = destChar;
            return newChars;
        });
    
        setStoryLog(prev => [...prev, { type: 'game-event', text: t('itemTransferred', { itemName: item.name, sourceName: characters[activeCharacterIndex].name, destName: characters[destIndex].name }) }]);
        setTransferTarget(null); // Close modal
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handlePlayerAction(playerInput);
        setPlayerInput('');
    };
    
    const handleRollResult = (resultText: string) => {
        setPlayerInput(prev => `(${t('myRoll')}: ${resultText}) ${prev}`);
        setActiveTab('story');
    };

    const handleCharacterSwap = (index: number) => {
        if (index === activeCharacterIndex || isLoading) return;
        onCharacterChange(index);
    };

    const getLogEntryStyle = (type: StoryEvent['type']) => {
        switch (type) {
            case 'dm':
                return 'bg-black/10 border-l-4 border-accent/30 p-4 rounded-lg text-text-main italic';
            case 'player':
                return 'bg-black/30 border-r-4 border-accent-light p-4 rounded-lg text-accent-light/90 text-right';
            case 'system':
                return 'text-center text-text-muted font-bold tracking-wider py-2';
            case 'game-event':
                 return 'bg-accent/10 border-2 border-dashed border-accent/30 text-accent-light font-bold text-center p-3 rounded-lg';
            default:
                return '';
        }
    };
    
    const renderInvitation = (invitation: Invitation, eventIndex: number) => {
        switch (invitation.status) {
            case 'pending':
                return (
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-3 text-right">
                        <p className="text-text-main font-semibold flex-grow text-left sm:text-right italic">
                            {t('inviteToPartyQuestion', { name: invitation.name })}
                        </p>
                        <button
                            onClick={() => handleDeclineInvite(eventIndex, invitation)}
                            disabled={isLoading}
                            className="bg-black/20 border border-accent/20 text-text-main font-bold py-2 px-6 rounded-lg hover:bg-black/40 transition-all duration-300 w-full sm:w-auto disabled:opacity-50"
                        >
                            {t('decline')}
                        </button>
                        <button
                            onClick={() => handleAcceptInvite(eventIndex, invitation)}
                             disabled={isLoading}
                            className="bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold py-2 px-6 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300 w-full sm:w-auto disabled:opacity-50"
                        >
                            {t('addToParty')}
                        </button>
                    </div>
                );
            case 'generating':
                return (
                    <div className="flex items-center justify-end gap-3 text-accent-light italic">
                        <LoadingSpinner />
                        {t('generatingCharacter')}
                    </div>
                );
            case 'accepted':
                return (
                    <p className="text-center font-bold text-green-400">
                        {t('characterJoined', { name: invitation.name })}
                    </p>
                );
            case 'declined':
                return (
                    <p className="text-center font-bold text-text-muted italic">
                        {t('inviteDeclinedMessage', { name: invitation.name })}
                    </p>
                );
            case 'error':
                 return (
                    <p className="text-center font-bold text-red-400">
                        {t('inviteErrorMessage')}
                    </p>
                 );
            default:
                return null;
        }
    };

    const RightPanelTabButton: React.FC<{
      label: string;
      isActive: boolean;
      onClick: () => void;
    }> = ({ label, isActive, onClick }) => (
      <button
        onClick={onClick}
        className={`px-4 py-2 font-bold transition-colors duration-200 rounded-t-md ${isActive ? 'bg-black/40 border-b-2 border-accent text-accent-light' : 'text-text-muted hover:text-accent-light/80 border-b-2 border-transparent'}`}
      >
        {label}
      </button>
    );

    return (
        <div className="bg-black/20 backdrop-blur-lg border border-accent/30 p-4 sm:p-6 rounded-xl shadow-2xl mx-auto animate-fade-in max-w-7xl w-full flex flex-col">
            {combatModalType && <CombatEventModal type={combatModalType} onClose={() => setCombatModalType(null)} />}
            {gameEvent && (
                <GameEventModal
                    type={gameEvent.type}
                    title={gameEvent.title}
                    subtitle={gameEvent.subtitle}
                    onClose={() => setGameEvent(null)}
                    onExit={onExitStory}
                />
            )}
            {transferTarget && (
                <TransferItemModal
                    item={transferTarget.item}
                    characters={characters}
                    sourceCharacterIndex={activeCharacterIndex}
                    onTransfer={handleTransferItem}
                    onClose={() => setTransferTarget(null)}
                />
            )}
            
            <div className="sm:hidden mb-4 flex-shrink-0">
                <div className="flex border-b-2 border-accent/20">
                    <button onClick={() => setActiveTab('story')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'story' ? 'text-accent-light border-b-2 border-accent' : 'text-text-muted'}`}>{t('adventure')}</button>
                    <button onClick={() => setActiveTab('info')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'info' ? 'text-accent-light border-b-2 border-accent' : 'text-text-muted'}`}>{t('characterAndDice')}</button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-6">
                <div className={`sm:col-span-2 lg:col-span-2 flex flex-col bg-black/20 rounded-lg p-4 ${activeTab === 'story' ? 'flex' : 'hidden sm:flex'}`}>
                    <div ref={storyContainerRef} className="flex-grow space-y-4 pr-2 overflow-y-auto">
                        {hasMoreLogs && (
                            <div className="text-center my-2">
                                <button
                                    onClick={handleShowMore}
                                    className="bg-black/30 hover:bg-black/50 text-accent-light text-sm font-bold py-2 px-4 rounded-full transition-colors"
                                >
                                    {t('showPreviousHistory')}
                                </button>
                            </div>
                        )}
                        {visibleStoryLog.map((entry, index) => (
                           <div key={index} className={`animate-fade-in ${getLogEntryStyle(entry.type)}`}>
                                <p className="whitespace-pre-wrap font-sans">{entry.text}</p>
                                {entry.invitation && (
                                    <div className="mt-4 pt-4 border-t border-dashed border-accent/20">
                                        {renderInvitation(entry.invitation, storyLog.length - visibleStoryLog.length + index)}
                                    </div>
                                )}
                           </div>
                        ))}
                         {isLoading && storyLog.length > 0 && (
                            <div className="flex items-center justify-center gap-3 py-4 text-accent-light italic">
                                <LoadingSpinner />
                                {t('dmIsThinking')}
                            </div>
                         )}
                         <div ref={storyEndRef} />
                    </div>

                    <div className="flex-shrink-0 mt-4 pt-4 border-t border-accent/20">
                        <form onSubmit={handleFormSubmit} className="flex gap-2">
                            <textarea
                                value={playerInput}
                                onChange={e => setPlayerInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handlePlayerAction(playerInput);
                                        setPlayerInput('');
                                    }
                                }}
                                placeholder={t('whatDoYouDo', { name: activeCharacter.name })}
                                disabled={isLoading}
                                className="flex-grow bg-black/30 border border-accent/20 text-text-main rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                                rows={3}
                            />
                            <button type="submit" disabled={isLoading} className="bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold px-4 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300 disabled:from-accent/50 disabled:to-accent-dark/50 disabled:cursor-not-allowed self-stretch">
                                {t('send')}
                            </button>
                        </form>
                    </div>
                </div>
                
                 <div className={`sm:col-span-1 lg:col-span-1 ${activeTab === 'info' ? 'block' : 'hidden sm:block'}`}>
                    <div className="sm:sticky sm:top-6 sm:self-start sm:max-h-[calc(100vh-8rem)] sm:overflow-y-auto pr-2">
                         <div className="flex border-b border-accent/20 mb-4">
                            <RightPanelTabButton 
                                label={t('ambiance')}
                                isActive={activeRightPanelTab === 'ambiance'}
                                onClick={() => setActiveRightPanelTab('ambiance')}
                            />
                            <RightPanelTabButton 
                                label={t('minimap')}
                                isActive={activeRightPanelTab === 'minimap'}
                                onClick={() => setActiveRightPanelTab('minimap')}
                            />
                        </div>
                        
                        <div className="mb-4">
                            {activeRightPanelTab === 'ambiance' && (
                                <AmbianceDisplay 
                                    imageUrl={ambianceImageUrl} 
                                    isLoading={isGeneratingAmbiance} 
                                />
                            )}
                            {activeRightPanelTab === 'minimap' && (
                                <Minimap 
                                    data={minimapData}
                                    longRangeDistance={longRangeDistance}
                                />
                            )}
                        </div>
                        
                        <CharacterInfoPanel
                            character={activeCharacter}
                            setCharacter={handleCharacterUpdate}
                            characters={characters}
                            activeCharacterIndex={activeCharacterIndex}
                            onCharacterChange={handleCharacterSwap}
                            mainCharacterIndex={mainCharacterIndex}
                            onUseItem={handleUseItem}
                            onTransferItem={setTransferTarget}
                        />
                    </div>
                </div>
            </div>
            
            <div className="flex-shrink-0 flex justify-end items-center gap-4 mt-6 pt-4 border-t border-accent/20">
                <button
                    onClick={onSaveGame}
                    className="bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold py-3 px-6 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300 shadow-lg"
                >
                    {t('saveGame')}
                </button>
                <button
                    onClick={() => setIsExitModalOpen(true)}
                    className="bg-black/30 border border-stone-600 text-text-main font-bold py-3 px-6 rounded-lg hover:bg-black/50 transition-all duration-300 shadow-lg"
                >
                    {t('exitAdventure')}
                </button>
            </div>

            {isExitModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-fade-in p-4">
                    <div className="bg-black/50 border border-accent/30 rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
                        <h2 className="text-2xl font-bold font-medieval text-text-heading mb-4">{t('exitToMainMenu')}</h2>
                        <p className="text-text-muted mb-6">{t('exitConfirmMessage')}</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                             <button
                                onClick={() => { onSaveGame(); onExitStory(); }}
                                className="w-full bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold py-3 px-4 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300"
                            >
                                {t('saveAndExit')}
                            </button>
                            <button
                                onClick={onExitStory}
                                className="w-full bg-black/30 border border-stone-600 text-text-main font-bold py-3 px-4 rounded-lg hover:bg-red-800/50 hover:border-red-600 transition-all"
                            >
                                {t('exitWithoutSaving')}
                            </button>
                        </div>
                        <button onClick={() => setIsExitModalOpen(false)} className="mt-6 text-sm text-text-muted hover:text-white">{t('cancel')}</button>
                    </div>
                </div>,
                document.body
            )}

            <FloatingDiceRoller
                character={activeCharacter}
                onRoll={handleRollResult}
                isVisible={true}
            />
        </div>
    );
};

export default StoryGame;