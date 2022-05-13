<template>
  <div>
    <h1>TypeScript的配置文件tsconfig.json配置解析</h1>
    <p>
      TypeScript可以编译出纯净、
      简洁的JavaScript代码，并且可以运行在任何浏览器上、Node.js环境中和任何支持ECMAScript3（或更高版本）的JavaScript引擎中。
    </p>
    <p>
      类型允许JavaScript开发者在开发JavaScript应用程序时使用高效的开发工具和常用操作比如静态检查和代码重构。
      类型是可选的，类型推断让一些类型的注释使你的代码的静态验证有很大的不同。类型让你定义软件组件之间的接口和洞察现有JavaScript库的行为。
    </p>

    <h2>1.experimentalDecorators</h2>
    <p>
      <span class="parse">是否启用实验性的ES装饰器。</span> boolean类型，默认值：false。
      <el-link
        type="primary"
        href="https://www.typescriptlang.org/docs/handbook/decorators.html"
        target="_blank"
        >官方解释</el-link
      >
      <br />
      很多库都有用到该特性，比如vue-class-component 及 vuex-class等库。<strong
        >当你使用这些库时，必须开启experimentalDecorators。</strong
      >
    </p>
    <span class="cite"
      >启用 vuex-class同时需要设置strictFunctionTypes选项为false</span
    >

    <h2>2. strictPropertyInitialization</h2>
    <p>
     <span class="parse"> 是否类的非undefined属性已经在构造函数里初始化。</span> boolean类型，默认值：false
      <br />
      直白点，就是所有的属性值，都需要赋有初始值。<strong>建议把strictPropertyInitialization设置为false</strong>，
      这样就不需要定义一个变量就必须赋有初始值。对使用vuex-class库的朋友，建议请把这个值设为false，绝对能省很多事。
    </p>
    <span class="cite"
      >如果设置该选项为true，需要同时启用--strictNullChecks或启用--strict</span
    >

    <h2>3. noImplicitAny</h2>
    <p>
    <span class="parse">有隐含的 any类型时是否报错。</span> boolean值，默认值：false
      <br />
      ts是有默认推导的，同时还有any类型，所以不是每个变量或参数定义需要明确告知类型是什么。
      如果开启该值，当有隐含any类型时，会报错。建议初次上手TypeScript，把该选项设置为false。
    </p>
    <pre v-highlightjs>
        <code class="javascript">
       // 当开启noImplicitAny时，需要隐含当any需要明确指出
        arr.find(item => item.name === name) // error  参数“item”隐式具有“any”类型。ts(7006)
        arr.find((item: any) => item.name === name) // ok   
        </code></pre>

    <h2>4. target</h2>
      <p>
        <span class="parse">指定编译的ECMAScript目标版本。</span>
        枚举值："ES3"， "ES5"， "ES6"/ "ES2015"，
        "ES2016"， "ES2017"，"ESNext"。默认值： “ES3”
        <br />
        TypeScript是ES6的超集，所以你可以使用ES6来编写ts代码（通常我们也的确这么做）。
        <br>
        然而，当编译ts代码时，可以把ts转为ES5或更早的js代码。所以需要选择一个编译的目标版本。
        vue-cli3的typescript模板，设置为“ESNext”，因为现代大部分应用项目都会使用Webpack（Parcel也很棒）进行打包，
        Webpack会把你的代码转换成在所有浏览器中可运行的代码。
      </p>
      <span class="cite">target: "ESNext" 是指tc39最新的ES proposed features</span>

    <h2>5. module</h2>
      <p>
      <span class="parse">指定生成哪个模块系统代码。</span>
      枚举值："None"， "CommonJS"， "AMD"， "System"， "UMD"， "ES6"， "ES2015"，"ESNext"。
      默认值根据--target选项不同而不同，当target设置为ES6时，默认module为“ES6”，否则为“commonjs”
      <br>
        <p> 通常使用ES6的模块来写ts代码，然而2016年1月以前，基本上没有浏览器原生支持ES6的模块系统，所以需要转换为不同的模块系统，如：CommonJS、AMD、SystemJS等，而module选项就是指定编译使用对应的模块系统。</p>
      </p>

    <h2>6. lib</h2>
      <p>
      <span class="parse">编译过程中需要引入的库文件的列表。</span>
      string[]类型，可选的值有很多，常用的有ES5，ES6，ESNext，DOM，DOM.Iterable、WebWorker、ScriptHost等。该值默认值是根据--target选项不同而不同。
      当target为ES5时，默认值为['DOM ', 'ES5', 'ScriptHost'];当target为ES6时，默认值为['DOM', 'ES6', 'DOM.Iterable', 'ScriptHost']
      <br>
        <p> 为了在ts代码中使用ES6中的类，比如Array.form、Set、Reflect等，需要设置lib选项，在编译过程中把这些标准库引入。这样在编译过程中，如果遇到属于这些标准库的class或api时，ts编译器不会报错。</p>
      </p>

    <h2>7. moduleResolution</h2>
      <p>
      <span class="parse">决定如何处理模块。</span>
      string类型，“node”或者“classic”，默认值：“classic”。
      <br>
        <p> 说直白点，也就是遇到import { AAA } from './aaa'该如何去找对应文件模块解析。对于工程项目，建议大家使用node（vue-cli3 ts模板默认设置为node策略），因为这个更符合平时我们的书写习惯以及认知（平时都是webpack打包，webpack又基于node之上）。</p>
      </p>
       <pre v-highlightjs>
        <code class="javascript">
          // 在源文件/root/src/A.ts中import { b } from "./moduleB"
          // 两种解析方式查找文件方式不同

          // classic模块解析方式
          1. /root/src/moduleB.ts
          2. /root/src/moduleB.d.ts

          // node模块解析方式
          1. /root/src/moduleB.ts
          2. /root/src/moduleB.tsx
          3. /root/src/moduleB.d.ts
          4. /root/src/moduleB/package.json (if it specifies a "types" property)
          5. /root/src/moduleB/index.ts
          6. /root/src/moduleB/index.tsx
          7. /root/src/moduleB/index.d.ts
        </code></pre>

  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.parse{
  background: #eef5ff;
  padding: 4px 4px 4px 10px;
}
</style>
