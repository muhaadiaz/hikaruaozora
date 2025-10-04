import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import DiceRoller from './DiceRoller';
import { FinalCharacter } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';

interface FloatingDiceRollerProps {
  character: FinalCharacter;
  onRoll: (resultText: string) => void;
  isVisible: boolean;
}

const FloatingDiceRoller: React.FC<FloatingDiceRollerProps> = ({ character, onRoll, isVisible }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useLocalization();

  if (!isVisible) {
    return null;
  }
  
  const handleRollAndCollapse = (resultText: string) => {
    onRoll(resultText);
    setIsExpanded(false);
  };

  const content = (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col-reverse items-start gap-4">
        {/* Toggle Button */}
        <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-16 h-16 bg-gradient-to-br from-accent to-accent-dark text-text-on-accent rounded-full shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform"
            aria-label={isExpanded ? t('closeDiceRoller') : t('openDiceRoller')}
        >
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                {isExpanded ? 'close' : 'casino'}
            </span>
        </button>

        {/* Expanded View */}
        {isExpanded && (
            <div className="w-[300px] bg-black/40 backdrop-blur-lg border border-accent/30 rounded-xl shadow-2xl p-4 animate-fade-in">
                <DiceRoller character={character} onRoll={handleRollAndCollapse} />
            </div>
        )}
    </div>
  );
  
  return createPortal(content, document.body);
};

export default FloatingDiceRoller;
