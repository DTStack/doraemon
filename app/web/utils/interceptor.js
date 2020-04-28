export const reqHeader = {
  'Accept': '*/*',
  mode: 'cors',
  'Content-Type': 'application/json'
};
export function authBeforeRes(response) {
  if (response.headers.get('Content-Type').indexOf('application/vnd.ms-excel') > -1) {
    response.blob().then((blob) => {
      const a = window.document.createElement('a');
      const downUrl = window.URL.createObjectURL(blob);// 获取 blob 本地文件连接 (blob 为纯二进制对象，不能够直接保存到磁盘上)
      const filename = response.headers.get('Content-Disposition').split('filename=')[1].split('.');
      a.href = downUrl;
      a.download = `${decodeURI(filename[0])}.${filename[1]}`;
      a.click();
      window.URL.revokeObjectURL(downUrl);
    });
    return data;
  }else{
    switch (response.status) {
    case 200:
      return response;
    case 302:
      message.info('登录超时, 请重新登录！');
      return response;
    case 401:
      window.location.href='/auth/login';
      return response;
    default:
      if (process.env.NODE_ENV !== 'production') {
        console.error('Request error: ', response.code, response.message)
      }
      return response;
    }
  }
}

export function authAfterRes(response) {
  return response;
}
