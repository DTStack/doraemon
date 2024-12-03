import { message } from 'antd';
import { CHANGE_LOCAL_IP } from './constant';

export const changeLocalIp =
    (showMsg = false) =>
    (dispatch: any, getState: any, { API }: any) => {
        API.getLocalIp()
            .then((response: any) => {
                const { success, data } = response;
                if (success) {
                    console.log(data);
                    showMsg && message.success('刷新成功！');
                    dispatch({
                        type: CHANGE_LOCAL_IP,
                        payload: data,
                    });
                }
            })
            .catch(() => {
                showMsg && message.warning('刷新失败！');
            });
    };
