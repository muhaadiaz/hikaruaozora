import React from 'react';
import { Combatant } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';

interface MinimapProps {
    data: Combatant[] | null;
    longRangeDistance: number | null;
}

const GRID_ROWS = 5;
const GRID_COLS = 10;

const Minimap: React.FC<MinimapProps> = ({ data, longRangeDistance }) => {
    const { t } = useLocalization();

    const renderGrid = () => {
        if (!data) return null;

        const grid: (Combatant | null)[][] = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
        
        data.forEach(combatant => {
            const { x, y } = combatant.pos;
            if (y >= 0 && y < GRID_ROWS && x >= 0 && x < GRID_COLS) {
                grid[y][x] = combatant;
            }
        });

        return (
            <div className="flex flex-col items-center">
                <table className="border-collapse">
                    <tbody>
                        {grid.map((row, y) => (
                            <tr key={y}>
                                {row.map((cell, x) => {
                                    let cellClass = 'bg-black';
                                    let cellContent: React.ReactNode = '';
                                    if (cell) {
                                        if (cell.type === 'player' && cell.id) {
                                            cellContent = cell.id.charAt(0).toUpperCase();
                                        } else {
                                            cellContent = cell.id;
                                        }
                                        switch (cell.type) {
                                            case 'player':
                                                cellClass = 'bg-green-600';
                                                break;
                                            case 'enemy':
                                                cellClass = 'bg-red-700';
                                                break;
                                            case 'neutral':
                                                cellClass = 'bg-gray-500';
                                                break;
                                        }
                                    }
                                    return (
                                        <td 
                                            key={x} 
                                            className={`w-7 h-7 sm:w-8 sm:h-8 border border-gray-700 text-center align-middle font-bold text-white transition-colors duration-300 ${cellClass}`}
                                        >
                                            {cellContent}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="text-xs text-text-muted mt-2">{t('gridScale')}</p>
            </div>
        );
    };

    const renderLongRange = () => {
        if (!longRangeDistance) return null;
        return (
            <div className="aspect-video w-full bg-black/30 rounded-md flex items-center justify-center p-4 border border-accent/20">
                <div className="flex items-center justify-between w-full text-center">
                    <div className="p-3 bg-red-700 rounded-lg text-white font-bold">E</div>
                    <div className="flex-grow text-center text-text-muted px-2">
                        <span className="font-bold text-lg text-white">~</span>
                        <p className="text-sm font-semibold">{longRangeDistance}m</p>
                         <span className="font-bold text-lg text-white">~</span>
                    </div>
                    <div className="p-3 bg-green-600 rounded-lg text-white font-bold">P</div>
                </div>
            </div>
        );
    };

    const renderNoCombat = () => (
         <div className="aspect-video w-full bg-black/30 rounded-md flex items-center justify-center border border-accent/20">
            <p className="text-text-muted italic">{t('notInCombat')}</p>
        </div>
    );
    
    const inCombat = data !== null || longRangeDistance !== null;

    if (!inCombat) {
        return renderNoCombat();
    }
    
    return longRangeDistance ? renderLongRange() : renderGrid();
};

export default Minimap;