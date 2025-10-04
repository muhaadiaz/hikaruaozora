import React from 'react';
import { createPortal } from 'react-dom';
import { FinalCharacter, InventoryItem } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';

interface TransferItemModalProps {
    item: InventoryItem;
    characters: FinalCharacter[];
    sourceCharacterIndex: number;
    onTransfer: (destinationIndex: number) => void;
    onClose: () => void;
}

const TransferItemModal: React.FC<TransferItemModalProps> = ({ item, characters, sourceCharacterIndex, onTransfer, onClose }) => {
    const { t } = useLocalization();
    const destinationChars = characters.filter((_, index) => index !== sourceCharacterIndex);

    const modalContent = (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-fade-in p-4">
            <div className="bg-black/50 border border-accent/30 rounded-xl shadow-2xl w-full max-w-md p-6">
                <h2 className="text-2xl font-bold font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent text-center mb-4">
                    {t('transferItemTo', { itemName: item.name })}
                </h2>

                <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-2 mb-6">
                    {destinationChars.map((char) => {
                         const originalIndex = characters.findIndex(c => c === char);
                         return (
                            <button
                                key={originalIndex}
                                onClick={() => onTransfer(originalIndex)}
                                className="p-3 rounded-lg text-left transition-all duration-200 border-2 border-black/20 hover:border-accent/50 bg-black/20 flex items-center gap-4"
                            >
                                <img src={char.image} alt={char.name} className="w-12 h-12 object-cover rounded-full" />
                                <div>
                                    <h3 className="font-bold text-lg text-text-heading">{char.name}</h3>
                                    <p className="text-sm text-text-muted">{`${char.race} ${char.characterClass}`}</p>
                                </div>
                            </button>
                        )
                    })}
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={onClose}
                        className="bg-black/20 border border-accent/20 text-text-main font-bold py-2 px-6 rounded-lg hover:bg-black/40 transition-all duration-300"
                    >
                        {t('cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
    
    return createPortal(modalContent, document.body);
};

export default TransferItemModal;