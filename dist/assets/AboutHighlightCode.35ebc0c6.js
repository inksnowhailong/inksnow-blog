import{A as c,ab as h,o as t,c as i,O as n,a as s,G as e}from"./index.944c6738.js";const r={},a=s("h1",null,[e(" \u535A\u5BA2\u4E2D\u4F7F\u7528\u7684\u4EE3\u7801\u9AD8\u4EAE\u663E\u793A\u63D2\u4EF6\u4E3A"),s("span",{class:"cite"},"vue3-highlightjs")],-1),l=s("h2",null,"\u5B89\u88C5",-1),_=s("span",{class:"cite"},"npm i vue3-highlightjs --save",-1),d=s("h2",null,"\u52A0\u5165vue3",-1),p=e("    "),u=s("code",{class:"javascript"},`\r
    // \u5F15\u5165\u63D2\u4EF6\u7684\u4E1C\u897F\r
    import VueHighlightJS from "vue3-highlightjs";\r
    // \u8FD9\u91CC\u53EF\u4EE5\u5F15\u7528\u4E0D\u540C\u4E3B\u9898 \u76F4\u63A5\u53BBnode_module\u91CC\u9762\u627E\u5BF9\u5E94\u6587\u4EF6\u5939\r
    import "highlight.js/styles/obsidian.css";\r
    // \u5728main.ts\u91CC\u9762 \u4F7F\u7528\u4F60\u7684vue\u5B9E\u4F8Buse\u5B83\r
    const app = createApp(App)\r
    .use(VueHighlightJS)\r
    `,-1),g=[p,u],v=s("h2",null,"\u4F7F\u7528",-1),j=e("    "),m=s("code",{class:"javascript"},`\r
        <pre v-highlightjs>\r
          <code class="javascript">\r
          // code.....\r
          </code>\r
        </pre>\r
    `,-1),f=e(`\r
    `),x=[j,m,f];function A(V,b){const o=h("highlightjs");return t(),i("div",null,[a,l,_,d,n((t(),i("pre",null,g)),[[o]]),v,n((t(),i("pre",null,x)),[[o]])])}var H=c(r,[["render",A]]);export{H as default};
