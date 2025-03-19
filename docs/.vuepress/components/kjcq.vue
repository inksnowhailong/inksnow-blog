<script setup lang="ts">
import { ref, onMounted } from 'vue';
const url = 'https://inksnow-corgi-shiba.hf.space';
const show = ref(false);
onMounted(() => {
    show.value = true;
});
</script>

<template>
  <div style="box-shadow: 0 0 10px rgba(0, 0, 0, 0.1)">
    <iframe
     v-if="show"
      :src="url"
      frameborder="1"
        style="width: 100%; height: 60vh;"
    ></iframe>
  </div>
</template>

<style scoped lang="scss"></style>
