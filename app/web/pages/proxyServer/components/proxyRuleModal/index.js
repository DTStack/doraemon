import React from 'react';
import { Modal, Form, Input, Tooltip, Button, message as Message, Select } from 'antd';
import PropsTypes from 'prop-types';
import {urlReg} from '@/utils/reg';
import { API } from '@/api'
import './style.scss';
const { TextArea } = Input;
const { Option } = Select;

class ProxyRuleModal extends React.PureComponent{
  static defaultProps = {
    visible:false,
    onOk:()=>{},
    onCancel:()=>{},
    proxyServer:{},
    targetAddrs: [],
    confirmLoading:false
  }
  static propsTypes ={
    visible:PropsTypes.bool,
    onOk:PropsTypes.func,
    onCancel:PropsTypes.func,
    proxyServer:PropsTypes.object,
    targetAddrs:PropsTypes.array,
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
        values.target = values.target[0];
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

  // 目标地址校验
  targetAddrValidator = (rule, value, callback) => {
    if (value.length > 1) {
      callback('至多只可选择一个目标服务地址');
    }
    for (const target of value) {
      if (!urlReg.test(target)) {
        callback('请输入正确格式的目标服务地址');
      }
    }
    callback();
  }
  render(){
    const { visible, editable, form, proxyServer, confirmLoading, targetAddrs } = this.props;
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
              rules:[
                { required: true, message: '请输入或选择目标服务地址'},
                { validator: this.targetAddrValidator }
              ],
              initialValue: target ? [target] : undefined
            })(
              <Select
                mode="tags"
                placeholder="请输入目标服务地址"
              >
                {
                  targetAddrs.map(item => <Option key={item.id} value={item.target}>{item.remark}（{item.target}）</Option>)
                }
              </Select>
            )
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
