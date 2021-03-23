import http from '@/utils/http';
import API_URL from './url';
const { keys, assign } = Object;
let combineApi = assign({}, API_URL);
function mapUrlObjToFuncObj (urlObj: any) {
    const API: any = {};
    const URL: any = {};
    keys(urlObj).forEach((key) => {
        const item = urlObj[key]
        URL[key] = item.url
        API[key] = async function (params: any) {
            // eslint-disable-next-line no-return-await
            return await http[item.method.toLowerCase()](item.url, params)
        }
    });
    return { API, URL };
}
const { API, URL } = mapUrlObjToFuncObj(combineApi);
export {
    API,
    URL
};

