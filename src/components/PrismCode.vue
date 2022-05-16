<template>
 <pre class="line-numbers">
    <code  :class="'language-'+ type" v-html="Prism.highlight(code, Prism.languages[type], type)"></code>
 </pre>
 
</template>

<script setup lang="ts">

import Prism from 'prismjs';

const props = defineProps({
  code: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'javascript'
  }
})
const {code, type} = props

</script>
