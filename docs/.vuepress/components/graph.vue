<script setup lang="ts">
import * as echarts from "echarts/core";
import {
  TitleComponent,
  TitleComponentOption,
  TooltipComponent,
  TooltipComponentOption,
} from "echarts/components";
import { GraphChart, GraphSeriesOption } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import { onMounted } from "vue";
import { ref } from "vue";

echarts.use([TitleComponent, TooltipComponent, GraphChart, CanvasRenderer]);

type EChartsOption = echarts.ComposeOption<
  TitleComponentOption | TooltipComponentOption | GraphSeriesOption
>;

let chartDom = ref<HTMLElement | null>(null);
let option: EChartsOption;

option = {
  title: {
    text: "Basic Graph",
  },
  tooltip: {},
  animationDurationUpdate: 1500,
  animationEasingUpdate: "quinticInOut",
  series: [
    {
      type: "graph",
      layout: "none",
      symbolSize: 50,
      roam: true,
      label: {
        show: true,
      },
      edgeSymbol: ["circle", "arrow"],
      edgeSymbolSize: [4, 10],
      edgeLabel: {
        fontSize: 20,
      },
      data: [
        {
          name: "Node 1",
          x: 300,
          y: 300,
        },
        {
          name: "Node 2",
          x: 800,
          y: 300,
        },
      ],
      // links: [],
      links: [
        {
          source: 0,
          target: 1,
          symbolSize: [5, 20],
          label: {
            show: true,
          },
          lineStyle: {
            width: 5,
            curveness: 0,
          },
        },
      ],
      lineStyle: {
        opacity: 0.9,
        width: 2,
        curveness: 0,
      },
    },
  ],
};

onMounted(() => {
  let myChart = echarts.init(chartDom.value);
  option && myChart.setOption(option);
});
</script>

<template>
  <div class="graph" ref="graphBox"></div>
</template>

<style scoped lang="scss"></style>
