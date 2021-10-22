import React from 'react';
import { Modal } from 'antd'
import Loadable from 'react-loadable';
import { Loading } from '@/components/newLoading';

const WebTerminal = Loadable({
    loader: () => import('@/pages/webTerminal'),
    loading: Loading
})

const WebTerminalModal = (props) => {
    const { visible, onCancel, value: { hostIp, password, username } } = props
    return (
        <Modal
            title="Web Terminal"
            className="web-terminal__ant-modal"
            width={620}
            visible={visible}
            onCancel={onCancel}
            centered={true}
            keyboard={false}
            maskClosable={false}
            footer={null}
        >
            <WebTerminal host={hostIp} username={username} password={password}/>
        </Modal>
    )
}

export default WebTerminalModal
