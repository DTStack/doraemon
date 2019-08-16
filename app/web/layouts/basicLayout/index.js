import React from 'react';
import {Layout} from 'antd';
import {Link} from 'react-router-dom';
import classnames from 'classnames';
import './style.scss';
const {Header, Content} = Layout;
export default class BasicLayout extends React.PureComponent{
  render(){
    const {className} = this.props;
    return (
      <Layout className="layout-basic">
        <Header style={{ padding: '0 10px' }}>
          <Link to='/page/home'>
            <span className="system-title">哆啦A梦</span>
          </Link>
        </Header>
        <Content className={classnames("main-content",className)}>
          {this.props.children}
        </Content>
      </Layout>)
  }
}