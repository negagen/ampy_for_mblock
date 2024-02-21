# ampy for mBlock

This is a transcoded version of ampy (<https://github.com/scientifichackers/ampy>) to javascript. It is intended to be used in mBlock (<http://www.mblock.cc/>).

## Installation

While mBlock is supposed to support third-party libraries in the extension builder, it is not yet possible to use this library in mBlock. Therefore, you have to use the following workaround:

1. Compile the library using `npm run build`
2. From the JSON file in the `dist` folder, copy the content of the `bundle` property.
3. Open the mBlock extension builder and create a new extension.
4. In the `Common code settings` tab, sub-tab `Common code`, write the following code:

    ```javascript
    function loadAmpy() {
        const code = `/* Paste the content of the bundle property here */`;
        const func = new Function("module", "exports", code);
        const module = { exports: {} };
        func.call(module, module, module.exports);
        return module.exports;
    }
    ```

5. Now you can use the `loadAmpy` function to load the ampy library.

    ```javascript
    const ExtHandler = {
        // ...
        onLoad(app, target) {
            // When the extension is loaded
            const ampy = loadAmpy();
            // Use ampy here
        }
        // ...
    }
    ```

## Usage

We added an adapter called `MBlockSerial` which receives a `DeviceContext` and returns a Serial-like object. This object can be used to communicate with the device.

Example of custom uploader on mBlock:

```javascript
async function uploadHandler(app, device, code, logHandler, progressHandle, finishHandler, errHandler) {
    // Load the ampy library
    const { MBlockSerial, PyBoard, Files } = loadAmpy();

    // We need to create a new instance of MBlockSerial, PyBoard and Files
    const serial = new MBlockSerial(device);
    const board = new PyBoard.Pyboard(serial);
    const files = new Files.Files(board);

    logHandler("uploading file main.py");

    // Upload the code to the device as main.py
    let progress = 0;
    await filesObj.put("main.py", code, (chunk_size) => {
        progress += chunk_size;
        progressHandle((progress / code.length) * 100);
    })

    logHandler("file uploaded");

    // Reset the board
    logHandler("resetting board");
    serial.write("\x04");
    logHandler(await pyboard.readUntil(1, "soft reboot\r\n"));
    
    // Clean up
    device.getReactor().setReceiver(()=>{})
    finishHandler(null);
}
```
