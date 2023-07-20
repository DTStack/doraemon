import { notification } from 'antd';

// 本机IP发生变化进行提示
export const handleLocalIpChanged = (localIp) => {
    const rememberIp = localStorage.getItem('rememberIp');
    if (rememberIp !== null && rememberIp !== localIp) {
        notification.warning({
            message: 'IP地址变更',
            description: '您的IP地址【较上次访问时】已发生变更，请留意代理服务配置！',
            duration: 5,
            onClose: () => {
                localStorage.setItem('rememberIp', localIp)
            }
        });
    }
}
