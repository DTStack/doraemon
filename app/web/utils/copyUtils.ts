import { message } from 'antd';

export const copyToClipboard = async (text: string, successMsg: string) => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            message.success(successMsg ?? '已复制到剪贴板');
            return;
        }

        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
            message.success(successMsg ?? '已复制到剪贴板');
        } else {
            throw new Error('execCommand failed');
        }
    } catch (err) {
        console.error('复制失败:', err);
    }
};
