import SiderLayout from '@/layouts/siderLayout';
import BasicLayout from '@/layouts/basicLayout';

import Home from '@/pages/home';
//代理服务
import ProxyServer from '@/pages/proxyServer';
//内部网址导航
import InnerUrlNavigation from '@/pages/innerUrlNavigation';
//工具箱
import Toolbox from '@/pages/toolbox';

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
    path:`${urlPrefix}/internal-url-navigation`,
    layout: SiderLayout,
    component: InnerUrlNavigation
  },
  {
    path:`${urlPrefix}/toolbox`,
    layout: SiderLayout,
    component: Toolbox
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
