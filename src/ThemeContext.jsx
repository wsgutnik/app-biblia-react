/* eslint react-refresh/only-export-components: off */
import React, { createContext, useState, useEffect, useContext } from 'react';
import { STORAGE_KEYS, DEFAULTS, getFromStorage, setInStorage } from './config/constants';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        return getFromStorage(STORAGE_KEYS.THEME, DEFAULTS.THEME);
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        setInStorage(STORAGE_KEYS.THEME, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
