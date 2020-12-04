import { CHANGE_LOCAL_IP } from './constant';
const initialState = {
  localIp: '',
  serverInfo: {
    protocol: '',
    host: ''
  }
}
export default (state = initialState, action) => {
  const { type, payload } = action;
  switch (type) {
    case CHANGE_LOCAL_IP:
      const { localIp, protocol, host } = payload;
      return {
        ...state,
        localIp,
        serverInfo: {
          protocol,
          host
        }
      }
    default: return state;
  }
}
