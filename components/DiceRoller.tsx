
import React, { useState } from 'react';
import { FinalCharacter, Ability } from '../types';
import { getAbilityModifier } from '../utils.ts';
import { ABILITIES } from '../constants';
import { useLocalization } from '../contexts/LocalizationContext';

interface DiceRollerProps {
  character: FinalCharacter;
  onRoll: (resultText: string) => void;
}

type AdvantageState = 'normal' | 'advantage' | 'disadvantage';

const DICE_TYPES = [4, 6, 8, 10, 12, 20];

export default function DiceRoller({ character, onRoll }: DiceRollerProps) {
    const { t } = useLocalization();
    const [lastRoll, setLastRoll] = useState<string | null>(null);
    const [selectedDie, setSelectedDie] = useState<number | null>(20);
    const [selectedAbilityModifier, setSelectedAbilityModifier] = useState<Ability | null>(null);
    const [advantageState, setAdvantageState] = useState<AdvantageState>('normal');
    const [bonus, setBonus] = useState(0);
    const [isRolling, setIsRolling] = useState(false);
    const [rollAnimationValue, setRollAnimationValue] = useState<number | null>(null);
    const [isResultActionable, setIsResultActionable] = useState(false);

    const handleRoll = () => {
        if (!selectedDie) return;
        setIsRolling(true);
        setLastRoll(null);
        setIsResultActionable(false);
    
        const animationInterval = setInterval(() => {
            setRollAnimationValue(Math.floor(Math.random() * selectedDie) + 1);
        }, 75);
    
        setTimeout(() => {
            clearInterval(animationInterval);
            setIsRolling(false);
            setRollAnimationValue(null);
    
            let totalBonus = bonus;
            let modifierText = '';
            let bonusText = '';
    
            if (selectedAbilityModifier) {
                const modifierValue = getAbilityModifier(character.stats[selectedAbilityModifier]);
                totalBonus += modifierValue;
                modifierText = ` ${modifierValue >= 0 ? '+' : '-'} ${Math.abs(modifierValue)} [${selectedAbilityModifier.slice(0, 3).toUpperCase()}]`;
            }
            
            if (bonus !== 0) {
                bonusText = ` ${bonus > 0 ? '+' : '-'} ${Math.abs(bonus)}`;
            }
    
            let baseResultText: string;
            let total: number;
    
            if (selectedDie === 20 && advantageState !== 'normal') {
                const roll1 = Math.floor(Math.random() * 20) + 1;
                const roll2 = Math.floor(Math.random() * 20) + 1;
                
                let d20Result: number;
                let discardedRoll: number;
    
                if (advantageState === 'advantage') {
                    d20Result = Math.max(roll1, roll2);
                    discardedRoll = Math.min(roll1, roll2);
                } else { // disadvantage
                    d20Result = Math.min(roll1, roll2);
                    discardedRoll = Math.max(roll1, roll2);
                }
                total = d20Result + totalBonus;
                baseResultText = `${d20Result} (Rolled ${roll1}, ~${discardedRoll}~)`;
            } else {
                const result = Math.floor(Math.random() * selectedDie) + 1;
                total = result + totalBonus;
                baseResultText = `${result}`;
            }
            
            const parts: string[] = [`d${selectedDie}: ${baseResultText}`];
            if (modifierText) parts.push(modifierText);
            if (bonusText) parts.push(bonusText);
            parts.push(` = ${total}`);
    
            let fullResultString = parts.join('');
            setLastRoll(fullResultString);
            setIsResultActionable(true);

        }, 1000);
    };

    const getModifierButtonClass = (ability: Ability) => {
        const baseClass = "transition-all duration-200 rounded-lg font-bold py-2 px-1 flex flex-col items-center justify-center w-full";
        if (selectedAbilityModifier === ability) {
            return `${baseClass} bg-accent text-text-on-accent ring-2 ring-offset-2 ring-offset-black ring-accent-light`;
        }
        return `${baseClass} bg-black/40 hover:bg-black/60 text-text-main`;
    };

    const getAdvantageButtonClass = (isActive: boolean) => {
        const disabledClass = "disabled:opacity-50 disabled:cursor-not-allowed";
        const baseClass = "transition-all duration-200 rounded-lg font-bold py-2 px-2 text-sm capitalize tracking-wider";
        if (isActive) {
            return `${baseClass} bg-accent text-text-on-accent ring-2 ring-offset-2 ring-offset-black ring-accent-light ${disabledClass}`;
        }
        return `${baseClass} bg-black/20 hover:bg-black/40 text-text-main ${disabledClass}`;
    }

    return (
        <div className="bg-black/20 p-4 rounded-lg grid grid-cols-1 gap-4 items-start animate-fade-in">
            <div className="space-y-4">
                <div>
                    <h4 className="font-bold mb-2 text-center text-text-main">1. {t('selectDie')}</h4>
                    <select
                        value={selectedDie || ''}
                        onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : null;
                            setSelectedDie(value);
                            if (value !== 20) setAdvantageState('normal');
                        }}
                        className="w-full bg-black/30 border border-accent/20 text-text-main rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent/50 text-center font-bold tracking-wider text-md"
                    >
                        <option value="">-- {t('select')} --</option>
                        {DICE_TYPES.map(sides => ( <option key={sides} value={sides}>d{sides}</option>))}
                    </select>
                </div>
                <div>
                    <h4 className="font-bold mb-2 text-center text-text-main">2. {t('addModifier')}</h4>
                        <div className="grid grid-cols-6 gap-2">
                        {ABILITIES.map(ability => (
                            <button key={ability} onClick={() => setSelectedAbilityModifier(prev => prev === ability ? null : ability)} className={getModifierButtonClass(ability)}>
                                <span className="font-bold text-base capitalize">{ability.slice(0,3)}</span>
                                <span className="font-sans text-xs">{getAbilityModifier(character.stats[ability]) >= 0 ? `+${getAbilityModifier(character.stats[ability])}` : getAbilityModifier(character.stats[ability])}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-bold mb-2 text-center text-text-main">3. {t('state')}</h4>
                        <div className="grid grid-cols-3 gap-1">
                            {([
                                { key: 'N', value: 'normal', label: t('normal') },
                                { key: 'A', value: 'advantage', label: t('advantage') },
                                { key: 'D', value: 'disadvantage', label: t('disadvantage') },
                            ] as const).map(({ key, value, label }) => 
                                <button 
                                    key={key} 
                                    title={label}
                                    onClick={() => setAdvantageState(value)} 
                                    className={getAdvantageButtonClass(advantageState === value)} 
                                    disabled={selectedDie !== 20}
                                >
                                    {key}
                                </button>
                            )}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold mb-2 text-center text-text-main">4. {t('bonus')}</h4>
                        <input type="number" value={bonus} onChange={e => setBonus(parseInt(e.target.value) || 0)} className="w-full bg-black/20 border border-accent/20 text-text-main rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent/50 text-center text-xl font-bold"/>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col gap-4 h-full">
                <button onClick={handleRoll} disabled={!selectedDie || isRolling} className="w-full bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold py-3 px-4 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300 disabled:from-accent/50 disabled:to-accent-dark/50 disabled:cursor-not-allowed flex items-center justify-center text-xl tracking-wider">
                    {isRolling ? t('rolling') : t('roll')}
                </button>
                <div className="text-center min-h-[4rem] flex flex-col justify-center bg-black/20 p-2 rounded-lg">
                    {isRolling ? ( <p className="text-4xl font-sans font-bold text-white animate-pulse">{rollAnimationValue}</p> ) 
                    : lastRoll ? (
                        <>
                            <p className="text-md font-sans font-bold text-white animate-fade-in whitespace-pre-wrap">{lastRoll}</p>
                            {isResultActionable && (
                                <button onClick={() => onRoll(lastRoll)} className="mt-2 bg-white hover:bg-gray-200 text-black text-xs font-bold py-1 px-3 rounded-lg transition-colors w-full max-w-xs mx-auto shadow-md">
                                    {t('useRollInAction')}
                                </button>
                            )}
                        </>
                    ) : ( <p className="text-md text-text-muted/70">{t('resultWillAppear')}</p> )}
                </div>
            </div>
        </div>
    );
};