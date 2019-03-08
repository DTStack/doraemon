import SiderLayout from '@/layouts/siderLayout';
import BasicLayout from '@/layouts/basicLayout';

import Home from '@/pages/home';
import ProxyServer from '@/pages/proxyServer';
import NotFound from '@/pages/exception/404';
const urlPrefix = '/page'
const routes = [
  {
    path: '/',
    redirect:`${urlPrefix}/home`
  },
  {
    path: `${urlPrefix}/home`,
    layout: SiderLayout,
    component: Home
  },
  {
    path: `${urlPrefix}/proxy-server`,
    layout: SiderLayout,
    component: ProxyServer
  },
  {
    path: '*',
    layout: BasicLayout,
    component: NotFound
  }
];

export default routes;
