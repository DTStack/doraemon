import React, { useState,useEffect } from 'react';
import Loading from '@/components/loading';
import './style.scss';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
const Toolbox = () => {
  const [loading, setLoading] = useState(false);
  const initTerm = () => {
    // Terminal.applyAddon(fit)
    // Terminal.applyAddon(attach)
    let term = new Terminal({
      cols: 100,
      rows: 20,
      cursorBlink: 5,
      scrollback: 30,
      tabStopWidth: 4,
      theme: {
        foreground: '#5FFDFF',
        background: '#060101'
      }
    })
    let terminalContainer = document.getElementById('terminal-container')
    term.open(terminalContainer)
    term.focus()
    term.prompt = () => {
      term.write(' ~ ')
    }
    // 实际需要使用socket来交互
    if ('WebSocket' in window) {
      term.writeln('\x1b[1;1;32mThe Browser supports websocket!\x1b[0m')
      term.prompt()
      // 这里创建socket.io客户端实例
      // socket监听事件
    } else {
      term.writeln('\x1b[1;1;31mThe Browser does not support websocket!\x1b[0m')
    }
    term.textarea.onkeydown = function (e) {
      console.log('User pressed key with keyCode: ', e.keyCode);
      //console.log('编码',)
      //ws.send(that.encodeBase64Content(e.keyCode.toString()));
      //ws.send('bHM=');
    }

    
    // term.on('key', function(key, ev) {
    //   const printable = !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey
    //   // 每行开头前缀长度 @ashinWu:$ 
    //   const threshold = this.prefix.length
    //   // 总偏移(长度) = 输入+前缀
    //   let fixation = this.input.length + threshold
    //   // 当前x偏移量
    //   let offset = term._core.buffer.x
    //   this.currentOffset = fixation
    //   // 禁用Home、PgUp、PgDn、Ins、Del键
    //   if ([36, 33, 34, 45, 46].indexOf(ev.keyCode) !== -1) return
    //   switch(ev.keyCode) {
    //     // 回车键
    //   case 13:
    //     this.handleInput()
    //     this.input = ''
    //     break;
    //     // 退格键
    //   case 8:
    //     if (offset > threshold) {
    //       term._core.buffer.x = offset - 1
    //         // \x1b[?K: 清除光标至行末的"可清除"字符
    //       term.write('\x1b[?K' + this.input.slice(offset - threshold))
    //         // 保留原来光标位置
    //       const cursor = this.bulidData(fixation - offset, '\x1b[D')
    //       term.write(cursor)
    //       this.input = `${this.input.slice(0, offset - threshold - 1)}${this.input.slice(offset - threshold)}`
    //     }
    //     break;
    //   case 35:
    //     const cursor = this.bulidData(fixation - offset, '\x1b[C')
    //     term.write(cursor)
    //     break
    //     // 方向盘上键
    //   case 38:
    //     if (this.histCommandList[this.histIndex - 1]) {
    //         // 将光标重置到末端
    //       term._core.buffer.x = fixation
    //       let b1 = '', b2 = '', b3 = '';
    //         // 构造退格(模拟替换效果) \b \b标识退一格; \b\b  \b\b表示退两格...
    //       for (let i = 0; i < this.input.length; i++) {
    //         b1 = b1 + '\b'
    //         b2 = b2 + ' '
    //         b3 = b3 + '\b'
    //       }
    //       term.write(b1 + b2 + b3)
    //       this.input = this.histCommandList[this.histIndex - 1]
    //       term.write(this.histCommandList[this.histIndex - 1])
    //       this.histIndex--
    //     }
    //     break;
    //     // 方向盘下键
    //   case 40:
    //     if (this.histCommandList[this.histIndex + 1]) {
    //         // 将光标重置到末端
    //       term._core.buffer.x = fixation  
    //       let b1 = '', b2 = '', b3 = '';
    //         // 构造退格(模拟替换效果) \b \b标识退一格; \b\b  \b\b表示退两格...
    //       for (let i = 0; i < this.histCommandList[this.histIndex].length; i++) {
    //         b1 = b1 + '\b'
    //         b2 = b2 + ' '
    //         b3 = b3 + '\b'
    //       }
    //       this.input = this.histCommandList[this.histIndex + 1]
    //       term.write(b1 + b2 + b3)
    //       term.write(this.histCommandList[this.histIndex + 1])
    //       this.histIndex++
    //     }
    //     break;
    //     // 方向盘左键
    //   case 37:
    //     if (offset > threshold) {
    //       term.write(key)
    //     }
    //     break;
    //     // 方向盘右键
    //   case 39:
    //     if (offset < fixation) {
    //       term.write(key)
    //     }
    //     break;
    //   default:
    //     if (printable) {
    //         // 限制输入最大长度 防止换行bug
    //       if (fixation >= term.cols)  return
    //         // 不在末尾插入时 要拼接
    //       if (offset < fixation) {
    //         term.write('\x1b[?K' + `${key}${this.input.slice(offset - threshold)}`)
    //         const cursor = this.bulidData(fixation - offset, '\x1b[D')
    //         term.write(cursor)
    //         this.input = `${this.input.slice(0, offset - threshold)}${key}${this.input.slice(offset - threshold)}`
    //       } else {
    //         term.write(key)
    //         this.input += key
    //       }
    //       this.histIndex = this.histCommandList.length
    //     }
    //     break;
    //   }
      
    // }.bind(this))
    // // 选中复制
    // term.on('selection', function() {
    //   if (term.hasSelection()) {
    //     this.copy = term.getSelection()
    //   }
    // }.bind(this))
    // term.attachCustomKeyEventHandler(function (ev) {
    //   // curl+v
    //   if (ev.keyCode === 86 && ev.ctrlKey) {
    //     const inline = (this.currentOffset + this.copy.length) >= term.cols
    //     if (inline) return
    //     if (this.copy) {
    //       term.write(this.copy)
    //       this.input += this.copy
    //     }
    //   }
    // }.bind(this))
    return term
  }
  useEffect(() => {
    initTerm()
  }, [])
  return (<Loading loading={loading}>
     <div className="page-toolbox" >
         web terminal
         <div id="terminal-container"></div>
     </div>
  </Loading>)
}
export default Toolbox;
