import React, { useEffect } from 'react';
import { Route, Redirect, Switch } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { useDispatch } from 'react-redux';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/lib/locale-provider/zh_CN';
import routes from '@/router';
import { renderRoutes } from 'react-router-config'
import * as actions from '@/store/actions';
import 'antd/dist/antd.less';
import 'ant-design-dtinsight-theme/theme/dt-theme/reset.less';
import 'ant-design-dtinsight-theme/theme/dt-theme/index.less';

declare var window: any;

const App = () => {
    const { changeLocalIp } = bindActionCreators(actions, useDispatch());

    // 需要挂 VPN 使用
    const hotJar = () => {
        (function (h: any, o: any, t: any, j: any, a?: any, r?: any) {
            h.hj = h.hj || function () { (h.hj.q = h.hj.q || []).push(arguments) };
            h._hjSettings = { hjid: 2133522, hjsv: 6 };
            a = o.getElementsByTagName('head')[0];
            r = o.createElement('script'); r.async = 1;
            r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
            a.appendChild(r);
        })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
    }
    useEffect(() => {
        hotJar();
        changeLocalIp();
    }, [])
    return (
        <div style={{ height: '100%' }}>
            <ConfigProvider locale={zhCN}>
                <Switch>
                    {
                        renderRoutes(routes)
                    }
                </Switch>
            </ConfigProvider>
        </div>
    );
}

export default App;
