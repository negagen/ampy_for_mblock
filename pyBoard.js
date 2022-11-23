/*
pyboard interface
This module provides the Pyboard class, used to communicate with and
control the pyboard over a serial USB connection.
Example usage:
    const { Pyboard } = require('pyboard')
    pyb = new Pyboard('/dev/ttyACM0')

Then:
    await pyb.enter_raw_repl()
    await pyb.exec('pyb.LED(1).on()')
    pyb.exit_raw_repl()

To run a script from the local machine on the board and print out the results:
    const { execfile } = require('pyboard')
    execfile('test.py', device='/dev/ttyACM0')

This script can also be run directly.  To execute a local script, use:
    ./pyboard.js test.py
Or:
    node pyboard.js test.py
*/

const Denque = require("denque");
const { InterByteTimeoutParser } = require("@serialport/parser-inter-byte-timeout");

let _rawdelay = null;

class PyboardError extends Error {
    constructor(msg) {
        super(msg);
    }
}

class Pyboard {
    constructor(serial, rawdelay = 0) {

        _rawdelay = rawdelay;

        this.serial = serial
        this.parser = this.serial.pipe(
            new InterByteTimeoutParser({ interval: 100 })
        );

        this.parser.setEncoding("utf8")
        this.serial.fifo = new Denque();
    }

    close() {
        this.serial.close();
    }

    readUntil(min_num_bytes, ending, timeout=10000, data_consumer=null) {
        const that = this;

        const ontimeout = new Promise((resolve, reject)=>{
            setTimeout(()=>{
                let ret = that.serial.fifo.splice(0, that.serial.fifo.length)
                that.parser.off("data", wrapListener);
                resolve(ret?.join(""));
            },timeout)
        })

        const onfound = new Promise((resolve, reject) => {

            data_consumer && data_consumer(that.serial.fifo.toArray().join(""))
            
            that.serial.read(min_num_bytes)?.split("").forEach((ch) => {
                that.serial.fifo.push(ch);
            });

            let match = that.serial.fifo.toArray().join("").match(ending)

            if (match) {
                let ret = that.serial.fifo.splice(0, match.index + ending.length)
                return resolve(ret.join(""));
            }

            function wrapListener(data) {
                data.split("").forEach((ch) => {5
                    that.serial.fifo.push(ch);
                });

                data_consumer && data_consumer(that.serial.fifo.toArray().join(""))

                let match = that.serial.fifo.toArray().join("").match(ending)

                if (match) {
                    onTimeout && clearTimeout(onTimeout);
                    let ret = that.serial.fifo.splice(0, match.index + ending.length)
                    //console.log("This is the ending:", ending)
                    //console.log("Returning this:", ret.join(""))
                    that.parser.off("data", wrapListener);
                    return resolve(ret.join(""));
                }
            }

            this.parser.on("data", wrapListener);
        });

        return Promise.race([ontimeout, onfound])
    }

    async enter_raw_repl() {
        if (_rawdelay > 0) {
            let promise = new Promise((resolve) => {
                setTimeout(resolve, _rawdelay);
            });
            await promise;
        }

        this.serial.write("\r\x03");
        await new Promise((resolve) => setTimeout(resolve, 100));
        this.serial.write("\x03");
        await new Promise((resolve) => setTimeout(resolve, 100));

        //this.serial.flush();

        for (let retry = 0; retry < 5; retry++) {
            this.serial.write("\r\x01");
            let data = await this.readUntil(1, "raw REPL; CTRL-B to exit\r\n>");
            if (data?.match("raw REPL; CTRL-B to exit\r\n>")) {
                break;
            } else {
                if (retry >= 4) {
                    //console.log(data);
                    throw new PyboardError("could not enter raw repl");
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
            }
        }

        this.serial.write("\x04");
        let data = await this.readUntil(1, "soft reboot\r\n");
        if (!data?.match("soft reboot\r\n")) {
            //console.log(data);
            throw new PyboardError("could not enter raw repl");
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
        this.serial.write("\x03");
        await new Promise((resolve) => setTimeout(resolve, 100));
        this.serial.write("\x03");

        data = await this.readUntil(1, "raw REPL; CTRL-B to exit\r\n");
        
        if (!data?.match("raw REPL; CTRL-B to exit\r\n")) {
            //console.log(data);
            throw new PyboardError("could not enter raw repl");
        }

    }

    exit_raw_repl() {
        this.serial.write("\r\x02");
    }

    async follow(timeout, data_consumer=null){
        // wait for normal output
        let data = await this.readUntil(1, '\x04', timeout=timeout, data_consumer=data_consumer)
        
        if(!data.match('\x04'))
            throw new PyboardError('timeout waiting for first EOF reception')

        data = data.substring(0, data.length-1)

        // wait for error output
        let data_err = await this.readUntil(1, '\x04', timeout=timeout)
        if(!data_err.match('\x04')){
            throw new PyboardError('timeout waiting for second EOF reception')
        }

        data_err = data_err.substring(0, data_err.length-1)
        
        //console.log("Data:", data)
        //console.log("Err", data_err)
        
        // return normal and error output
        return [data, data_err]
    }

    async exec_raw_no_follow(command) {
        let data = await this.readUntil(1, ">");
        if (!data.match(">")) {
            throw new PyboardError("could not enter raw repl");
        }

        for (let i = 0; i < command.length; i = i + 256) {
            this.serial.write(
                command.substring(
                    i,
                    i + 256 < command.length ? i + 256 : command.length
                )
            );
            await new Promise((resolve) => setTimeout(resolve, 10));
        }

        this.serial.write("\x04");
        //this.serial.drain()

        data = await this.readUntil(2,"OK");

        if (!data?.match("OK")) {
            throw new PyboardError("could not exec command");
        }
    }

    async exec_raw(command, timeout = 10, data_consumer = null) {
        await this.exec_raw_no_follow(command);
        return await this.follow(timeout, data_consumer);
    }

    async eval(expression){
        return await this.exec_(`print(${expression})`)
    }


    async exec_(command, data_consumer){

        let [ret, ret_err] = await this.exec_raw(command, 10000, data_consumer)
        
        if(ret_err){
            let pyerr = new PyboardError("exception")
            pyerr.ret = ret
            pyerr.ret_err = ret_err
            throw pyerr
        }

        return ret
    }

    async execfile(pyfile, stream_output=false){
        return this.exec_(pyfile, stream_output)
    }

    async get_time(){
        let t = await this.eval('pyb.RTC().datetime()')
        t = t.substring(1,t.length-1).split(', ')
        return t[4] * 3600 + t[5] * 60 + t[6]
    }
}

module.exports = {
    Pyboard,
    PyboardError
}