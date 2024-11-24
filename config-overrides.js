module.exports = function override(config, env) {
  config.resolve.fallback = {
    process: require.resolve("process/browser"),
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer"),
    url: require.resolve("url"),
    assert: require.resolve("assert/"),
    os: require.resolve("os-browserify/browser"),
    util: require.resolve("util/"),
    vm: require.resolve("vm-browserify"),
    constants: require.resolve("constants-browserify"),
  };

  // Adicionar polyfills globalmente
  const webpack = require("webpack");
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    })
  );

  return config;
};
