// scripts/jest-preprocess-import-meta.cjs
const { createTransformer } = require('babel-jest');

module.exports = {
  process(sourceText, sourcePath, options) {
    let processedText = sourceText;

    // Replace import.meta.env.VITE_XYZ with process.env.VITE_XYZ
    // Using a function for replacement to avoid issues with '$' in replaced string if any
    processedText = processedText.replace(/import\.meta\.env\.VITE_([A-Z0-9_]+)/g, (_match, varName) => `process.env.VITE_${varName}`);

    // Replace import.meta.env.DEV with process.env.DEV
    processedText = processedText.replace(/import\.meta\.env\.DEV/g, 'process.env.DEV');

    // Delegate to babel-jest for further transformation (JSX, TS syntax, etc.)
    // This uses the project's existing babel.config.cjs
    const babelTransformer = createTransformer({ configFile: './babel.config.cjs' });
    return babelTransformer.process(processedText, sourcePath, options);
  },
};
