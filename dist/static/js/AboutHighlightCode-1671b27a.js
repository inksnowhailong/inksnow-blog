import{P as a}from"./prismjs-746e6908.js";import{d as l,o as p,c as h,a as e,C as d,u,I as n,O as _,G as r}from"./@vue-4ea5409b.js";import"./dayjs-47b942cd.js";const g={class:"line-numbers"},m=n("    "),E=["innerHTML"],F=n(`\r
 `),C=l({props:{code:{type:String,default:""},type:{type:String,default:"javascript"}},setup(c){const s=c,{code:i,type:t}=s;return(o,D)=>(p(),h("pre",g,[m,e("code",{class:d("language-"+u(t)),innerHTML:u(a).highlight(u(i),u(a).languages[u(t)],u(t))},null,10,E),F]))}}),B=e("h1",null,[n(" \u535A\u5BA2\u4E2D\u4F7F\u7528\u7684\u4EE3\u7801\u9AD8\u4EAE\u663E\u793A\u63D2\u4EF6\u4E3A"),e("span",{class:"cite"},"vue3-highlightjs")],-1),v=e("h2",null,"\u5B89\u88C5",-1),f=e("span",{class:"cite"},"npm i vue3-highlightjs --save",-1),A=e("h2",null,"\u52A0\u5165vue3",-1),j=e("h2",null,"\u4F7F\u7528",-1),x=l({setup(c){const s=_([`
     // \u5F15\u5165\u63D2\u4EF6\u7684\u4E1C\u897F
    import VueHighlightJS from "vue3-highlightjs";
    // \u8FD9\u91CC\u53EF\u4EE5\u5F15\u7528\u4E0D\u540C\u4E3B\u9898 \u76F4\u63A5\u53BBnode_module\u91CC\u9762\u627E\u5BF9\u5E94\u6587\u4EF6\u5939
    import "highlight.js/styles/obsidian.css";
    // \u5728main.ts\u91CC\u9762 \u4F7F\u7528\u4F60\u7684vue\u5B9E\u4F8Buse\u5B83
    const app = createApp(App)
    .use(VueHighlightJS)
    `,`
      <pre ></pre>;
          <code v-prism class="language-javascript">;
          // code.....
          </code>;
        </pre>;
    `]);return(i,t)=>{const o=C;return p(),h("div",null,[B,v,f,A,r(o,{code:u(s)[0]},null,8,["code"]),j,r(o,{code:u(s)[1]},null,8,["code"])])}}});export{x as default};
