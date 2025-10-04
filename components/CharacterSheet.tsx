import React from 'react';
import { FinalCharacter, Ability } from '../types';
import { getAbilityModifier, saveCharacterSheetAsPdf, saveCharacterAsJson } from '../utils.ts';
import { ABILITIES } from '../constants';
import { useLocalization } from '../contexts/LocalizationContext';


interface CharacterSheetProps {
  character: FinalCharacter | null;
  onEdit: () => void;
  onStartStory: () => void;
  isModalView?: boolean;
}

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={className}>
        <h3 className="text-2xl font-bold mb-3 font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">{title}</h3>
        <div className="text-text-muted space-y-2">{children}</div>
    </div>
);

const StatDisplay: React.FC<{ ability: Ability; score: number }> = ({ ability, score }) => {
    const modifier = getAbilityModifier(score);
    return (
        <div className="flex flex-col items-center justify-center bg-black/20 p-2 rounded-lg text-center">
            <div className="font-bold text-lg text-text-main uppercase tracking-wider">{ability.slice(0, 3)}</div>
            <div className="text-2xl text-text-heading font-sans font-bold">{score}</div>
            <div className="text-sm bg-black/30 px-2 py-0.5 rounded-full text-text-main">
                {modifier >= 0 ? `+${modifier}` : modifier}
            </div>
        </div>
    );
};

const CombatStatDisplay: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
    <div className="flex flex-col items-center justify-center bg-black/20 p-3 rounded-lg text-center">
        <div className="font-bold text-md text-text-main uppercase tracking-wide">{label}</div>
        <div className="text-3xl text-text-heading font-sans font-bold">{value}</div>
    </div>
);

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onEdit, onStartStory, isModalView = false }) => {
  const { t } = useLocalization();

  const handleSavePdf = () => {
    if (character) {
      saveCharacterSheetAsPdf(character);
    }
  };
  
  const handleSaveJson = () => {
    if (character) {
        saveCharacterAsJson(character);
    }
  };

  const renderContent = () => {
    if (!character) {
      return null;
    }
    
    const { generated: data } = character;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-8 gap-y-6 animate-fade-in">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
                <img src={character.image} alt={`${character.race} ${character.characterClass}`} className="w-full rounded-lg shadow-lg border-2 border-black/20 object-cover" />
                
                <div className="space-y-2">
                    <h2 className="text-4xl font-bold font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">{character.name || `${character.race} ${character.characterClass}`}</h2>
                    <p className="text-lg text-accent-light/90">{`${character.gender} ${character.race} ${character.characterClass}`}</p>
                    <p className="text-md text-accent-light/70">{`${character.alignment} | ${character.background}`}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <CombatStatDisplay label="HP" value={character.maxHp} />
                    <CombatStatDisplay label="AC" value={character.armorClass} />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                    {ABILITIES.map(ability => (
                        <StatDisplay key={ability} ability={ability} score={character.stats[ability]} />
                    ))}
                </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-3 space-y-6">
                 <Section title={t('description')}>
                    <p className="italic text-text-main">{data.characterDescription}</p>
                </Section>
                
                {character.backgroundStory && (
                    <Section title={t('backgroundStory')}>
                        <p className="whitespace-pre-wrap font-sans text-text-main text-sm">{character.backgroundStory}</p>
                    </Section>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    <Section title={t('mainWeapon')}>
                        <p className="text-lg text-text-heading font-semibold">{character.mainWeapon?.name || t('nothingEquipped')}</p>
                    </Section>
                    <Section title={t('armor')}>
                        <p className="text-lg text-text-heading font-semibold">{character.armor?.name || t('nothingEquipped')}</p>
                    </Section>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    <Section title={t('keySkills')}>
                        <div>
                            <h4 className="font-bold text-text-main">{t('proficiencies')}:</h4>
                             <ul className="list-disc list-inside space-y-1 text-sm">
                                 {character.selectedSkills.map((skill, index) => <li key={index}>{skill}</li>)}
                            </ul>
                        </div>
                         <div className="mt-2">
                            <h4 className="font-bold text-text-main">{t('otherTalents')}:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                 {data.skills.map((skill, index) => <li key={index}>{skill}</li>)}
                            </ul>
                        </div>
                    </Section>
                    
                     <Section title={t('specialMove')}>
                        <p className="text-lg text-text-heading font-semibold">{data.specialMove.name}</p>
                        <p className="text-sm text-text-main mt-1 whitespace-pre-wrap">{data.specialMove.description}</p>
                        <p className="text-xs text-text-muted mt-2">{character.fightingStyle} Style</p>
                    </Section>
                    
                    <Section title={t('inventory')}>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                           {character.inventory.map((item, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <span>{item.name}</span>
                                    {item.tag && <span className="text-xs bg-accent/20 text-accent-light px-2 py-0.5 rounded-full">{item.tag}</span>}
                                </li>
                            ))}
                        </ul>
                         {character.inventory.length === 0 && <p className="text-sm text-text-muted">{t('packIsEmpty')}</p>}
                    </Section>
                    <Section title={t('currency')}>
                        <p className="text-text-main font-bold">
                            {character.currency.gp} GP, {character.currency.sp} SP, {character.currency.cp} CP
                        </p>
                    </Section>
                </div>
            </div>
        </div>
    );
  };

  const renderButtons = () => {
    if (!character) return null;

    return (
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-between items-center">
             <div className="flex gap-4">
                <button
                onClick={onEdit}
                className="bg-black/20 border border-accent/20 text-text-main font-bold py-3 px-6 rounded-lg hover:bg-black/40 transition-all duration-300 flex items-center justify-center text-lg tracking-wider"
                >
                    {t('editCharacter')}
                </button>
            </div>
            <div className="flex-grow flex justify-center px-4">
                <button
                onClick={onStartStory}
                className="w-full max-w-xs bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold py-3 px-4 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300 flex items-center justify-center text-xl tracking-wider"
                >
                {t('startAdventure')} &rarr;
                </button>
            </div>
            <div className="flex-shrink-0 flex gap-4">
                <button
                onClick={handleSavePdf}
                className="bg-black/20 border border-accent/20 text-text-main font-bold py-3 px-6 rounded-lg hover:bg-black/40 transition-all duration-300 flex items-center justify-center text-lg tracking-wider"
                >
                    {t('saveAsPdf')}
                </button>
                 <button
                  onClick={handleSaveJson}
                  className="bg-black/20 border border-accent/30 text-accent-light font-bold py-3 px-6 rounded-lg hover:bg-black/40 transition-all duration-300 flex items-center justify-center text-lg tracking-wider"
                >
                    {t('saveFile')}
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-lg border border-accent/30 rounded-xl shadow-2xl h-full flex flex-col">
        <div className={`flex-grow overflow-y-auto ${isModalView ? 'p-6' : 'p-6 pr-4 -mr-4'}`}>
            {renderContent()}
        </div>
        {!isModalView && (
            <div className="p-6 pt-4 border-t border-accent/10">
                {renderButtons()}
            </div>
        )}
    </div>
  );
};

export default CharacterSheet;