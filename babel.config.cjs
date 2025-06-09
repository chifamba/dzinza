module.exports = function (api) {
  const isTest = api.env('test');

  // const isTest = api.env('test'); // Removed duplicate line

  const presets = [
    ['@babel/preset-env', {
      targets: isTest ? { node: 'current' } : { esmodules: true },
    }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    ['@babel/preset-typescript', { isTSX: true, allExtensions: true, allowNamespaces: true }],
  ];

  const plugins = [
    // No import.meta.env plugins here, handled by custom Jest transformer
  ];

  return {
    presets,
    plugins,
  };
};
