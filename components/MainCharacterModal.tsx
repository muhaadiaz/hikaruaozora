import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FinalCharacter } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';

interface MainCharacterModalProps {
    characters: FinalCharacter[];
    onConfirm: (originalIndex: number) => void;
    onCancel: () => void;
}

const MainCharacterModal: React.FC<MainCharacterModalProps> = ({ characters, onConfirm, onCancel }) => {
    const { t } = useLocalization();
    const [selectedIndex, setSelectedIndex] = useState<number>(0);

    const handleConfirm = () => {
        onConfirm(selectedIndex);
    };

    const modalContent = (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-black/50 border border-accent/30 rounded-xl shadow-2xl w-full max-w-2xl p-6">
                <h2 className="text-3xl font-bold font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent text-center mb-2">
                    {t('selectMainCharacter')}
                </h2>
                <p className="text-center text-text-muted mb-6">{t('mainCharacterPrompt')}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-2 mb-6">
                    {characters.map((char, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedIndex(index)}
                            className={`p-3 rounded-lg text-left transition-all duration-200 border-2 ${selectedIndex === index ? 'border-accent bg-accent/20' : 'border-black/20 hover:border-accent/50 bg-black/20'}`}
                        >
                            <img src={char.image} alt={char.name} className="w-full h-48 object-cover rounded-md mb-3" />
                            <h3 className="font-bold text-lg text-text-heading">{char.name}</h3>
                            <p className="text-sm text-text-muted">{`${char.race} ${char.characterClass}`}</p>
                        </button>
                    ))}
                </div>

                <div className="flex justify-end gap-4">
                    <button
                        onClick={onCancel}
                        className="bg-black/20 border border-accent/20 text-text-main font-bold py-2 px-6 rounded-lg hover:bg-black/40 transition-all duration-300"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold py-2 px-6 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300"
                    >
                        {t('confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
    
    return createPortal(modalContent, document.body);
};

export default MainCharacterModal;