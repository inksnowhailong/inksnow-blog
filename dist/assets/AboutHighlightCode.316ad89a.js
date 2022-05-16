import{d as r,o as p,c as h,a as e,n as d,m as u,ab as i,G as n,v as _,B as l}from"./index.9d0a1cc7.js";const g={class:"line-numbers"},E=n("    "),m=["innerHTML"],F=n(`\r
 `),B=r({props:{code:{type:String,default:""},type:{type:String,default:"javascript"}},setup(c){const s=c,{code:a,type:t}=s;return(o,D)=>(p(),h("pre",g,[E,e("code",{class:d("language-"+u(t)),innerHTML:u(i).highlight(u(a),u(i).languages[u(t)],u(t))},null,10,m),F]))}}),v=e("h1",null,[n(" \u535A\u5BA2\u4E2D\u4F7F\u7528\u7684\u4EE3\u7801\u9AD8\u4EAE\u663E\u793A\u63D2\u4EF6\u4E3A"),e("span",{class:"cite"},"vue3-highlightjs")],-1),C=e("h2",null,"\u5B89\u88C5",-1),A=e("span",{class:"cite"},"npm i vue3-highlightjs --save",-1),f=e("h2",null,"\u52A0\u5165vue3",-1),j=e("h2",null,"\u4F7F\u7528",-1),V=r({setup(c){const s=_([`
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
    `]);return(a,t)=>{const o=B;return p(),h("div",null,[v,C,A,f,l(o,{code:u(s)[0]},null,8,["code"]),j,l(o,{code:u(s)[1]},null,8,["code"])])}}});export{V as default};
