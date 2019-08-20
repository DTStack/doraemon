import { CHANGE_LOCAL_IP} from './constant';
const initialState = {
  localIp:''
}
export default (state=initialState, action)=>{
  const {type,payload} = action;
  switch(type){
    case CHANGE_LOCAL_IP:
      return {
        ...state,
        localIp:payload
      }
    default: return state;
  }
}
