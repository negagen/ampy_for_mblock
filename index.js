module.exports = {
    ...require('./files.js'),
    ...require('./mBlockSerial.js'),
    ...require('./pyBoard.js'),
    Denque: require('denque'),
    Stream: require('stream'),
    Buffer: require('buffer'),
    Dedent: require('dedent'),
}