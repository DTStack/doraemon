import React, { forwardRef } from 'react';
import { Modal, Input, Form, FormInstance } from 'antd';
import PropsTypes from 'prop-types';
import { urlReg } from '@/utils/reg';
import ProxyAddrsTable from './proxyAddrsTable';

const ProxyAddrsTableRef = forwardRef((props: any, ref: any) => <ProxyAddrsTable {...props} />)

class ProxyServerModal extends React.PureComponent<any, any> {
    state: any = {
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

    formRef: FormInstance<any> = null;

    componentDidMount() {
        const { target, addrs } = this.props.proxyServer;
        if (Array.isArray(addrs) && addrs.length) {
            const addrIdx = addrs.findIndex((item: any) => item.target === target);
            this.setState({
                selectedRowKeys: [addrIdx]
            });
        }
    }

    handleModalOk = () => {
        const { onOk, editable, proxyServer } = this.props;
        this.formRef.validateFields().then((values: any) => {
            values.addrs = this.formatTargetAddrs(values.addrs);
            // 保存
            if (editable) {
                onOk(Object.assign({}, proxyServer, values));
            } else {
                onOk(values);
            }
        })
    }

    handleModalCancel = () => {
        const { onCancel } = this.props;
        onCancel();
    }

    // 目标服务地址处理
    formatTargetAddrs = (targetAddrs: any) => {
        // 编辑，带上之前删掉的数据
        const { editable, proxyServer: { addrs } } = this.props;
        const { deleteRowKeys } = this.state;
        const deleteRow: any = [];
        if (editable) {
            addrs.forEach((item: any) => {
                if (deleteRowKeys.includes(item.rowId)) {
                    deleteRow.push({
                        ...item,
                        is_delete: 1
                    })
                }
            })
        }
        // 表格数据去rowId
        const newAddrs: any = [...targetAddrs, ...deleteRow].map(({ rowId, ...rest }) => ({ ...rest }));
        return newAddrs;
    }

    // 目标服务地址列表校验
    addrsValidator = (rules: any, value: any, callback: any) => {
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
    handleRowSelect = (selectedRowKeys: any, selectedRows: any) => {
        this.setState({ selectedRowKeys });
        this.formRef.setFieldsValue({
            target: selectedRows[0].target
        })
    }

    render() {
        const { selectedRowKeys, deleteRowKeys } = this.state;
        const { visible, editable, proxyServer, confirmLoading } = this.props;
        const { name, target, api_doc_url, addrs } = proxyServer;
        const formItemLayout: any = {
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
            <Form
                {...formItemLayout}
                ref={(form: any) => this.formRef = form}
                initialValues={{
                    name: name,
                    target: target,
                    api_doc_url: api_doc_url,
                    addrs: addrs && addrs.length ? addrs : [{
                        rowId: 0,
                        target: '',
                        remark: ''
                    }]
                }}
                scrollToFirstError={true}
            >
                <Form.Item
                    label="代理服务名称"
                    name="name"
                    rules={[{
                        required: true, message: '请输入代理服务名称'
                    }]}
                >
                    <Input placeholder="请输入代理服务名称" />
                </Form.Item>
                <Form.Item
                    label="默认目标服务地址"
                    name="target"
                    rules={[{
                        required: true, pattern: urlReg, message: '请输入正确格式的目标服务地址'
                    }]}
                >
                    <Input placeholder="请通过下表选择默认目标服务地址" disabled />
                </Form.Item>
                <Form.Item
                    label="接口文档地址"
                    name="api_doc_url"
                >
                    <Input placeholder="请输入接口文档地址" />
                </Form.Item>
                <Form.Item
                    label="目标服务地址列表"
                    name="addrs"
                    rules={[
                        { required: true, message: '至少创建一条目标服务地址' },
                        { validator: this.addrsValidator }
                    ]}
                >
                    <ProxyAddrsTableRef
                        rowDelete={{
                            deleteRowKeys,
                            onChange: (deleteRowKeys: any) => this.setState({ deleteRowKeys })
                        }}
                        rowSelection={{
                            type: 'radio',
                            selectedRowKeys,
                            onChange: this.handleRowSelect
                        }}
                    />
                </Form.Item>
            </Form>
        </Modal>)
    }
}
export default ProxyServerModal;
