import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import { Provider } from 'react-redux';
import { matchRoutes } from 'react-router-config';
import { BrowserRouter, StaticRouter } from 'react-router-dom';

import App from '@/app';
import Layout from '@/view/layout';
import { create } from './store/index';
import routes from './router';
import '@/scss/index.scss';
import '@/asset/font/iconfont.css';
declare let window: any;
declare let module: any;

const clientRender = () => {
    const store = create(window.__INITIAL_STATE__);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const url = store.getState().url;
    const Entry = () => (
        <div style={{ height: '100%' }}>
            <Provider store={store}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </Provider>
        </div>
    );
    const render = (Page: any) => {
        ReactDOM.hydrate(
            EASY_ENV_IS_DEV ? (
                // @ts-ignore
                <AppContainer>
                    <Page />
                </AppContainer>
            ) : (
                <Page />
            ),
            document.getElementById('app')
        );
    };
    if (EASY_ENV_IS_DEV && module.hot) {
        module.hot.accept();
    }
    render(Entry);
};

const serverRender = (context: any, _options: any) => {
    const url = context.state.url;
    const branch = matchRoutes(routes, url);
    const promises = branch.map(({ route }: any) => {
        const fetch = route.component && route.component.fetch;
        return fetch instanceof Function ? fetch() : Promise.resolve(null);
    });
    return Promise.all(promises).then((data: any) => {
        const initState = context.state;
        data.forEach((item: any) => {
            Object.assign(initState, item);
        });
        context.state = Object.assign({}, context.state, initState);
        const store = create(initState);
        return () => (
            <Layout>
                <div style={{ height: '100%' }}>
                    <Provider store={store}>
                        <StaticRouter location={url} context={{}}>
                            <App />
                        </StaticRouter>
                    </Provider>
                </div>
            </Layout>
        );
    });
};
export default EASY_ENV_IS_NODE ? serverRender : clientRender();
