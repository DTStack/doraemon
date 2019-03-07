import Cookies from 'js-cookie';
import { reqHeader, authBeforeRes, authAfterRes } from './interceptor';


class Http {
  get(url, params) { 
    let options = { method: 'GET' }
    let req_url = params ? this.buildUrl(url, params) : url;
    return this.request(req_url, options)
  }

  post(url, data) { 
    let options = { method: 'POST', headers: { "content-type": "application/json;charset=UTF-8" } }
    if (data) options.body = JSON.stringify(data)
    return this.request(url, options)
  }

  delete(url, params) { 
    let options = { method: 'DELETE' }
    let req_url = params ? this.buildUrl(url, params) : url;
    return this.request(req_url, options)
  }

  put(url, data) {
    let options = { method: 'PUT' }
    if (data) options.body = JSON.stringify(data)
    return this.request(url, options)
  }

  postForm(url, data) {
    let options = { method: 'POST',headers:{} }
    if (data) options.body = this.buildFormData(data);
    return this.request(url, options)
  }

  head(url) {
    let options = { method: 'Head' }
    return this.request(url, options)
  }
  
  buildUrl(url, params) {
    const ps = []
    if (params) {
      for (let p in params) {
        if (p&&params[p]!==undefined&&params[p]!==null) {
          ps.push(p + '=' + encodeURIComponent(params[p]));
        }
      }
    }
    return url + '?' + ps.join('&')
  }

  buildFormData(params) {
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
  request(url, options) {
    options.headers = options.headers || reqHeader;
    options.headers['x-csrf-token'] = Cookies.get('csrfToken');
    options.credentials = 'same-origin'
    return fetch(url, options)
      .then(authBeforeRes)
      .then(response => {
        return response.json()
      })
      .then(authAfterRes)
      .catch(err => {
        console.error("错误信息：",JSON.stringify(err));
        this.handleExcept(err);//开发环境可讲此方法注视
      });
  }
  handleExcept(e){
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
export default new Http()
