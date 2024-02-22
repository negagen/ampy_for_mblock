// DeviceContext definition
/**
 * @typedef {Object} DeviceContext
 * @property {function} constructor - Constructs a new DeviceContext object.
 * @property {function} id - Returns the id of the target.
 * @property {function} isSelected - Checks if the target is selected.
 * @property {function} getEditingTarget - Returns the editing target.
 * @property {function} clearBuffer - Clears the buffer of the target.
 * @property {function} getBufferPool - Returns the buffer pool.
 * @property {function} deviceID - Returns the device id of the target.
 * @property {function} getReactor - Returns the reactor.
 * @property {function} isConnected - Checks if the device is connected.
 * @property {function} isUploadMode - Checks if the device is in upload mode.
 * @property {function} switchChannel - Switches the channel.
 * @property {function} writeRaw - Writes raw data.
 * @property {function} readRaw - Reads raw data.
 * @property {function} consumeBuffer - Consumes the buffer.
 * @property {function} setTextDecoder - Sets the text decoder.
 * @property {function} getTextDecoder - Returns the text decoder.
 * @property {function} writeText - Writes text.
 * @property {function} readText - Reads text.
 * @property {function} writeHex - Writes hex data.
 * @property {function} readHex - Reads hex data.
 * @property {function} clear - Clears the reactor.
 * @property {function} receiveHexPattern - Receives a hex pattern.
 * @property {function} subscribeHexPattern - Subscribes to a hex pattern.
 * @property {function} asyncReadProtocol - Reads a protocol asynchronously.
 * @property {function} registerProtocol - Registers a protocol.
 * @property {function} asyncWriteProtocol - Writes a protocol asynchronously.
 * @property {function} subscribeReadProtocol - Subscribes to read a protocol.
 * @property {function} subscribeOutput - Subscribes to the output.
 * @property {function} subscribeFallback - Subscribes to the fallback.
 * @property {function} uploadFirmware - Uploads firmware.
 * @property {function} uploadCode - Uploads code.
 * @property {function} recvData - Receives data.
 * @property {function} updateSpriteByName - Updates a sprite by name.
 * @property {function} getByGivenTarget - Gets by given target.
 * @property {function} getByScratchBlockUtil - Gets by Scratch block util.
 * @property {function} getByID - Gets by id.
 * @property {function} getByExtensionID - Gets by extension id.
 * @property {function} getByConnectedTarget - Gets by connected target.
 */

// Libraries
const { Buffer } = require('buffer')
const { SerialPort } = require('serialport')
const octabioCommons = require('./index.js')

// Mocking
const app = {}
const code = "print('Hello World')"
const logHandler = (data) => console.log(`Log: ${data}`)
const progressHandle = (percent) => console.log(`Progress: ${percent}%`)
const finishHandler = (data) => console.log("Finished")
const errHandler = (err) => console.error(err)
const loadLibraries = async () => octabioCommons

// Device use real serial port
const serial = new SerialPort({ path: 'COM5', baudRate: 115200 })

/** 
 * We adapt SerialPort to a DeviceContext-like object
 * @type {DeviceContext}
 */
const device = {
    writeRaw(data) {
        serial.write(Buffer.from(data))
    },
    getReactor() {
        return {
            setReceiver(handler) {
                serial.on('data', (data) => {
                    handler([...data])
                })
            }
        }
    }
}

/**
 * Custom Upload Driver
 *
 * @param {AppContext} app
 * @param {DeviceContext} device
 * @param {ArrayBuffer | string} code
 * @param {() => void} logHandler
 * @param {(percent: number) => void} progressHandle
 * @param {(err: any, result: any) => void} callback
 */
async function uploadHandler(app, device, code, logHandler, progressHandle, finishHandler, errHandler) {
    // TODO
    try {

        const octabioCommons = await loadLibraries()
        logHandler("Creating board interface...")
        const serial = new octabioCommons.MBlockSerial(device);
        const pyboard = new octabioCommons.PyBoard.Pyboard(serial);
        const filesObj = new octabioCommons.Files.Files(pyboard);

        logHandler("uploading file template.py");

        let progress = 0;
        await filesObj.put("template.py", code, (chunk_size) => {
            progress += chunk_size;
            progressHandle((progress / code.length) * 100);
        })

        logHandler("file uploaded");
        logHandler("resetting board");
        serial.write("\x04");
        logHandler(await pyboard.readUntil(1, "soft reboot\r\n"));


        device.getReactor().setReceiver(()=>{})
        finishHandler(null);
    } catch (er) {
        errHandler(er);
    }
}

uploadHandler(app, device, code, logHandler, progressHandle, finishHandler, errHandler)