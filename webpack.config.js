const webpack = require('webpack')

module.exports = {
  resolve: {
    fallback: {
      stream: require.resolve('stream-browserify'),
      process: require.resolve('process/browser'),  // <- this
    },
  },
  entry: {
    mBlockSerial:'./index.js',
    Denque:'denque',
    Buffer:'buffer',
    stream:'stream',
    jsonPrune:'json-prune'
  },
  output: {
    filename: "[name].js",
    library: {
      type: "umd",
      name: "[name]",
    },
    globalObject: "this",
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: "babel-loader",
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser"
    }),
  ]
};
