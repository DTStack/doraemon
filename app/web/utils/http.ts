import Cookies from 'js-cookie';
import { reqHeader, authBeforeRes, authAfterRes } from './interceptor';


class Http {
    get(url: any, params: any) { 
        let options: any = { method: 'GET' }
        let req_url = params ? this.buildUrl(url, params) : url;
        return this.request(req_url, options)
    }

    post(url: any, data: any) { 
        let options: any = { method: 'POST', headers: { 'content-type': 'application/json;charset=UTF-8' } }
        if (data) options.body = JSON.stringify(data)
        return this.request(url, options)
    }

    delete(url: any, params: any) { 
        let options: any = { method: 'DELETE' }
        let req_url = params ? this.buildUrl(url, params) : url;
        return this.request(req_url, options)
    }

    put(url: any, data: any) {
        let options: any = { method: 'PUT' }
        if (data) options.body = JSON.stringify(data)
        return this.request(url, options)
    }

    postForm(url: any, data: any) {
        let options: any = { method: 'POST',headers:{} }
        if (data) options.body = this.buildFormData(data);
        return this.request(url, options)
    }

    head(url: any) {
        let options: any = { method: 'Head' }
        return this.request(url, options)
    }
  
    buildUrl(url: any, params: any) {
        const ps: any = []
        if (params) {
            for (let p in params) {
                if (p&&params[p]!==undefined&&params[p]!==null) {
                    ps.push(p + '=' + encodeURIComponent(params[p]));
                }
            }
        }
        return url + '?' + ps.join('&')
    }

    buildFormData(params: any) {
        if (params) {
            const data = new FormData()
            for (let p in params) {
                if (p) {
                    data.append(p, params[p])
                }
            }
            return data;
        }
    }
    request(url: any, options: any) {
        options.headers = options.headers || reqHeader;
        options.headers['x-csrf-token'] = Cookies.get('csrfToken');
        options.credentials = 'same-origin'
        return fetch(url, options)
            .then(authBeforeRes)
            .then((response: any) => {
                return response.json()
            })
            .then(authAfterRes)
            .catch((err: any) => {
                console.error('错误信息：',JSON.stringify(err));
                this.handleExcept(err);//开发环境可讲此方法注视
            });
    }
    handleExcept(e: any){
        const status = e.name;
        if (status === 401) {
            window.location.href='/auth/login';
            return;
        }
        if (status === 403) {
            window.location.href='/auth/login';
            return;
        }
        if (status <= 504 && status >= 500) {
            window.location.href='/auth/login';
            return;
        }
        if (status >= 404 && status < 422) {
            window.location.href='/auth/login';
        }
    }
}
/* eslint-enable */
export default new Http()
