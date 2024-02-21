const { Duplex } = require('stream') 
const { Buffer } = require('buffer')

class MBlockSerial extends Duplex {
    constructor(device, opts){
        super(opts)
        this._source = device
        this._rawDataHandler = this._rawDataHandler.bind(this)
        this._write = this._write.bind(this)
        this._read = this._read.bind(this)
        this._source.getReactor().setReceiver(this._rawDataHandler)
    }

    _rawDataHandler(data, text){
        this.push(Buffer.from(data))
    }

    _write(chunk, encoding, cb){
        this.device.writeRaw([...Buffer.from(chunk, encoding)])
        cb(null)
    }

    _read(){
        // use onRead on mblock to push data 
    }
}


module.exports = MBlockSerial