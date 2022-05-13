var $=Object.defineProperty,D=Object.defineProperties;var N=Object.getOwnPropertyDescriptors;var C=Object.getOwnPropertySymbols;var J=Object.prototype.hasOwnProperty,O=Object.prototype.propertyIsEnumerable;var S=(t,l,o)=>l in t?$(t,l,{enumerable:!0,configurable:!0,writable:!0,value:o}):t[l]=o,w=(t,l)=>{for(var o in l||(l={}))J.call(l,o)&&S(t,o,l[o]);if(C)for(var o of C(l))O.call(l,o)&&S(t,o,l[o]);return t},B=(t,l)=>D(t,N(l));import{h as H,d as P,j as F,k as M,r as q,b as g,o as a,n as u,w as f,O as p,P as z,a as n,f as e,E as T,q as d,p as G,s as _,c,m as A,J as r,a5 as v,G as E,F as Q,Q as K,v as L,A as R,D as U,ac as W}from"./index.d69684c4.js";import{T as m,a as X}from"./icon.3261c04b.js";const Y=t=>Object.keys(t),Z=["light","dark"],x=H({title:{type:String,default:""},description:{type:String,default:""},type:{type:String,values:Y(m),default:"info"},closable:{type:Boolean,default:!0},closeText:{type:String,default:""},showIcon:Boolean,center:Boolean,effect:{type:String,values:Z,default:"light"}}),ee={close:t=>t instanceof MouseEvent},se={name:"ElAlert"},te=P(B(w({},se),{props:x,emits:ee,setup(t,{emit:l}){const o=t,{Close:h}=X,y=F(),i=M("alert"),j=q(!0),k=g(()=>m[o.type]||m.info),I=g(()=>o.description||{[i.is("big")]:y.default}),V=g(()=>o.description||{[i.is("bold")]:y.default}),b=s=>{j.value=!1,l("close",s)};return(s,Ee)=>(a(),u(K,{name:e(i).b("fade")},{default:f(()=>[p(n("div",{class:d([e(i).b(),e(i).m(s.type),e(i).is("center",s.center),e(i).is(s.effect)]),role:"alert"},[s.showIcon&&e(k)?(a(),u(e(T),{key:0,class:d([e(i).e("icon"),e(I)])},{default:f(()=>[(a(),u(G(e(k))))]),_:1},8,["class"])):_("v-if",!0),n("div",{class:d(e(i).e("content"))},[s.title||s.$slots.title?(a(),c("span",{key:0,class:d([e(i).e("title"),e(V)])},[A(s.$slots,"title",{},()=>[r(v(s.title),1)])],2)):_("v-if",!0),s.$slots.default||s.description?(a(),c("p",{key:1,class:d(e(i).e("description"))},[A(s.$slots,"default",{},()=>[r(v(s.description),1)])],2)):_("v-if",!0),s.closable?(a(),c(Q,{key:2},[s.closeText?(a(),c("div",{key:0,class:d([e(i).e("close-btn"),e(i).is("customed")]),onClick:b},v(s.closeText),3)):(a(),u(e(T),{key:1,class:d(e(i).e("close-btn")),onClick:b},{default:f(()=>[E(e(h))]),_:1},8,["class"]))],2112)):_("v-if",!0)],2)],2),[[z,j.value]])]),_:3},8,["name"]))}}));var oe=L(te,[["__file","/home/runner/work/element-plus/element-plus/packages/components/alert/src/alert.vue"]]);const ne=R(oe);const le={},ie=n("h1",null,[r(" \u535A\u5BA2\u4E2D\u4F7F\u7528\u7684\u4EE3\u7801\u9AD8\u4EAE\u663E\u793A\u63D2\u4EF6\u4E3A"),n("span",{class:"cite"},"vue3-highlightjs")],-1),ae=n("h2",null,"\u5B89\u88C5",-1),ce=n("span",{class:"cite"},"npm i vue3-highlightjs --save",-1),re=n("h2",null,"\u52A0\u5165vue3",-1),de=r("    "),he=n("code",{class:"javascript"},`\r
    // \u5F15\u5165\u63D2\u4EF6\u7684\u4E1C\u897F\r
    import VueHighlightJS from "vue3-highlightjs";\r
    // \u8FD9\u91CC\u53EF\u4EE5\u5F15\u7528\u4E0D\u540C\u4E3B\u9898 \u76F4\u63A5\u53BBnode_module\u91CC\u9762\u627E\u5BF9\u5E94\u6587\u4EF6\u5939\r
    import "highlight.js/styles/obsidian.css";\r
    // \u5728main.ts\u91CC\u9762 \u4F7F\u7528\u4F60\u7684vue\u5B9E\u4F8Buse\u5B83\r
    const app = createApp(App)\r
    .use(VueHighlightJS)\r
    `,-1),pe=[de,he],ue=n("h2",null,"\u4F7F\u7528",-1),_e=r("    "),fe=n("code",{class:"javascript"},`\r
        <pre v-highlightjs>\r
          <code class="javascript">\r
          // code.....\r
          </code>\r
        </pre>\r
    `,-1),ge=r(`\r
    `),ve=[_e,fe,ge],me=n("strong",{class:"error"},"\u5751\uFF1A\u5728\u6211\u5F15\u5165\u8FD9\u4E2A\u5E93\u7684js\u6587\u4EF6\u65F6\u5019",-1),ye=n("span",{slot:"title"}," \u65E0\u6CD5\u627E\u5230\u6A21\u5757\u201Cvue3-highlightjs\u201D\u7684\u58F0\u660E\u6587\u4EF6\u3002\u201C/node_modules/vue3-highlightjs/dist/vue3-highlight.js\u201D\u9690\u5F0F\u62E5\u6709 \"any\" \u7C7B\u578B\u3002 \u5C1D\u8BD5\u4F7F\u7528 `npm i --save-dev @types/vue3-highlightjs` (\u5982\u679C\u5B58\u5728)\uFF0C\u6216\u8005\u6DFB\u52A0\u4E00\u4E2A\u5305\u542B `declare module 'vue3-highlightjs';` \u7684\u65B0\u58F0\u660E(.d.ts)\u6587\u4EF6 ",-1),je=n("strong",{class:"success"}," \u89E3\u51B3\u529E\u6CD5\uFF1A1\u3001\u76F4\u63A5\u4FEE\u6539\u4E86tsconfig.json ",-1),ke=r("    "),be=n("code",{class:"javascript"},`\r
    {\r
      "compilerOptions": {\r
        // \u8FD9\u91CC\u52A0\u5165\u8FD9\u4E24\u884C\u914D\u7F6E\uFF0C\u5C31\u4E0D\u62A5\u7EA2\u4E86\r
        "noImplicitAny": false,\r
        "allowJs": true,\r
      }\r
    }\r
    `,-1),Ce=[ke,be],Se=n("strong",{class:"success"}," \u89E3\u51B3\u529E\u6CD5\uFF1A2\u3001\u6309\u63D0\u793A\u6240\u8BF4\u7684\uFF0C\u8BBE\u7F6Ed.ts\u6587\u4EF6 ",-1),we=r("    "),Be=n("code",{class:"javascript"},`\r
      // \u6839\u76EE\u5F55\u5EFA\u7ACB\u4E00\u4E2Aindex.d.ts\u6587\u4EF6\uFF0C\u7136\u540E\u5199\u5165\u8FD9\u884C\u4EE3\u7801\r
          declare module "vue3-highlightjs";\r
      // \u7136\u540E\u5728tsconfig.json\u91CC\u9762\u7684include\u5F15\u7528\u5B83\r
      {\r
          "include": [\r
          "index.d.ts"\r
        ],\r
      }\r
    `,-1),Te=[we,Be];function Ae(t,l){const o=ne,h=W("highlightjs");return a(),c("div",null,[ie,ae,ce,re,p((a(),c("pre",null,pe)),[[h]]),ue,p((a(),c("pre",null,ve)),[[h]]),me,E(o,{type:"error",closable:!1},{default:f(()=>[ye]),_:1}),je,p((a(),c("pre",null,Ce)),[[h]]),Se,p((a(),c("pre",null,Te)),[[h]])])}var De=U(le,[["render",Ae]]);export{De as default};
