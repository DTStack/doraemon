
const path = require('path');
const fs = require('fs');
const ROOT_PATH = path.join(__dirname, '../../');
const createFolder  = (paths) => {
    let dirPath = ROOT_PATH;
    try {
        paths.forEach(dir => {
            dirPath = path.join(dirPath, dir.toString());
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
            }
        })
        return dirPath;
    } catch {
        throw new Error('创建文件夹出错')
    }
}
const createFileSync = (paths,fileName,data) => {
    try {
        const dir = createFolder(paths);
        const filePath = path.join(dir,fileName)
        fs.writeFileSync(filePath,data);
        return filePath;
    } catch {
        throw new Error('创建文件出错')
    }
}
module.exports = {
    createFolder,
    createFileSync,
    response:(success,data=null,message)=>{
        if (success){
            message='执行成功';
        }
        return {
            success,
            data,
            message
        }
    }
}