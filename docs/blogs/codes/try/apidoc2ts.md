---
title: vscode扩展,解析java文档到TS
date: 2024-10-21
categories:
  - 编程
tags:
  - 实验
---
apidoc2ts 是一款 VSCode 扩展，旨在解析接口文档，生成前端请求代码。提高前端开发效率它具有以下功能：

- **爬取 Java 文档生成 API 请求函数**：目前仅支持 Knife4e 2.x 版本和 3.x 版本。
- **生成接口代码和 TS 类型**：在 TS 或 Vue 文件中输入 **@api xxx|** 即可触发接口爬取。
   - **@api** 为前置触发条件，**xxx** 为 Knife4j 某接口的 URL 地址，**|** 为开始搜索。
   - 每次只能爬取一个接口，URL 地址是该接口的浏览器地址栏中的 URL。
   - 生成会有三部分，其中基础路径根据配置项中的设置来：
      - 第一部分：**/api/{执行@api命令的文件的所在目录名称+父目录名称}.ts**，保存接口函数。
      - 第二部分：**/api/types/{执行@api命令的文件的所在目录名称+父目录名称}.ts**，保存接口函数的参数和返回值 TS 类型。
      - 第三部分：是输入命令位置，会变为生成的接口函数名称，如果你使用了一些自动 import 引入的其他插件，这会有用。
![演示](https://github.com/inksnowhailong/vscode-plugin/raw/master/apidoc2ts/images/demo.gif)
**注意**：Knife4j 文档不能有账号密码登录，因为那样无法进行登录，就无法爬取，所以请与后端沟通好。
**配置项**：

- 在 VSCode 设置中设置，或者项目根目录中添加 **apidoc2ts.config.json** 文件。
- **apidoc2ts.exePath**：谷歌浏览器或 Edge 浏览器可执行文件地址，默认使用浏览器的默认安装地址。
- **apidoc2ts.apiFileMode**：设置 API 文件生成位置，默认值为 **api**（生成在 **api** 目录），可选值为 **inline**（当前执行命令文件所在文件夹）或直接输入的自定义绝对路径。
- **apidoc2ts.requestMethodContent**：请求函数的引用代码，默认值为一个基础的请求函数，请推荐您封装好的 axios，并默认导出一个函数作为使用。
- **apidoc2ts.BaseResponse**：返回值的基础结构数据类型，需要接受一个泛型，得到实际返回内容的数据类型，默认值为 **import actionRequest from '@/utils/request';**。



# 收款码
如果你觉得这个扩展对你有帮助，欢迎打赏个鸡腿儿呀：

<img src="https://github.com/inksnowhailong/vscode-plugin/raw/master/apidoc2ts/images/skm.jpg" alt="收款码" width="200" />
<img src="https://github.com/inksnowhailong/vscode-plugin/raw/master/apidoc2ts/images/skm2.jpg" alt="收款码" width="200" />
