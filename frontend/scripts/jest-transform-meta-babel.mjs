// scripts/jest-transform-meta-babel.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const babelJest = require('babel-jest').default;
const babelConfig = require('../babel.config.cjs');

const babelTransformer = babelJest.createTransformer({
  ...babelConfig({ env: () => 'test' }),
});

export default {
  process(src, filename, config, options) {
    // Replace all import.meta.env with process.env (robust, multiline, all cases)
    const replaced = src.replace(/import\.meta\.env/g, 'process.env');
    // Pass the result to babel-jest for transpilation
    return babelTransformer.process(replaced, filename, config, options);
  },
};
