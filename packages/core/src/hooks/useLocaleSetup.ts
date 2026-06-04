import path from 'node:path';
import { setLocale } from '@oagent/i18n';
import { useEffect, useRef } from 'react';
import { getConfiguredLocalePlugins, getConfigLocale } from '../config';

/** 启动时加载语言扩展包并设置当前语言 */
export function useLocaleSetup(): void {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        (async () => {
            const localePlugins = getConfiguredLocalePlugins();
            await Promise.all(
                localePlugins.map(async (pkgName) => {
                    try {
                        let mod;
                        try {
                            mod = await import(pkgName);
                        } catch {
                            const localPath = path.resolve(process.cwd(), 'node_modules', pkgName, 'dist', 'index.js');
                            mod = await import(localPath);
                        }
                        if (typeof mod.register === 'function') {
                            mod.register(pkgName);
                        }
                    } catch {
                        // 语言扩展包加载失败不阻塞启动
                    }
                })
            );
            setLocale(getConfigLocale());
        })();
    }, []);
}
