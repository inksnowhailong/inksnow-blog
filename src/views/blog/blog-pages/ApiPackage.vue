<template>
  <div>
    <h1>
      vue和nuxt的axios请求封装方案推荐，亲测好用，可以按照以下步骤直接去封装和使用
    </h1>
    <p>
      这是本人在工作和学习过程中，通过知识和经验自己搞出来的一套封装方式，如有雷同，纯属巧合，当然，里面还是有很多东西在借鉴前辈们。十分感谢前辈们能够找到如此方便的东西:
      <el-tag>Axios</el-tag>
      <el-tag>Webpack</el-tag>
    </p>
    <p>
      最开始这么搞，主要是为了能够在组件内不用费劲的去从某个js文件里面去这么操作
      <span class="cite">import {xxxapifunction} from 'xxxx.js'</span>
      我更愿意，直接去使用x.x.x的这种方式，直接在某个地方，某个模块，拿某个请求。
      <br />
      本文的封装方式，最适合的是async await风格的请求，当然.then风格也能用。
    </p>
    <p>
      最终效果：我有一个A.vue文件，那么apis文件夹里就会有一个对应的A.js，，然后在A.js里面写好请求的路径和方法,随后就可以在A.vue里面
      this.$apis.A.getXXX
    </p>
    <h2>Vue2x的版本</h2>
    <h3>目录结构</h3>
    <pre v-highlightjs>
        <code class="javascript">
            在src下建立http文件夹，目录结构如下
            http/
            |-- apis/
            |   |-- a.js
            |   |-- b.js
            |-- index.js
            |-- request.js
        </code></pre>
    <h3>request.js文件</h3>
    <pre v-highlightjs>
        <code class="javascript">
        import axios from 'axios'
        //这里设置全局默认属性
        axios.defaults.timeout = 20000

        // 拦截器
        axios.interceptors.request.use(config => {
            return config
        })
        axios.interceptors.response.use(
            res => {
                return res
            },
            error => {
                return Promise.reject({ data: { error }})
            }
        )
        // get方法
        export function get(url, params, headers) {
            return new Promise((resolve, reject) => {
                axios
                .get(
                    url,
                    params,
                    { ...headers }
                )
                .then(res => resolve(res))
                .catch(err => resolve(err))
            })
        }
        // post方法
        export function post(url, params, headers) {
            const jsonParams = JSON.stringify(params)
            return new Promise((resolve, reject) => {
                axios
                .post(url, jsonParams, {
                    headers: { 'Content-Type': 'application/json' }, ...headers
                })
                .then(res => resolve(res))
                .catch(err => {
                    resolve(err)
                })
            })
        }
        // delete方法
        export function del(url, params, headers) {
            return new Promise((resolve, reject) => {
                axios
                .delete(
                    url,
                    params,
                    { ...headers }
                )
                .then(res => resolve(res))
                .catch(err => resolve(err))
            })
        }
        // 自义定方法
        export function request(method, url, params, headers) {
            return new Promise((resolve, reject) => {
                axios[method](url, params, { ...headers })
                .then(res => resolve(res))
                .catch(err => resolve(err))
            })
        }
       
        </code></pre>
    <h3>index.js文件 这个vue是唯一要引入的文件</h3>
    <pre v-highlightjs>
        <code class="javascript">
        /* 导入apis中所有的api接口 */
        const apisFiles = require.context('./apis', true, /\.js$/)
        // 遍历这个拿到的文件数据 这个是个函数，里面还有固定的方法 在此不做详细叙述
        const apis = apisFiles.keys().reduce((modules, modulePath) => {
            //modulePath 是拿到的文件路径，截取出来文件名
            const moduleName = modulePath.replace(/^\.\/(.*)\.\w+$/, '$1')
            //通过文件名，拿到指定文件到处的模块数据
            const value = apisFiles(modulePath)
            //返回合并后的数据，返回值交给下一层递归的第一个参数
            modules[moduleName] = value
            return modules
        }, {})
        export const Api = {
        ...apis
        }
        </code></pre>

    <h3>
      apis文件夹里面，要放一个个的请求模块，模块文件名自义定，但是这里推荐<strong
        >使用对应的vue组件名</strong
      >
      里面的内容像这样去写
    </h3>
    <pre v-highlightjs>
        <code class="javascript">
        import { get, del, post , request } from '../request.js'
        import qs from 'qs'
        // 获取数据  
        export function getXXX(params) {
            return get(`/xxx/?${qs.stringify(params)}`)
        }
        // 提交数据
        export function postXXX(params) {
            return post(`/xxx`,params)
        }
        // 删除数据
        export function delXXX(params) {
            return del(`/xxx/?${qs.stringify(params)}`)
        }
        //自义定某个请求方法
        export function othreXXX(params){
            return request('pull',params)
        }
        </code></pre>
    <h3>最后在main.js里面</h3>
    <pre v-highlightjs>
        <code class="javascript">
          import { Api } from './http/index.js'
          // 注入请求通道
          Vue.prototype.$apis = Api

          //之后在某个vue里只需要大概这么使用：
         methods:{
            async getData(){
                 const {data} = await this.$apis.xxxx.getXXX()
                 // 无论请求成功与失败，都会被request里面拦截成请求成功，但是请求失败的话，这里就一定会返回个error字段
                 if(res.error){
                     //这里写入请求失败时候执行的操作
                     return 
                 }
                 // 以下是写入请求成功的操作，因为请求失败的话直接就在上方处理好了，return出去了，这里就不会执行了，
                 // 所以就可以一种似乎默认是请求成功的同步逻辑去写代码了
                 
             }
         }
        </code></pre>
    <h2>
      nuxt2x的版本，这里我采用了和vue时候不一样的逻辑方式去搞，区别很小，实现效果也一样，但是，能节省写几行代码
    </h2>
    <h3>目录结构，同vue2x版本</h3>
    <pre v-highlightjs>
        <code class="javascript">
            在src下建立http文件夹，目录结构如下
            http/
            |-- apis/
            |   |-- a.js
            |   |-- b.js
            |-- index.js
            |-- request.js
        </code></pre>
    <h3>request文件</h3>
    <pre v-highlightjs>
        <code class="javascript">
        export default ({ $axios, app, redirect }) => {
        // 配置默认属性
        $axios.defaults.timeout = 20000
        // !! 注意这块，是nuxt 的坑，因为是服务端渲染，所以服务端是不该走代理的，在客户端才走代理，
        // 所以baseUrl应该不同，在服务端请求东西，应该前面加全请求的域名https什么的
        $axios.defaults.baseURL = process.client ? '/api' : process.env.baseUrl
        // 拦截器
        $axios.interceptors.request.use((config) => {
            return config
        })
        $axios.interceptors.response.use(
            (res) => {
            return res
            },
            (error) => {
            return Promise.reject({ data: { error, response: error.response.data } })
            }
        )
            return {
                // get方法
                get (url, params, headers) {
                    return new Promise((resolve, reject) => {
                        $axios
                        .get(url, params, { ...headers })
                        .then(res => resolve(res))
                        .catch(err => resolve(err))
                    })
                },
                // post方法
                post (url, params, headers) {
                const jsonParams = JSON.stringify(params)
                    return new Promise((resolve, reject) => {
                        $axios
                        .post(url, jsonParams, {
                            headers: { 'Content-Type': 'application/json' },
                            ...headers
                        })
                        .then(res => resolve(res))
                        .catch(err => resolve(err))
                    })
                },
                // delete方法、
                del (url, params, headers) {
                    return new Promise((resolve, reject) => {
                        $axios
                        .delete(url, params, { ...headers })
                        .then(res => resolve(res))
                        .catch(err => resolve(err))
                    })
                },
                // 自义定方法
                request (method, url, params, headers) {
                    return new Promise((resolve, reject) => {
                        $axios[method](url, params, { ...headers })
                        .then(res => resolve(res))
                        .catch(err => resolve(err))
                    })
                },
            }
        }
        </code></pre>
    <h3>index.js文件</h3>
    <pre v-highlightjs>
        <code class="javascript">
        import apiTool from './request.js'

        export default (ctx, inject) => {
            // 引入请求工具
            const askFunc = apiTool(ctx)
            /* 导入apis中所有的api接口 */
            const apisFiles = require.context('./apis', true, /\.js$/)
            console.log(apisFiles)
            // 全部接口集成在这里
            const apis = apisFiles.keys().reduce((modules, modulePath) => {
                // 说明：$1,$2上就是按顺序对应小括号里面的小正则 捕获到的内容。
                const moduleName = modulePath.replace(/^\.\/(.*)\.\w+$/, '$1')
                // 得到当前遍历到的这个模块
                const value = apisFiles(modulePath)
                // value.default 就是文件的导出内容 注意这里是重点，这里传入了所有请求方法给请求模块文件
                modules[moduleName] = value.default(askFunc)
                return modules
            }, {})
            // 注入全局上下文   组件内用this.$apis   asyncData内用context.app.$apis
            inject('apis', { ...apis, settAxios: askFunc.settAxios })
        }
        </code></pre>
    <h3>apis里面的模块文件,以如下方式来写入</h3>
    <pre v-highlightjs>
        <code class="javascript">
        import qs from 'qs'
        export default ({ get,post,del,request }) => {
            return {
                // 获取数据
                getXXX(params) {
                    return get(`/xxx/?${qs.stringify(params)}`)
                },
                //提交数据
                postXXX(params) {
                    return post(`/xxx/`,params)
                },
                
            }
        }
        </code></pre>
    <h3>最后，在nuxt.config里面</h3>
    <pre v-highlightjs>
        <code class="javascript">
        // 随后 在nuxt.config里面 把他引入就行
        plugins:[
            {
            src: '@/http/index.js',
            ssr: true
            },
        ]
        
        // 在请求时候 可以像这样 这与vue2版本一样
        //客户端
        methods:{
            async getData(){
                 const {data} = await this.$apis.xxxx.getXXX()
                 // 无论请求成功与失败，都会被request里面拦截成请求成功，但是请求失败的话，这里就一定会返回个error字段
                 if(res.error){
                     //这里写入请求失败时候执行的操作
                     return 
                 }
                 // 以下是写入请求成功的操作，因为请求失败的话直接就在上方处理好了，return出去了，这里就不会执行了，
                 // 所以就可以一种似乎默认是请求成功的同步逻辑去写代码了
                 
             }
         }
         //客户端 
         async asyncData ({ app }) {
            const axiosData = {}
            const { data: course } = await app.$apis.xxx.getxxx()
            if (course.error) {
                // 请求失败的处理
            app.$message.error('请求失败')
            } else{
                //请求成的代码
                // 注意，这里不一样了，这里要在else里面去使用,因为return 已经有了特别的用处，给组件返回数据用了
            }
    
        return {
        ...axiosData
        }
  },
        </code></pre>

    <el-divider />
    <ul class="">
      <li>
        # 关于reduce方法 请参考
        <el-link
          type="primary"
          href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce"
          target="_blank"
          >MDN解释</el-link
        >
      </li>
      <li>
        # 关于require.context 请参考<el-link
          type="primary"
          href="https://webpack.docschina.org/guides/dependency-management/#requirecontext"
          target="_blank"
          >webpack官方解释</el-link
        >
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
