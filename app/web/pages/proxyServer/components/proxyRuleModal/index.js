import React from 'react';
import {Modal,Form,Input,Tooltip, Button} from 'antd';
import PropsTypes from 'prop-types';
import {urlReg} from '@/utils/reg';
import { API } from '@/api'
import './style.scss';
const { TextArea } = Input;

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
  state = {
    localIp:''
  }
  componentDidMount(){
    API.getLocalIp().then((response)=>{
      const {success,data,message} = response;
      if(success){
        this.setState({
          localIp:data.localIp
        })
      }
    })
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
  onClickQuickInput = () => {
    const {form,proxyServer} = this.props;
    const {ip} = proxyServer;
    const { localIp } = this.state;
    form.setFieldsValue({
      target:`http://${ip||localIp}:8080`
    })
  }
  render(){
    const {visible,editable,form,proxyServer,confirmLoading} = this.props;
    const {getFieldDecorator} = form;
    const {ip,target,remark} = proxyServer;
    const { localIp } = this.state;
    const formItemLayout = {
      labelCol: {
        span: 5
      },
      wrapperCol: {
        span: 18
      }
    };
    return (<Modal
      title={`${editable?'编辑':'新增'}代理规则`}
      visible={visible}
      confirmLoading={confirmLoading}
      onOk={this.handleModalOk}
      className="proxyRuleModal"
      onCancel={this.handleModalCancel}>
      <Form {...formItemLayout} >
        <Form.Item
          label="IP">
          {
            getFieldDecorator('ip',{
              rules:[{
                required: true, message: '请输入IP'
              }],
              initialValue:ip||localIp
            })(<Input placeholder="请输入ip"/>)
          }
        </Form.Item>
        <Form.Item
          label="目标服务地址">
          {
            getFieldDecorator('target',{
              rules:[{
                required: true,pattern:urlReg,message: '请输入正确格式的目标服务地址'
              }],
              initialValue:target
            })(<Input placeholder="请输入目标服务地址"/>)
          }
          <Tooltip placement="topLeft" title={`快速填写默认目标地址默认为：http://${ip||localIp}:8080`}>
            <Button shape="circle" className="retweet" size="small" onClick={this.onClickQuickInput} icon="retweet"/>
          </Tooltip>
        </Form.Item>
        <Form.Item
          label="备注">
          {
            getFieldDecorator('remark',{
              rules:[{
                required: false, message: '请输入备注'
              }],
              initialValue:remark
            })(<TextArea rows={4} placeholder="请输入备注"/>)
          }
        </Form.Item>
      </Form>
    </Modal>)
  }
}

export default Form.create()(ProxyRuleModal)
