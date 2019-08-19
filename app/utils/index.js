module.exports = {
  response:(success,data=null,message)=>{
    if(success){
      message="执行成功";
    }
    return {
      success,
      data,
      message
    }
  }
}