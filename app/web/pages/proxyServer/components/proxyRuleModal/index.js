import React from 'react';
import { RetweetOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Input, Tooltip, Button, message as Message, Select, Radio } from 'antd';
import PropsTypes from 'prop-types';
import {urlReg} from '@/utils/reg';
import { API } from '@/api'
import './style.scss';
const { TextArea } = Input;
const { Option } = Select;

class ProxyRuleModal extends React.PureComponent{
  static defaultProps = {
    visible:false,
    localIp:'',
    onOk:()=>{},
    onCancel:()=>{},
    proxyServer:{},
    targetAddrs: [],
    confirmLoading:false
  }
  static propsTypes ={
    localIp:PropsTypes.string,
    visible:PropsTypes.bool,
    onOk:PropsTypes.func,
    onCancel:PropsTypes.func,
    proxyServer:PropsTypes.object,
    targetAddrs:PropsTypes.array,
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
  onClickQuickInput = () => {
    const {form,proxyServer,localIp} = this.props;
    const {ip} = proxyServer;
    form.setFieldsValue({
      target:`http://${ip||localIp}:8080`
    })
  }
  onChangeRadio = () => {
    this.props.form.setFieldsValue({
      target:undefined
    })
  }
  render(){
    const { visible, editable, form, proxyServer, confirmLoading, targetAddrs,localIp } = this.props;
    const {getFieldDecorator,getFieldValue} = form;
    const {ip,target,remark,mode} = proxyServer;
    const formItemLayout = {
      labelCol: {
        span: 5
      },
      wrapperCol: {
        span: 18
      }
    };
    return (
      <Modal
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
            label="代理模式">
            {
              getFieldDecorator('mode',{
                rules:[{
                  required: true, message: '请输入IP'
                }],
                initialValue:mode===undefined ? '0': mode
              })(<Radio.Group onChange={this.onChangeRadio}>
                <Radio value="0">手动</Radio>
                <Radio value="1">引用</Radio>
              </Radio.Group>)
            }
          </Form.Item>
          {
            getFieldValue('mode')==='0' ? (
              <Form.Item
              label="目标服务地址">
              {
                getFieldDecorator('target',{
                  rules: [{
                    required: true, pattern: urlReg, message: '请输入正确格式的目标服务地址'
                  }],
                  initialValue:target
                })(<Input placeholder="请输入正确格式的目标服务地址"/>)
              }
              <Tooltip placement="topLeft" title={`快速填写默认目标地址默认为：http://${ip||localIp}:8080`}>
                <Button shape="circle" className="retweet" size="small" onClick={this.onClickQuickInput} icon={<RetweetOutlined />}/>
              </Tooltip>
            </Form.Item>
            ):(
              <Form.Item
              label="目标服务地址">
              {
                getFieldDecorator('target',{
                  rules:[
                    { required: true, message: '请输入或选择目标服务地址'}
                  ],
                  initialValue: target ? target : undefined
                })(
                  <Select
                    placeholder="请输入目标服务地址"
                  >
                    {
                      targetAddrs.map(item => <Option key={item.id} value={item.target}>{item.remark}（{item.target}）</Option>)
                    }
                  </Select>
                )
              }
            </Form.Item>
           
            )
          }
         
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
      </Modal>
    );
  }
}

export default Form.create()(ProxyRuleModal)
