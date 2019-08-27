const fs = require('fs');
const path = require('path');
const Controller = require('egg').Controller;
const _ = require('lodash');
const NodeSsh = require('node-ssh')

class ConfigDetail extends Controller{
  async getBasicInfo(){
    const {ctx,app} = this;
    const {id} = ctx.query;
    if(_.isNil(id)) throw new Error('缺少必要参数id');
    const data = await ctx.service.configDetail.getConfigBasicInfo(id);
    if(_.isNil(data))   throw new Error('获取不到该文件的相关信息');
    ctx.body = app.utils.response(true,data);
  }
  async getRemoteConfig(){
    const {ctx,app} = this;
    const {id} = ctx.query;
    const configDetail = await ctx.service.configDetail.getConfigSpecificInfo(id,['id','filename','filePath',[app.Sequelize.col('host_management.host_ip'),'hostIp'],[app.Sequelize.col('host_management.username'),'username'],[app.Sequelize.col('host_management.password'),'password']]);
    if(_.isNil(configDetail)){
      throw new Error('获取不到该文件的相关信息');
    }else{
      const {filePath,filename,hostIp,username,password} = configDetail.dataValues;
      const ssh = new NodeSsh();
      app.logger.info(`开始连接服务器${hostIp}...`);
      await ssh.connect({
        host:hostIp,
        username,
        port: 22,
        password
      });
      await ssh.exec(`cat ${path.join(filePath,filename)}`,[],{
        onStdout:(chunk)=>{
          ssh.dispose();
          app.logger.info(`服务器${hostIp}断开`);
          ctx.body = app.utils.response(true,chunk.toString('utf8'));
        },
        onStderr:(chunk)=>{
          ssh.dispose();
          app.logger.info(`服务器${hostIp}断开`);
          throw new Error(chunk.toString('utf8'));
        },
      });
    }
  }
  async saveConfig(){
    const {ctx,app} = this;
    const {id,config,shell} = ctx.request.body;
    const configDetail = await ctx.service.configDetail.getConfigSpecificInfo(id,['id','filename','filePath',[app.Sequelize.col('host_management.host_ip'),'hostIp'],[app.Sequelize.col('host_management.username'),'username'],[app.Sequelize.col('host_management.password'),'password']]);
    const {filePath,filename,hostIp,username,password} = configDetail.dataValues;
    const configFilePath = path.join(__dirname,'../../cache/',filename);
    const shellPath = path.join(__dirname,'../../cache',`${filename}_shell`);
    fs.writeFileSync(configFilePath,config);
    fs.writeFileSync(shellPath,shell);
    const remoteConfigFilePath = path.join(filePath,filename);
    const remoteShellPath = path.join(filePath,`${filename}_shell`)
    try{
      const ssh = new NodeSsh();
      app.logger.info(`开始连接服务器${hostIp}...`);
      await ssh.connect({
        host:hostIp,
        username,
        port: 22,
        password
      });
      await ssh.putFile(configFilePath,remoteConfigFilePath);
      await ssh.putFile(shellPath,remoteShellPath);
      const {Stderr:execShellStderr} = await ssh.execCommand(`bash ${remoteShellPath}`);
      if(_.isEmpty(execShellStderr)){
        const {STDERR:deleteShellStderr} = await ssh.execCommand(`rm -rf ${remoteShellPath}`);
        if(_.isEmpty(deleteShellStderr)){
          await ctx.service.configCenter.editConfig({
            id,
            updateShell:shell
          });
          fs.unlinkSync(configFilePath);
          fs.unlinkSync(shellPath);
          ssh.dispose();
          app.logger.info(`服务器${hostIp}断开`);
          ctx.body = app.utils.response(true);
        }else{
          throw new Error(deleteShellStderr);
        }
      }else{
        throw new Error(execShellStderr);
      }
    }catch(err){
      ssh.dispose();
      app.logger.info(`服务器${hostIp}断开`);
      fs.unlinkSync(configFilePath);
      fs.unlinkSync(shellPath);
      throw err;
    }
  }
}

module.exports=ConfigDetail;