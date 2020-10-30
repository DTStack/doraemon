import React from 'react';
import {Modal,Form,Input} from 'antd';
import PropsTypes from 'prop-types';
import {urlReg} from '@/utils/reg';

class CreateApp extends React.PureComponent {
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
    const { onOk, form, appInfo } = this.props;
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        onOk({ ...values, id: appInfo.id || '' });
      }
    });
  }
  handleModalCancel=()=>{
    const {onCancel} = this.props;
    onCancel();
  }
  render(){
    const { visible, appInfo, confirmLoading } = this.props;
    const { getFieldDecorator } = this.props.form;
    const { appName, appUrl, appDesc } = appInfo;
    const formItemLayout = {
      labelCol: {
        span: 6
      },
      wrapperCol: {
        span: 15
      },
    };
    console.log(this.props)
    return (<Modal
      title={appInfo ? `添加应用` : '编辑应用'}
      visible={visible}
      confirmLoading={confirmLoading}
      onOk={this.handleModalOk}
      onCancel={this.handleModalCancel}>
      <Form {...formItemLayout} >
        <Form.Item
          label="应用名称"
          hasFeedback
        >
          {
            getFieldDecorator('appName',{
              rules:[{
                required: true, message: '请输入应用名称',
              }],
              initialValue: appName || ''
            })(<Input placeholder="请输入请输入应用名称"/>)
          }
        </Form.Item>
        <Form.Item
          label="应用URL"
          hasFeedback
        >
          {
            getFieldDecorator('appUrl',{
              rules:[{
                required: true,
                message: '请输入应用URL'
              }],
              initialValue: appUrl || ''
            })(<Input placeholder="请输入应用URL"/>)
          }
        </Form.Item>
        <Form.Item
          label="应用描述"
          hasFeedback
        >
          {
            getFieldDecorator('appDesc',{
              rules:[{
                required: true,
                max: 120,
                message: '请输入应用描述'
              }],
              initialValue: appDesc || ''
            })(<Input.TextArea placeholder="请输入应用描述"/>)
          }
        </Form.Item>
      </Form>
    </Modal>)
  }
}
export default Form.create()(CreateApp)
