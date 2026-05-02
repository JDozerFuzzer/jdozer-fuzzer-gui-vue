import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// ECharts setup
import 'echarts'
import ECharts from 'vue-echarts'

const app = createApp(App)

app.component('v-chart', ECharts)

app.use(createPinia())
app.use(router)

app.mount('#app')
