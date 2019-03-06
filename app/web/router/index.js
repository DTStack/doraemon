import Home from '@/pages/home';
import ProxyServer from '@/pages/proxyServer';
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
    component: Home
  },
  {
    path: '/page/home',
    component: Home
  },
  {
    path: '/page/proxy-server',
    component: ProxyServer
  },
  {
    path: '*',
    component: NotFound
  }
];

export default routes;
