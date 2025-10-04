import React from 'react';
import { createPortal } from 'react-dom';
import { useLocalization } from '../contexts/LocalizationContext';

interface InviteModalProps {
    name: string;
    onAccept: () => void;
    onDecline: () => void;
    isGenerating: boolean;
}

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const InviteModal: React.FC<InviteModalProps> = ({ name, onAccept, onDecline, isGenerating }) => {
    const { t } = useLocalization();

    const modalContent = (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-fade-in p-4">
            <div className="bg-black/50 border border-accent/30 rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
                <h2 className="text-2xl font-bold font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent mb-4">
                    {t('inviteToPartyQuestion', { name })}
                </h2>
                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={onDecline}
                        disabled={isGenerating}
                        className="bg-black/20 border border-accent/20 text-text-main font-bold py-3 px-8 rounded-lg hover:bg-black/40 transition-all duration-300 disabled:opacity-50"
                    >
                        {t('decline')}
                    </button>
                    <button
                        onClick={onAccept}
                        disabled={isGenerating}
                        className="bg-gradient-to-br from-accent to-accent-dark text-text-on-accent font-bold py-3 px-8 rounded-lg hover:from-accent-dark hover:to-accent-dark transition-all duration-300 flex items-center justify-center disabled:opacity-75"
                    >
                        {isGenerating && <LoadingSpinner />}
                        {isGenerating ? t('generatingCharacter') : t('addToParty')}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default InviteModal;