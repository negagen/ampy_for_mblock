const { Duplex } = require('stream') 
const { Buffer } = require('buffer')


class mBlockSerial extends Duplex {
    constructor(device, opts){
        super(opts)
        this.device = device
    }

    _write(chunk, encoding){
        this.device.writeRaw([...Buffer.from(chunk, encoding)])
    }

    _read(){
        // use onRead on mblock to push data
    }
}


module.exports = mBlockSerial