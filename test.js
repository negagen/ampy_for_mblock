// Libraries
const { Buffer } = require('buffer')
const { SerialPort } = require('serialport')
const octabioCommons = require('./dist/bundle.js')

// Mocking
const app = {}
const code = "print('Hello World')"
const logHandler = (data) => console.log(`Log: ${data}`)
const progressHandle = (percent) => console.log(`Progress: ${percent}%`)
const finishHandler = (data) => console.log("Finished")
const errHandler = (err) => console.error(err)
const loadLibraries = async () => octabioCommons

// Device use real serial port
const serial = new SerialPort({ path: 'COM7', baudRate: 115200 })

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
        const serial = new octabioCommons.mBlockSerial();
        serial.indexText = 0;

        serial._write = function (chunk, encoding, cb) {
            try {
                device.writeRaw([...octabioCommons.Buffer.Buffer.from(chunk, encoding)]);
                cb(null);
            } catch (er) {
                cb(er);
            }
        };

        const pyboard = new octabioCommons.PyBoard.Pyboard(serial);

        const rawDataHandler = (data, text) => {
            serial.push(octabioCommons.Buffer.Buffer.from(data))
        }

        device.getReactor().setReceiver(rawDataHandler)


        const pushToFifo = (data) => {
            logHandler(data)
            data.split("").forEach((ch) => {
                pyboard.serial.fifo.push(ch);
            });
        };

        pyboard.parser.on("data", pushToFifo);

        pyboard.readUntil = function (
            min_num_bytes,
            ending,
            timeout = 10000,
            data_consumer = null
        ) {
            const that = pyboard;

            const ontimeout = new Promise((resolve, reject) => {
                setTimeout(() => {
                    try {
                        let ret = that.serial.fifo.splice(0, that.serial.fifo.length);
                        if (typeof ret !== "undefined" && ret && ret.join)
                            resolve(ret.join(""));
                    } catch (err) {
                        reject(err);
                    }
                }, timeout);
            });

            const onfound = new Promise((resolve, reject) => {
                try {
                    data_consumer && data_consumer(that.serial.fifo.toArray().join(""));

                    let match = that.serial.fifo.toArray().join("").match(ending);

                    if (match) {
                        let ret = that.serial.fifo.splice(0, match.index + ending.length);
                        return resolve(ret.join(""));
                    }

                    function wrapListener(data) {
                        try {
                            data_consumer &&
                                data_consumer(that.serial.fifo.toArray().join(""));

                            let match = that.serial.fifo.toArray().join("").match(ending);

                            if (match) {
                                ontimeout && clearTimeout(ontimeout);
                                let ret = that.serial.fifo.splice(
                                    0,
                                    match.index + ending.length
                                );

                                that.parser.off("data", wrapListener);
                                resolve(ret.join(""));
                            }
                        } catch (er) {
                            reject(er);
                        }
                    }

                    that.parser.on("data", wrapListener);
                } catch (er) {
                    reject(er);
                }
            });

            return Promise.race([ontimeout, onfound]);
        }

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
        pyboard.parser.off("data", pushToFifo);
        device.getReactor().setReceiver(() => { })
        finishHandler(null);

    } catch (er) {
        errHandler(er);
    }
}

uploadHandler(app, device, code, logHandler, progressHandle, finishHandler, errHandler)