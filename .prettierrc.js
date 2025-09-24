module.exports = {
  // 基本設置
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,

  // JSX 設置
  jsxSingleQuote: true,
  jsxBracketSameLine: false,

  // 其他設置
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'auto',

  // 覆蓋特定文件類型的設置
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 200,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
  ],
};
