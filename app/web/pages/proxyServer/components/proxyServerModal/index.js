import React from 'react';
import {Modal,Form,Input} from 'antd';
import PropsTypes from 'prop-types'; 

class ProxyServerModal extends React.PureComponent{
  static defaultProps = {
    visible:false,
    onOk:()=>{},
    onCancel:()=>{},
    proxyServer:{}
  }
  static propsTypes ={
    visible:PropsTypes.bool,
    onOk:PropsTypes.func,
    onCancel:PropsTypes.func,
    proxyServer:PropsTypes.object
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
    const {visible,editable,form,proxyServer} = this.props;
    const {getFieldDecorator} = form;
    const {name,target} = proxyServer;
    const formItemLayout = {
      labelCol: {
        span: 6
      },
      wrapperCol: {
        span: 17
      },
    };
    return (<Modal
      title={`${editable?'编辑':'新增'}代理服务`}
      visible={visible}
      onOk={this.handleModalOk}
      onCancel={this.handleModalCancel}>
      <Form {...formItemLayout} >
        <Form.Item
          label="代理服务名称">
          {
            getFieldDecorator('name',{
              rules:[{
                required: true, message: '请输入代理服务名称',
              }],
              initialValue:name
            })(<Input placeholder="请输入代理服务名称"/>)
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
export default Form.create()(ProxyServerModal)
