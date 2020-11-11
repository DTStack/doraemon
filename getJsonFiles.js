
const  fs = require('fs');
function getJsonFiles(jsonPath){
  let jsonFiles = [];
  function findJsonFile(path){
    let files = fs.readdirSync(path);
    files.forEach(function (item, index) {
      jsonFiles.push(item)
    });
  }
  findJsonFile(jsonPath);
  console.log(jsonFiles);
}
getJsonFiles('./node_modules/codemirror/theme');