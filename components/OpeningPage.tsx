

import React, { useRef, useState } from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { Campaign } from '../types';

interface OpeningPageProps {
    onStart: (campaign: Campaign) => void;
    onLoad: (jsonString: string) => void;
    error: string | null;
    setLang: (lang: 'en' | 'id') => void;
}

const OpeningPage: React.FC<OpeningPageProps> = ({ onStart, onLoad, error, setLang }) => {
    const { t } = useLocalization();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<'lang' | 'main'>('lang');
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

    const handleLoadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const jsonString = event.target?.result;
                if (typeof jsonString === 'string') {
                    onLoad(jsonString);
                }
            };
            reader.readAsText(file);
            e.target.value = ''; // Reset for same-file uploads
        }
    };
    
    const handleLangSelect = (lang: 'en' | 'id') => {
        setLang(lang);
        setStep('main');
    };

    const CampaignCard: React.FC<{
        campaignId: Campaign;
        title: string;
        description: string;
        isSelected: boolean;
        onSelect: () => void;
    }> = ({ campaignId, title, description, isSelected, onSelect }) => (
        <button
            onClick={onSelect}
            className={`p-4 rounded-lg text-left transition-all duration-200 border-2 text-white ${isSelected ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400' : 'border-amber-500/30 bg-black/20 hover:border-amber-500/70'}`}
        >
            <h3 className="font-bold text-xl font-medieval text-amber-300">{title}</h3>
            <p className="text-sm text-amber-300/80 mt-1">{description}</p>
        </button>
    );

    const renderLangSelection = () => (
        <div className="text-center animate-fade-in bg-black/20 backdrop-blur-lg border border-amber-500/30 p-8 sm:p-12 rounded-xl shadow-2xl max-w-md w-full">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-wider font-medieval bg-gradient-to-b from-amber-300 to-amber-600 bg-clip-text text-transparent mb-6">
                Select Your Language
            </h1>
            <div className="flex flex-col gap-4">
                 <button 
                    onClick={() => handleLangSelect('en')}
                    className="w-full bg-gradient-to-br from-amber-400 to-amber-600 text-black font-bold py-3 px-6 rounded-lg hover:from-amber-500 hover:to-amber-700 transition-all duration-300 text-xl tracking-wider transform hover:scale-105"
                >
                    English
                </button>
                <button 
                    onClick={() => handleLangSelect('id')}
                    className="w-full bg-transparent border-2 border-amber-500 text-amber-300 font-bold py-3 px-6 rounded-lg hover:bg-amber-500 hover:text-black transition-all duration-300 text-xl tracking-wider"
                >
                    Bahasa Indonesia
                </button>
            </div>
        </div>
    );

    const renderMainMenu = () => (
        <div className="text-center animate-fade-in bg-black/20 backdrop-blur-lg border border-amber-500/30 p-8 sm:p-12 rounded-xl shadow-2xl max-w-4xl w-full">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-wider font-medieval bg-gradient-to-b from-amber-300 to-amber-600 bg-clip-text text-transparent mb-4">
                {t('welcomeMessage')}
            </h1>
            <p className="text-amber-300/80 mt-2 text-lg mb-6">
                {t('welcomeSubtitle')}
            </p>

            {error && (
                <div className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-6 text-center">
                    {error}
                </div>
            )}
            
            <h2 className="text-2xl font-bold font-medieval text-amber-300 mb-4">{t('chooseYourAdventure')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                 <CampaignCard 
                    campaignId="beginner-journey"
                    title={t('campaignBeginnerJourney')}
                    description={t('campaignBeginnerJourneyDesc')}
                    isSelected={selectedCampaign === 'beginner-journey'}
                    onSelect={() => setSelectedCampaign('beginner-journey')}
                />
                <CampaignCard 
                    campaignId="crossroads-of-destiny"
                    title={t('campaignCrossroadsOfDestiny')}
                    description={t('campaignCrossroadsOfDestinyDesc')}
                    isSelected={selectedCampaign === 'crossroads-of-destiny'}
                    onSelect={() => setSelectedCampaign('crossroads-of-destiny')}
                />
                <CampaignCard 
                    campaignId="lost-mine-of-phandelver"
                    title={t('campaignLostMine')}
                    description={t('campaignLostMineDesc')}
                    isSelected={selectedCampaign === 'lost-mine-of-phandelver'}
                    onSelect={() => setSelectedCampaign('lost-mine-of-phandelver')}
                />
                <CampaignCard 
                    campaignId="frozen-sick"
                    title={t('campaignFrozenSick')}
                    description={t('campaignFrozenSickDesc')}
                    isSelected={selectedCampaign === 'frozen-sick'}
                    onSelect={() => setSelectedCampaign('frozen-sick')}
                />
            </div>

            <div className="flex flex-col gap-4">
                <button 
                    onClick={() => selectedCampaign && onStart(selectedCampaign)}
                    disabled={!selectedCampaign}
                    className="w-full bg-gradient-to-br from-amber-400 to-amber-600 text-black font-bold py-4 px-6 rounded-lg hover:from-amber-500 hover:to-amber-700 transition-all duration-300 text-xl tracking-wider transform hover:scale-105 disabled:from-gray-500 disabled:to-gray-700 disabled:cursor-not-allowed"
                >
                    {t('newGame')}
                </button>
                 <button 
                    onClick={handleLoadClick}
                    className="w-full bg-transparent border-2 border-amber-500 text-amber-300 font-bold py-4 px-6 rounded-lg hover:bg-amber-500 hover:text-black transition-all duration-300 text-xl tracking-wider"
                >
                    {t('loadGame')}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" aria-hidden="true" />
            </div>
        </div>
    );

    return (
        <div 
            className="min-h-screen w-full flex flex-col items-center justify-center text-white p-4 font-sans -m-4 sm:-m-6 lg:-m-8"
        >
           {step === 'lang' ? renderLangSelection() : renderMainMenu()}
        </div>
    );
};

export default OpeningPage;