import {message as Message} from 'antd';
import { CHANGE_LOCAL_IP } from './constant';

export const changeLocalIp = ()=>(dispatch,getState,{API})=>{
  API.getLocalIp().then((response)=>{
    const {success,data,message} = response;
    if(success){
      dispatch({
        type:CHANGE_LOCAL_IP,
        payload:data
      })
    }else{
      Message.error(message);
    }
  });
}


