import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { BrowserRouter, StaticRouter } from 'react-router-dom';
import { matchRoutes } from 'react-router-config';
import { AppContainer } from 'react-hot-loader';
import Layout from '@/view/layout';
import App from '@/app';
import { create } from './store/index';
import routes from './router';
import '@/scss/index.scss';
import '@/asset/font/iconfont.css';
const clientRender = () => {
  const store = create(window.__INITIAL_STATE__);
  const url = store.getState().url;
  const Entry = () => (<div style={{height:'100%'}}>
    <Provider store={ store }>
      <BrowserRouter>
        <App url={ url }/>
      </BrowserRouter>
    </Provider>
  </div>
  );
  const render = Page =>{
    ReactDOM.hydrate(EASY_ENV_IS_DEV ? <AppContainer><Page /></AppContainer> : <Page />, document.getElementById('app'));
  };
  if (EASY_ENV_IS_DEV && module.hot) {
    module.hot.accept();
  }
  render(Entry);
};

const serverRender = (context, options)=> {
  const url = context.state.url;
  const branch = matchRoutes(routes, url);
  const promises = branch.map(({route}) => {
    const fetch = route.component&&route.component.fetch;
    return fetch instanceof Function ? fetch() : Promise.resolve(null)
  });
  return Promise.all(promises).then(data => {
    const initState = context.state;
    data.forEach(item => {
      Object.assign(initState, item);
    });
    context.state = Object.assign({}, context.state, initState);
    const store = create(initState);
    return () =>(
      <Layout>
        <div style={{height:'100%'}}>
          <Provider store={store}>
            <StaticRouter location={url} context={{}}>
              <App url={url}/>
            </StaticRouter>
          </Provider>
        </div>
      </Layout>
    )
  });
};
export default EASY_ENV_IS_NODE ?  serverRender : clientRender();