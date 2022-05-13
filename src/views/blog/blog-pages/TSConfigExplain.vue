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
        是否启用实验性的ES装饰器。boolean类型，默认值：false。
        <el-link
            type="primary"
            href="https://www.typescriptlang.org/docs/handbook/decorators.html"
            target="_blank"
            >官方解释</el-link
        >
        <br>
        很多库都有用到该特性，比如vue-class-component 及
        vuex-class等库。<strong>当你使用这些库时，必须开启experimentalDecorators。</strong>
        </p>
        <span class="cite">启用 vuex-class同时需要设置strictFunctionTypes选项为false</span>

    <h2>2. strictPropertyInitialization</h2>
        <p>
        是否类的非undefined属性已经在构造函数里初始化。 boolean类型，默认值：false
        <br>
        直白点，就是所有的属性值，都需要赋有初始值。<strong>建议把strictPropertyInitialization设置为false</strong>，
        这样就不需要定义一个变量就必须赋有初始值。对使用vuex-class库的朋友，建议请把这个值设为false，绝对能省很多事。
        </p>
        <span class="cite">如果设置该选项为true，需要同时启用--strictNullChecks或启用--strict</span>

    <h2>3. noImplicitAny</h2>
        <p>
        有隐含的 any类型时是否报错。boolean值，默认值：false
        <br>
        ts是有默认推导的，同时还有any类型，所以不是每个变量或参数定义需要明确告知类型是什么。
        如果开启该值，当有隐含any类型时，会报错。建议初次上手TypeScript，把该选项设置为false。
        </p>
         <pre v-highlightjs>
        <code class="javascript">
       // 当开启noImplicitAny时，需要隐含当any需要明确指出
        arr.find(item => item.name === name) // error  参数“item”隐式具有“any”类型。ts(7006)
        arr.find((item: any) => item.name === name) // ok   
        </code></pre>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
