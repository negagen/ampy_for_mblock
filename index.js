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


module.exports = mBlockSerial