
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

interface LocalizationContextType {
    lang: 'en' | 'id';
    translations: Record<string, string>;
    t: (key: string, options?: Record<string, string | number>) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: ReactNode; lang: 'en' | 'id' }> = ({ children, lang }) => {
    const [translations, setTranslations] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchTranslations = async () => {
            try {
                const response = await fetch(`/locales/${lang}.json`);
                if (!response.ok) {
                    throw new Error(`Could not load ${lang}.json`);
                }
                const data = await response.json();
                setTranslations(data);
            } catch (error) {
                console.error("Failed to fetch translations:", error);
                // Fallback to empty or default
                setTranslations({});
            }
        };

        fetchTranslations();
    }, [lang]);

    const t = useCallback((key: string, options?: Record<string, string | number>): string => {
        let translation = translations[key] || key;
        if (options) {
            Object.keys(options).forEach(optionKey => {
                translation = translation.replace(`{{${optionKey}}}`, String(options[optionKey]));
            });
        }
        return translation;
    }, [translations]);

    const value = useMemo(() => ({ lang, translations, t }), [lang, translations, t]);

    return (
        <LocalizationContext.Provider value={value}>
            {children}
        </LocalizationContext.Provider>
    );
};

export const useLocalization = (): LocalizationContextType => {
    const context = useContext(LocalizationContext);
    if (context === undefined) {
        throw new Error('useLocalization must be used within a LocalizationProvider');
    }
    return context;
};
