<template>
  <GlassCard :title="title">
    <div class="schema-summary-bar">
      <div class="schema-kpi total-probe">
        <span class="kpi-label">Total Solicitudes</span>
        <span class="kpi-val">{{ globalTotals.total }}</span>
        <span class="kpi-tag">Inspeccionadas</span>
      </div>
      <div class="schema-kpi exact">
        <span class="kpi-label">Válidas</span>
        <span class="kpi-val">{{ globalTotals.valid }}</span>
        <span class="kpi-tag">{{ globalTotals.validPct }}% Cumple Schema</span>
      </div>
      <div class="schema-kpi none">
        <span class="kpi-label">Inválidas</span>
        <span class="kpi-val">{{ globalTotals.invalid }}</span>
        <span class="kpi-tag">{{ globalTotals.invalidPct }}% Mutación / No Cumple</span>
      </div>
    </div>

    <div class="schema-layout">
      <!-- Chart Stacked by Operation -->
      <div class="chart-wrapper">
        <v-chart class="echart" :option="chartOption" autoresize />
      </div>

      <!-- Operations Breakdown List -->
      <div class="schema-ops-list">
        <div v-if="Object.keys(normalizedData).length === 0" class="empty-schema">
          Esperando eventos request:payload...
        </div>
        <div v-else v-for="(data, opId) in normalizedData" :key="opId" class="schema-op-card">
          <div class="schema-op-header">
            <span class="schema-op-title" :title="opId">{{ opId }}</span>
            <span class="schema-op-total">{{ data.total }} probes</span>
          </div>

          <!-- Progress bar for valid/invalid ratio -->
          <div class="probe-progress-bar">
            <div class="probe-bar-valid"
              :style="{ width: (data.total > 0 ? (data.valid / data.total * 100) : 0) + '%' }" title="Válidos">
            </div>
            <div class="probe-bar-invalid"
              :style="{ width: (data.total > 0 ? (data.invalid / data.total * 100) : 0) + '%' }" title="Inválidos">
            </div>
          </div>

          <!-- Counters Row -->
          <div class="schema-badges-row">
            <span class="schema-badge badge-exact" title="Request cumple con el schema definido en contrato">
              ✅ Válidos: {{ data.valid }} ({{ data.total > 0 ? Math.round(data.valid / data.total * 100) : 0 }}%)
            </span>
            <span class="schema-badge badge-none" title="Request NO cumple con el schema definido en contrato">
              ❌ Inválidos: {{ data.invalid }} ({{ data.total > 0 ? Math.round(data.invalid / data.total * 100) : 0 }}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  </GlassCard>
</template>

<script setup>
import { computed } from 'vue'
import GlassCard from './GlassCard.vue'
import VChart from 'vue-echarts'

import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'

use([CanvasRenderer, BarChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent])

const props = defineProps({
  data: {
    type: [Object, Array],
    default: null
  },
  requestPayloads: {
    type: [Object, Array],
    default: null
  },
  schemaProbe: {
    type: [Object, Array],
    default: null
  },
  title: {
    type: String,
    default: 'Validación de Schemas de Solicitud (Request Payload) por Operación'
  }
})

const normalizedData = computed(() => {
  const raw = props.data || props.requestPayloads || props.schemaProbe
  if (!raw) return {}

  const firstKey = typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw)[0] : null
  if (firstKey && raw[firstKey] && typeof raw[firstKey] === 'object' && raw[firstKey].total !== undefined && (raw[firstKey].valid !== undefined || raw[firstKey].invalid !== undefined)) {
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
    const isValid = p.isValid

    if (!opId || isValid === undefined) return

    if (!map[opId]) {
      map[opId] = { valid: 0, invalid: 0, total: 0 }
    }

    if (isValid) {
      map[opId].valid++
    } else {
      map[opId].invalid++
    }
    map[opId].total++
  })

  if (Object.keys(map).length === 0 && typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.payload && typeof raw.payload === 'object') {
      return raw.payload
    }
    return raw
  }

  return map
})

const globalTotals = computed(() => {
  const byOp = normalizedData.value || {}
  let valid = 0
  let invalid = 0
  let total = 0

  Object.values(byOp).forEach(opData => {
    valid += opData.valid || 0
    invalid += opData.invalid || 0
    total += opData.total || 0
  })

  const validPct = total > 0 ? Math.round((valid / total) * 100) : 0
  const invalidPct = total > 0 ? Math.round((invalid / total) * 100) : 0

  return { valid, invalid, total, validPct, invalidPct }
})

const chartOption = computed(() => {
  const byOp = normalizedData.value || {}
  const operations = Object.keys(byOp)

  if (operations.length === 0) {
    return {
      title: { text: 'Sin datos aún', textStyle: { color: '#a0a0b0' }, left: 'center', top: 'middle' }
    }
  }

  operations.sort((a, b) => (byOp[a]?.total || 0) - (byOp[b]?.total || 0))

  const series = [
    {
      name: 'Válidos',
      type: 'bar',
      stack: 'probeValidity',
      itemStyle: { color: '#4ade80' },
      data: operations.map(op => byOp[op]?.valid || 0)
    },
    {
      name: 'Inválidos',
      type: 'bar',
      stack: 'probeValidity',
      itemStyle: { color: '#f87171' },
      data: operations.map(op => byOp[op]?.invalid || 0)
    }
  ]

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(28, 28, 40, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#f0f0f5' }
    },
    legend: {
      data: ['Válidos', 'Inválidos'],
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
.schema-summary-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.schema-kpi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.schema-kpi.total-probe { border-left: 4px solid #60a5fa; }
.schema-kpi.exact { border-left: 4px solid #4ade80; }
.schema-kpi.none { border-left: 4px solid #f87171; }

.kpi-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-val {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-heading);
}

.kpi-tag {
  font-size: 10px;
  color: var(--text-secondary);
}

.schema-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.chart-wrapper {
  height: 350px;
}

.echart {
  height: 350px;
  width: 100%;
}

.schema-ops-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 4px;
}

.schema-ops-list::-webkit-scrollbar {
  width: 4px;
}

.schema-ops-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.schema-ops-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.empty-schema {
  padding: 30px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  border: 1px dashed var(--border-color);
}

.schema-op-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
}

.schema-op-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.schema-op-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: monospace;
}

.schema-op-total {
  font-size: 11px;
  color: var(--text-muted);
}

.probe-progress-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 6px;
}

.probe-bar-valid {
  background: #4ade80;
  transition: width 0.3s ease;
}

.probe-bar-invalid {
  background: #f87171;
  transition: width 0.3s ease;
}

.schema-badges-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.schema-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.badge-exact {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.badge-none {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.3);
}
</style>
