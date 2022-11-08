const webpack = require('webpack')

module.exports = {
  resolve: {
    fallback: {
      stream: require.resolve('stream-browserify'),
      process: require.resolve('process/browser'),  // <- this
      buffer: require.resolve('buffer/'),
    },
  },
  entry: {
    mBlockSerial:'./mBlockSerial.js',
    Denque:'denque',
    Buffer:'buffer',
    stream:'stream',
    jsonPrune:'json-prune',
    pyboard: './pyBoard.js',
    files: './files.js',
    flat: 'flat',
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
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    })
  ]
};
