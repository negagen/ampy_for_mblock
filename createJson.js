// create a json file with the content of the bundle.js file
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'dist/bundle.js');

fs.readFile(file, 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    const json = JSON.stringify({ bundle: data });
    fs.writeFile('dist/bundle.json', json, 'utf8', (err) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('File has been written');
    });
});