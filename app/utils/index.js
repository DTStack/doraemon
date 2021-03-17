
const path = require('path');
const fs = require('fs');
const ROOT_PATH = path.join(__dirname, '../../');
const ChatBot = require('dingtalk-robot-sender');

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
const sendMsg = async (webhook_url,basicInfo) => {
  const { filename, filePath, hostIp, hostName } = basicInfo
  const feChatRobot = new ChatBot({
    webhook: webhook_url
  });
  const mdTxt = "Doraemon - 配置中心变更通知：\n\n\n" +
                "主机：" + hostIp + "(" + hostName + ")\n\n" +
                "文件名：" + filename + "\n\n\n" + 
                "配置文件已更新 / 已删除"
  feChatRobot
    .markdown('配置中心变更通知', mdTxt)
    .catch(ex => console.error(ex));
}
module.exports = {
  createFolder,
  createFileSync,
  sendMsg,
  response:(success,data=null,message)=>{
    if(success){
      message='执行成功';
    }
    return {
      success,
      data,
      message
    }
  }
}