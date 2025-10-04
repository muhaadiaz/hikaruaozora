

import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';

interface AmbianceDisplayProps {
    imageUrl: string | null;
    isLoading: boolean;
}

const LoadingSpinner: React.FC = () => (
    <div className="flex flex-col items-center justify-center gap-3 text-accent-light italic">
        <svg className="animate-spin h-8 w-8 text-accent-light" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>{useLocalization().t('generatingScene')}</p>
    </div>
);


const AmbianceDisplay: React.FC<AmbianceDisplayProps> = ({ imageUrl, isLoading }) => {
    const { t } = useLocalization();

    return (
        <div className="aspect-video w-full bg-black/30 rounded-md flex items-center justify-center overflow-hidden border border-accent/20">
            {isLoading ? (
                <LoadingSpinner />
            ) : imageUrl ? (
                <img 
                    src={imageUrl} 
                    alt={t('ambiance')}
                    className="w-full h-full object-cover animate-fade-in"
                />
            ) : (
                <div className="text-center p-4 text-text-muted">
                    <p>{t('dmIsSettingTheScene')}</p>
                </div>
            )}
        </div>
    );
};

export default AmbianceDisplay;