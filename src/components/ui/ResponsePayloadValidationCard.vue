<template>
  <GlassCard :title="title">
    <div class="schema-summary-bar">
      <div class="schema-kpi total-payload">
        <span class="kpi-label">Total Respuestas</span>
        <span class="kpi-val">{{ globalTotals.total }}</span>
        <span class="kpi-tag">Payloads Inspeccionados</span>
      </div>
      <div class="schema-kpi exact">
        <span class="kpi-label">Payload Válido</span>
        <span class="kpi-val">{{ globalTotals.valid }}</span>
        <span class="kpi-tag">{{ globalTotals.validPct }}% Cumple Schema</span>
      </div>
      <div class="schema-kpi none">
        <span class="kpi-label">Payload Inválido</span>
        <span class="kpi-val">{{ globalTotals.invalid }}</span>
        <span class="kpi-tag">{{ globalTotals.invalidPct }}% Falla / Leak</span>
      </div>
      <div class="schema-kpi sev-critical-kpi">
        <span class="kpi-label">Critical (5)</span>
        <span class="kpi-val">{{ globalTotals.severities[5] }}</span>
        <span class="kpi-tag">Data Leak / Crítico</span>
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
          Esperando eventos response:payload...
        </div>
        <div v-else v-for="(data, opId) in normalizedData" :key="opId" class="schema-op-card">
          <div class="schema-op-header">
            <span class="schema-op-title" :title="opId">{{ opId }}</span>
            <span class="schema-op-total">{{ data.total }} respuestas</span>
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

          <!-- Severity Level Counters -->
          <div class="schema-badges-row">
            <span class="schema-badge badge-exact" title="Válidos">
              ✅ Válidos: {{ data.valid }}
            </span>
            <span class="schema-badge badge-none" title="Inválidos">
              ❌ Inválidos: {{ data.invalid }}
            </span>
            <span v-if="data.bySeverityLevel && data.bySeverityLevel[5]" class="schema-badge badge-critical"
              title="Severidad 5: CRITICAL">
              🟣 Critical: {{ data.bySeverityLevel[5] }}
            </span>
            <span v-if="data.bySeverityLevel && data.bySeverityLevel[4]" class="schema-badge badge-none" title="Severidad 4: HIGH">
              🔴 High: {{ data.bySeverityLevel[4] }}
            </span>
            <span v-if="data.bySeverityLevel && data.bySeverityLevel[3]" class="schema-badge badge-5xx" title="Severidad 3: MEDIUM">
              🟠 Medium: {{ data.bySeverityLevel[3] }}
            </span>
          </div>

          <!-- Finding Types breakdown list -->
          <div class="findings-types-list" v-if="data.byType && Object.keys(data.byType).length > 0">
            <span class="config-title">Hallazgos Registrados:</span>
            <div class="finding-type-items">
              <div v-for="(count, typeName) in data.byType" :key="typeName" class="finding-type-item">
                <span :class="'schema-badge ' + findingTypeBadgeClass(typeName)">
                  {{ typeName }}
                </span>
                <span class="finding-type-count font-mono">{{ count }}</span>
              </div>
            </div>
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
  responsePayloads: {
    type: [Object, Array],
    default: null
  },
  schemaResponsePayload: {
    type: [Object, Array],
    default: null
  },
  title: {
    type: String,
    default: 'Validación de Payloads de Respuesta (Schema Response Payload) por Operación'
  }
})

const normalizedData = computed(() => {
  const raw = props.data || props.responsePayloads || props.schemaResponsePayload
  if (!raw) return {}

  const firstKey = typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw)[0] : null
  if (firstKey && raw[firstKey] && typeof raw[firstKey] === 'object' && raw[firstKey].total !== undefined && (raw[firstKey].bySeverityLevel !== undefined || raw[firstKey].byType !== undefined || raw[firstKey].valid !== undefined)) {
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
    if (!opId) return

    const isValid = p.isValid !== undefined ? p.isValid : true
    const severityLevel = p.severityLevel !== undefined ? p.severityLevel : 1
    const severityName = (p.severityName || (
      severityLevel === 1 ? 'INFO' :
        severityLevel === 2 ? 'LOW' :
          severityLevel === 3 ? 'MEDIUM' :
            severityLevel === 4 ? 'HIGH' : 'CRITICAL'
    )).toUpperCase()
    const type = p.type || 'UNKNOWN'

    if (!map[opId]) {
      map[opId] = {
        total: 0,
        valid: 0,
        invalid: 0,
        bySeverityLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        bySeverityName: { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        byType: {}
      }
    }

    const opData = map[opId]
    opData.total++
    if (isValid) {
      opData.valid++
    } else {
      opData.invalid++
    }

    if (opData.bySeverityLevel[severityLevel] !== undefined) {
      opData.bySeverityLevel[severityLevel]++
    } else {
      opData.bySeverityLevel[severityLevel] = 1
    }

    if (opData.bySeverityName[severityName] !== undefined) {
      opData.bySeverityName[severityName]++
    } else {
      opData.bySeverityName[severityName] = 1
    }

    if (!opData.byType[type]) {
      opData.byType[type] = 0
    }
    opData.byType[type]++
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
  let total = 0
  let valid = 0
  let invalid = 0
  const severities = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  Object.values(byOp).forEach(opData => {
    total += opData.total || 0
    valid += opData.valid || 0
    invalid += opData.invalid || 0
    const bsl = opData.bySeverityLevel || {}
    severities[1] += bsl[1] || 0
    severities[2] += bsl[2] || 0
    severities[3] += bsl[3] || 0
    severities[4] += bsl[4] || 0
    severities[5] += bsl[5] || 0
  })

  const validPct = total > 0 ? Math.round((valid / total) * 100) : 0
  const invalidPct = total > 0 ? Math.round((invalid / total) * 100) : 0

  return { total, valid, invalid, validPct, invalidPct, severities }
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

  const levels = [
    { key: 1, name: 'INFO', color: '#94a3b8' },
    { key: 2, name: 'LOW', color: '#fbbf24' },
    { key: 3, name: 'MEDIUM', color: '#fb923c' },
    { key: 4, name: 'HIGH', color: '#f87171' },
    { key: 5, name: 'CRITICAL', color: '#c084fc' }
  ]

  const series = levels.map(l => ({
    name: l.name,
    type: 'bar',
    stack: 'payloadSeverity',
    itemStyle: { color: l.color },
    data: operations.map(op => byOp[op]?.bySeverityLevel ? (byOp[op].bySeverityLevel[l.key] || 0) : 0)
  }))

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(28, 28, 40, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#f0f0f5' }
    },
    legend: {
      data: levels.map(l => l.name),
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

const findingTypeBadgeClass = (typeName) => {
  const map = {
    'SCHEMA_VALIDATION_SUCCESS': 'badge-exact',
    'EMPTY_RESPONSE_VALID': 'badge-exact',
    'UNREADABLE_RESPONSE_PAYLOAD': 'badge-default',
    'MISSING_RESPONSE_BODY': 'badge-5xx',
    'SCHEMA_VALIDATION_ERROR': 'badge-none',
    'UNDOCUMENTED_DATA_LEAK': 'badge-critical'
  }
  return map[typeName] || 'badge-wildcard'
}
</script>

<style scoped>
.schema-summary-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.schema-kpi {
  flex: 1;
  min-width: 120px;
  padding: 12px 14px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.schema-kpi.total-payload { border-left: 4px solid #c084fc; }
.schema-kpi.exact { border-left: 4px solid #4ade80; }
.schema-kpi.none { border-left: 4px solid #f87171; }
.schema-kpi.sev-critical-kpi { border-left: 4px solid #e879f9; }

.schema-kpi .kpi-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.schema-kpi .kpi-val {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--font-heading);
  color: var(--text-primary);
}

.schema-kpi .kpi-tag {
  font-size: 11px;
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
  max-height: 350px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 6px;
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
  color: var(--text-muted);
  text-align: center;
  margin-top: 40px;
  font-size: 13px;
}

.schema-op-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 14px;
}

.schema-op-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.schema-op-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--accent-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.schema-op-total {
  font-size: 12px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 8px;
  border-radius: 10px;
}

.probe-progress-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 10px;
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
  margin-bottom: 10px;
}

.schema-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}

.badge-exact {
  background: rgba(74, 222, 128, 0.12);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.badge-wildcard {
  background: rgba(96, 165, 250, 0.12);
  color: #60a5fa;
  border: 1px solid rgba(96, 165, 250, 0.3);
}

.badge-default {
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.badge-5xx {
  background: rgba(251, 146, 60, 0.12);
  color: #fb923c;
  border: 1px solid rgba(251, 146, 60, 0.3);
}

.badge-none {
  background: rgba(248, 113, 113, 0.12);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.badge-critical {
  background: rgba(192, 132, 252, 0.15);
  color: #c084fc;
  border: 1px solid rgba(192, 132, 252, 0.3);
}

.config-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  font-weight: 600;
  text-align: left;
}

.findings-types-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.finding-type-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.finding-type-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.03);
  padding: 3px 8px;
  border-radius: 6px;
}

.finding-type-count {
  font-size: 11px;
  color: var(--accent-primary);
  font-weight: bold;
}

@media (max-width: 1024px) {
  .schema-layout {
    grid-template-columns: 1fr;
  }
}
</style>
