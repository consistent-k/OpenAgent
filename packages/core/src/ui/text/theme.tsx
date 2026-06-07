import React, { createContext, useContext, useMemo, useState } from 'react';
import { getConfigTheme, saveConfig } from '../../config';

export interface SyntaxColors {
    keyword: string;
    string: string;
    comment: string;
    function: string;
    number: string;
    type: string;
    operator: string;
    punctuation: string;
}

export interface Theme {
    accent: string;
    accentDim: string;
    suggestion: string;
    success: string;
    warning: string;
    error: string;
    inactive: string;
    subtle: string;
    text: string;
    textDim: string;
    border: string;
    surface: string;
    syntax: SyntaxColors;
}

const darkTheme: Theme = {
    accent: '#007ACC',
    accentDim: '#1B8AD4',
    suggestion: '#569CD6',
    success: '#89D185',
    warning: '#CCA700',
    error: '#F44747',
    inactive: '#808080',
    subtle: '#3F3F46',
    text: '#D4D4D4',
    textDim: '#808080',
    border: '#3F3F46',
    surface: '#252526',
    syntax: {
        keyword: '#569CD6',
        string: '#CE9178',
        comment: '#6A9955',
        function: '#DCDCAA',
        number: '#B5CEA8',
        type: '#4EC9B0',
        operator: '#D4D4D4',
        punctuation: '#D4D4D4'
    }
};

const lightTheme: Theme = {
    accent: '#d77757',
    accentDim: '#f59575',
    suggestion: '#5769f7',
    success: '#2c7a39',
    warning: '#966c1e',
    error: '#ab2b3f',
    inactive: '#666666',
    subtle: '#afafaf',
    text: '#000000',
    textDim: '#666666',
    border: '#999999',
    surface: '#f0f0f0',
    syntax: {
        keyword: '#A626A4',
        string: '#50A14F',
        comment: '#A0A1A7',
        function: '#4078F2',
        number: '#986801',
        type: '#C18401',
        operator: '#0184BC',
        punctuation: '#383A42'
    }
};

// 五月天 5525 五球配色（融合卜卜橙绿）
// 冠佑蓝 #26a7e1 / 石头绿 #13AF68 / 怪兽红 #E95412 / 玛莎黄 #FFE009 / 阿信粉 #e274a9 / 卜卜橙 #FF8C42
const maydayTheme: Theme = {
    accent: '#26a7e1',
    accentDim: '#FF8C42',
    suggestion: '#e274a9',
    success: '#13AF68',
    warning: '#FFE009',
    error: '#E95412',
    inactive: '#808080',
    subtle: '#4A4535',
    text: '#E8E0D0',
    textDim: '#B5A994',
    border: '#5A5545',
    surface: '#1E1C16',
    syntax: {
        keyword: '#e274a9',
        string: '#A5D6A7',
        comment: '#66BB6A',
        function: '#FFB74D',
        number: '#FFE009',
        type: '#13AF68',
        operator: '#E8E0D0',
        punctuation: '#E8E0D0'
    }
};

export type ThemeName = 'dark' | 'light' | 'mayday';

const themeOrder: ThemeName[] = ['dark', 'light', 'mayday'];

const themes: Record<ThemeName, Theme> = { dark: darkTheme, light: lightTheme, mayday: maydayTheme };

interface ThemeContextValue {
    themeName: ThemeName;
    theme: Theme;
    toggleTheme: () => void;
    setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    themeName: 'dark',
    theme: darkTheme,
    toggleTheme: () => {},
    setThemeName: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeName, setThemeNameState] = useState<ThemeName>(() => {
        try {
            const saved = getConfigTheme();
            if (saved in themes) return saved as ThemeName;
        } catch {
            // config 尚未就绪，使用默认主题
        }
        return 'mayday';
    });

    const setThemeName = (name: ThemeName) => {
        setThemeNameState(name);
        try {
            saveConfig({ theme: name });
        } catch {
            // 忽略保存失败
        }
    };

    const toggleTheme = () =>
        setThemeNameState((t) => {
            const idx = themeOrder.indexOf(t);
            return themeOrder[(idx + 1) % themeOrder.length]!;
        });
    const value = useMemo(() => ({ themeName, theme: themes[themeName], toggleTheme, setThemeName }), [themeName]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    return useContext(ThemeContext);
}

export type StringThemeKeys = { [K in keyof Theme]: Theme[K] extends string ? K : never }[keyof Theme];

export function resolveColor(color: StringThemeKeys | string | undefined, theme: Theme): string | undefined {
    if (!color) return undefined;
    if (color in theme) return theme[color as StringThemeKeys];
    return color;
}
