import React, { forwardRef } from 'react';
import { Modal, Form, Input, Table } from 'antd';
import PropsTypes from 'prop-types';
import { urlReg } from '@/utils/reg';
import ProxyAddrsTable from './proxyAddrsTable';

const ProxyAddrsTableRef = forwardRef((props, ref) => <ProxyAddrsTable {...props} />)

class ProxyServerModal extends React.PureComponent {
  static defaultProps = {
    visible: false,
    onOk: () => { },
    onCancel: () => { },
    proxyServer: {},
    confirmLoading: false
  }
  static propsTypes = {
    visible: PropsTypes.bool,
    onOk: PropsTypes.func,
    onCancel: PropsTypes.func,
    proxyServer: PropsTypes.object,
    confirmLoading: PropsTypes.bool
  }
  handleModalOk = () => {
    const { onOk, form, editable, proxyServer } = this.props;
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        // 表格数据去rowId
        const newAddrs = values.addrs.map(({ rowId, ...rest }) => ({ ...rest }))
        values.addrs = newAddrs;
        // 保存
        if (editable) {
          onOk(Object.assign({}, proxyServer, values));
        } else {
          onOk(values);
        }
      }
    });
  }
  handleModalCancel = () => {
    const { onCancel } = this.props;
    onCancel();
  }

  // 目标服务地址列表校验
  addrsValidator = (rules, value, callback) => {
    if (Array.isArray(value)) {
      for (const addr of value) {
        const target = addr.target;
        if (!target) {
          callback('请输入目标服务地址');
        }
        if (!urlReg.test(target)) {
          callback('请输入正确格式的目标服务地址');
        }
      }
    }
    callback();
  }

  // 通过表格选择默认目标地址
  handleRowSelect = (selectedRow) => {
    this.props.form.setFieldsValue({ target: selectedRow.target })
  }

  // 默认选择的目标地址
  getDefaultSelectedKeys = () => {
    const { proxyServer } = this.props;
    const { target, addrs } = proxyServer;
    if (Array.isArray(addrs) && addrs.length) {
      const addrIdx = addrs.findIndex(item => item.target === target);
      return [addrIdx];
    }
    return [0];
  }

  render() {
    const { visible, editable, form, proxyServer, confirmLoading } = this.props;
    const { getFieldDecorator } = form;
    const { name, target, addrs } = proxyServer;
    const formItemLayout = {
      labelCol: {
        span: 6
      },
      wrapperCol: {
        span: 17
      }
    };
    return (<Modal
      title={`${editable ? '编辑' : '新增'}代理服务`}
      width={720}
      visible={visible}
      confirmLoading={confirmLoading}
      onOk={this.handleModalOk}
      onCancel={this.handleModalCancel}>
      <Form {...formItemLayout} >
        <Form.Item
          label="代理服务名称">
          {
            getFieldDecorator('name', {
              rules: [{
                required: true, message: '请输入代理服务名称'
              }],
              initialValue: name
            })(<Input placeholder="请输入代理服务名称" />)
          }
        </Form.Item>
        <Form.Item
          label="默认目标服务地址">
          {
            getFieldDecorator('target', {
              rules: [{
                required: true, pattern: urlReg, message: '请输入正确格式的目标服务地址'
              }],
              initialValue: target
            })(<Input placeholder="请通过下表选择默认目标服务地址" disabled />)
          }
        </Form.Item>
        <Form.Item
          label="目标服务地址列表">
          {
            getFieldDecorator('addrs', {
              rules: [
                { required: true, message: '至少创建一条目标服务地址' },
                { validator: this.addrsValidator }
              ],
              initialValue: addrs && addrs.length ? addrs : [{
                rowId: 0,
                target: '',
                remark: ''
              }]
            })(
              <ProxyAddrsTableRef
                defaultSelectedKeys={this.getDefaultSelectedKeys()}
                onRowSelect={this.handleRowSelect}
              />
            )
          }
        </Form.Item>
      </Form>
    </Modal>)
  }
}
export default Form.create()(ProxyServerModal)
