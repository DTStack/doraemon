import React from 'react';
import {Modal,Form,Input} from 'antd';
import PropsTypes from 'prop-types'; 

class ProxyRuleModal extends React.PureComponent{
  static defaultProps = {
    visible:false,
    onOk:()=>{},
    onCancel:()=>{},
    proxyServer:{},
    confirmLoading:false
  }
  static propsTypes ={
    visible:PropsTypes.bool,
    onOk:PropsTypes.func,
    onCancel:PropsTypes.func,
    proxyServer:PropsTypes.object,
    confirmLoading:PropsTypes.bool
  }
  handleModalOk=()=>{
    const {onOk,form,editable,proxyServer} = this.props;
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        if(editable){
          onOk(Object.assign({},proxyServer,values));
        }else{
          onOk(values);
        }
      }
    });
  }
  handleModalCancel=()=>{
    const {onCancel} = this.props;
    onCancel();
  }
  render(){
    const {visible,editable,form,proxyServer,confirmLoading} = this.props;
    const {getFieldDecorator} = form;
    const {ip,target} = proxyServer;
    const formItemLayout = {
      labelCol: {
        span: 6
      },
      wrapperCol: {
        span: 17
      },
    };
    return (<Modal
      title={`${editable?'编辑':'新增'}代理规则`}
      visible={visible}
      confirmLoading={confirmLoading}
      onOk={this.handleModalOk}
      onCancel={this.handleModalCancel}>
      <Form {...formItemLayout} >
        <Form.Item
          label="IP">
          {
            getFieldDecorator('ip',{
              rules:[{
                required: true, message: '请输入IP',
              }],
              initialValue:ip
            })(<Input placeholder="请输入ip"/>)
          }
        </Form.Item>
        <Form.Item
          label="目标服务地址">
          {
            getFieldDecorator('target',{
              rules:[{
                required: true, message: '请输入目标服务地址',
              }],
              initialValue:target
            })(<Input placeholder="请输入目标服务地址"/>)
          }
        </Form.Item>
      </Form>
    </Modal>)
  }
} 
export default Form.create()(ProxyRuleModal)
