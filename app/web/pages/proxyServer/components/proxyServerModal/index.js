import React, { forwardRef } from 'react';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Input, Table } from 'antd';
import PropsTypes from 'prop-types';
import { urlReg } from '@/utils/reg';
import ProxyAddrsTable from './proxyAddrsTable';

const ProxyAddrsTableRef = forwardRef((props, ref) => <ProxyAddrsTable {...props} />)

class ProxyServerModal extends React.PureComponent {
  state = {
    selectedRowKeys: [0],
    deleteRowKeys: []
  }
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

  componentDidMount() {
    const { target, addrs } = this.props.proxyServer;
    if (Array.isArray(addrs) && addrs.length) {
      const addrIdx = addrs.findIndex(item => item.target === target);
      this.setState({
        selectedRowKeys: [addrIdx]
      });
    }
  }

  handleModalOk = () => {
    const { onOk, form, editable, proxyServer } = this.props;
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        values.addrs = this.formatTargetAddrs(values.addrs);
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

  // 目标服务地址处理
  formatTargetAddrs = (targetAddrs) => {
    // 编辑，带上之前删掉的数据
    const { editable, proxyServer: { addrs } } = this.props;
    const { deleteRowKeys } = this.state;
    const deleteRow = [];
    if (editable) {
      addrs.forEach(item => {
        if (deleteRowKeys.includes(item.rowId)) {
          deleteRow.push({
            ...item,
            is_delete: 1
          })
        }
      })
    }
    // 表格数据去rowId
    const newAddrs = [...targetAddrs, ...deleteRow].map(({ rowId, ...rest }) => ({ ...rest }));
    return newAddrs;
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
  handleRowSelect = (selectedRowKeys, selectedRows) => {
    this.setState({ selectedRowKeys });
    this.props.form.setFieldsValue({
      target: selectedRows[0].target
    })
  }

  render() {
    const { selectedRowKeys, deleteRowKeys } = this.state;
    const { visible, editable, form, proxyServer, confirmLoading } = this.props;
    const { getFieldDecorator } = form;
    const { name, target, api_doc_url, addrs } = proxyServer;
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
          label="接口文档地址">
          {
            getFieldDecorator('api_doc_url', {
              initialValue: api_doc_url
            })(<Input placeholder="请输入接口文档地址" />)
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
                rowDelete={{
                  deleteRowKeys,
                  onChange: deleteRowKeys => this.setState({ deleteRowKeys })
                }}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys,
                  onChange: this.handleRowSelect
                }}
              />
            )
          }
        </Form.Item>
      </Form>
    </Modal>)
  }
}
export default Form.create()(ProxyServerModal)
