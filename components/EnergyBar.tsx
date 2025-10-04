
import React, { useState, useEffect } from 'react';
import { apiUsageTracker } from '../services/apiUsageTracker';
import { useLocalization } from '../contexts/LocalizationContext';

interface UsageState {
    used: number;
    remaining: number;
    limit: number;
    percentage: number;
}

const EnergyBar: React.FC = () => {
    const { t } = useLocalization();
    const [usage, setUsage] = useState<UsageState>(apiUsageTracker.getUsage());

    useEffect(() => {
        const handleUsageChange = () => {
            setUsage(apiUsageTracker.getUsage());
        };

        apiUsageTracker.subscribe(handleUsageChange);
        return () => {
            apiUsageTracker.unsubscribe(handleUsageChange);
        };
    }, []);

    const getBarColor = (percentage: number) => {
        const hue = (percentage / 100) * 120; // 0=red, 120=green
        return `hsl(${hue}, 80%, 45%)`;
    };

    return (
        <div 
            className="bg-black/30 backdrop-blur-md text-white font-bold py-2 px-3 rounded-lg border border-accent/50 flex items-center gap-3"
            title={t('energyTooltip')}
        >
            <span className="text-sm font-medieval text-accent-light">{t('energy')}</span>
            <div className="w-24 h-4 bg-black/50 rounded-full overflow-hidden border border-white/20">
                <div 
                    className="h-full transition-all duration-300 ease-out"
                    style={{ 
                        width: `${usage.percentage}%`,
                        backgroundColor: getBarColor(usage.percentage)
                    }}
                />
            </div>
            <span className="text-xs font-sans tabular-nums">{usage.remaining}/{usage.limit} <span className="text-text-muted">{t('rpm')}</span></span>
        </div>
    );
};

export default EnergyBar;
