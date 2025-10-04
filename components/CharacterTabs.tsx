import React from 'react';
import { FinalCharacter } from '../types';

interface CharacterTabsProps {
    characters: FinalCharacter[];
    activeIndex: number | null;
    onSelect: (index: number) => void;
    onAdd?: () => void;
    onDelete?: (index: number) => void;
    addLabel?: string;
    canAdd?: boolean;
    mainCharacterIndex?: number | null;
}

const getInitials = (name: string): string => {
    if (!name) return '?';
    const nameParts = name.trim().split(' ').filter(Boolean);
    if (nameParts.length > 1) {
      return (nameParts[0][0] + (nameParts[nameParts.length - 1][0] || '')).toUpperCase();
    }
    if (nameParts.length === 1 && nameParts[0].length > 0) {
        return nameParts[0].substring(0, 2).toUpperCase();
    }
    return '?';
};


const CharacterTabs: React.FC<CharacterTabsProps> = ({
    characters,
    activeIndex,
    onSelect,
    onAdd,
    onDelete,
    addLabel,
    canAdd,
    mainCharacterIndex,
}) => {
    return (
        <div className="flex items-center w-full">
            <div className="flex-grow flex items-center gap-1 overflow-x-auto">
                {characters.map((char, index) => (
                    <div key={char.name + index} className={`relative group border-t-2 border-x-2 rounded-t-lg transition-colors flex-shrink-0 ${activeIndex === index ? 'border-accent/30 bg-black/20' : 'border-transparent hover:bg-black/10'} ${char.status === 'downed' ? 'opacity-50' : ''}`}>
                         <button
                            onClick={() => onSelect(index)}
                            title={char.name || 'Unnamed'}
                            className={`px-4 py-3 font-bold flex items-center gap-2 ${activeIndex === index ? 'text-text-heading' : 'text-text-muted hover:text-accent-light'}`}
                        >
                            {char.status === 'downed' && <span title="Downed">💀</span>}
                            {mainCharacterIndex === index && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-accent-light" viewBox="0 0 20 20" fill="currentColor">
                                    <title>Main Character</title>
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            )}
                            {activeIndex === index ? (char.name || 'Unnamed') : getInitials(char.name || 'Unnamed')}
                        </button>
                        {onDelete && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(index); }}
                                className="absolute top-1 right-1 text-stone-400 hover:text-white transition-opacity duration-200 opacity-0 group-hover:opacity-100 rounded-full bg-black/20 hover:bg-black/50 w-5 h-5 flex items-center justify-center text-xs"
                                aria-label={`Delete ${char.name}`}
                            >
                                &times;
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {onAdd && addLabel && (
                <button
                    onClick={onAdd}
                    disabled={!canAdd}
                    className="ml-4 px-4 py-2 bg-gradient-to-br from-accent to-accent-dark text-text-on-accent rounded-lg font-bold hover:from-accent-dark hover:to-accent-dark disabled:from-accent/50 disabled:to-accent-dark/50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0"
                    aria-label="Add new character"
                >
                    {addLabel}
                </button>
            )}
        </div>
    );
};

export default CharacterTabs;