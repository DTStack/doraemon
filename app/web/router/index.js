import MainLayout from '@/layouts/mainLayout';
import Home from '@/pages/home';
import ProxyServer from '@/pages/proxyServer';
const urlPrefix = '/page'
const NotFound = () => {
  return (
    <Route render={({ staticContext }) => {
      if (staticContext) {
        staticContext.status = 404;
      }
      return (
        <div>
          <h1>404 : Not Found</h1>
        </div>
      );
    }}/>
  );
};
const routes = [
  {
    path: '/',
    redirect:`${urlPrefix}/home`,
    component: Home
  },
  {
    path: `${urlPrefix}/home`,
    layout: MainLayout,
    component: Home
  },
  {
    path: `${urlPrefix}/proxy-server`,
    layout: MainLayout,
    component: ProxyServer
  },
  {
    path: '*',
    component: NotFound
  }
];

export default routes;
