<script setup lang="ts">
import { fetchWeatherApi } from "openmeteo";
import { onMounted, ref, computed } from "vue";
interface WeatherData {
  weather: Weather;
  sunrise: string;
  sunset: string;
}
/**
 * @description: 天气枚举
 * @return {*}
 */
const enum Weather {
  晴天 = "晴天",
  多云 = "多云",
  阴天 = "阴天",
  雾 = "雾",
  毛毛雨 = "毛毛雨",
  雨 = "雨",
  雪 = "雪",
  阵雪 = "阵雪",
  雷暴 = "雷暴",
  阵雨 = "阵雨",
}
const weatherEng = {
  "晴天": "sunny",
  "多云": "cloudy",
  "阴天": "cloudy",
  "雾": "fog",
  "毛毛雨": "drizzle",
  "雨": "rain",
  "雪": "snow",
  "阵雪": "snow",
  "雷暴": "thunderstorm",
  "阵雨": "rain",
}
/**
 * @description: 天气代码枚举
 * @return {*}
 */
const simplifiedWeatherCodeObj = {
  0: Weather.晴天,
  1: Weather.多云,
  2: Weather.阴天,
  3: Weather.多云,
  45: Weather.雾,
  48: Weather.雾,
  51: Weather.毛毛雨,
  53: Weather.毛毛雨,
  55: Weather.毛毛雨,
  56: Weather.毛毛雨,
  57: Weather.毛毛雨,
  61: Weather.雨,
  63: Weather.雨,
  65: Weather.雨,
  66: Weather.雨,
  67: Weather.雨,
  71: Weather.雪,
  73: Weather.雪,
  75: Weather.雪,
  77: Weather.雪,
  80: Weather.阵雨,
  81: Weather.阵雨,
  82: Weather.阵雨,
  85: Weather.阵雪,
  86: Weather.阵雪,
  95: Weather.雷暴,
  96: Weather.雷暴,
  99: Weather.雷暴,
};

const weather = ref<WeatherData>({
  weather: Weather.晴天,
  sunrise: "",
  sunset: "",
});
const bgImg = ref<string>("");
onMounted(() => {
  getWeather();
  getBgImg();
});
/**
 * @description: 获取天气数据
 * @return {*}
 */
async function getWeather() {
  const params = {
    latitude: 39.9042,
    longitude: 116.4074,
    daily: ["sunrise", "sunset"],
    current: "weather_code",
    timezone: "Asia/Shanghai",
  };

  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    console.log("位置信息:", data);
    params.latitude = data.latitude;
    params.longitude = data.longitude;
  } catch (error) {
    console.error("获取位置信息失败:", error);
  }

  const url = "https://api.open-meteo.com/v1/forecast";
  console.log(params);

  const responses = await fetchWeatherApi(url, params);

  // Process first location. Add a for-loop for multiple locations or weather models
  const response = responses[0];

  const current = response.current()!;
  const daily = response.daily()!;

  const sunrise = daily.variables(0)!;
  const sunset = daily.variables(1)!;

  // Note: The order of weather variables in the URL query and the indices below need to match!
  const weatherData = {
    current: {
      time: new Date(Number(current.time()) * 1000),
      weatherCode: current.variables(0)!.value(),
    },
    daily: {
      time: [...Array((Number(daily.timeEnd()) - Number(daily.time())) / daily.interval())].map(
        (_, i) => new Date((Number(daily.time()) + i * daily.interval()) * 1000)
      ),
      sunrise: [...Array(sunrise.valuesInt64Length())].map(
        (_, i) => new Date(Number(sunrise.valuesInt64(i)) * 1000)
      ),
      sunset: [...Array(sunset.valuesInt64Length())].map(
        (_, i) => new Date(Number(sunset.valuesInt64(i)) * 1000)
      ),
    },
  };

  weather.value.weather = simplifiedWeatherCodeObj[weatherData.current.weatherCode];
  weather.value.sunrise = weatherData.daily.sunrise[0].toLocaleString();
  weather.value.sunset = weatherData.daily.sunset[0].toLocaleString();
}
/**
 * @description: 计算日出日落进度
 * @param {*} computed
 * @return {*}
 */
const getDayProgress = computed(() => {
  const now = new Date();
  const sunrise = new Date(weather.value.sunrise);
  const sunset = new Date(weather.value.sunset);

  // 如果当前时间在日出之前
  if (now < sunrise) return 0;
  // 如果当前时间在日落之后
  if (now > sunset) return 100;

  // 计算当前时间在日出日落之间的进度
  const total = sunset.getTime() - sunrise.getTime();
  const current = now.getTime() - sunrise.getTime();
  return Math.round((current / total) * 100);
});
async function getBgImg() {

  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${weatherEng[weather.value.weather]}&per_page=1`,
    {
      headers: {
        Authorization: "Y6Ka77FwnK3Y1HnbsAyH8fcIVMIoalwkE3KFL5cHn7tT8FROimAx397T",
      },
    }
  );
  const data = await response.json();
  console.log(data);
  bgImg.value = data.photos[0].src.original;
}
</script>

<template>
  <div
    class="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white text-gray-800 relative"
    :style="{ backgroundImage: `url(${bgImg})`, backgroundSize: 'cover', backgroundPosition: 'center' }"
  >
    <!-- 天气信息卡片 -->
    <div class="absolute top-2 right-2 backdrop-blur-md bg-white/30 rounded-xl p-3 shadow-lg text-sm border border-white/30">
      <div class="flex items-center gap-1 mb-2">
        <span class="font-medium text-white drop-shadow-sm">{{ weather.weather }}</span>
      </div>
      <!-- 日出日落进度条 -->
      <div class="w-48">
        <div class="flex justify-between text-xs text-white/90 mb-1 drop-shadow-sm">
          <span>日出 {{ weather.sunrise.split(" ")[1] }}</span>
          <span>日落 {{ weather.sunset.split(" ")[1] }}</span>
        </div>
        <div class="h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
          <div
            class="h-full bg-gradient-to-r from-yellow-400/80 to-orange-500/80"
            :style="{ width: getDayProgress + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 text-center backdrop-blur-md bg-white/70 rounded-xl p-3 shadow-lg text-sm border border-white/30">
      <h1 class="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
        inksnow海龙的博客
      </h1>
      <p class="text-xl md:text-2xl text-gray-600 mb-8">日复一日,年复一年。</p>
      <blockquote class="text-lg md:text-xl text-gray-700 italic border-l-4 border-blue-500 pl-4 my-8 ">
        "你需要放下当前的预设和执念，甚至要牺牲你最在乎的东西，才能实现自己的潜力，而不是始终停滞不前"
        <footer class="text-sm mt-2 text-gray-500">——乔丹·彼得森</footer>
      </blockquote>
    </div>
  </div>
</template>

<style scoped>
.backdrop-blur-md {
  backdrop-filter: blur(12px);
}
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
}
</style>
