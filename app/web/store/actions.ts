import { message as Message } from 'antd';
import { CHANGE_LOCAL_IP } from './constant';

export const changeLocalIp = () => (dispatch: any, getState: any, { API }: any) => {
    API.getLocalIp().then((response: any) => {
        const { success, data } = response;
        if (success) {
            console.log(data);
            dispatch({
                type: CHANGE_LOCAL_IP,
                payload: data
            })
        }
    });
}
