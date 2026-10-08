import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // const { id, ...rest } = obj 처럼 일부를 빼고 나머지만 쓰는 패턴은 허용해요.
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
      // React 19 컴파일러용 엄격 규칙은 기존 에디터 코드와 맞지 않는 곳이 많아서 오류 대신 경고로 둬요.
      // (동작에는 문제가 없고, 코드를 고칠 때 하나씩 줄여 나가면 돼요.)
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
])
