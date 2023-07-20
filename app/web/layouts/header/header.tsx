import React, { useState, useEffect } from 'react';
import { AppstoreOutlined, CloudOutlined, DesktopOutlined, TagOutlined, SettingOutlined, QuestionCircleOutlined, EditOutlined } from '@ant-design/icons';
import { Form, Layout, Menu, Modal, FormInstance, Input, Tooltip, Popconfirm } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as actions from '@/store/actions';
import { API } from '@/api';
import logo from '@/asset/images/logo.png';
import config from '../../../../env.json';
import './style.scss';

const { SubMenu } = Menu;
const { Header } = Layout;

const formItemLayout: any = {
    labelCol: {
        span: 5
    },
    wrapperCol: {
        span: 18
    }
};

const navMenuList: any = [{
    name: '应用中心',
    path: '/page/toolbox',
    icon: <AppstoreOutlined />,
    routers: ['toolbox', 'switch-hosts-list', 'switch-hosts-edit', 'article-subscription-list']
}, {
    name: '代理服务',
    path: '/page/proxy-server',
    icon: <CloudOutlined />,
    routers: ['proxy-server']
}, {
    name: '主机管理',
    path: '/page/host-management',
    icon: <DesktopOutlined />,
    routers: ['host-management']
}, {
    name: '配置中心',
    path: '/page/config-center',
    icon: <SettingOutlined />,
    routers: ['config-center', 'config-detail']
}, {
    name: '标签管理',
    path: '/page/tags',
    icon: <TagOutlined />,
    routers: ['tags']
}]

const HeaderComponent = (props: any) => {
    const { location, proxyServer } = props;
    const { localIp = '127.0.0.1' } = useSelector((state: any) => state.global);
    const { pathname } = location;
    const [selectedKeys, setSelectedKeys] = useState([pathname]);
    const [visible, setVisible] = useState<boolean>(false);
    const [popconfirmOpen, setPopconfirmOpen] = useState<boolean>(false);
    const { setLocalIp } = bindActionCreators(actions, useDispatch());
    let formRef: FormInstance<any> = null;

    useEffect(() => {
        let current = navMenuList.filter(item => item.routers.some((ele) => pathname.indexOf(ele) > -1))
        current.length && setSelectedKeys([current[0].path])
    }, [pathname])
    // 检测是否通过 VPN 访问哆啦A梦
    useEffect(() => {
        checkIsVPN();
    }, [localIp]);

    const handleSelectedKeys = (e: any) => {
        setSelectedKeys(e.key);
    }

    // 刷新获取真实IP
    const handleGetRealIp = () => {
        API.getLocalIp().then((response: any) => {
            const { success, data } = response;
            if (success) {
                formRef.setFieldsValue({ localIp: data.localIp });
                // 记录真实IP
                localStorage.setItem('real-localIp', data.localIp);
            }
        })
    }

    const handleModalOk = () => {
        formRef.validateFields().then((values: any) => {
            setLocalIp(values.localIp);
            setVisible(false);
        });
    }

    // 检测当前本地IP是否为 VPN 服务器的IP，是则代表通过 VPN 使用哆啦A梦代理，提示右上角可以进行设置自定义本地IP
    const checkIsVPN = () => {
        const vpnIp = config.vpnIp || [];
        const tipTime = Number(localStorage.getItem('vpnIp-tip-time') || '');
        console.log(111, Date.now() - tipTime - 24 * 60 * 60)
        if ((Date.now() - tipTime - 24 * 60 * 60) > 0) {
            setPopconfirmOpen(vpnIp.includes(localIp))
        }
    }

    return (
        <Header className="dt-layout-header header_component">
            <div className="dt-header-log-wrapper logo">
                <Link to='/page/toolbox'>
                    <img className="logo_img" src={logo} />
                    <span className="system-title">Doraemon</span>
                </Link>
            </div>
            <div className="menu_content">
                <Menu
                    mode="horizontal"
                    theme="dark"
                    onClick={handleSelectedKeys}
                    selectedKeys={selectedKeys}>
                    {
                        navMenuList.map((nav: any) => {
                            const { children, name, path, icon } = nav;
                            if (Array.isArray(children) && children.length > 0) {
                                return <SubMenu key={name} title={<span>{icon}<span>Navigation Two</span></span>}>{children.map((navChild: any) => <Menu.Item key={navChild.path}><Link to={navChild.path}>{navChild.icon}<span>{navChild.name}</span></Link></Menu.Item>)}</SubMenu>;
                            } else {
                                return <Menu.Item key={path}><Link to={path}>{icon}<span>{name}</span></Link></Menu.Item>;
                            }
                        })
                    }
                </Menu>
                <div>
                    <a href={config?.helpDocUrl || ''} rel="noopener noreferrer" target='_blank'>
                        <QuestionCircleOutlined className="help-link" />
                    </a>
                    <span className="local-ip ml-20">{`本机IP: ${localIp}`}</span>

                    {/* 自定义本地IP */}
                    <Popconfirm
                        visible={popconfirmOpen}
                        placement="bottomRight"
                        title="检测到您当前是通过 VPN 访问哆啦A梦代理服务，可点击设置自定义本机IP"
                        onConfirm={() => {
                            setVisible(true);
                            setPopconfirmOpen(false);
                            // 关闭提示后记录时间
                            localStorage.setItem('vpnIp-tip-time', `${Date.now()}`);
                        }}
                        onCancel={() => {
                            setPopconfirmOpen(false);
                            // 关闭提示后记录时间
                            localStorage.setItem('vpnIp-tip-time', `${Date.now()}`);
                        }}
                    >
                        <EditOutlined className='refresh-cion' onClick={() => {
                            !popconfirmOpen && setVisible(true);
                        }} />
                    </Popconfirm>
                </div>
            </div>

            <Modal
                title="自定义本机IP"
                visible={visible}
                onOk={handleModalOk}
                className="proxy-rule-modal"
                onCancel={() => { setVisible(false) }}
            >
                <Form
                    {...formItemLayout}
                    ref={(form) => formRef = form}
                    initialValues={{
                        localIp: proxyServer?.ip || localIp
                    }}
                    scrollToFirstError={true}
                >
                    <Form.Item
                        label="本机IP"
                        name="localIp"
                        rules={[
                            { required: true, message: '请输入本机IP' }
                        ]}
                    >
                        <Input placeholder="请输入本机IP" addonAfter={
                            <Tooltip placement="bottom" title="获取真实IP">
                                <SyncOutlined className='refresh-cion' onClick={handleGetRealIp} />
                            </Tooltip>
                        } />
                    </Form.Item>
                </Form>
            </Modal>
        </Header>
    );
}
export default HeaderComponent;
