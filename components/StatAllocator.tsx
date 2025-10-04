
import React, { useMemo } from 'react';
import { CharacterOptions, Stats, Ability } from '../types';
import { ABILITIES, POINT_BUY_TOTAL_POINTS, POINT_BUY_COST } from '../constants';
import { useLocalization } from '../contexts/LocalizationContext';

interface StatAllocatorProps {
  stats: Stats;
  setOptions: React.Dispatch<React.SetStateAction<CharacterOptions>>;
}

const StatAllocator: React.FC<StatAllocatorProps> = ({ stats, setOptions }) => {
  const { t } = useLocalization();

  const pointsSpent = useMemo(() => {
    return ABILITIES.reduce((total, ability) => {
      const score = stats[ability];
      return total + (POINT_BUY_COST[score] || 0);
    }, 0);
  }, [stats]);

  const pointsRemaining = POINT_BUY_TOTAL_POINTS - pointsSpent;

  const handleStatChange = (ability: Ability, change: 1 | -1) => {
    setOptions(prev => {
      const currentScore = prev.stats[ability];
      const newScore = currentScore + change;

      if (newScore < 8 || newScore > 15) return prev;

      const newStats = { ...prev.stats, [ability]: newScore };

      const newPointsSpent = ABILITIES.reduce((total, ab) => {
          return total + (POINT_BUY_COST[newStats[ab]] || 0);
      }, 0);

      if (newPointsSpent > POINT_BUY_TOTAL_POINTS) return prev;

      return { ...prev, stats: newStats };
    });
  };

  return (
    <div className="space-y-3">
        <div className="text-center bg-black/20 p-3 rounded-lg mb-4">
            <h4 className="text-lg font-bold tracking-wide font-medieval bg-gradient-to-b from-accent-light to-accent-dark bg-clip-text text-transparent">{t('pointsRemaining')}</h4>
            <p className={`text-3xl font-bold font-sans ${pointsRemaining < 0 ? 'text-red-500' : 'text-white'}`}>
                {pointsRemaining}
            </p>
            <p className="text-xs text-text-muted/70">{t('totalPoints')}: {POINT_BUY_TOTAL_POINTS}</p>
        </div>
      {ABILITIES.map(ability => {
        const currentScore = stats[ability];
        const costToIncrease = (POINT_BUY_COST[currentScore + 1] - POINT_BUY_COST[currentScore]) || 99;
        
        return (
          <div key={ability} className="grid grid-cols-3 items-center">
            <label className="capitalize font-bold text-text-main tracking-wide text-lg">{t(ability)}</label>
            <div className="flex items-center justify-center gap-3">
                <button 
                    onClick={() => handleStatChange(ability, -1)}
                    disabled={currentScore <= 8}
                    className="px-3 py-1 bg-black/20 rounded-md hover:bg-black/40 disabled:bg-black/10 disabled:cursor-not-allowed disabled:text-stone-500 transition-colors"
                    aria-label={`${t('decrease')} ${t(ability)}`}
                >
                    -
                </button>
                <span className="text-2xl font-sans font-bold text-white w-8 text-center">{currentScore}</span>
                <button 
                    onClick={() => handleStatChange(ability, 1)}
                    disabled={currentScore >= 15 || pointsRemaining < costToIncrease}
                    className="px-3 py-1 bg-black/20 rounded-md hover:bg-black/40 disabled:bg-black/10 disabled:cursor-not-allowed disabled:text-stone-500 transition-colors"
                    aria-label={`${t('increase')} ${t(ability)}`}
                >
                    +
                </button>
            </div>
          </div>
        );
      })}
       <p className="text-xs text-text-muted/70 pt-4 text-center">{t('pointBuyDescription')}</p>
    </div>
  );
};

export default StatAllocator;
