var E=Object.defineProperty,S=Object.defineProperties;var T=Object.getOwnPropertyDescriptors;var j=Object.getOwnPropertySymbols;var D=Object.prototype.hasOwnProperty,F=Object.prototype.propertyIsEnumerable;var b=(s,n,t)=>n in s?E(s,n,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[n]=t,y=(s,n)=>{for(var t in n||(n={}))D.call(n,t)&&b(s,t,n[t]);if(j)for(var t of j(n))F.call(n,t)&&b(s,t,n[t]);return s},k=(s,n)=>S(s,T(n));import{b as z,d as B,g as V,e as O,o as a,c as l,a as r,j as $,n as h,m as u,k as x,w as _,B as d,E as q,p as X,q as P,Q as J,s as M,y as R,A as U,ac as G,O as p,G as e}from"./index.9d0a1cc7.js";import{E as I}from"./link.0a85bcf8.js";import{d as L,c as W,E as Q}from"./divider.ba143665.js";import{c as w}from"./icon.49fbd637.js";const H=z({closable:Boolean,type:{type:String,values:["success","info","warning","danger",""],default:""},hit:Boolean,disableTransitions:Boolean,color:{type:String,default:""},size:{type:String,values:L,default:""},effect:{type:String,values:["dark","light","plain"],default:"light"},round:Boolean}),K={close:s=>s instanceof MouseEvent,click:s=>s instanceof MouseEvent},Y={name:"ElTag"},Z=B(k(y({},Y),{props:H,emits:K,setup(s,{emit:n}){const t=s,m=W(),o=V("tag"),c=O(()=>{const{type:i,hit:v,effect:C,closable:A,round:N}=t;return[o.b(),o.is("closable",A),o.m(i),o.m(m.value),o.m(C),o.is("hit",v),o.is("round",N)]}),g=i=>{i.stopPropagation(),n("close",i)},f=i=>{n("click",i)};return(i,v)=>i.disableTransitions?(a(),x(J,{key:1,name:`${u(o).namespace.value}-zoom-in-center`},{default:_(()=>[r("span",{class:h(u(c)),style:P({backgroundColor:i.color}),onClick:f},[r("span",{class:h(u(o).e("content"))},[$(i.$slots,"default")],2),i.closable?(a(),x(u(q),{key:0,class:h(u(o).e("close")),onClick:g},{default:_(()=>[d(u(w))]),_:1},8,["class"])):X("v-if",!0)],6)]),_:3},8,["name"])):(a(),l("span",{key:0,class:h(u(c)),style:P({backgroundColor:i.color}),onClick:f},[r("span",{class:h(u(o).e("content"))},[$(i.$slots,"default")],2),i.closable?(a(),x(u(q),{key:0,class:h(u(o).e("close")),onClick:g},{default:_(()=>[d(u(w))]),_:1},8,["class"])):X("v-if",!0)],6))}}));var rr=M(Z,[["__file","/home/runner/work/element-plus/element-plus/packages/components/tag/src/tag.vue"]]);const er=R(rr);const sr={},nr=r("h1",null," vue\u548Cnuxt\u7684axios\u8BF7\u6C42\u5C01\u88C5\u65B9\u6848\u63A8\u8350\uFF0C\u4EB2\u6D4B\u597D\u7528\uFF0C\u53EF\u4EE5\u6309\u7167\u4EE5\u4E0B\u6B65\u9AA4\u76F4\u63A5\u53BB\u5C01\u88C5\u548C\u4F7F\u7528 ",-1),tr=e(" \u8FD9\u662F\u672C\u4EBA\u5728\u5DE5\u4F5C\u548C\u5B66\u4E60\u8FC7\u7A0B\u4E2D\uFF0C\u901A\u8FC7\u77E5\u8BC6\u548C\u7ECF\u9A8C\u81EA\u5DF1\u641E\u51FA\u6765\u7684\u4E00\u5957\u5C01\u88C5\u65B9\u5F0F\uFF0C\u5982\u6709\u96F7\u540C\uFF0C\u7EAF\u5C5E\u5DE7\u5408\uFF0C\u5F53\u7136\uFF0C\u91CC\u9762\u8FD8\u662F\u6709\u5F88\u591A\u4E1C\u897F\u5728\u501F\u9274\u524D\u8F88\u4EEC\u3002\u5341\u5206\u611F\u8C22\u524D\u8F88\u4EEC\u80FD\u591F\u627E\u5230\u5982\u6B64\u65B9\u4FBF\u7684\u4E1C\u897F: "),or=e("Axios"),ar=e("Webpack"),ir=r("p",null,[e(" \u6700\u5F00\u59CB\u8FD9\u4E48\u641E\uFF0C\u4E3B\u8981\u662F\u4E3A\u4E86\u80FD\u591F\u5728\u7EC4\u4EF6\u5185\u4E0D\u7528\u8D39\u52B2\u7684\u53BB\u4ECE\u67D0\u4E2Ajs\u6587\u4EF6\u91CC\u9762\u53BB\u8FD9\u4E48\u64CD\u4F5C "),r("span",{class:"cite"},"import {xxxapifunction} from 'xxxx.js'"),e(" \u6211\u66F4\u613F\u610F\uFF0C\u76F4\u63A5\u53BB\u4F7F\u7528x.x.x\u7684\u8FD9\u79CD\u65B9\u5F0F\uFF0C\u76F4\u63A5\u5728\u67D0\u4E2A\u5730\u65B9\uFF0C\u67D0\u4E2A\u6A21\u5757\uFF0C\u62FF\u67D0\u4E2A\u8BF7\u6C42\u3002 "),r("br"),e(" \u672C\u6587\u7684\u5C01\u88C5\u65B9\u5F0F\uFF0C\u6700\u9002\u5408\u7684\u662Fasync await\u98CE\u683C\u7684\u8BF7\u6C42\uFF0C\u5F53\u7136.then\u98CE\u683C\u4E5F\u80FD\u7528\u3002 ")],-1),cr=r("p",null," \u6700\u7EC8\u6548\u679C\uFF1A\u6211\u6709\u4E00\u4E2AA.vue\u6587\u4EF6\uFF0C\u90A3\u4E48apis\u6587\u4EF6\u5939\u91CC\u5C31\u4F1A\u6709\u4E00\u4E2A\u5BF9\u5E94\u7684A.js\uFF0C\uFF0C\u7136\u540E\u5728A.js\u91CC\u9762\u5199\u597D\u8BF7\u6C42\u7684\u8DEF\u5F84\u548C\u65B9\u6CD5,\u968F\u540E\u5C31\u53EF\u4EE5\u5728A.vue\u91CC\u9762 this.$apis.A.getXXX ",-1),lr=r("h2",null,"Vue2x\u7684\u7248\u672C",-1),ur=r("h3",null,"\u76EE\u5F55\u7ED3\u6784",-1),pr={class:"line-numbers"},dr=e("        "),_r={class:"language-javascript"},hr=e(`\r
            \u5728src\u4E0B\u5EFA\u7ACBhttp\u6587\u4EF6\u5939\uFF0C\u76EE\u5F55\u7ED3\u6784\u5982\u4E0B\r
            http/\r
            |-- apis/\r
            |   |-- a.js\r
            |   |-- b.js\r
            |-- index.js\r
            |-- request.js\r
        `),mr=[hr],xr=r("h3",null,"request.js\u6587\u4EF6",-1),gr={class:"line-numbers"},fr=e("        "),vr={class:"language-javascript"},jr=e(`\r
        import axios from 'axios'\r
        //\u8FD9\u91CC\u8BBE\u7F6E\u5168\u5C40\u9ED8\u8BA4\u5C5E\u6027\r
        axios.defaults.timeout = 20000\r
\r
        // \u62E6\u622A\u5668\r
        axios.interceptors.request.use(config => {\r
            return config\r
        })\r
        axios.interceptors.response.use(\r
            res => {\r
                return res\r
            },\r
            error => {\r
                return Promise.reject({ data: { error }})\r
            }\r
        )\r
        // get\u65B9\u6CD5\r
        export function get(url, params, headers) {\r
            return new Promise((resolve, reject) => {\r
                axios\r
                .get(\r
                    url,\r
                    params,\r
                    { ...headers }\r
                )\r
                .then(res => resolve(res))\r
                .catch(err => resolve(err))\r
            })\r
        }\r
        // post\u65B9\u6CD5\r
        export function post(url, params, headers) {\r
            const jsonParams = JSON.stringify(params)\r
            return new Promise((resolve, reject) => {\r
                axios\r
                .post(url, jsonParams, {\r
                    headers: { 'Content-Type': 'application/json' }, ...headers\r
                })\r
                .then(res => resolve(res))\r
                .catch(err => {\r
                    resolve(err)\r
                })\r
            })\r
        }\r
        // delete\u65B9\u6CD5\r
        export function del(url, params, headers) {\r
            return new Promise((resolve, reject) => {\r
                axios\r
                .delete(\r
                    url,\r
                    params,\r
                    { ...headers }\r
                )\r
                .then(res => resolve(res))\r
                .catch(err => resolve(err))\r
            })\r
        }\r
        // \u81EA\u4E49\u5B9A\u65B9\u6CD5\r
        export function request(method, url, params, headers) {\r
            return new Promise((resolve, reject) => {\r
                axios[method](url, params, { ...headers })\r
                .then(res => resolve(res))\r
                .catch(err => resolve(err))\r
            })\r
        }\r
       \r
        `),br=[jr],yr=r("h3",null,"index.js\u6587\u4EF6 \u8FD9\u4E2Avue\u662F\u552F\u4E00\u8981\u5F15\u5165\u7684\u6587\u4EF6",-1),kr={class:"line-numbers"},$r=e("        "),qr={class:"language-javascript"},Xr=e(`\r
        /* \u5BFC\u5165apis\u4E2D\u6240\u6709\u7684api\u63A5\u53E3 */\r
        const apisFiles = require.context('./apis', true, /\\.js$/)\r
        // \u904D\u5386\u8FD9\u4E2A\u62FF\u5230\u7684\u6587\u4EF6\u6570\u636E \u8FD9\u4E2A\u662F\u4E2A\u51FD\u6570\uFF0C\u91CC\u9762\u8FD8\u6709\u56FA\u5B9A\u7684\u65B9\u6CD5 \u5728\u6B64\u4E0D\u505A\u8BE6\u7EC6\u53D9\u8FF0\r
        const apis = apisFiles.keys().reduce((modules, modulePath) => {\r
            //modulePath \u662F\u62FF\u5230\u7684\u6587\u4EF6\u8DEF\u5F84\uFF0C\u622A\u53D6\u51FA\u6765\u6587\u4EF6\u540D\r
            const moduleName = modulePath.replace(/^\\.\\/(.*)\\.\\w+$/, '$1')\r
            //\u901A\u8FC7\u6587\u4EF6\u540D\uFF0C\u62FF\u5230\u6307\u5B9A\u6587\u4EF6\u5230\u5904\u7684\u6A21\u5757\u6570\u636E\r
            const value = apisFiles(modulePath)\r
            //\u8FD4\u56DE\u5408\u5E76\u540E\u7684\u6570\u636E\uFF0C\u8FD4\u56DE\u503C\u4EA4\u7ED9\u4E0B\u4E00\u5C42\u9012\u5F52\u7684\u7B2C\u4E00\u4E2A\u53C2\u6570\r
            modules[moduleName] = value\r
            return modules\r
        }, {})\r
        export const Api = {\r
        ...apis\r
        }\r
        `),Pr=[Xr],wr=r("h3",null,[e(" apis\u6587\u4EF6\u5939\u91CC\u9762\uFF0C\u8981\u653E\u4E00\u4E2A\u4E2A\u7684\u8BF7\u6C42\u6A21\u5757\uFF0C\u6A21\u5757\u6587\u4EF6\u540D\u81EA\u4E49\u5B9A\uFF0C\u4F46\u662F\u8FD9\u91CC\u63A8\u8350"),r("strong",null,"\u4F7F\u7528\u5BF9\u5E94\u7684vue\u7EC4\u4EF6\u540D"),e(" \u91CC\u9762\u7684\u5185\u5BB9\u50CF\u8FD9\u6837\u53BB\u5199 ")],-1),Cr={class:"line-numbers"},Ar=e("        "),Nr={class:"language-javascript"},Er=e(`\r
        import { get, del, post , request } from '../request.js'\r
        import qs from 'qs'\r
        // \u83B7\u53D6\u6570\u636E  \r
        export function getXXX(params) {\r
            return get(\`/xxx/?\${qs.stringify(params)}\`)\r
        }\r
        // \u63D0\u4EA4\u6570\u636E\r
        export function postXXX(params) {\r
            return post(\`/xxx\`,params)\r
        }\r
        // \u5220\u9664\u6570\u636E\r
        export function delXXX(params) {\r
            return del(\`/xxx/?\${qs.stringify(params)}\`)\r
        }\r
        //\u81EA\u4E49\u5B9A\u67D0\u4E2A\u8BF7\u6C42\u65B9\u6CD5\r
        export function othreXXX(params){\r
            return request('pull',params)\r
        }\r
        `),Sr=[Er],Tr=r("h3",null,"\u6700\u540E\u5728main.js\u91CC\u9762",-1),Dr={class:"line-numbers"},Fr=e("        "),zr={class:"language-javascript"},Br=e(`\r
          import { Api } from './http/index.js'\r
          // \u6CE8\u5165\u8BF7\u6C42\u901A\u9053\r
          Vue.prototype.$apis = Api\r
\r
          //\u4E4B\u540E\u5728\u67D0\u4E2Avue\u91CC\u53EA\u9700\u8981\u5927\u6982\u8FD9\u4E48\u4F7F\u7528\uFF1A\r
         methods:{\r
            async getData(){\r
                 const {data} = await this.$apis.xxxx.getXXX()\r
                 // \u65E0\u8BBA\u8BF7\u6C42\u6210\u529F\u4E0E\u5931\u8D25\uFF0C\u90FD\u4F1A\u88ABrequest\u91CC\u9762\u62E6\u622A\u6210\u8BF7\u6C42\u6210\u529F\uFF0C\u4F46\u662F\u8BF7\u6C42\u5931\u8D25\u7684\u8BDD\uFF0C\u8FD9\u91CC\u5C31\u4E00\u5B9A\u4F1A\u8FD4\u56DE\u4E2Aerror\u5B57\u6BB5\r
                 if(res.error){\r
                     //\u8FD9\u91CC\u5199\u5165\u8BF7\u6C42\u5931\u8D25\u65F6\u5019\u6267\u884C\u7684\u64CD\u4F5C\r
                     return \r
                 }\r
                 // \u4EE5\u4E0B\u662F\u5199\u5165\u8BF7\u6C42\u6210\u529F\u7684\u64CD\u4F5C\uFF0C\u56E0\u4E3A\u8BF7\u6C42\u5931\u8D25\u7684\u8BDD\u76F4\u63A5\u5C31\u5728\u4E0A\u65B9\u5904\u7406\u597D\u4E86\uFF0Creturn\u51FA\u53BB\u4E86\uFF0C\u8FD9\u91CC\u5C31\u4E0D\u4F1A\u6267\u884C\u4E86\uFF0C\r
                 // \u6240\u4EE5\u5C31\u53EF\u4EE5\u4E00\u79CD\u4F3C\u4E4E\u9ED8\u8BA4\u662F\u8BF7\u6C42\u6210\u529F\u7684\u540C\u6B65\u903B\u8F91\u53BB\u5199\u4EE3\u7801\u4E86\r
                 \r
             }\r
         }\r
        `),Vr=[Br],Or=r("h2",null," nuxt2x\u7684\u7248\u672C\uFF0C\u8FD9\u91CC\u6211\u91C7\u7528\u4E86\u548Cvue\u65F6\u5019\u4E0D\u4E00\u6837\u7684\u903B\u8F91\u65B9\u5F0F\u53BB\u641E\uFF0C\u533A\u522B\u5F88\u5C0F\uFF0C\u5B9E\u73B0\u6548\u679C\u4E5F\u4E00\u6837\uFF0C\u4F46\u662F\uFF0C\u80FD\u8282\u7701\u5199\u51E0\u884C\u4EE3\u7801 ",-1),Jr=r("h3",null,"\u76EE\u5F55\u7ED3\u6784\uFF0C\u540Cvue2x\u7248\u672C",-1),Mr={class:"line-numbers"},Rr=e("        "),Ur={class:"language-javascript"},Gr=e(`\r
            \u5728src\u4E0B\u5EFA\u7ACBhttp\u6587\u4EF6\u5939\uFF0C\u76EE\u5F55\u7ED3\u6784\u5982\u4E0B\r
            http/\r
            |-- apis/\r
            |   |-- a.js\r
            |   |-- b.js\r
            |-- index.js\r
            |-- request.js\r
        `),Ir=[Gr],Lr=r("h3",null,"request\u6587\u4EF6",-1),Wr={class:"line-numbers"},Qr=e("        "),Hr={class:"language-javascript"},Kr=e(`\r
        export default ({ $axios, app, redirect }) => {\r
        // \u914D\u7F6E\u9ED8\u8BA4\u5C5E\u6027\r
        $axios.defaults.timeout = 20000\r
        // !! \u6CE8\u610F\u8FD9\u5757\uFF0C\u662Fnuxt \u7684\u5751\uFF0C\u56E0\u4E3A\u662F\u670D\u52A1\u7AEF\u6E32\u67D3\uFF0C\u6240\u4EE5\u670D\u52A1\u7AEF\u662F\u4E0D\u8BE5\u8D70\u4EE3\u7406\u7684\uFF0C\u5728\u5BA2\u6237\u7AEF\u624D\u8D70\u4EE3\u7406\uFF0C\r
        // \u6240\u4EE5baseUrl\u5E94\u8BE5\u4E0D\u540C\uFF0C\u5728\u670D\u52A1\u7AEF\u8BF7\u6C42\u4E1C\u897F\uFF0C\u5E94\u8BE5\u524D\u9762\u52A0\u5168\u8BF7\u6C42\u7684\u57DF\u540Dhttps\u4EC0\u4E48\u7684\r
        $axios.defaults.baseURL = process.client ? '/api' : ({}).baseUrl\r
        // \u62E6\u622A\u5668\r
        $axios.interceptors.request.use((config) => {\r
            return config\r
        })\r
        $axios.interceptors.response.use(\r
            (res) => {\r
            return res\r
            },\r
            (error) => {\r
            return Promise.reject({ data: { error, response: error.response.data } })\r
            }\r
        )\r
            return {\r
                // get\u65B9\u6CD5\r
                get (url, params, headers) {\r
                    return new Promise((resolve, reject) => {\r
                        $axios\r
                        .get(url, params, { ...headers })\r
                        .then(res => resolve(res))\r
                        .catch(err => resolve(err))\r
                    })\r
                },\r
                // post\u65B9\u6CD5\r
                post (url, params, headers) {\r
                const jsonParams = JSON.stringify(params)\r
                    return new Promise((resolve, reject) => {\r
                        $axios\r
                        .post(url, jsonParams, {\r
                            headers: { 'Content-Type': 'application/json' },\r
                            ...headers\r
                        })\r
                        .then(res => resolve(res))\r
                        .catch(err => resolve(err))\r
                    })\r
                },\r
                // delete\u65B9\u6CD5\u3001\r
                del (url, params, headers) {\r
                    return new Promise((resolve, reject) => {\r
                        $axios\r
                        .delete(url, params, { ...headers })\r
                        .then(res => resolve(res))\r
                        .catch(err => resolve(err))\r
                    })\r
                },\r
                // \u81EA\u4E49\u5B9A\u65B9\u6CD5\r
                request (method, url, params, headers) {\r
                    return new Promise((resolve, reject) => {\r
                        $axios[method](url, params, { ...headers })\r
                        .then(res => resolve(res))\r
                        .catch(err => resolve(err))\r
                    })\r
                },\r
            }\r
        }\r
        `),Yr=[Kr],Zr=r("h3",null,"index.js\u6587\u4EF6",-1),re={class:"line-numbers"},ee=e("        "),se={class:"language-javascript"},ne=e(`\r
        import apiTool from './request.js'\r
\r
        export default (ctx, inject) => {\r
            // \u5F15\u5165\u8BF7\u6C42\u5DE5\u5177\r
            const askFunc = apiTool(ctx)\r
            /* \u5BFC\u5165apis\u4E2D\u6240\u6709\u7684api\u63A5\u53E3 */\r
            const apisFiles = require.context('./apis', true, /\\.js$/)\r
            console.log(apisFiles)\r
            // \u5168\u90E8\u63A5\u53E3\u96C6\u6210\u5728\u8FD9\u91CC\r
            const apis = apisFiles.keys().reduce((modules, modulePath) => {\r
                // \u8BF4\u660E\uFF1A$1,$2\u4E0A\u5C31\u662F\u6309\u987A\u5E8F\u5BF9\u5E94\u5C0F\u62EC\u53F7\u91CC\u9762\u7684\u5C0F\u6B63\u5219 \u6355\u83B7\u5230\u7684\u5185\u5BB9\u3002\r
                const moduleName = modulePath.replace(/^\\.\\/(.*)\\.\\w+$/, '$1')\r
                // \u5F97\u5230\u5F53\u524D\u904D\u5386\u5230\u7684\u8FD9\u4E2A\u6A21\u5757\r
                const value = apisFiles(modulePath)\r
                // value.default \u5C31\u662F\u6587\u4EF6\u7684\u5BFC\u51FA\u5185\u5BB9 \u6CE8\u610F\u8FD9\u91CC\u662F\u91CD\u70B9\uFF0C\u8FD9\u91CC\u4F20\u5165\u4E86\u6240\u6709\u8BF7\u6C42\u65B9\u6CD5\u7ED9\u8BF7\u6C42\u6A21\u5757\u6587\u4EF6\r
                modules[moduleName] = value.default(askFunc)\r
                return modules\r
            }, {})\r
            // \u6CE8\u5165\u5168\u5C40\u4E0A\u4E0B\u6587   \u7EC4\u4EF6\u5185\u7528this.$apis   asyncData\u5185\u7528context.app.$apis\r
            inject('apis', { ...apis, settAxios: askFunc.settAxios })\r
        }\r
        `),te=[ne],oe=r("h3",null,"apis\u91CC\u9762\u7684\u6A21\u5757\u6587\u4EF6,\u4EE5\u5982\u4E0B\u65B9\u5F0F\u6765\u5199\u5165",-1),ae={class:"line-numbers"},ie=e("        "),ce={class:"language-javascript"},le=e(`\r
        import qs from 'qs'\r
        export default ({ get,post,del,request }) => {\r
            return {\r
                // \u83B7\u53D6\u6570\u636E\r
                getXXX(params) {\r
                    return get(\`/xxx/?\${qs.stringify(params)}\`)\r
                },\r
                //\u63D0\u4EA4\u6570\u636E\r
                postXXX(params) {\r
                    return post(\`/xxx/\`,params)\r
                },\r
                \r
            }\r
        }\r
        `),ue=[le],pe=r("h3",null,"\u6700\u540E\uFF0C\u5728nuxt.config\u91CC\u9762",-1),de={class:"line-numbers"},_e=e("        "),he={class:"language-javascript"},me=e(`\r
        // \u968F\u540E \u5728nuxt.config\u91CC\u9762 \u628A\u4ED6\u5F15\u5165\u5C31\u884C\r
        plugins:[\r
            {\r
            src: '@/http/index.js',\r
            ssr: true\r
            },\r
        ]\r
        \r
        // \u5728\u8BF7\u6C42\u65F6\u5019 \u53EF\u4EE5\u50CF\u8FD9\u6837 \u8FD9\u4E0Evue2\u7248\u672C\u4E00\u6837\r
        //\u5BA2\u6237\u7AEF\r
        methods:{\r
            async getData(){\r
                 const {data} = await this.$apis.xxxx.getXXX()\r
                 // \u65E0\u8BBA\u8BF7\u6C42\u6210\u529F\u4E0E\u5931\u8D25\uFF0C\u90FD\u4F1A\u88ABrequest\u91CC\u9762\u62E6\u622A\u6210\u8BF7\u6C42\u6210\u529F\uFF0C\u4F46\u662F\u8BF7\u6C42\u5931\u8D25\u7684\u8BDD\uFF0C\u8FD9\u91CC\u5C31\u4E00\u5B9A\u4F1A\u8FD4\u56DE\u4E2Aerror\u5B57\u6BB5\r
                 if(res.error){\r
                     //\u8FD9\u91CC\u5199\u5165\u8BF7\u6C42\u5931\u8D25\u65F6\u5019\u6267\u884C\u7684\u64CD\u4F5C\r
                     return \r
                 }\r
                 // \u4EE5\u4E0B\u662F\u5199\u5165\u8BF7\u6C42\u6210\u529F\u7684\u64CD\u4F5C\uFF0C\u56E0\u4E3A\u8BF7\u6C42\u5931\u8D25\u7684\u8BDD\u76F4\u63A5\u5C31\u5728\u4E0A\u65B9\u5904\u7406\u597D\u4E86\uFF0Creturn\u51FA\u53BB\u4E86\uFF0C\u8FD9\u91CC\u5C31\u4E0D\u4F1A\u6267\u884C\u4E86\uFF0C\r
                 // \u6240\u4EE5\u5C31\u53EF\u4EE5\u4E00\u79CD\u4F3C\u4E4E\u9ED8\u8BA4\u662F\u8BF7\u6C42\u6210\u529F\u7684\u540C\u6B65\u903B\u8F91\u53BB\u5199\u4EE3\u7801\u4E86\r
                 \r
             }\r
         }\r
         //\u5BA2\u6237\u7AEF \r
         async asyncData ({ app }) {\r
            const axiosData = {}\r
            const { data: course } = await app.$apis.xxx.getxxx()\r
            if (course.error) {\r
                // \u8BF7\u6C42\u5931\u8D25\u7684\u5904\u7406\r
            app.$message.error('\u8BF7\u6C42\u5931\u8D25')\r
            } else{\r
                //\u8BF7\u6C42\u6210\u7684\u4EE3\u7801\r
                // \u6CE8\u610F\uFF0C\u8FD9\u91CC\u4E0D\u4E00\u6837\u4E86\uFF0C\u8FD9\u91CC\u8981\u5728else\u91CC\u9762\u53BB\u4F7F\u7528,\u56E0\u4E3Areturn \u5DF2\u7ECF\u6709\u4E86\u7279\u522B\u7684\u7528\u5904\uFF0C\u7ED9\u7EC4\u4EF6\u8FD4\u56DE\u6570\u636E\u7528\u4E86\r
            }\r
    \r
        return {\r
        ...axiosData\r
        }\r
  },\r
        `),xe=[me],ge={class:""},fe=e(" # \u5173\u4E8Ereduce\u65B9\u6CD5 \u8BF7\u53C2\u8003 "),ve=e("MDN\u89E3\u91CA"),je=e(" # \u5173\u4E8Erequire.context \u8BF7\u53C2\u8003"),be=e("webpack\u5B98\u65B9\u89E3\u91CA");function ye(s,n){const t=er,m=Q,o=I,c=G("prism");return a(),l("div",null,[nr,r("p",null,[tr,d(t,null,{default:_(()=>[or]),_:1}),d(t,null,{default:_(()=>[ar]),_:1})]),ir,cr,lr,ur,r("pre",pr,[dr,p((a(),l("code",_r,mr)),[[c]])]),xr,r("pre",gr,[fr,p((a(),l("code",vr,br)),[[c]])]),yr,r("pre",kr,[$r,p((a(),l("code",qr,Pr)),[[c]])]),wr,r("pre",Cr,[Ar,p((a(),l("code",Nr,Sr)),[[c]])]),Tr,r("pre",Dr,[Fr,p((a(),l("code",zr,Vr)),[[c]])]),Or,Jr,r("pre",Mr,[Rr,p((a(),l("code",Ur,Ir)),[[c]])]),Lr,r("pre",Wr,[Qr,p((a(),l("code",Hr,Yr)),[[c]])]),Zr,r("pre",re,[ee,p((a(),l("code",se,te)),[[c]])]),oe,r("pre",ae,[ie,p((a(),l("code",ce,ue)),[[c]])]),pe,r("pre",de,[_e,p((a(),l("code",he,xe)),[[c]])]),d(m),r("ul",ge,[r("li",null,[fe,d(o,{type:"primary",href:"https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce",target:"_blank"},{default:_(()=>[ve]),_:1})]),r("li",null,[je,d(o,{type:"primary",href:"https://webpack.docschina.org/guides/dependency-management/#requirecontext",target:"_blank"},{default:_(()=>[be]),_:1})])])])}var we=U(sr,[["render",ye]]);export{we as default};
