const { PyboardError } = require('./pyboard.js')
const { Buffer } = require('buffer')
const dedent = require('dedent')

const BUFFER_SIZE = 32

class DirectoryExistsError extends Error {
    constructor(msg) {
        super(msg)
    }
}

class Files {
    constructor(pyboard) {
        this._pyboard = pyboard
    }

    async get(filename) {
        const command = `
            import sys
            import ubinascii
            with open('${filename}', 'rb') as infile:
                while True:
                    result = infile.read(${BUFFER_SIZE})
                    if result == b'':
                        break
                    len = sys.stdout.write(ubinascii.hexlify(result))
        `

        await this._pyboard.enter_raw_repl()

        let out

        try {
            out = await this._pyboard.exec_(dedent(command))
        }

        catch (ex) {
            if (ex instanceof PyboardError) {
                const message = ex.ret_err
                if (message.match('OSError') && message.match('2')) {
                    throw new Error(`No such file:  ${filename}`)
                }
                
            } else {
                throw ex
            }
        }

        this._pyboard.exit_raw_repl()
        return Buffer.from(out, "hex").toString('ascii')
    }

    async ls(directory = "/", long_format = true, recursive = false) {
        if (!directory.startsWith("/")) {
            directory = "/" + directory
        }

        let command = dedent`
            try:        
                import os
            except ImportError:
                import uos as os
        ` + "\n"

        if (recursive) {
            command += dedent`
                def listdir(directory):
                    result = set()
                    def _listdir(dir_or_file):
                        try:
                            # if its a directory, then it should provide some children.
                            children = os.listdir(dir_or_file)
                        except OSError:                        
                            # probably a file. run stat() to confirm.
                            os.stat(dir_or_file)
                            result.add(dir_or_file) 
                        else:
                            # probably a directory, add to result if empty.
                            if children:
                                # queue the children to be dealt with in next iteration.
                                for child in children:
                                    # create the full path.
                                    if dir_or_file == '/':
                                        next = dir_or_file + child
                                    else:
                                        next = dir_or_file + '/' + child
                                    
                                    _listdir(next)
                            else:
                                result.add(dir_or_file)                     
                    _listdir(directory)
                    return sorted(result)` + "\n"

        }

        else {
            command += dedent`
                def listdir(directory):
                    if directory == '/':                
                        return sorted([directory + f for f in os.listdir(directory)])
                    else:
                        return sorted([directory + '/' + f for f in os.listdir(directory)])` + "\n"

        }

        if (long_format) {
            command += dedent`
                r = []
                for f in listdir('${directory}'):
                    size = os.stat(f)[6]                    
                    r.append('{0} - {1} bytes'.format(f, size))
                print(r)
            ` + "\n"

        }

        else {
            command += dedent`
                print(listdir('${directory}'))
            ` + "\n"

        }

        await this._pyboard.enter_raw_repl()

        let out

        try {
            out = await this._pyboard.exec_(command)
        }

        catch (ex) {
            if (ex instanceof PyboardError) {
                const message = ex.ret_err
                if (message.match('OSError') && message.match('2')) {
                    throw new Error(`No such directory:  ${directory}`)
                }
               
            } else {
                throw ex
            }
        }


        await this._pyboard.exit_raw_repl()

        if (out)
            return JSON.parse(out.replaceAll(`'`, `"`))
    }

    async mkdir(directory, exists_okay = false) {
        const command = dedent`
            try:
                import os
            except ImportError:
                import uos as os
            os.mkdir('${directory}')
        `

        await this._pyboard.enter_raw_repl()

        let out

        try {
            out = await this._pyboard.exec_(command)
        }

        catch (ex) {
            if (ex instanceof PyboardError) {
                const message = ex.ret_err
                if (message && message.match('OSError') && message.match('17')) {
                    if (!exists_okay)
                        throw new DirectoryExistsError(`Directory already exists: ${directory}`)
                }
            } else {
                throw ex
            }
        }

        this._pyboard.exit_raw_repl()
    }

    async put(filename, data, progress_cb) {
        await this._pyboard.enter_raw_repl()
        await this._pyboard.exec_(`f = open('${filename}','wb')`)

        const size = data.length
        for (let i = 0; i < size; i = i + BUFFER_SIZE) {
            const chunk_size = (BUFFER_SIZE < size - 1) ? BUFFER_SIZE : size - 1
            const chunk = 'b' + JSON.stringify(data.substring(i, i + chunk_size))

            await this._pyboard.exec_(`f.write(${chunk})`)

            if (progress_cb) {
                progress_cb(chunk_size)
            }
        }

        await this._pyboard.exec_("f.close()")
        this._pyboard.exit_raw_repl()
    }

    async rm(filename) {
        const command = dedent`
            try:
                import os
            except ImportError:
                import uos as os
            os.remove('${filename}')
        `

        await this._pyboard.enter_raw_repl()

        let out

        try {
            out = await this._pyboard.exec_(command)
        }

        catch (ex) {
            if (ex instanceof PyboardError) {
                const message = ex.ret_err
                if (message && message.match('OSError') && message.match('2')) {
                    if (!exists_okay)
                        throw new Error(`No such file/directory: ${directory}`)
                }
                else if (message && message.match('OSError') && message.match('13')) {
                    if (!exists_okay)
                        throw new Error(`Directory is not empty: ${directory}`)
                }
                
            } else {
                throw ex
            }
        }

        this._pyboard.exit_raw_repl()
    }

    async rmdir(directory, missing_okay) {
        const command = dedent`
        try:
            import os
        except ImportError:
            import uos as os
        def rmdir(directory):
            os.chdir(directory)
            for f in os.listdir():
                try:
                    os.remove(f)
                except OSError:
                    pass
            for f in os.listdir():
                rmdir(f)
            os.chdir('..')
            os.rmdir(directory)
        rmdir('${directory}')
    `

        await this._pyboard.enter_raw_repl()

        let out

        try {
            out = await this._pyboard.exec_(command)
        }

        catch (ex) {
            if (ex instanceof PyboardError) {
                const message = ex.ret_err
                if (message && message.match('OSError') && message.match('2')) {
                    if (!exists_okay)
                        throw new Error(`No such directory: ${directory}`)
                }
            }
            else {
                throw ex
            }
        }

        this._pyboard.exit_raw_repl()
    }

    async run(pyfile, wait_output = true, stream_output = true) {
        await this._pyboard.enter_raw_repl()
        let out
        
        if(stream_output){
            await this._pyboard.execfile(pyfile, stream_output)
        }

        else if(wait_output){
            // Run the file and wait for output to return.
            out = await this._pyboard.execfile(pyfile)
        }
        
        else{
            // Read the file and run it using lower level pyboard functions that
            // won't wait for it to finish or return output.
            await this._pyboard.exec_raw_no_follow(pyfile)
        }

        this._pyboard.exit_raw_repl()
        return out
    }
}

module.exports = {
    Files,
    DirectoryExistsError
}