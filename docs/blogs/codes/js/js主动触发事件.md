---
title: js主动触发事件
date: 2024-9-4
categories:
 - 编程
tags:
 - JS/TS
---

```js
// 找到需要模拟鼠标滑过事件的元素
const element = document.getElementById("myElement");

// 创建一个 MouseEvent 对象
const event = new MouseEvent('mouseover', {
  'view': window,
  'bubbles': true,
  'cancelable': true
});

// 使用 dispatchEvent 方法将 MouseEvent 对象分派到元素上
element.dispatchEvent(event);
```
[MDN文档地址](https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent/MouseEvent)
