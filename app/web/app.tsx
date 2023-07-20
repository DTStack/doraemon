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
    useEffect(() => {
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
