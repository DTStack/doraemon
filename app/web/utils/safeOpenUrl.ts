// I4: 限制 window.open 仅接受绝对 http(s) 或同源相对路径，
// 拒绝 javascript:/data:/vbscript: 等危险协议，避免在安装面板里被执行。
export function safeOpenUrl(url: string | undefined | null, target = '_blank') {
    const value = String(url ?? '').trim();
    if (!value) return;

    const isHttp = /^https?:\/\//i.test(value);
    // 同源相对路径以单个 / 开头；排除 //evil.com 这类协议相对跳转
    const isSameOriginRelative = value.startsWith('/') && !value.startsWith('//');

    if (isHttp || isSameOriginRelative) {
        window.open(value, target);
    }
}
