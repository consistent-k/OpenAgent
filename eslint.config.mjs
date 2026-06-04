import importPlugin from 'eslint-plugin-import-x';
import prettier from 'eslint-plugin-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['node_modules/', '**/dist/', 'build/']
    },
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
        plugins: {
            prettier,
            'unused-imports': unusedImports,
            'import-x': importPlugin
        },
        rules: {
            'prettier/prettier': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_'
                }
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/ban-ts-comment': 'off',
            'unused-imports/no-unused-imports': 'warn',
            'import-x/order': [
                'warn',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                    'newlines-between': 'never',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true
                    }
                }
            ]
        }
    }
);
