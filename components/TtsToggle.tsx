import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface TtsToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

const TtsToggle: React.FC<TtsToggleProps> = ({ isEnabled, onToggle }) => {
  const { t } = useLocalization();
  const label = isEnabled ? t('disableTts') : t('enableTts');

  return (
    <button
      onClick={onToggle}
      className="bg-black/30 backdrop-blur-md text-white font-bold p-2 rounded-lg border border-accent/50 hover:bg-accent hover:text-text-on-accent transition-colors"
      aria-label={label}
      title={label}
    >
      <span className="material-symbols-outlined">
        {isEnabled ? 'volume_up' : 'volume_off'}
      </span>
    </button>
  );
};

export default TtsToggle;
