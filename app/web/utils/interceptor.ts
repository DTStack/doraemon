import { notification } from 'antd'
let operator = 1; let preTitle: any; let preMessage: any; let preType: string;
const singletonNotification = (title: any, message: any, type: string) => {
    if ((preTitle != title) || (preMessage != message) || (preType != type) || (operator === 1)) {
        preTitle = title;
        preMessage = message;
        preType = type;
        let notifyMsgs = document.querySelectorAll('.ant-notification-notice-description');
        if (notifyMsgs.length) {
            let closeBtn: any = document.querySelector('.dt-notification__close-btn');
            closeBtn.style.display = 'block';
        }
        notification[type]({
            message: title,
            description: message
        });
        let timer = setTimeout(function () {
            operator = 1;
            clearTimeout(timer)
        }, 5000);
        operator = 0;
    }
}
export const reqHeader: any = {
    'Accept': '*/*',
    mode: 'cors',
    'Content-Type': 'application/json'
};
export function authBeforeRes(response: any) {
    if (response.headers.get('Content-Type').indexOf('application/vnd.ms-excel') > -1) {
        response.blob().then((blob: any) => {
            const a = window.document.createElement('a');
            const downUrl = window.URL.createObjectURL(blob);// 获取 blob 本地文件连接 (blob 为纯二进制对象，不能够直接保存到磁盘上)
            const filename = response.headers.get('Content-Disposition').split('filename=')[1].split('.');
            a.href = downUrl;
            a.download = `${decodeURI(filename[0])}.${filename[1]}`;
            a.click();
            window.URL.revokeObjectURL(downUrl);
        });
        return response;
    } else {
        switch (response.status) {
        case 200:
            return response;
        case 302:
            return response;
        case 401:
            return response;
        default:
            if (process.env.NODE_ENV !== 'production') {
                console.error('Request error: ', response.code, response.message)
            }
            return response;
        }
    }
}

export function authAfterRes(response: any) {
    if (!response.success) {
        singletonNotification(
            '异常',
            response.message,
            'error'
        );
    }
    return response;
}
