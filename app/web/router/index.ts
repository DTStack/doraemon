import BasicLayout from '@/layouts/basicLayout';
// 文章订阅管理
import ArticleSubscriptionList from '@/pages/articleSubscription';
// 配置中心
import ConfigCenter from '@/pages/configCenter';
// 配置详情
import ConfigDetail from '@/pages/configDetail';
// 环境管理
import EnvManagement from '@/pages/envManagement';
import NotFound from '@/pages/exception/404';
import Home from '@/pages/home';
// 主机管理
import HostManagement from '@/pages/hostManagement';
// 内部网址导航
import InnerUrlNavigation from '@/pages/innerUrlNavigation';
// 邮件签名生成
import MailSign from '@/pages/mailSign';
// 代理服务
import ProxyServer from '@/pages/proxyServer';
// hosts列表
import SwitchHostsList from '@/pages/switchHosts';
// hosts编辑
import SwitchHostsEdit from '@/pages/switchHosts/editHosts';
import TagsManagement from '@/pages/tagsManagement';
// 工具箱
import Toolbox from '@/pages/toolbox';

const urlPrefix = '/page';
const routes: any = [
    {
        path: '/',
        component: BasicLayout,
        routes: [
            {
                path: `${urlPrefix}/toolbox`,
                component: Toolbox,
            },
            {
                path: `${urlPrefix}/home`,
                component: Home,
            },
            {
                path: `${urlPrefix}/internal-url-navigation`,
                component: InnerUrlNavigation,
            },
            {
                path: `${urlPrefix}/proxy-server`,
                component: ProxyServer,
            },
            {
                path: `${urlPrefix}/mail-sign`,
                component: MailSign,
            },
            {
                path: `${urlPrefix}/host-management`,
                component: HostManagement,
            },
            {
                path: `${urlPrefix}/env-management`,
                component: EnvManagement,
            },
            {
                path: `${urlPrefix}/config-center`,
                component: ConfigCenter,
            },
            {
                path: `${urlPrefix}/config-detail/:id`,
                component: ConfigDetail,
            },
            {
                path: `${urlPrefix}/switch-hosts-list`,
                component: SwitchHostsList,
            },
            {
                path: `${urlPrefix}/switch-hosts-edit/:id/:type`,
                component: SwitchHostsEdit,
            },
            {
                path: `${urlPrefix}/article-subscription-list`,
                component: ArticleSubscriptionList,
            },
            {
                path: `${urlPrefix}/tags`,
                component: TagsManagement,
            },
            {
                path: '*',
                component: NotFound,
            },
        ],
    },
];

export default routes;
