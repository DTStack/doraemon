import http from '@/utils/http';
import API_URL from './url';
const { keys, assign } = Object;
const combineApi = assign({}, API_URL);
function mapUrlObjToFuncObj(urlObj: any) {
    const API: any = {};
    const URL: any = {};
    keys(urlObj).forEach((key) => {
        const item = urlObj[key];
        URL[key] = item.url;
        API[key] = async function (params: any) {
            const rawMethod = String(item.method || 'get');
            const methodName =
                typeof (http as any)[rawMethod] === 'function'
                    ? rawMethod
                    : rawMethod.toLowerCase();
            if (typeof (http as any)[methodName] !== 'function') {
                throw new Error(`Unsupported API method: ${item.method}`);
            }
            // eslint-disable-next-line no-return-await
            return await (http as any)[methodName](item.url, params);
        };
    });
    return { API, URL };
}
const { API, URL } = mapUrlObjToFuncObj(combineApi);
export { API, URL };
