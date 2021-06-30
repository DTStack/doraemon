# 哆啦 A 梦 (Doraemon) v1.1.0 (2020-12-05)



> 致力于解放更多生产力，让日常工作变的更加高效、轻松、便捷、愉快～



## 简介
![logo.png](https://cdn.nlark.com/yuque/0/2020/png/241689/1607057068446-ff5ec595-bea8-4cf5-9554-42c9df000885.png#align=left&display=inline&height=64&margin=%5Bobject%20Object%5D&name=logo.png&originHeight=64&originWidth=64&size=5693&status=done&style=none&width=64)[哆啦 A 梦（Doraemon）](http://doraemon:7001/page/home)是一个帮你整理日常开发、配置、代理服务、主机等资源的管理工具。


通过`应用中心`可`收纳`、`分享`常用、好用的的`应用链接`；多环境的`主机（Host）`账号和密码等信息，在这里我们都可以统一管理维护，便于查看和管理；`配置管理`模块，可轻松维护远程服务主机上的`配置文件`；`在线代理（Proxy）`改变传统前后端联调方式，接口联调时，不再需要前后端另起本地服务。另外，前端同学需求切换开发环境时，只需要在线简单的配置即可。


_我们正在不断迭代和完善中，还有更多功能等待你的探索。_


## 应用中心


我们默认内置了[签名制作（袋鼠云邮箱签名制作）](http://doraemon:7001/page/mail-sign)、[Remote Hosts](##) 等应用，还有更多实用工具等`快捷链接`。
![新logo应用中心.2020-12-04 15_51_20.gif](https://cdn.nlark.com/yuque/0/2020/gif/188521/1607068291520-432b2a0b-f33f-454c-af6c-e78b44db93a0.gif#align=left&display=inline&height=980&margin=%5Bobject%20Object%5D&name=%E6%96%B0logo%E5%BA%94%E7%94%A8%E4%B8%AD%E5%BF%83.2020-12-04%2015_51_20.gif&originHeight=980&originWidth=1392&size=1028800&status=done&style=none&width=1392)


## Hosts 管理
![image.png](https://cdn.nlark.com/yuque/0/2020/png/188521/1607069497118-2d4a973d-ac1e-4cc4-939f-862f63de0bc8.png#align=left&display=inline&height=966&margin=%5Bobject%20Object%5D&name=image.png&originHeight=966&originWidth=1420&size=339014&status=done&style=none&width=1420)
[Remote Hosts](##) 为集中化管理工具, 再也不用担心 `hosts` 配置杂乱、不能及时同步等问题。详情请参考 [Remote Hosts - 配置指南](https://dtstack.yuque.com/rd-center/sm6war/rinsoa)


## 代理服务 (Proxy)


代理服务提供项目 api 请求，服务代理中转功能，依赖于目标服务器、服务端 nginx 配置，需修改相关服务配置以将服务代理托管到多啦 A 梦代理服务平台，具体 nginx 配置修改请参考**配置中心**。


### 新增代理服务


![image.png](https://cdn.nlark.com/yuque/0/2020/png/188521/1606981488612-e1837130-d4ef-43e9-b26a-be69913cc91c.png#align=left&display=inline&height=325&margin=%5Bobject%20Object%5D&name=image.png&originHeight=325&originWidth=561&size=49523&status=done&style=none&width=561#align=left&display=inline&height=325&margin=%5Bobject%20Object%5D&originHeight=325&originWidth=561&status=done&style=none&width=561)


### 新增代理规则


![image.png](https://cdn.nlark.com/yuque/0/2020/png/188521/1606981294056-8278e0cf-65b2-4af2-83f6-d6a70b337600.png#align=left&display=inline&height=351&margin=%5Bobject%20Object%5D&name=image.png&originHeight=406&originWidth=784&size=133509&status=done&style=none&width=677#align=left&display=inline&height=406&margin=%5Bobject%20Object%5D&originHeight=406&originWidth=784&status=done&style=none&width=784)


### 如何配置使用


**查找项目所属代理服务地址如：**


![image.png](https://cdn.nlark.com/yuque/0/2020/png/188521/1606981073121-fb232f91-7f39-4020-a73c-b860fb953c81.png#align=left&display=inline&height=58&margin=%5Bobject%20Object%5D&name=image.png&originHeight=105&originWidth=1339&size=64389&status=done&style=none&width=741#align=left&display=inline&height=105&margin=%5Bobject%20Object%5D&originHeight=105&originWidth=1339&status=done&style=none&width=1339)


#### 前端开发环境配置


server 服务配置修改如下：


```javascript
'use strict';
const ip = require('ip');
let locatIp = ip.address(); //获取请求真实ip
module.exports = {
    server: {
        port: 8080,
        host: '0.0.0.0',
        proxy: {
            '/api/v1': { // 标签引擎
                target: 'http://xxx.xxx.xxx.xxx:7001/proxy/16', // 哆啦A梦
                changeOrigin: true,
                secure: false,
                "onProxyReq":function(proxyReq, req, res) {
                    proxyReq.setHeader('X-Real-IP', locatIp)
                }
            }
        }
    }
};
```


#### 服务端 Nginx 配置


```shell
# 标签引擎代理
location /api/v1  {
   proxy_pass http://doraemon/proxy/16; # doraemon
}
```


做完以上配置，我们的项目 api 请求的接口服务就托管到了哆啦 a 梦。需要注意的、在标签引擎的这个项目下，若当前项目下未填写任何代理规则，默认的接口服务地址即为新增代理服务时设置的默认代理目标，如果想指定自己的客户端访问服务的接口地址，点击添加一条代理规则，**IP**是你的**身份标示**，对应的目标服务地址只对你当前机器有效。这里留意右上角，那里显示的就是你的**本机 IP。**


#### 更新和关闭代理服务


![image.png](https://cdn.nlark.com/yuque/0/2020/png/188521/1606982481937-97f59bed-8993-44ff-9e3d-277626710f43.png#align=left&display=inline&height=196&margin=%5Bobject%20Object%5D&name=image.png&originHeight=347&originWidth=1324&size=230588&status=done&style=none&width=746#align=left&display=inline&height=347&margin=%5Bobject%20Object%5D&originHeight=347&originWidth=1324&status=done&style=none&width=1324)
我们提供了，快速更新代理服务规则快捷键：


1. 根据 IP 及目标 IP 判断是否为同类型代理服务（前端，后端）;
1. 当 IP 与本地 IP 不一致时，更新代理服务 IP 为本机 IP；
1. 根据是否为同类型（后端），决定是否更新目标代理服务



另外的，提供代理服务状态切换功能，便于你准确的切换代理服务，减少代理规则不明确导致的服务异常。


#### 常用项目收藏
![代理服务-new.2020-12-04 15_49_09.gif](https://cdn.nlark.com/yuque/0/2020/gif/188521/1607068167975-7b0a2ccf-6143-4efe-87d7-1474f8463ba6.gif#align=left&display=inline&height=966&margin=%5Bobject%20Object%5D&name=%E4%BB%A3%E7%90%86%E6%9C%8D%E5%8A%A1-new.2020-12-04%2015_49_09.gif&originHeight=966&originWidth=1420&size=736889&status=done&style=none&width=1420)
经常使用的项目，收藏起来，加入常用项，下次访问，点击就可以快速搜索定位到了。


## 主机管理
![image.png](https://cdn.nlark.com/yuque/0/2020/png/188521/1607068989349-19aca7e3-59e8-4734-b265-deecbdeb8415.png#align=left&display=inline&height=966&margin=%5Bobject%20Object%5D&name=image.png&originHeight=966&originWidth=1420&size=553140&status=done&style=none&width=1420)


管理远程主机地址及账号密码，用于访问远程目标机器，配置文件修改。


![image.png](https://cdn.nlark.com/yuque/0/2020/png/188521/1606984357812-25a9b477-040b-4398-abd8-929b38c82411.png#align=left&display=inline&height=104&margin=%5Bobject%20Object%5D&name=image.png&originHeight=182&originWidth=1308&size=62228&status=done&style=none&width=746#align=left&display=inline&height=182&margin=%5Bobject%20Object%5D&originHeight=182&originWidth=1308&status=done&style=none&width=1308)


## 配置中心


**数栈开发环境配置，演示如下：**
**操作步骤：**


1. 点新增配置
1. 选择目标服务器
1. 输入服务端对应文件名
1. 输入文件路径，完成创建
1. 点击编辑文件，修改当前文件配置。



![image.png](https://cdn.nlark.com/yuque/0/2020/png/188521/1606984642834-752298b9-0f39-46ab-912c-01a26b2a1801.png#align=left&display=inline&height=427&margin=%5Bobject%20Object%5D&name=image.png&originHeight=576&originWidth=667&size=129350&status=done&style=none&width=495#align=left&display=inline&height=576&margin=%5Bobject%20Object%5D&originHeight=576&originWidth=667&status=done&style=none&width=667)


![image.png](https://cdn.nlark.com/yuque/0/2020/png/188521/1606984975630-61aba3a8-9205-4b01-bae4-9945869d1dfd.png#align=left&display=inline&height=41&margin=%5Bobject%20Object%5D&name=image.png&originHeight=73&originWidth=1332&size=42699&status=done&style=none&width=746#align=left&display=inline&height=73&margin=%5Bobject%20Object%5D&originHeight=73&originWidth=1332&status=done&style=none&width=1332)
![image.png](https://cdn.nlark.com/yuque/0/2020/png/188521/1607066266168-e468ed1f-f50f-4588-b9c5-681b0f7410f1.png#align=left&display=inline&height=966&margin=%5Bobject%20Object%5D&name=image.png&originHeight=966&originWidth=1420&size=601792&status=done&style=none&width=1420)
其中文件修改不局限于 nginx 文件


## 标签管理
![标签管理-new.2020-12-04 15_28_19.gif](https://cdn.nlark.com/yuque/0/2020/gif/188521/1607066917265-b6d6e898-09f8-412e-b89f-b06b87397be5.gif#align=left&display=inline&height=966&margin=%5Bobject%20Object%5D&name=%E6%A0%87%E7%AD%BE%E7%AE%A1%E7%90%86-new.2020-12-04%2015_28_19.gif&originHeight=966&originWidth=1420&size=548785&status=done&style=none&width=1420)
标签管理功能，提供自定义标签功能，给你的服务、主机或应用设置专有标签，方便搜索，查找和分类。为了方便我们暂时提供了两个内置标签（前端、后端），该内置标签不可删除。


## 意见反馈
![feckback.2020-12-04 15_46_19.gif](https://cdn.nlark.com/yuque/0/2020/gif/188521/1607067999751-14bef4ea-0f49-4241-80f4-9dafb9419151.gif#align=left&display=inline&height=966&margin=%5Bobject%20Object%5D&name=feckback.2020-12-04%2015_46_19.gif&originHeight=966&originWidth=1420&size=498541&status=done&style=none&width=1420)
如果你有好的建议，请务必联系我们，也欢迎你能协助我们一起来完善它。


## 安全须知


1. **不要轻易修改远程服务 nginx 相关代理配置，如果更改，更改会对当前文件对应的所有服务生效，这有可能导致其它用户的代理服务出现异常，建议修改项目下个人 IP 对应的代理服务规则，这个规则修改只对个人有效。**
1. **不用轻易修改代理服务默认的目标服务地址，同样的这个修改也会对此项目下所有的接口代理服务产生影响，如果不必要，请修改个人对应的目标服务地址。**
