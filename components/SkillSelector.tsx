
import React from 'react';
import { SKILLS } from '../constants';
import { CharacterOptions } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';

interface SkillSelectorProps {
    selectedSkills: string[];
    setOptions: React.Dispatch<React.SetStateAction<CharacterOptions>>;
}

const MAX_SKILLS = 4;

const SkillSelector: React.FC<SkillSelectorProps> = ({ selectedSkills, setOptions }) => {
    const { t } = useLocalization();

    const handleSkillChange = (skill: string) => {
        setOptions(prev => {
            const newSkills = prev.selectedSkills.includes(skill)
                ? prev.selectedSkills.filter(s => s !== skill)
                : [...prev.selectedSkills, skill];

            if (newSkills.length > MAX_SKILLS) {
                // To prevent selecting more than max, just ignore the addition.
                return prev;
            }

            return { ...prev, selectedSkills: newSkills };
        });
    };

    return (
        <div>
            <label className="block text-sm font-bold text-text-muted mb-2 tracking-wide">{t('skillProficiencies', { count: MAX_SKILLS })}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SKILLS.map(skill => {
                    const isChecked = selectedSkills.includes(skill);
                    const isDisabled = !isChecked && selectedSkills.length >= MAX_SKILLS;
                    return (
                        <label key={skill} className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${isChecked ? 'bg-accent/30 text-white' : 'bg-black/20 hover:bg-black/40'}`}>
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleSkillChange(skill)}
                                disabled={isDisabled}
                                className="form-checkbox h-4 w-4 text-accent bg-black/30 border-accent/20 rounded focus:ring-accent accent-accent"
                            />
                            <span className="text-sm text-text-main">{skill}</span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

export default SkillSelector;
