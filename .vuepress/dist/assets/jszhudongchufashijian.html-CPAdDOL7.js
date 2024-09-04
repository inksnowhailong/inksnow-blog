import { _ as _export_sfc, r as resolveComponent, o as openBlock, c as createElementBlock, a as createStaticVNode, b as createBaseVNode, d as createTextVNode, e as createVNode } from "./app-BRHqNXZo.js";
const _sfc_main = {};
const _hoisted_1 = {
  href: "https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent/MouseEvent",
  target: "_blank",
  rel: "noopener noreferrer"
};
function _sfc_render(_ctx, _cache) {
  const _component_ExternalLinkIcon = resolveComponent("ExternalLinkIcon");
  return openBlock(), createElementBlock("div", null, [
    _cache[1] || (_cache[1] = createStaticVNode('<div class="language-javascript line-numbers-mode" data-highlighter="prismjs" data-ext="js" data-title="js"><pre class="language-javascript"><code><span class="line"><span class="token comment">// 找到需要模拟鼠标滑过事件的元素</span></span>\n<span class="line"><span class="token keyword">const</span> element <span class="token operator">=</span> document<span class="token punctuation">.</span><span class="token function">getElementById</span><span class="token punctuation">(</span><span class="token string">&quot;myElement&quot;</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>\n<span class="line"></span>\n<span class="line"><span class="token comment">// 创建一个 MouseEvent 对象</span></span>\n<span class="line"><span class="token keyword">const</span> event <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">MouseEvent</span><span class="token punctuation">(</span><span class="token string">&#39;mouseover&#39;</span><span class="token punctuation">,</span> <span class="token punctuation">{</span></span>\n<span class="line">  <span class="token string-property property">&#39;view&#39;</span><span class="token operator">:</span> window<span class="token punctuation">,</span></span>\n<span class="line">  <span class="token string-property property">&#39;bubbles&#39;</span><span class="token operator">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span></span>\n<span class="line">  <span class="token string-property property">&#39;cancelable&#39;</span><span class="token operator">:</span> <span class="token boolean">true</span></span>\n<span class="line"><span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span></span>\n<span class="line"></span>\n<span class="line"><span class="token comment">// 使用 dispatchEvent 方法将 MouseEvent 对象分派到元素上</span></span>\n<span class="line">element<span class="token punctuation">.</span><span class="token function">dispatchEvent</span><span class="token punctuation">(</span>event<span class="token punctuation">)</span><span class="token punctuation">;</span></span>\n<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>', 1)),
    createBaseVNode("p", null, [
      createBaseVNode("a", _hoisted_1, [
        _cache[0] || (_cache[0] = createTextVNode("MDN文档地址")),
        createVNode(_component_ExternalLinkIcon)
      ])
    ])
  ]);
}
const jszhudongchufashijian_html = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__file", "jszhudongchufashijian.html.vue"]]);
const data = JSON.parse('{"path":"/blogs/codes/js/jszhudongchufashijian.html","title":"js主动触发事件","lang":"en-US","frontmatter":{"title":"js主动触发事件","date":"2024-9-4","categories":["编程"],"tags":["JS/TS"]},"headers":[],"git":{"createdTime":1725438873000,"updatedTime":1725438873000,"contributors":[{"name":"张海龙","email":"inksnowhailong@gmail.com","commits":1}]},"filePathRelative":"blogs/codes/js/js主动触发事件.md"}');
export {
  jszhudongchufashijian_html as comp,
  data
};
