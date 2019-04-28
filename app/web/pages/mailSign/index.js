import React from 'react';
import './style.scss';
import html2canvas from 'html2canvas';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { saveAs } from 'file-saver';

let cropper = null;
export default class MainSign extends React.PureComponent  {
  constructor(props) {
    super(props);

    this.state = {
      name: '',
      nick: '',
      phone: '',
      title: '',
      mail: '',
      addr: '杭州市西湖区紫霞街176号互联网创新创业园2号楼8F',
      previewImgSrc: ''
    }
  }

  crop() {
    let image = cropper.getCroppedCanvas({
      width: 140,
      height: 140
    });
    this.setState({
      previewUrl: image.toDataURL('image/jpeg')
    })
  }

  clear() {
    this.refs.file.value = null
    this.setState({
      previewUrl: null,
      image: null,
      previewImgSrc: ''
    })
  }

  onChange(evt) {
    let file = evt.target.files[0];
    console.log(evt.target.files)
    var reader = new FileReader();
    reader.onload = (e) => {
      this.setState({ 
        previewImgSrc: e.target.result,
        image: file
      }, () => {
        if (cropper) {
          cropper.destroy();
        }
        cropper = null;
        cropper = new Cropper(this.previewImg, {
          aspectRatio: 1 / 1,  // 宽高比
          viewMode: 1
        })
      })
    }
    reader.readAsDataURL(file);
  }

  
  handleClick(e) {
    const {value, name} = e.target;
    let o = {};
    o[name] = value;
    this.setState(o);
  }

  trim(c) {
    var ctx = c.getContext('2d'),
      copy = document.createElement('canvas').getContext('2d'),
      pixels = ctx.getImageData(0, 0, c.width, c.height),
      l = pixels.data.length,
      i,
      bound = {
        top: null,
        left: null,
        right: null,
        bottom: null
      },
      x, y;

    for (i = 0; i < l; i += 4) {
      if (pixels.data[i+3] !== 0) {
        x = (i / 4) % c.width;
        y = ~~((i / 4) / c.width);

        if (bound.top === null) {
          bound.top = y;
        }

        if (bound.left === null) {
          bound.left = x;
        } else if (x < bound.left) {
          bound.left = x;
        }

        if (bound.right === null) {
          bound.right = x;
        } else if (bound.right < x) {
          bound.right = x;
        }

        if (bound.bottom === null) {
          bound.bottom = y;
        } else if (bound.bottom < y) {
          bound.bottom = y;
        }
      }
    }

    var trimHeight = bound.bottom - bound.top,
      trimWidth = bound.right - bound.left,
      trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

    copy.canvas.width = trimWidth;
    copy.canvas.height = trimHeight;
    copy.putImageData(trimmed, 0, 0);

    return copy.canvas;
  }

  createImg() { 
    html2canvas(this.el, {
      allowTaint: true,
      timeout: 1000
    }).then((canvas) => {
      let copy;
      try{
        copy = this.trim(canvas);
      }
      catch(err) {
        console.warn(err);
        alert('预览区域已不在可视范围');
        return;
      }

      this.setState({
        img: copy.toDataURL()
      }, () => {
        setTimeout(() => {
          const h = document.getElementById('j-pic').getBoundingClientRect().height;

          if(h < 213) {
            this.setState({
              err: '图片尺寸错误，重试中...'
            });
            window.scrollBy(0, Math.random() * 13 - 10);
            this.createImg();
          }
          else {
            this.setState({err: ''})
            copy.toBlob((blob) => {
              saveAs(blob, this.state.name + ".png");
            });
          }
        }, 100);
      });
    });
  }

  render() {
    const { name, nick, phone, title, mail, addr, previewImgSrc } = this.state;
    return (
      <div className="mail-sign">
        <div className="form" >
          <h3>1. 个人信息</h3>
          <hr/>
          <br />
          <p className="form-item">
            <span>姓名：</span><input onChange={ this.handleClick.bind(this) } type="text" name="name"/>
          </p>
          <p className="form-item">
            <span>花名：</span><input onChange={ this.handleClick.bind(this) } type="text" name="nick"/>
          </p>
          <p className="form-item">
            <span>职位：</span><input onChange={ this.handleClick.bind(this) } type="text" name="title"/>
          </p>
          <p className="form-item">
            <span>电话：</span><input onChange={ this.handleClick.bind(this) } type="text" name="phone"/>
          </p>
          <p className="form-item">
            <span>邮箱：</span><input onChange={ this.handleClick.bind(this) } type="text" name="mail"/>
          </p>
          <p className="form-item">
            <span>地址：</span><input onChange={ this.handleClick.bind(this) } type="text" name="addr"/>
          </p>
          <p className="form-item">
            <span>头像: </span><input ref='file' type='file' onChange={this.onChange.bind(this)} /> 
          </p>
          {this.state.image &&
            <div>
              <div style={{ width: 400, maxHeight: 600 }}>
                <img key={previewImgSrc} src={previewImgSrc} ref={(node) => this.previewImg = node} style={{ maxWidth: '100%' }}/>
              </div>
              <p className="form-item">
                <button onClick={this.crop.bind(this)}>裁切</button>
                <button onClick={this.clear.bind(this)}>清除</button>
              </p>
            </div>
          }
        </div>

        <h3 style={{ marginTop: 50 }}>2. 预览</h3>
        <hr/>
        <div className="m-box" id="j-preview" style={{position: 'relative'}} ref={ el => this.el = el }>
          <p style={{
            position: 'absolute',
            top: 35, left: 415, color: '#393939',fontSize: 15
          }}>{name}<span style={{ color: '#38A5C9' }}>（{ nick }）</span></p>
          <p style={{
            position: 'absolute',
            top: 76, left: 435, fontSize: 14, color: '#393939'
          }}>袋鼠云-{ title }</p>
          <p style={{
            position: 'absolute',
            top: 105, left: 435, fontSize: 14, color: '#393939'
          }}>{ phone }</p>

          <p style={{
            position: 'absolute',
            top: 133, left: 435, fontSize: 14, color: '#393939'
          }}>{ mail }</p>

          <p style={{
            position: 'absolute',
            top: 160, left: 435, fontSize: 14, color: '#393939'
          }}>{ addr }</p>

          <div className="avatar"
            style={{ width: 138, height: 138, borderRadius: 69, overflow: 'hidden',
              position: 'absolute',top: 38, left: 256, textAlign: 'center'
            }}
          >
            <img style={{ width: '100%', height: '100%' }} src={ this.state.previewUrl } alt=""/>
          </div>
        </div>

        <h3 style={{marginTop: 50}}>3. 生成结果</h3>
        <hr/>

        <button onClick={ this.createImg.bind(this) }>保存图片</button>
        <span style={{color: '#f30', fontSize: 12}}>{this.state.err}</span>
        <div className="img" ref={ box => this.box = box } style={{ height: 250, border: '1px dashed #ccc', padding: 10 }}>
          <img src={ this.state.img } alt="" id="j-pic" />
        </div>
        <p style={{ color: 'red'}}>提示: 自动保存或在图片上右键选择另存为。</p>
      </div>
    );
  }
}
