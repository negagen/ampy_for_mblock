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
 * @type {(data: number[]) => void}
 * 
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
        finishHandler(null);

    } catch (er) {
        errHandler(er);
    }
}

uploadHandler(app, device, code, logHandler, progressHandle, finishHandler, errHandler)