<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import HelloWorld from './components/HelloWorld.vue'


const getArray = <T, U>(param1: T, param2: U, times: number): [T, U][] => {
  return new Array(times).fill([param1, param2]);
};
getArray<number,string>(1, "a", 3).forEach(item => {
  console.log(item[1].length); // error 类型“number”上不存在属性“length”
  console.log(item[0].toFixed(2)); // error 属性“toFixed”在类型“string”上不存在
});

</script>

<template>
  <img alt="Vue logo" src="./assets/logo.png" />
  <HelloWorld msg="Hello Vue 3 + TypeScript + Vite" />
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
