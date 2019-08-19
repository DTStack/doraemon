import SiderLayout from '@/layouts/siderLayout';
import BasicLayout from '@/layouts/basicLayout';

import Home from '@/pages/home';
//代理服务
import ProxyServer from '@/pages/proxyServer';
//内部网址导航
import InnerUrlNavigation from '@/pages/innerUrlNavigation';
//工具箱
import Toolbox from '@/pages/toolbox';
//邮件签名生成
import MailSign from '@/pages/mailSign';
//主机管理
import HostManagement from '@/pages/hostManagement';

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
    path: `${urlPrefix}/mail-sign`,
    layout: SiderLayout,
    component: MailSign
  },
  {
    path: `${urlPrefix}/host-management`,
    layout: SiderLayout,
    component: HostManagement
  },
  {
    path: '*',
    layout: BasicLayout,
    component: NotFound
  }
];

export default routes;
