import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FinalCharacter, Currency, InventoryItem } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import CharacterTabs from './CharacterTabs';
import CharacterSheet from './CharacterSheet';

interface CharacterInfoPanelProps {
  character: FinalCharacter;
  setCharacter: (updates: Partial<FinalCharacter>) => void;
  characters: FinalCharacter[];
  activeCharacterIndex: number;
  onCharacterChange: (index: number) => void;
  mainCharacterIndex: number;
  onUseItem: (item: InventoryItem, index: number) => void;
  onTransferItem: (transferTarget: {item: InventoryItem, slot: 'inventory' | 'mainWeapon' | 'armor', itemIndex?: number}) => void;
}

const EquipModal: React.FC<{
    item: InventoryItem;
    onEquip: (slot: 'weapon' | 'armor') => void;
    onClose: () => void;
    t: (key: string, options?: any) => string;
}> = ({ item, onEquip, onClose, t }) => {
    const modalContent = (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-fade-in p-4">
            <div className="bg-black/50 border border-accent/30 rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                <h3 className="text-xl font-bold mb-4 text-text-heading">{t('equipAs', { itemName: item.name })}</h3>
                <div className="flex gap-4">
                    <button onClick={() => onEquip('weapon')} className="w-full bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold py-3 px-4 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300">
                        {t('equipAsWeapon')}
                    </button>
                    <button onClick={() => onEquip('armor')} className="w-full bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold py-3 px-4 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300">
                        {t('equipAsArmor')}
                    </button>
                </div>
                <button onClick={onClose} className="mt-4 text-sm text-text-muted hover:text-white">{t('cancel')}</button>
            </div>
        </div>
    );
    return createPortal(modalContent, document.body);
};

const DetailsModal: React.FC<{
    character: FinalCharacter;
    onClose: () => void;
    t: (key: string) => string;
}> = ({ character, onClose, t }) => {
    const modalContent = (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] animate-fade-in p-4">
            <div className="relative bg-transparent w-full max-w-6xl h-[90vh] flex flex-col">
                 <CharacterSheet character={character} onEdit={()=>{}} onStartStory={()=>{}} isModalView={true} />
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors text-2xl z-10"
                    aria-label={t('close')}
                >
                    &times;
                </button>
            </div>
        </div>
    );
    return createPortal(modalContent, document.body);
};

const HpBar: React.FC<{ current: number; max: number; }> = ({ current, max }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    const p = Math.max(0, Math.min(100, percentage));
    const hue = (p / 100) * 120; // 0=red, 120=green
    const barColor = `hsl(${hue}, 90%, 45%)`;

    return (
        <div className="w-full bg-black/50 rounded-full h-3.5 border border-white/10 overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-300 ease-in-out"
                style={{
                    width: `${p}%`,
                    backgroundColor: barColor,
                }}
            />
        </div>
    );
};


const CharacterInfoPanel: React.FC<CharacterInfoPanelProps> = ({
    character, setCharacter,
    characters, activeCharacterIndex, onCharacterChange, mainCharacterIndex, onUseItem, onTransferItem
}) => {
    const { t } = useLocalization();
    const [newItem, setNewItem] = useState('');
    const [equipModal, setEquipModal] = useState<{ item: InventoryItem, index: number } | null>(null);
    const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
    const [isSkillExpanded, setIsSkillExpanded] = useState(false);

    const handleCharacterUpdate = (updates: Partial<FinalCharacter>) => {
        setCharacter(updates);
    };

    const handleCurrencyChange = (coin: keyof Currency, value: string) => {
        const numValue = parseInt(value) || 0;
        handleCharacterUpdate({ currency: { ...character.currency, [coin]: numValue } });
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            const newItemObject: InventoryItem = { name: newItem.trim() };
            handleCharacterUpdate({ inventory: [...character.inventory, newItemObject] });
            setNewItem('');
        }
    };

    const handleRemoveItem = (indexToRemove: number) => {
        handleCharacterUpdate({
            inventory: character.inventory.filter((_, index) => index !== indexToRemove)
        });
    };

    const handleEquip = (slot: 'weapon' | 'armor') => {
        if (!equipModal) return;
        const { item, index } = equipModal;

        const newInventory = [...character.inventory];
        newInventory.splice(index, 1); // Remove from inventory

        // Unequip current item in slot, if any
        const currentEquipped = slot === 'weapon' ? character.mainWeapon : character.armor;
        if (currentEquipped) {
            newInventory.push(currentEquipped);
        }

        const updates: Partial<FinalCharacter> = { inventory: newInventory };
        if (slot === 'weapon') {
            updates.mainWeapon = item;
        } else {
            updates.armor = item;
        }

        handleCharacterUpdate(updates);
        setEquipModal(null);
    };

    const handleUnequip = (slot: 'weapon' | 'armor') => {
        const itemToUnequip = slot === 'weapon' ? character.mainWeapon : character.armor;
        if (!itemToUnequip) return;
        
        const updates: Partial<FinalCharacter> = {
            inventory: [...character.inventory, itemToUnequip]
        };
        if (slot === 'weapon') {
            updates.mainWeapon = null;
        } else {
            updates.armor = null;
        }
        handleCharacterUpdate(updates);
    };

    const EquippedItem: React.FC<{ item: InventoryItem | null; slot: 'weapon' | 'armor' }> = ({ item, slot }) => (
        <div className="bg-black/30 p-2 rounded-lg">
            <h4 className="text-sm font-bold mb-1 text-text-muted">{slot === 'weapon' ? t('mainWeapon') : t('armor')}</h4>
            {item ? (
                <div className="flex justify-between items-center bg-black/20 p-2 rounded group">
                    <span className="text-text-main text-sm font-semibold">{item.name}</span>
                    <div className="flex items-center gap-2">
                        {characters.length > 1 &&
                            <button onClick={() => onTransferItem({ item, slot: slot === 'weapon' ? 'mainWeapon' : slot })} className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors opacity-0 group-hover:opacity-100">{t('transfer')}</button>
                        }
                        <button onClick={() => handleUnequip(slot)} className="text-accent-light/80 hover:text-accent-dark text-xs font-bold transition-colors opacity-0 group-hover:opacity-100">
                            {t('unequip')}
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-sm text-text-muted/70 text-center py-2 italic">{t('nothingEquipped')}</p>
            )}
        </div>
    );

    return (
        <div className="animate-fade-in flex flex-col gap-4 relative">
            {character.status === 'downed' && (
                <div className="absolute inset-0 bg-red-900/70 rounded-lg flex items-center justify-center z-10 animate-fade-in">
                    <span className="text-white font-bold text-3xl font-medieval tracking-wider transform -rotate-12 select-none">{t('downed')}</span>
                </div>
            )}
            <CharacterTabs
                characters={characters}
                activeIndex={activeCharacterIndex}
                onSelect={onCharacterChange}
                mainCharacterIndex={mainCharacterIndex}
            />

            {isSheetModalOpen && <DetailsModal character={character} onClose={() => setIsSheetModalOpen(false)} t={t} />}
            {equipModal && <EquipModal item={equipModal.item} onClose={() => setEquipModal(null)} onEquip={handleEquip} t={t} />}

            <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
                <div>
                    <h2 className="text-2xl font-bold font-medieval text-text-heading">{character.name}</h2>
                    <p className="text-sm text-text-muted">{`${character.race} ${character.characterClass}`}</p>
                </div>
                <button 
                    onClick={() => setIsSheetModalOpen(true)}
                    className="bg-accent/20 text-accent-light font-bold py-2 px-3 rounded-lg hover:bg-accent/40 transition-colors flex items-center gap-2"
                    title={t('showDetails')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                   <span className="hidden xl:inline">{t('showDetails')}</span>
                </button>
            </div>


            {/* Vitals */}
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-black/20 p-3 rounded-lg">
                     <label className="font-bold text-text-muted/90 block text-left mb-1">{t('hp')}</label>
                     <div className="flex items-center gap-2">
                        <input type="number" value={character.currentHp} onChange={e => handleCharacterUpdate({ currentHp: parseInt(e.target.value) || 0 })} className="w-16 bg-transparent text-white text-2xl text-center font-bold focus:outline-none" />
                        <span className="text-text-muted/70 font-bold">/</span>
                        <input type="number" value={character.maxHp} onChange={e => handleCharacterUpdate({ maxHp: parseInt(e.target.value) || 0 })} className="w-16 bg-transparent text-text-muted text-2xl text-center font-bold focus:outline-none" />
                     </div>
                    <HpBar current={character.currentHp} max={character.maxHp} />
                </div>
                    <div className="bg-black/20 p-3 rounded-lg flex flex-col justify-center">
                    <label className="font-bold text-text-muted/90 block">{t('armorClass')}</label>
                    <input type="number" value={character.armorClass} onChange={e => handleCharacterUpdate({ armorClass: parseInt(e.target.value) || 0 })} className="w-24 mx-auto bg-transparent text-white text-4xl text-center font-bold focus:outline-none" />
                </div>
            </div>

            {/* Equipment */}
            <div className="grid grid-cols-2 gap-2">
                <EquippedItem item={character.mainWeapon} slot="weapon" />
                <EquippedItem item={character.armor} slot="armor" />
            </div>

            {/* Special Move */}
            <div className="bg-black/20 p-3 rounded-lg">
                <h3 className="text-xl font-bold mb-2 font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">{t('specialMove')}</h3>
                <div
                    className="cursor-pointer"
                    onClick={() => setIsSkillExpanded(prev => !prev)}
                    role="button"
                    aria-expanded={isSkillExpanded}
                >
                    <div className="flex justify-between items-center">
                        <h4 className="font-bold text-text-main">{character.generated.specialMove.name}</h4>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-text-muted transition-transform duration-200 ${isSkillExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                    {isSkillExpanded && (
                        <p className="text-sm text-text-muted mt-2 whitespace-pre-wrap animate-fade-in">{character.generated.specialMove.description}</p>
                    )}
                </div>
            </div>
            
            {/* Inventory */}
            <div className="bg-black/20 p-3 rounded-lg">
                <h3 className="text-xl font-bold mb-2 font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">{t('inventory')}</h3>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-2">
                    {character.inventory.map((item, index) => (
                        <div key={index} className="flex justify-between items-center bg-black/20 p-2 rounded group">
                            <span className="text-text-main text-sm">{item.name}</span>
                            <div className="flex items-center gap-2">
                                {item.tag && <span className="text-xs bg-accent/20 text-accent-light px-1.5 py-0.5 rounded-full">{item.tag}</span>}
                                {item.tag?.toLowerCase().includes('consumable') && (
                                    <button onClick={() => onUseItem(item, index)} className="text-xs font-bold text-green-400 hover:text-green-300 transition-colors opacity-0 group-hover:opacity-100">{t('useItem')}</button>
                                )}
                                {characters.length > 1 &&
                                    <button onClick={() => onTransferItem({item, slot: 'inventory', itemIndex: index})} className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors opacity-0 group-hover:opacity-100">{t('transfer')}</button>
                                }
                                <button onClick={() => setEquipModal({ item, index })} className="text-xs font-bold text-accent-light/80 hover:text-accent-dark transition-colors opacity-0 group-hover:opacity-100">{t('equip')}</button>
                                <button onClick={() => handleRemoveItem(index)} className="text-accent-light hover:text-accent-dark text-xl flex-shrink-0">&times;</button>
                            </div>
                        </div>
                    ))}
                    {character.inventory.length === 0 && <p className="text-sm text-text-muted text-center py-2">{t('packIsEmpty')}</p>}
                </div>
                <form onSubmit={handleAddItem} className="flex gap-2 mt-3">
                    <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder={t('addNewItem')} className="flex-grow bg-black/20 border border-accent/20 text-text-main rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent/50" />
                    <button type="submit" className="bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold px-4 rounded-lg hover:from-accent-dark hover:to-accent-dark">+</button>
                </form>
            </div>

            {/* Wallet & Notes */}
            <div className="flex flex-col gap-4">
                 <div className="bg-black/20 p-3 rounded-lg">
                    <h3 className="text-xl font-bold mb-2 font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">{t('wallet')}</h3>
                    <div className="flex justify-around">
                        {Object.keys(character.currency).map(coin => (
                            <div key={coin} className="text-center">
                                <label className="font-bold text-text-muted/90 uppercase text-xs">{coin}</label>
                                <input type="number" value={character.currency[coin as keyof Currency]} onChange={e => handleCurrencyChange(coin as keyof Currency, e.target.value)} className="w-16 bg-transparent text-white text-lg text-center font-bold focus:outline-none" />
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="bg-black/20 p-3 rounded-lg">
                    <h3 className="text-xl font-bold mb-2 font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">{t('notes')}</h3>
                    <textarea value={character.notes} onChange={e => handleCharacterUpdate({ notes: e.target.value })} placeholder={t('trackQuests')} className="w-full h-20 bg-black/20 border border-accent/20 text-text-main rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"></textarea>
                </div>
            </div>
        </div>
    );
};

export default CharacterInfoPanel;