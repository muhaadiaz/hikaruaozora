import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocalization } from '../contexts/LocalizationContext';

interface CombatEventModalProps {
    type: 'start' | 'end';
    onClose: () => void;
}

const CombatEventModal: React.FC<CombatEventModalProps> = ({ type, onClose }) => {
    const { t } = useLocalization();

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 2500); // Modal displayed for 2.5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const content = {
        start: {
            text: t('combatStarted'),
            style: 'text-red-500',
        },
        end: {
            text: t('combatEnded'),
            style: 'text-green-500',
        }
    };
    
    const { text, style } = content[type];

    const modalContent = (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] px-8 pointer-events-none">
            <div className="relative flex items-center justify-center">
                {/* Ping effect for start */}
                {type === 'start' && (
                     <div className="absolute inline-flex h-40 w-40 rounded-full bg-red-600 animate-ping opacity-75"></div>
                )}
                <div className="relative text-center animate-fade-in">
                    <h1 className={`text-6xl sm:text-8xl font-bold font-medieval tracking-wider ${style}`}>
                        {text}
                    </h1>
                </div>
            </div>
        </div>
    );
    
    return createPortal(modalContent, document.body);
};

export default CombatEventModal;