import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocalization } from '../contexts/LocalizationContext';

interface GameEventModalProps {
    type: 'downed' | 'revived' | 'gameOver' | 'victory';
    title: string;
    subtitle?: string;
    onClose: () => void;
    onExit?: () => void;
}

const MODAL_CONFIG = {
    downed: {
        style: 'text-red-500',
        bg: 'bg-zinc-900/50 border-red-500/50',
        autoClose: true,
    },
    revived: {
        style: 'text-yellow-400',
        bg: 'bg-zinc-900/50 border-yellow-400/50',
        autoClose: true,
    },
    gameOver: {
        style: 'text-red-700',
        bg: 'bg-zinc-900/50 border-red-700/50',
        autoClose: false,
    },
    victory: {
        style: 'text-green-400',
        bg: 'bg-zinc-900/50 border-green-400/50',
        autoClose: true,
    }
};

const GameEventModal: React.FC<GameEventModalProps> = ({ type, title, subtitle, onClose, onExit }) => {
    const { t } = useLocalization();
    const config = MODAL_CONFIG[type];

    useEffect(() => {
        if (config.autoClose) {
            const timer = setTimeout(() => {
                onClose();
            }, 4000); // Auto-close after 4 seconds
            return () => clearTimeout(timer);
        }
    }, [onClose, config.autoClose]);

    const modalContent = (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] px-8 pointer-events-auto">
            <div className={`relative text-center p-8 sm:p-12 rounded-2xl border-2 ${config.bg} transform scale-100 animate-fade-in w-full max-w-2xl`}>
                <h1 className={`text-5xl sm:text-7xl font-bold font-medieval tracking-wider ${config.style} drop-shadow-lg`}>
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-4 text-lg sm:text-xl text-text-muted">
                        {subtitle}
                    </p>
                )}
                {type === 'gameOver' && onExit && (
                     <button
                        onClick={onExit}
                        className="mt-8 bg-gradient-to-br from-red-600 to-red-800 text-white font-bold py-3 px-8 rounded-lg hover:from-red-700 hover:to-red-900 transition-all duration-300 text-lg shadow-lg"
                    >
                        {t('returnToMainMenu')}
                    </button>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default GameEventModal;