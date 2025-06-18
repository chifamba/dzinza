module.exports = function (api) {
  const isTest = api.env("test");

  const presets = [
    [
      "@babel/preset-env",
      {
        targets: isTest ? { node: "current" } : { esmodules: true },
      },
    ],
    ["@babel/preset-react", { runtime: "automatic" }],
    [
      "@babel/preset-typescript",
      { isTSX: true, allExtensions: true, allowNamespaces: true },
    ],
  ];

  const plugins = [
    [
      "babel-plugin-transform-import-meta",
      {
        env: {
          env: {
            VITE_JWT_STORAGE_KEY: "test-jwt-storage-key",
            VITE_REFRESH_TOKEN_KEY: "test-refresh-token-key",
            VITE_API_BASE_URL: "http://localhost:3001/api",
            VITE_APP_NAME: "Dzinza Test",
            VITE_DEFAULT_LANGUAGE: "en",
            VITE_SUPPORTED_LANGUAGES: "en,sn,nd",
            VITE_SENTRY_DSN: "",
            VITE_ENVIRONMENT: "test",
          },
        },
      },
    ],
  ];

  return {
    presets,
    plugins,
  };
};
