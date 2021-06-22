import React, { useState,useEffect } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
// import './style.scss'
import 'xterm/css/xterm.css'

import Loading from '@/components/loading'

const WebTerminal: React.FC = () => {
    const [loading, setLoading] = useState(false);

    const initTerminal = () => {
        let linkpath = '';
        // let ws = new WebSocket(linkpath);

        const prefix = 'admin $ '
        const fitAddon = new FitAddon()
        const terminal: any = new Terminal({ cursorBlink: true })
        const termContainer = document.getElementById('terminal-container')
        let input = ''
        let currentOffset = 0
        let histCommandList = []
        let histIndex = 0

        terminal.loadAddon(fitAddon)    // terminal 的尺寸与父元素匹配
        terminal.open(termContainer)
        fitAddon.fit()

        terminal.focus()
        terminal.prompt = () => {
            terminal.write(prefix)
        }
        terminal.prompt()
        terminal.bulidData = (length, subString) => {
            let cursor = ''
            for (let i = 0; i < length; i++) {
                cursor += subString
            }
            return cursor;
        }
        terminal.handleInput = () => {
            // 判断空值
            terminal.write('\r\n')
            if (input.trim()) {
                // 记录历史命令
                if (histCommandList[histCommandList.length - 1] !== input) {
                    histCommandList.push(input)
                    histIndex = histCommandList.length
                }
                const command = input.trim().split(' ')
                // 可限制可用命令
                // 这里进行socket交互
                if ('WebSocket' in window) {

                }

                switch (command[0]) {
                case 'help':
                    // terminal.writeln('\x1b[40;33;1m\nthis is a web terminal demo based on xterm!\x1b[0m\n此demo模拟shell上下左右和退格键效果\n')
                    break
                default:
                    // terminal.writeln(input)
                    break
                }
            }
            terminal.prompt()
        }
        terminal.onKey(e => {
            console.log('e.domEvent', e.domEvent, e.key) 
            const printable = !e.domEvent.altKey && !e.domEvent.altGraphKey && !e.domEvent.ctrlKey && !e.domEvent.metaKey
            // 每行开头前缀长度 @ashinWu:$
            const threshold = prefix.length
            // 总偏移(长度) = 输入+前缀
            let fixation = input.length + threshold
            // 当前x偏移量
            let offset = terminal._core.buffer.x
            currentOffset = fixation
            // 禁用Home、PgUp、PgDn、Ins、Del键
            if ([36, 33, 34, 45, 46].indexOf(e.domEvent.keyCode) !== -1) return

            const { keyCode } = e.domEvent
            const { key } = e

            switch(keyCode) {
            // 回车键
            case 13:
                terminal.handleInput()
                input = ''
                break
            // 退格键
            case 8:
                if (offset > threshold) {
                    terminal._core.buffer.x = offset - 1
                    // \x1b[?K: 清除光标至行末的"可清除"字符
                    terminal.write('\x1b[?K' + input.slice(offset - threshold))
                    // 保留原来光标位置
                    const cursor = terminal.bulidData(fixation - offset, '\x1b[D')
                    terminal.write(cursor)
                    input = `${input.slice(0, offset - threshold - 1)}${input.slice(offset - threshold)}`
                }
                break
            case 35:
                const cursor = terminal.bulidData(fixation - offset, '\x1b[C')
                terminal.write(cursor)
                break
            // 方向盘上键
            case 38:
                if (histCommandList[histIndex - 1]) {
                    // 将光标重置到末端
                    terminal._core.buffer.x = fixation
                    let b1 = '', b2 = '', b3 = '';
                    // 构造退格(模拟替换效果) \b \b标识退一格; \b\b  \b\b表示退两格...
                    for (let i = 0; i < input.length; i++) {
                        b1 = b1 + '\b'
                        b2 = b2 + ' '
                        b3 = b3 + '\b'
                    }
                    terminal.write(b1 + b2 + b3)
                    input = histCommandList[histIndex - 1]
                    terminal.write(histCommandList[histIndex - 1])
                    histIndex--
                }
                break;
                // 方向盘下键
            case 40:
                if (histCommandList[histIndex + 1]) {
                    // 将光标重置到末端
                    terminal._core.buffer.x = fixation
                    let b1 = '', b2 = '', b3 = '';
                    // 构造退格(模拟替换效果) \b \b标识退一格; \b\b  \b\b表示退两格...
                    for (let i = 0; i < histCommandList[histIndex].length; i++) {
                        b1 = b1 + '\b'
                        b2 = b2 + ' '
                        b3 = b3 + '\b'
                    }
                    input = histCommandList[histIndex + 1]
                    terminal.write(b1 + b2 + b3)
                    terminal.write(histCommandList[histIndex + 1])
                    histIndex++
                }
                break;
                // 方向盘左键
            case 37:
                if (offset > threshold) {
                    terminal.write(key)
                }
                break;
                // 方向盘右键
            case 39:
                if (offset < fixation) {
                    terminal.write(key)
                }
                break;
            default:
                if (printable) {
                    // 限制输入最大长度 防止换行bug
                    if (fixation >= terminal.cols)  return

                    // 不在末尾插入时 要拼接
                    if (offset < fixation) {
                        terminal.write('\x1b[?K' + `${key}${input.slice(offset - threshold)}`)
                        const cursor = terminal.bulidData(fixation - offset, '\x1b[D')
                        terminal.write(cursor)
                        input = `${input.slice(0, offset - threshold)}${key}${input.slice(offset - threshold)}`
                    } else {
                        terminal.write(key)
                        input += key
                    }
                    histIndex = histCommandList.length
                }
                break;
            }
        })
        // 实际需要使用socket来交互
        // if ('WebSocket' in window) {
        //     terminal.writeln('\x1b[1;1;32mThe Browser supports websocket!\x1b[0m')
        //     terminal.prompt()
        //     // 这里创建socket.io客户端实例
        //     // socket监听事件
        // } else {
        //     terminal.writeln('\x1b[1;1;31mThe Browser does not support websocket!\x1b[0m')
        // }
        terminal.textarea.onkeydown = function (ev: any) {
            console.log('User pressed key with keyCode: ', ev);
        }
        return terminal
    }

    useEffect(() => {
        initTerminal()
    }, [])

    return (<Loading loading={loading}>
        <div className="page-toolbox">
            web terminal
            <div id="terminal-container" style={{ width: 800, height: 500 }}></div>
        </div>
    </Loading>)
}
export default WebTerminal
