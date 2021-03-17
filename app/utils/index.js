
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
  const { filename, filePath, hostIp, hostName, username, remark} = basicInfo
  const feChatRobot = new ChatBot({
    webhook: webhook_url
  });
  const mdTxt = "#### 配置中心变更通知\n" +
                "文件名：" + filename  +
                "\n文件路径：" + filePath  +
                "\n主机IP：" + hostIp  +
                "\n主机名：" + hostName  +
                "\nSSH连接：" + username +"@"+ hostIp  +
                "\n备注：" + remark 
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