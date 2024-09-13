<script setup lang="ts">
import * as THREE from "three";
import { onMounted } from "vue";
import { ref } from "vue";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
// 获取 .glb 文件的 URL
const glbUrl = new URL("../public/smallhouse.glb", import.meta.url).href;
console.log("glb", glbUrl);
const canvasRef = ref<HTMLCanvasElement | null>(null);

onMounted(() => {
  const scene = new THREE.Scene();
  const canvas = canvasRef.value as HTMLCanvasElement;
  console.log("canvas.clientWidth", canvas.clientWidth);
  console.log("canvas.clientWidth", canvas.clientHeight);
  const camera = new THREE.PerspectiveCamera(
    75,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );

  const loader = new GLTFLoader();
  const renderer = new THREE.WebGLRenderer({
    canvas,
  });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  const controls = new OrbitControls(camera, renderer.domElement);
  // 配置 OrbitControls
  controls.enablePan = true; // 启用平移
  controls.panSpeed = 1.0; // 设置平移速度
  controls.enableDamping = true; // 启用阻尼效果
  controls.dampingFactor = 0.25; // 阻尼系数
  controls.screenSpacePanning = false; // 设置为 true 以在屏幕空间中进行平移
  // Load a glTF resource
  loader.load(
    // resource URL
    glbUrl,
    // called when the resource is loaded
    function (gltf) {
      console.log("gltf", gltf);
      scene.add(gltf.scene);

      gltf.animations; // Array<THREE.AnimationClip>
      gltf.scene; // THREE.Group
      gltf.scenes; // Array<THREE.Group>
      gltf.cameras; // Array<THREE.Camera>
      gltf.asset; // Object
    },
    // called while loading is progressing
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    // called when loading has errors
    function (error) {
      console.log("An error happened");
    }
  );

  // 加入环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 3); // 白色环境光，强度为0.5
  scene.add(ambientLight);


  camera.position.z = 5;

  controls.update();
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    // console.log('1', 1)
  }
  animate();
});
</script>

<template>
  <div class="myhouse">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.myhouse {
  width: 100%;
  height: 600px;
  background-color: #f0f0f0;
}
.myhouse canvas {
  width: 100%;
  height: 100%;
}
</style>
