import React, { useEffect, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

import Loading from '@/components/loading';
import { Socket } from '@/utils/socket';
import { TERMINAL_INPUT_KEY } from './const';
import './style.scss';
import 'xterm/css/xterm.css';

const WebTerminal: React.FC = (props: any) => {
    const { host, username, password } = props;

    const [terminal, setTerminal] = useState(null);
    const [socket, _setSocket] = useState(Socket);
    // const prefix = 'admin $ '
    let prefix = '';

    let inputText = '';
    let currentIndex = 0;
    const inputTextList = [];

    const getCursorOffsetLength = (offsetLength: number, subString = '') => {
        let cursorOffsetLength = '';
        for (let offset = 0; offset < offsetLength; offset++) {
            cursorOffsetLength += subString;
        }
        return cursorOffsetLength;
    };

    const handleInputText = () => {
        if (inputText.trim()) {
            terminal.write('\r\n');

            if (inputTextList.indexOf(inputText) === -1) {
                inputTextList.push(inputText);
            }
        }
        currentIndex = inputTextList.length;
        // socket 通信
        socket.emit('shellCommand', inputText + '\r');
        terminal.prompt();
    };

    const handleCtrlC = () => {
        terminal.write('\r\n');
        currentIndex = inputTextList.length;
        socket.emit('shellCommand', '\u0003');
        inputText = '';
        terminal.prompt();
    };

    const onKeyAction = () => {
        terminal.onKey((e) => {
            console.log('e.domEvent', e.domEvent, e.key);

            const { key } = e;
            const { keyCode, altKey, altGraphKey, ctrlKey, metaKey } = e.domEvent;

            const printAble = !(altKey || altGraphKey || ctrlKey || metaKey); // 禁止相关按键
            const totalOffsetLength = inputText.length + prefix.length; // 总偏移量
            const currentOffsetLength = terminal._core.buffer.x; // 当前x偏移量
            console.log('currentOffsetLength ========= ', currentOffsetLength);

            switch (keyCode) {
                case TERMINAL_INPUT_KEY.ENTER:
                    handleInputText();
                    inputText = '';
                    break;

                case TERMINAL_INPUT_KEY.BACK:
                    if (currentOffsetLength > prefix.length) {
                        const cursorOffSetLength = getCursorOffsetLength(
                            totalOffsetLength - currentOffsetLength,
                            '\x1b[D'
                        ); // 保留原来光标位置
                        terminal._core.buffer.x = currentOffsetLength - 1;
                        terminal.write(
                            '\x1b[?K' + inputText.slice(currentOffsetLength - prefix.length)
                        );
                        terminal.write(cursorOffSetLength);
                        inputText = `${inputText.slice(
                            0,
                            currentOffsetLength - prefix.length - 1
                        )}${inputText.slice(currentOffsetLength - prefix.length)}`;
                    }
                    break;

                case TERMINAL_INPUT_KEY.UP: {
                    if (!inputTextList[currentIndex - 1]) break;

                    const offsetLength = getCursorOffsetLength(inputText.length, '\x1b[D');

                    inputText = inputTextList[currentIndex - 1];
                    terminal.write(offsetLength + '\x1b[?K');
                    terminal.write(inputTextList[currentIndex - 1]);
                    terminal._core.buffer.x = totalOffsetLength;
                    currentIndex--;
                    break;
                }

                case TERMINAL_INPUT_KEY.DOWN: {
                    if (!inputTextList[currentIndex + 1]) break;

                    // 构造退格(模拟替换效果) \b \b标识退一格; \b\b  \b\b表示退两格...
                    const backLength = getCursorOffsetLength(
                        inputTextList[currentIndex].length,
                        '\b'
                    );
                    const blackLength = getCursorOffsetLength(
                        inputTextList[currentIndex].length,
                        ' '
                    );
                    inputText = inputTextList[currentIndex + 1];
                    terminal.write(backLength + blackLength + backLength);
                    terminal.write(inputTextList[currentIndex + 1]);
                    terminal._core.buffer.x = totalOffsetLength;
                    currentIndex++;
                    break;
                }

                case TERMINAL_INPUT_KEY.LEFT:
                    if (currentOffsetLength > prefix.length) {
                        terminal.write(key);
                    }
                    break;

                case TERMINAL_INPUT_KEY.RIGHT:
                    if (currentOffsetLength < totalOffsetLength) {
                        terminal.write(key);
                    }
                    break;

                default: {
                    // 在当前的坐标写上 key 和坐标后面的字符
                    // 移动停留在当前位置的光标
                    if (keyCode === TERMINAL_INPUT_KEY.CHAR_C && ctrlKey) {
                        handleCtrlC();
                        break;
                    }
                    if (!printAble) break;
                    if (totalOffsetLength >= terminal.cols) break;
                    if (currentOffsetLength >= totalOffsetLength) {
                        terminal.write(key);
                        inputText += key;
                        break;
                    }
                    const cursorOffSetLength = getCursorOffsetLength(
                        totalOffsetLength - currentOffsetLength,
                        '\x1b[D'
                    );
                    terminal.write(
                        '\x1b[?K' + `${key}${inputText.slice(currentOffsetLength - prefix.length)}`
                    );
                    terminal.write(cursorOffSetLength);
                    inputText =
                        inputText.slice(0, currentOffsetLength - prefix.length) +
                        key +
                        inputText.slice(currentOffsetLength - prefix.length);
                }
            }
        });
    };

    const initTerminal = (terminal) => {
        const fitAddon = new FitAddon();

        terminal.open(document.getElementById('terminal-container'));
        terminal.loadAddon(fitAddon); // terminal 的尺寸与父元素匹配
        fitAddon.fit();
        terminal.focus();

        terminal.prompt = () => {
            terminal.write(prefix);
        };

        terminal.writeln('\x1b[1;1;32mwellcom to web terminal!\x1b[0m');
        terminal.prompt();

        setTerminal(terminal);
    };

    const initSocket = () => {
        if (socket.disconnected) {
            socket.connect();
        }

        socket.on('connect', () => {
            console.log('*** SOCKET IO SERVER CONNECTION SUCCESS ***');
        });

        // 发送消息
        // socket.send('*** CLIENT SEND MESSAGE ***')
        // socket.emit('getShellCommand', { command: 'cd /' })

        // 登录服务器
        socket.emit('loginServer', { host, username, password });
    };

    useEffect(() => {
        const terminal: any = new Terminal({ cursorBlink: true });
        initTerminal(terminal);
        initSocket();
        return () => {
            socket.close();
            terminal.dispose();
        };
    }, []);

    useEffect(() => {
        if (terminal) {
            onKeyAction();

            socket.on('serverMsg', (res: string) => {
                console.log('*** SERVER MESSAGE ***', res);
                if (res && !inputTextList.find((value) => res === value + '\r\n')) {
                    terminal.write(res);
                    // TODO: Temporarily solve the problem of message merging
                    const arr = res?.split('\r\n');
                    prefix = arr[arr?.length - 1] ?? res;
                }
            });
        }
    }, [terminal]);

    return (
        <Loading>
            <div id="terminal-container" className="c-webTerminal__container"></div>
        </Loading>
    );
};
export default WebTerminal;
