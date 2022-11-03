module.exports = {
  resolve: {
    fallback: {
      stream: "stream-browserify",
    },
  },
  entry: "./index.js",
  output: {
    filename: "libraries.js",
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
