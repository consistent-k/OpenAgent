import { registerLocale } from './engine';
import { en } from './locales/en';
import { zh } from './locales/zh';

// 注册内置语言
registerLocale('zh', '中文', zh);
registerLocale('en', 'English', en);

// 导出公共 API
export { t, getLocale, setLocale, registerLocale, getSupportedLocales } from './engine';
