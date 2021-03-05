import _ from 'lodash';
import API_URL from './url';
import http from '@/utils/http';

function mapUrlObjToFuncObj(urlObj: any) {
    const API: any = {};
    _.keys(urlObj).forEach((key) => {
        const item = urlObj[key]
        API[key] = function (params: any) {
            return http[item.method](item.url, params)
        }
    });
    return API;
}
function mapUrlObjToStrObj(urlObj: any) {
    const Url: any = {};
    _.keys(urlObj).forEach((key) => {
        const item = urlObj[key]
        Url[key] = item.url
    });
    return Url;
}

export const API = mapUrlObjToFuncObj(API_URL);
export const URL = mapUrlObjToStrObj(API_URL);
