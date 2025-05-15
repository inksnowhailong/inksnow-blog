<script setup lang="ts">
import { ref, watch } from "vue";

const canvasRef = ref<HTMLCanvasElement>();
const props = defineProps<{
  isShowLoading: boolean;
}>();
const animateMethod = () => {
  const canvas = canvasRef.value as HTMLCanvasElement;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  // 设置画布为全屏
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // 文字动画参数
  const text = "INKSNOW";
  const letters = text.split("");
  const fontSize = 60;
  const baseColors = ["#1e90ff", "#ff69b4", "#00ced1", "#ff4500", "#9370db"];
  let letterStates = letters.map((_, index) => ({
    opacity: 0,
    scale: 0.5,
    rotation: 0,
    color: baseColors[index % baseColors.length],
    timeOffset: index * 0.2,
  }));

  // 粒子效果
  const particles: any[] = [];
  const particleCount = 50;
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 5 + 2,
      speedX: (Math.random() - 0.5) * 2,
      speedY: (Math.random() - 0.5) * 2,
      color: baseColors[Math.floor(Math.random() * baseColors.length)],
    });
  }

  // 设置字体
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // 动画函数
  const animate = () => {
    // 清空画布，设置白色背景
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制粒子
    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;

      // 边界反弹
      if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
      if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

      // 绘制粒子
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 绘制文字
    const textWidth = ctx.measureText(text).width;
    const startX = canvas.width / 2 - textWidth / 2;
    let currentX = startX;

    letters.forEach((letter, index) => {
      const state = letterStates[index];
      const time = Date.now() / 1000 + state.timeOffset;

      // 动画参数计算
      state.opacity = (Math.sin(time * 2) + 1) / 2;
      state.scale = 0.5 + Math.sin(time * 1.5) * 0.3;
      state.rotation = (Math.sin(time * 1) * Math.PI) / 4;

      // 保存画布状态
      ctx.save();
      ctx.translate(
        currentX + ctx.measureText(letter).width / 2,
        canvas.height / 2
      );
      ctx.scale(state.scale, state.scale);
      ctx.rotate(state.rotation);

      // 绘制文字
      ctx.fillStyle = state.color;
      ctx.globalAlpha = state.opacity;
      ctx.fillText(letter, 0, 0);

      // 恢复画布状态
      ctx.restore();

      currentX += ctx.measureText(letter).width;
    });

    // 继续动画
    requestAnimationFrame(animate);
  };
  // 启动动画
  animate();
};
watch(
  () => props.isShowLoading,
  (newVal) => {
    if (newVal) {
      animateMethod();
    }
  }
);
</script>

<template>
  <div class="loading-container" v-if="props.isShowLoading">
    <canvas ref="canvas" class="loading-canvas"></canvas>
  </div>
</template>

<style scoped>
.loading-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 2025;
}
.loading-canvas {
  display: block;
}
</style>
