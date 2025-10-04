
import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface LanguageSwitcherProps {
    setLang: (lang: 'en' | 'id') => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ setLang }) => {
    const { lang, t } = useLocalization();

    const toggleLang = () => {
        setLang(lang === 'en' ? 'id' : 'en');
    };

    return (
        <button
            onClick={toggleLang}
            className="bg-black/30 backdrop-blur-md text-white font-bold py-2 px-4 rounded-lg border border-accent/50 hover:bg-accent hover:text-text-on-accent transition-colors"
            aria-label="Switch Language"
        >
            {t('switchLanguage')}
        </button>
    );
};

export default LanguageSwitcher;
