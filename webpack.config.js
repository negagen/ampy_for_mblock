module.exports = {
  resolve: {
    fallback: {
      stream: "stream-browserify",
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
      name: "libraries",
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
};
