<template>
  <GlassCard :title="title">
    <div class="schema-summary-bar">
      <div class="schema-kpi exact">
        <span class="kpi-label">Exact Match</span>
        <span class="kpi-val">{{ schemaGlobalTotals.exact }}</span>
        <span class="kpi-tag">Exacta (Info)</span>
      </div>
      <div class="schema-kpi wildcard">
        <span class="kpi-label">Wildcard Match</span>
        <span class="kpi-val">{{ schemaGlobalTotals.wildcard }}</span>
        <span class="kpi-tag">Comodín (Info)</span>
      </div>
      <div class="schema-kpi default">
        <span class="kpi-label">Default Match</span>
        <span class="kpi-val">{{ schemaGlobalTotals.default }}</span>
        <span class="kpi-tag">Default (Low)</span>
      </div>
      <div class="schema-kpi error5xx">
        <span class="kpi-label">5xx Undocumented</span>
        <span class="kpi-val">{{ schemaGlobalTotals['5xx'] }}</span>
        <span class="kpi-tag">5xx (Medium)</span>
      </div>
      <div class="schema-kpi none">
        <span class="kpi-label">No Match</span>
        <span class="kpi-val">{{ schemaGlobalTotals.none }}</span>
        <span class="kpi-tag">No Doc (High)</span>
      </div>
    </div>

    <div class="schema-layout">
      <!-- Chart Stacked by Operation -->
      <div class="chart-wrapper">
        <v-chart class="echart" :option="schemaChartOption" autoresize />
      </div>

      <!-- Operations Breakdown Cards -->
      <div class="schema-ops-list">
        <div v-if="Object.keys(normalizedData).length === 0" class="empty-schema">
          Esperando eventos contract-drift:status-code...
        </div>
        <div v-else v-for="(data, opId) in normalizedData" :key="opId" class="schema-op-card">
          <div class="schema-op-header">
            <span class="schema-op-title" :title="opId">{{ opId }}</span>
            <span class="schema-op-total">{{ data.total }} respuestas</span>
          </div>

          <!-- MatchType Pills -->
          <div class="schema-badges-row">
            <span class="schema-badge badge-exact" title="Coincidencia Exacta con Contrato">
              Exact: {{ data.byMatchType?.exact || 0 }}
            </span>
            <span class="schema-badge badge-wildcard" title="Coincidencia por Comodín (e.g. 4XX)">
              Wildcard: {{ data.byMatchType?.wildcard || 0 }}
            </span>
            <span class="schema-badge badge-default" title="Respuesta por cláusula Default">
              Default: {{ data.byMatchType?.default || 0 }}
            </span>
            <span class="schema-badge badge-5xx" title="Error 5xx No Especificado">
              5xx: {{ data.byMatchType?.['5xx'] || 0 }}
            </span>
            <span class="schema-badge badge-none" title="Código No Documentado en Contrato">
              None: {{ data.byMatchType?.none || 0 }}
            </span>
          </div>

          <!-- Status Code details table per operation -->
          <div class="schema-codes-table-wrapper" v-if="data.byStatusCode && Object.keys(data.byStatusCode).length > 0">
            <table class="schema-codes-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Matched</th>
                  <th>Tipo Match</th>
                  <th>Severidad</th>
                  <th>Cant.</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(info, code) in data.byStatusCode" :key="code">
                  <td class="font-mono code-val">{{ code }}</td>
                  <td class="font-mono text-muted">{{ info.matched }}</td>
                  <td>
                    <span :class="'match-type-pill match-' + info.matchType">
                      {{ info.matchType }}
                    </span>
                  </td>
                  <td>
                    <span :class="'sev-pill sev-' + info.severityName">
                      {{ info.severityName }} ({{ info.severity }})
                    </span>
                  </td>
                  <td class="count-val">{{ info.count }}</td>
                </tr>
              </tbody>
            </table>
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

const props = defineProps({
  data: {
    type: [Object, Array],
    default: null
  },
  schemaResponses: {
    type: [Object, Array],
    default: null
  },
  title: {
    type: String,
    default: 'Coincidencia de Contrato OpenAPI (Schema Response) por Operación'
  }
})

const normalizedData = computed(() => {
  const raw = props.data || props.schemaResponses
  if (!raw) return {}

  const firstKey = typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw)[0] : null
  if (firstKey && raw[firstKey] && typeof raw[firstKey] === 'object' && (raw[firstKey].byMatchType || raw[firstKey].byStatusCode || raw[firstKey].total !== undefined)) {
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
    const statusCode = p.statusCode

    if (!opId || statusCode === undefined) return

    const matchType = p.matchType || 'none'
    const matched = p.matched !== undefined ? String(p.matched) : '-'
    const severity = p.severity !== undefined ? p.severity : 1
    const severityName = p.severityName || (
      severity <= 2 ? 'info' : severity === 3 ? 'low' : severity === 4 ? 'medium' : 'high'
    )

    if (!map[opId]) {
      map[opId] = {
        total: 0,
        byMatchType: { exact: 0, wildcard: 0, default: 0, '5xx': 0, none: 0 },
        bySeverityName: { info: 0, low: 0, medium: 0, high: 0 },
        byStatusCode: {}
      }
    }

    const opData = map[opId]
    opData.total++

    if (opData.byMatchType[matchType] !== undefined) {
      opData.byMatchType[matchType]++
    } else {
      opData.byMatchType[matchType] = 1
    }

    if (opData.bySeverityName[severityName] !== undefined) {
      opData.bySeverityName[severityName]++
    } else {
      opData.bySeverityName[severityName] = 1
    }

    if (!opData.byStatusCode[statusCode]) {
      opData.byStatusCode[statusCode] = {
        count: 0,
        matched,
        matchType,
        severity,
        severityName
      }
    }
    opData.byStatusCode[statusCode].count++
  })

  if (Object.keys(map).length === 0 && typeof raw === 'object' && !Array.isArray(raw)) {
    if (raw.payload && typeof raw.payload === 'object') {
      return raw.payload
    }
    return raw
  }

  return map
})

const schemaGlobalTotals = computed(() => {
  const byOp = normalizedData.value || {}
  const totals = { exact: 0, wildcard: 0, default: 0, '5xx': 0, none: 0 }

  Object.values(byOp).forEach(opData => {
    const bm = opData.byMatchType || {}
    totals.exact += bm.exact || 0
    totals.wildcard += bm.wildcard || 0
    totals.default += bm.default || 0
    totals['5xx'] += bm['5xx'] || 0
    totals.none += bm.none || 0
  })

  return totals
})

const schemaChartOption = computed(() => {
  const byOp = normalizedData.value || {}
  const operations = Object.keys(byOp)

  if (operations.length === 0) {
    return {
      title: { text: 'Sin datos aún', textStyle: { color: '#a0a0b0' }, left: 'center', top: 'middle' }
    }
  }

  operations.sort((a, b) => (byOp[a]?.total || 0) - (byOp[b]?.total || 0))

  const matchTypes = [
    { key: 'exact', name: 'Exact Match', color: '#4ade80' },
    { key: 'wildcard', name: 'Wildcard', color: '#60a5fa' },
    { key: 'default', name: 'Default', color: '#fbbf24' },
    { key: '5xx', name: '5xx Undoc', color: '#fb923c' },
    { key: 'none', name: 'No Match', color: '#f87171' }
  ]

  const series = matchTypes.map(m => ({
    name: m.name,
    type: 'bar',
    stack: 'schemaContract',
    itemStyle: { color: m.color },
    data: operations.map(op => byOp[op]?.byMatchType?.[m.key] || 0)
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
      data: matchTypes.map(m => m.name),
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

.schema-kpi.exact { border-left: 3px solid #4ade80; }
.schema-kpi.wildcard { border-left: 3px solid #60a5fa; }
.schema-kpi.default { border-left: 3px solid #fbbf24; }
.schema-kpi.error5xx { border-left: 3px solid #fb923c; }
.schema-kpi.none { border-left: 3px solid #f87171; }

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

.badge-exact { background: rgba(74, 222, 128, 0.15); color: #4ade80; }
.badge-wildcard { background: rgba(96, 165, 250, 0.15); color: #60a5fa; }
.badge-default { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
.badge-5xx { background: rgba(251, 146, 60, 0.15); color: #fb923c; }
.badge-none { background: rgba(248, 113, 113, 0.15); color: #f87171; }

.schema-codes-table-wrapper {
  margin-top: 4px;
}

.schema-codes-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.schema-codes-table th {
  text-align: left;
  padding: 4px 6px;
  color: var(--text-muted);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.schema-codes-table td {
  padding: 4px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
}

.code-val { font-weight: bold; color: var(--text-primary); }
.count-val { font-weight: bold; color: var(--accent-primary); }

.match-type-pill {
  font-size: 9.5px;
  padding: 1px 5px;
  border-radius: 4px;
  text-transform: uppercase;
}

.match-exact { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
.match-wildcard { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
.match-default { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.match-none { background: rgba(248, 113, 113, 0.2); color: #f87171; }

.sev-pill {
  font-size: 9.5px;
  padding: 1px 5px;
  border-radius: 4px;
  text-transform: uppercase;
}

.sev-info { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
.sev-low { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }
.sev-medium { background: rgba(251, 146, 60, 0.2); color: #fb923c; }
.sev-high { background: rgba(248, 113, 113, 0.2); color: #f87171; }

.font-mono { font-family: monospace; }
.text-muted { color: var(--text-muted); }
</style>
