const fs = require('fs');
function getJsonFiles(jsonPath) {
    const jsonFiles = [];
    function findJsonFile(path) {
        const files = fs.readdirSync(path);
        files.forEach(function (item) {
            jsonFiles.push(item);
        });
    }
    findJsonFile(jsonPath);
    console.log(jsonFiles);
}
getJsonFiles('./node_modules/codemirror/theme');
