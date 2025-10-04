

import React, { useState, useRef, useEffect } from 'react';
import { CharacterOptions } from '../types';
import { RACES, CLASSES, BACKGROUNDS, SKIN_COLORS, GENDERS, HAIR_TYPES, TERRAINS, ENEMIES, FIGHTING_STYLES, ALIGNMENTS, HAIR_COLORS, CLOTH_THEMES, ACCESSORIES } from '../constants';
import StatAllocator from './StatAllocator';
import SkillSelector from './SkillSelector';
import { useLocalization } from '../contexts/LocalizationContext';

interface CharacterCustomizerProps {
  options: CharacterOptions;
  setOptions: React.Dispatch<React.SetStateAction<CharacterOptions>>;
  isLoading: boolean;
  isRandomizing: boolean;
  isGeneratingStory: boolean;
  isGeneratingMove: boolean;
  onGenerate: () => void;
  onRandomGenerate: () => void;
  onGenerateStory: () => void;
  onGenerateMove: () => void;
  onUpload: (file: File) => void;
  onBack: () => void | null;
  isEditing: boolean;
}

const CustomDropdown: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}> = ({ label, value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-bold text-text-muted mb-1 tracking-wide">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-black/20 border border-accent/20 text-text-main rounded-lg p-2.5 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-accent/50"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{value}</span>
        <svg className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && (
        <ul className="absolute z-10 w-full mt-1 bg-black/80 backdrop-blur-md border border-accent/20 rounded-lg shadow-lg max-h-60 overflow-y-auto" role="listbox">
          {options.map((option) => (
            <li
              key={option}
              onClick={() => handleSelect(option)}
              className={`p-2.5 cursor-pointer hover:bg-accent/20 ${value === option ? 'bg-accent/30 font-bold' : ''}`}
              role="option"
              aria-selected={value === option}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


const CustomInput: React.FC<{ label: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string; type?: string; }> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-sm font-bold text-text-muted mb-1 tracking-wide">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-black/20 border border-accent/20 text-text-main rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-accent/50"
    />
  </div>
);

const CustomSlider: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; minLabel: string; maxLabel: string }> = ({ label, value, onChange, minLabel, maxLabel }) => (
    <div>
        <label className="block text-sm font-bold text-text-muted mb-1 tracking-wide">{label}</label>
        <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-accent"
        />
        <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>{minLabel}</span>
            <span>{maxLabel}</span>
        </div>
    </div>
);

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CharacterCustomizer: React.FC<CharacterCustomizerProps> = ({ options, setOptions, isLoading, isRandomizing, isGeneratingStory, isGeneratingMove, onGenerate, onRandomGenerate, onGenerateStory, onGenerateMove, onUpload, onBack, isEditing }) => {
  const { t } = useLocalization();
  
  const handleChange = <K extends keyof CharacterOptions>(key: K, value: CharacterOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      e.target.value = '';
    }
  };


  return (
    <div className="bg-black/20 backdrop-blur-lg border border-accent/30 p-6 rounded-xl shadow-2xl">
      <div className="flex justify-between items-center border-b-2 border-accent/20 pb-4 mb-6">
        <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">
                {isEditing ? t('editCharacter') : t('createCharacter')}
            </h2>
            {!isEditing && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={onRandomGenerate}
                        disabled={isLoading || isRandomizing}
                        className="flex items-center gap-2 bg-black/20 hover:bg-black/40 text-text-main font-bold py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                        aria-label={t('ariaRandomize')}
                    >
                        {isRandomizing ? <LoadingSpinner /> : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 5h10v10H5V5zm2 2a1 1 0 100-2h.01a1 1 0 100-2H7zm6 0a1 1 0 100 2h.01a1 1 0 100-2H13zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H7zm6 0a1 1 0 100 2h.01a1 1 0 100-2H13z" />
                            </svg>
                        )}
                        <span className="hidden sm:inline">{isRandomizing ? t('randomizing') : t('randomize')}</span>
                    </button>
                    <button
                        onClick={handleUploadClick}
                        disabled={isLoading || isRandomizing}
                        className="flex items-center gap-2 bg-black/20 hover:bg-black/40 text-text-main font-bold py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                        aria-label={t('uploadCharacter')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="hidden sm:inline">{t('uploadCharacter')}</span>
                    </button>
                </div>
            )}
        </div>
        {onBack && (
            <button onClick={onBack} className="text-xl bg-black/20 hover:bg-black/40 text-text-main font-bold py-1 px-3 rounded-lg transition-colors" aria-label={t('backToDashboard')}>
                &lt;
            </button>
        )}
      </div>
      <div className="space-y-6">
        <CustomInput label={t('name')} value={options.name} onChange={e => handleChange('name', e.target.value)} placeholder={t('namePlaceholder')} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CustomDropdown label={t('race')} value={options.race} onChange={val => handleChange('race', val)} options={RACES} />
          <CustomDropdown label={t('class')} value={options.characterClass} onChange={val => handleChange('characterClass', val)} options={CLASSES} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomDropdown label={t('background')} value={options.background} onChange={val => handleChange('background', val)} options={BACKGROUNDS} />
            <CustomDropdown label={t('gender')} value={options.gender} onChange={val => handleChange('gender', val)} options={GENDERS} />
        </div>
        
        <CustomInput label={t('age')} type="number" value={options.age} onChange={e => handleChange('age', parseInt(e.target.value) || 0)} placeholder={t('agePlaceholder')} />

        <CustomDropdown label={t('alignment')} value={options.alignment} onChange={val => handleChange('alignment', val)} options={ALIGNMENTS} />
        
        <div className="border-t border-accent/20 pt-6 space-y-6">
            <h3 className="text-xl font-bold font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">{t('abilityScores')}</h3>
            <StatAllocator stats={options.stats} setOptions={setOptions} />
        </div>

        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-text-muted tracking-wide">{t('backgroundStory')}</label>
                <button 
                    onClick={onGenerateStory}
                    disabled={isGeneratingStory}
                    className="text-xs bg-accent/20 text-accent-light px-2 py-1 rounded hover:bg-accent/40 transition-colors disabled:opacity-50 flex items-center"
                >
                    {isGeneratingStory && <LoadingSpinner />}
                    {isGeneratingStory ? t('generating') : t('autoGenerate')}
                </button>
            </div>
            <textarea
                value={options.backgroundStory}
                onChange={e => handleChange('backgroundStory', e.target.value)}
                placeholder={t('backgroundStoryPlaceholder')}
                className="w-full bg-black/20 border border-accent/20 text-text-main rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-accent/50 h-28 resize-y"
            />
        </div>
        
        <div className="border-t border-accent/20 pt-6 space-y-6">
             <h3 className="text-xl font-bold font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">{t('appearanceAndPreferences')}</h3>
             <CustomDropdown label={t('hairType')} value={options.hairType} onChange={val => handleChange('hairType', val)} options={HAIR_TYPES} />
             {options.hairType === 'Other' && (
                <CustomInput 
                    label={t('customHairType')} 
                    value={options.customHairType} 
                    onChange={e => handleChange('customHairType', e.target.value)} 
                    placeholder={t('customHairTypePlaceholder')} 
                />
             )}
             
             <div>
                 <label className="block text-sm font-bold text-text-muted mb-2 tracking-wide">{t('hairColor')}</label>
                 <div className="grid grid-cols-9 gap-2">
                    {HAIR_COLORS.map(color => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => handleChange('hairColor', color)}
                            className={`w-full pt-[100%] rounded-full transition-transform duration-200 ${options.hairColor === color ? 'ring-2 ring-offset-2 ring-offset-black ring-white transform scale-110' : ''}`}
                            style={{ backgroundColor: color }}
                            aria-label={`${t('ariaSelectHairColor')} ${color}`}
                        />
                    ))}
                 </div>
            </div>

             <CustomSlider label={t('height')} value={options.height} onChange={e => handleChange('height', parseInt(e.target.value))} minLabel={t('short')} maxLabel={t('tall')} />
             <CustomSlider label={t('build')} value={options.build} onChange={e => handleChange('build', parseInt(e.target.value))} minLabel={t('slender')} maxLabel={t('bulky')} />
             <CustomSlider label={t('muscularity')} value={options.muscularity} onChange={e => handleChange('muscularity', parseInt(e.target.value))} minLabel={t('lean')} maxLabel={t('ripped')} />
            
            <div>
                 <label className="block text-sm font-bold text-text-muted mb-2 tracking-wide">{t('skinColor')}</label>
                 <div className="grid grid-cols-9 gap-2">
                    {SKIN_COLORS.map(color => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => handleChange('skinColor', color)}
                            className={`w-full pt-[100%] rounded-full transition-transform duration-200 ${options.skinColor === color ? 'ring-2 ring-offset-2 ring-offset-black ring-white transform scale-110' : ''}`}
                            style={{ backgroundColor: color }}
                            aria-label={`${t('ariaSelectSkinColor')} ${color}`}
                        />
                    ))}
                 </div>
            </div>
            
             <CustomDropdown label={t('accessories')} value={options.accessories} onChange={val => handleChange('accessories', val)} options={ACCESSORIES} />
             {options.accessories === 'Other' && (
                <CustomInput 
                    label={t('customAccessory')} 
                    value={options.customAccessory} 
                    onChange={e => handleChange('customAccessory', e.target.value)} 
                    placeholder={t('customAccessoryPlaceholder')} 
                />
             )}

            <div>
                 <label className="block text-sm font-bold text-text-muted mb-2 tracking-wide">{t('clothTheme')}</label>
                 <div className="grid grid-cols-6 gap-2">
                    {CLOTH_THEMES.map(theme => (
                        <button
                            key={theme.name}
                            type="button"
                            onClick={() => handleChange('clothColor', theme.name)}
                            className={`w-full pt-[100%] rounded-full transition-transform duration-200 ${options.clothColor === theme.name ? 'ring-2 ring-offset-2 ring-offset-black ring-white transform scale-110' : ''}`}
                            style={{ backgroundColor: theme.color }}
                            aria-label={`${t('ariaSelectTheme')} ${theme.name}`}
                        />
                    ))}
                 </div>
            </div>

            <CustomDropdown label={t('fightingStyle')} value={options.fightingStyle} onChange={val => handleChange('fightingStyle', val)} options={FIGHTING_STYLES} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomDropdown label={t('favoriteTerrain')} value={options.favoriteTerrain} onChange={val => handleChange('favoriteTerrain', val)} options={TERRAINS} />
                <CustomDropdown label={t('favoriteEnemy')} value={options.favoriteEnemy} onChange={val => handleChange('favoriteEnemy', val)} options={ENEMIES} />
            </div>
        </div>

        <div className="border-t border-accent/20 pt-6 space-y-6">
            <h3 className="text-xl font-bold font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">{t('proficienciesAndMoves')}</h3>
            <SkillSelector selectedSkills={options.selectedSkills} setOptions={setOptions} />
            <div>
              <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-text-muted tracking-wide">{t('customSpecialMove')}</label>
                  <button 
                      onClick={onGenerateMove}
                      disabled={isGeneratingMove || isGeneratingStory || isLoading}
                      className="text-xs bg-accent/20 text-accent-light px-2 py-1 rounded hover:bg-accent/40 transition-colors disabled:opacity-50 flex items-center"
                  >
                      {isGeneratingMove && <LoadingSpinner />}
                      {isGeneratingMove ? t('suggesting') : t('suggestMove')}
                  </button>
              </div>
              <input
                type="text"
                value={options.customSpecialMove}
                onChange={e => handleChange('customSpecialMove', e.target.value)}
                placeholder={t('specialMovePlaceholder')}
                className="w-full bg-black/20 border border-accent/20 text-text-main rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
        </div>

        <div className="flex flex-col space-y-3 pt-4">
            <button
              onClick={onGenerate}
              disabled={isLoading || isRandomizing}
              className="w-full bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold py-3 px-4 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300 disabled:from-accent/50 disabled:to-accent-dark/50 disabled:cursor-not-allowed flex items-center justify-center text-lg tracking-wider"
            >
              {isLoading ? ( <><div className="mr-3"><LoadingSpinner /></div> {t('generating')}...</> ) : ( isEditing ? t('updateCharacter') : t('generateCharacter') )}
            </button>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

export default CharacterCustomizer;