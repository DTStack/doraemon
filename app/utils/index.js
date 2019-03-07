module.exports = {
  response:(success,data,message)=>{
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