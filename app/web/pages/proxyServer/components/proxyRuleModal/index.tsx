import * as React from 'react';
import { RetweetOutlined } from '@ant-design/icons';
import { Modal, Input, Tooltip, Button, message as Message, Select, Radio, Form, FormInstance } from 'antd';
import PropsTypes from 'prop-types';
import { urlReg } from '@/utils/reg';
import { API } from '@/api'
import './style.scss';
const { TextArea } = Input;
const { Option } = Select;

class ProxyRuleModal extends React.PureComponent<any, any>{
    static defaultProps = {
        visible: false,
        localIp: '',
        onOk: () => { },
        onCancel: () => { },
        proxyServer: {},
        targetAddrs: [],
        confirmLoading: false
    }
    static propsTypes = {
        localIp: PropsTypes.string,
        visible: PropsTypes.bool,
        onOk: PropsTypes.func,
        onCancel: PropsTypes.func,
        proxyServer: PropsTypes.object,
        targetAddrs: PropsTypes.array,
        confirmLoading: PropsTypes.bool
    }

    formRef: FormInstance<any> = null;

    handleModalOk = () => {
        const { onOk, editable, proxyServer } = this.props;
        this.formRef.validateFields().then((values: any) => {
            if (editable) {
                onOk(Object.assign({}, proxyServer, values));
            } else {
                onOk(values);
            }
        });
    }
    handleModalCancel = () => {
        const { onCancel } = this.props;
        onCancel();
    }
    onClickQuickInput = () => {
        const { proxyServer, localIp } = this.props;
        const { ip } = proxyServer;
        this.formRef.setFieldsValue({
            target: `http://${ip || localIp}:8080`
        })
    }
    onChangeRadio = () => {
        this.formRef.setFieldsValue({
            target: undefined
        })
    }
    render() {
        const { visible, editable, proxyServer, confirmLoading, targetAddrs, localIp } = this.props;
        const { ip, target, remark, mode } = proxyServer;
        const formItemLayout: any = {
            labelCol: {
                span: 5
            },
            wrapperCol: {
                span: 18
            }
        };
        return (
            <Modal
                title={`${editable ? '编辑' : '新增'}代理规则`}
                visible={visible}
                confirmLoading={confirmLoading}
                onOk={this.handleModalOk}
                className="proxy-rule-modal"
                onCancel={this.handleModalCancel}
            >
                <Form
                    {...formItemLayout}
                    ref={(form) => this.formRef = form}
                    initialValues={{
                        ip: ip || localIp,
                        mode: mode === undefined ? '0' : mode,
                        target: target || undefined,
                        remark: remark
                    }}
                    scrollToFirstError={true}
                >
                    <Form.Item
                        label="IP"
                        name="ip"
                        rules={[{ required: true, message: '请输入IP' }]}
                    >
                        <Input placeholder="请输入ip" />
                    </Form.Item>
                    <Form.Item
                        label="代理模式"
                        name="mode"
                        rules={[{ required: true, message: '请输入IP' }]}
                    >
                        <Radio.Group onChange={this.onChangeRadio}>
                            <Radio value="0">手动</Radio>
                            <Radio value="1">引用</Radio>
                        </Radio.Group>
                    </Form.Item>
                    <Form.Item
                        noStyle
                        shouldUpdate={(prevValues: any, currentValues: any) => prevValues.mode !== currentValues.mode}
                    >
                        {({ getFieldValue }) =>
                            getFieldValue('mode') === '0' ? (
                                <div className="proxy-rule-modal__form-target">
                                    <Form.Item
                                        label="目标服务地址"
                                        name="target"
                                        rules={[{ required: true, pattern: urlReg, message: '请输入正确格式的目标服务地址，以 http(s):// 开头' }]}
                                    >
                                        <Input placeholder="请输入正确格式的目标服务地址，以 http(s):// 开头" />
                                    </Form.Item>
                                    <Tooltip placement="topLeft" title={`快速填写默认目标地址默认为：http://${ip || localIp}:8080`}>
                                        <Button shape="circle" className="retweet" size="small" onClick={this.onClickQuickInput} icon={<RetweetOutlined />} />
                                    </Tooltip>
                                </div>
                            ) : (
                                <Form.Item
                                    label="目标服务地址"
                                    name="target"
                                    rules={[{ required: true, message: '请输入正确格式的目标服务地址，以 http(s):// 开头' }]}
                                >
                                    <Select placeholder="请输入目标服务地址">
                                        {
                                            targetAddrs.map((item: any) => <Option key={item.id} value={item.target}>{item.remark}（{item.target}）</Option>)
                                        }
                                    </Select>
                                </Form.Item>
                            )
                        }
                    </Form.Item>
                    <Form.Item
                        label="备注"
                        name="remark"
                        rules={[{ required: false, message: '请输入备注' }]}
                    >
                        <TextArea rows={4} placeholder="请输入备注" />
                    </Form.Item>
                </Form>
            </Modal>
        );
    }
}

export default ProxyRuleModal;
