import { handleLocalIpChanged } from '@/utils/localIp';
import config from '../../../env.json'

// 从接口获取本机IP
export const fetchLocalIp = () => (dispatch: any, getState: any, { API }: any) => {
        // 本地没有 localIp 再从接口获取
        const localIp = localStorage.getItem('localIp');
        if (localIp) {
            dispatch({
                type: 'CHANGE_LOCAL_IP',
                payload: {
                    host: `${localIp}:7001`,
                    localIp,
                    protocol: 'http'
                }
            })
            handleLocalIpChanged(localIp);
        } else {
            API.getLocalIp().then((response: any) => {
                const { success, data } = response;
                if (success) {
                    dispatch({
                        type: 'CHANGE_LOCAL_IP',
                        payload: data
                    })
                    handleLocalIpChanged(data.localIp);
                    // 记录真实IP
                    localStorage.setItem('real-localIp', localIp);
                }
            });
        }
}

// 自定义本机IP
export const setLocalIp = (localIp) => (dispatch: any) => {
    dispatch({
        type: 'CHANGE_LOCAL_IP',
        payload: {
            host: `${localIp}:7001`,
            localIp,
            protocol: 'http'
        }
    })
    handleLocalIpChanged(localIp);
}
