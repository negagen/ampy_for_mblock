const mBlockSerial = require('./mBlockSerial.js')
const { SerialPort } = require('serialport')
const { Pyboard } = require('./pyBoard.js')
const { Files } = require('./files.js')
const { InterByteTimeoutParser } = require('@serialport/parser-inter-byte-timeout')

const serial = new mBlockSerial({},{})

const parser = new InterByteTimeoutParser({interval:100})
parser.setEncoding('utf-8')

serial.pipe(parser)

//const serial2 = new SerialPort({ path:'COM7', baudRate: 115200 })
//const pyBoard = new Pyboard(serial2)
//let files = new Files(pyBoard)

serial.on('data', (data)=>{
    console.log("Serial", data)
})

parser.on('data', (data)=>{
    console.log("Parser", data)
})

setInterval(()=>serial.push("hola mundo",'utf8'),1000)