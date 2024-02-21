const webpack = require('webpack')

module.exports = {
  resolve: {
    fallback: {
      stream: require.resolve('stream-browserify'),
      process: require.resolve('process/browser'),  // <- this
      buffer: require.resolve('buffer/'),
    },
  },
  mode: "production",
  entry: "./index.js",
  output: {
    filename: "bundle.js",
    library: {
      name: "octabioCommons",
      type: "umd"
    },
    globalObject: "this",
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser"
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    })
  ]
};
