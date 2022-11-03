const { Duplex } = require('stream') 
const { Buffer } = require('buffer')

class mBlockSerial extends Duplex {
    constructor(device, opts){
        this.device = device
        this.indexHex = 0
        super(opts)
    }

    _write(chunk, encoding){
        this.device.writeRaw([...Buffer.from(chunk, encoding)])
    }
}

module.exports = {
    buffer: require('buffer'),
    stream: require('stream'),
    prune: require('json-prune'),
    mblockserial: mBlockSerial,
}