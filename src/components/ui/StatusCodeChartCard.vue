<template>
  <GlassCard :title="title">
    <div class="chart-wrapper">
      <v-chart class="echart" :option="chartOption" autoresize />
    </div>
  </GlassCard>
</template>

<script setup>
import { computed } from 'vue'
import GlassCard from './GlassCard.vue'
import VChart from 'vue-echarts'

const props = defineProps({
  data: {
    type: [Object, Array],
    default: null
  },
  statusCodes: {
    type: [Object, Array],
    default: null
  },
  title: {
    type: String,
    default: 'Códigos de Estado HTTP por Operación'
  }
})

const normalizedOperationsMap = computed(() => {
  const raw = props.data || props.statusCodes
  if (!raw) return {}

  if (typeof raw === 'object' && !Array.isArray(raw) && !raw.payload && !raw.headers && !raw.operationId) {
    return raw
  }

  const items = Array.isArray(raw)
    ? raw
    : (Array.isArray(raw.surfaces || raw.items || raw.events)
        ? (raw.surfaces || raw.items || raw.events)
        : [raw])

  const map = {}
  items.forEach(item => {
    if (!item) return
    const p = item.payload || item
    const opId = p.operationId || p.name || p.opId
    const code = p.statusCode
    if (!opId || code === undefined) return

    if (!map[opId]) map[opId] = {}
    map[opId][code] = (map[opId][code] || 0) + (p.count || 1)
  })

  if (Object.keys(map).length === 0 && typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.payload && typeof raw.payload === 'object' && !raw.payload.operationId) {
      return raw.payload
    }
    return raw
  }

  return map
})

const chartOption = computed(() => {
  const operationsMap = normalizedOperationsMap.value || {}
  const operations = Object.keys(operationsMap)

  if (operations.length === 0) {
    return {
      title: { text: 'Sin datos aún', textStyle: { color: '#a0a0b0' }, left: 'center', top: 'middle' }
    }
  }

  const allCodesSet = new Set()
  operations.forEach(op => {
    Object.keys(operationsMap[op] || {}).forEach(code => allCodesSet.add(code))
  })
  const allCodes = Array.from(allCodesSet).sort()

  operations.sort((a, b) => {
    const totalA = Object.values(operationsMap[a] || {}).reduce((sum, v) => sum + v, 0)
    const totalB = Object.values(operationsMap[b] || {}).reduce((sum, v) => sum + v, 0)
    return totalA - totalB
  })

  const series = allCodes.map(code => {
    let color = '#60a5fa'
    if (String(code).startsWith('2')) color = '#4ade80'
    if (String(code).startsWith('4')) color = '#fbbf24'
    if (String(code).startsWith('5')) color = '#f87171'

    return {
      name: `HTTP ${code}`,
      type: 'bar',
      stack: 'total',
      itemStyle: { color },
      data: operations.map(op => (operationsMap[op] && operationsMap[op][code]) || 0)
    }
  })

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(28, 28, 40, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#f0f0f5' }
    },
    legend: {
      data: series.map(s => s.name),
      textStyle: { color: '#a0a0b0' },
      top: 0
    },
    grid: { left: '3%', right: '4%', top: 40, bottom: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
    },
    yAxis: {
      type: 'category',
      data: operations,
      axisLabel: { color: '#a0a0b0' }
    },
    series
  }
})
</script>

<style scoped>
.chart-wrapper {
  height: 350px;
}

.echart {
  height: 350px;
  width: 100%;
}
</style>
