import React,{useState} from 'react';
import {Layout,Menu,Icon} from 'antd';
import {Link} from 'react-router-dom';
import './style.scss';
const {Sider } = Layout;
const SubMenu = Menu.SubMenu;

const navMenuList: any = [{
    name:'配置中心',
    path:'/page/config-center',
    icon:'setting'
},{
    name:'主机管理',
    path:'/page/host-management',
    icon:'desktop'
}]
const SiderComponent = (props: any)=>{
    const {location} = props;
    const {pathname} = location;
    const [collapsed,setCollapsed] = useState(false);
    const handleCollapseChange = ()=>{
        setCollapsed(!collapsed)
    }
    return (
        <Sider
            trigger={null} 
            collapsible 
            className="left-container"
            collapsed={collapsed}
            style={{height:'100%',background:'#262E36'}}
        >
            <div className="collapsed-wrap">
                <Icon
                    className="trigger"
                    type={collapsed ? 'menu-unfold' : 'menu-fold'}
                    onClick={handleCollapseChange}
                />
            </div>
            <Menu
                mode="inline"
                theme="dark"
                style={{background:'#262E36'}}
                selectedKeys={[pathname]}
            >
                {
                    navMenuList.map((nav: any)=>{
                        const {children,name,path,icon} = nav;
                        if(Array.isArray(children)&&children.length>0){
                            return <SubMenu key={name} title={<span><Icon type={icon} /><span>Navigation Two</span></span>}>{children.map((navChild)=><Menu.Item key={navChild.path}><Link to={navChild.path}><Icon type={navChild.icon} /><span>{navChild.name}</span></Link></Menu.Item>)}</SubMenu>
                        }else{
                            return <Menu.Item key={path}><Link to={path}><Icon type={icon} /><span>{name}</span></Link></Menu.Item>
                        }
                    })
                }
            </Menu>
        </Sider>)
}
export default SiderComponent;