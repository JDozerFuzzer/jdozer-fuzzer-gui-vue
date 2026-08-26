<template>
  <AppLayout>
    <div class="monitor-container">

      <!-- Top Actions / Status -->
      <div class="monitor-header">
        <div class="status-badge" :class="socketStore.isConnected ? 'connected' : 'disconnected'">
          <div class="pulse-dot"></div>
          {{ socketStore.isConnected ? 'Conectado a JDozerFuzzer (En vivo)' : 'Desconectado' }}
        </div>
        <button @click="socketStore.clearMetrics()" class="btn-outline">
          Limpiar Métricas
        </button>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <GlassCard>
          <div class="kpi-content cases-card">
            <span class="kpi-label">Casos Generados Totales</span>
            <span class="kpi-value">{{ socketStore.metrics.totalCasesCreated }}</span>

            <div class="op-cases-list" v-if="Object.keys(socketStore.metrics.casesByOperation).length > 0">
              <div class="op-case-item" v-for="(count, op) in socketStore.metrics.casesByOperation" :key="op">
                <span class="op-name" :title="op">{{ op }}</span>
                <span class="op-count">{{ count }}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div class="kpi-content cases-card">
            <span class="kpi-label">Configuración del Ataque</span>
            <div v-if="!socketStore.metrics.engineConfig" class="kpi-value highlight"
              style="font-size: 20px; padding-top: 10px;">
              Esperando motor...
            </div>
            <div v-else class="engine-config-list">
              <div class="config-section">
                <span class="config-title">Fases ({{ Object.keys(socketStore.metrics.engineConfig.phases).length
                  }})</span>
                <div class="config-items">
                  <div class="config-item" v-for="(phase, idx) in socketStore.metrics.engineConfig.phases"
                    :key="'phase-' + idx">
                    <span class="config-name">{{ idx || `Phase ${idx + 1}` }}</span>
                    <span class="config-badge">{{ phase.duration }}s</span>
                  </div>
                </div>
              </div>
              <div class="config-section">
                <span class="config-title">Escenarios ({{ Object.keys(socketStore.metrics.engineConfig.scenarios).length
                  }})</span>
                <div class="config-items">
                  <div class="config-item" v-for="(val, scenario) in socketStore.metrics.engineConfig.scenarios"
                    :key="'scen-' + scenario">
                    <span class="config-name">{{ scenario }}</span>
                    <span class="config-badge">{{ val.weight }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div class="monitor-grid">
        <!-- Chart Section -->
        <div class="chart-section">
          <GlassCard title="Códigos de Estado HTTP por Operación">
            <div class="chart-wrapper">
              <v-chart class="echart" :option="chartOption" autoresize />
            </div>
          </GlassCard>
        </div>

        <!-- Live Log Section -->
        <div class="log-section">
          <GlassCard title="Registro de Eventos">
            <div class="terminal-log">
              <div v-if="socketStore.eventsLog.length === 0" class="empty-log">
                Esperando eventos de fuzzer.running...
              </div>
              <div v-for="(event, idx) in socketStore.eventsLog" :key="idx" class="log-entry">
                <span class="log-time">[{{ event.time }}]</span>
                <span class="log-type">{{ event.type }}</span>
                <!--
                <span v-if="event.type === 'fuzzer-processor:status-code'" class="log-detail">
                  Op: {{ event.payload.scenarioName }} | Code: {{ event.payload.statusCode }}
                </span>
                <span v-else-if="event.payload?.fuzzerId" class="log-detail">
                  Fuzzer: {{ event.payload.fuzzerId.substring(0,8) }}...
                </span>
                -->
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <!-- Schema Response OpenAPI Contract Compliance Section -->
      <div class="schema-section">
        <GlassCard title="Coincidencia de Contrato OpenAPI (Schema Response) por Operación">
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
              <div v-if="Object.keys(socketStore.metrics.schemaResponsesByOperation).length === 0" class="empty-schema">
                Esperando eventos schema-response:status-code...
              </div>
              <div v-else v-for="(data, opId) in socketStore.metrics.schemaResponsesByOperation" :key="opId"
                class="schema-op-card">
                <div class="schema-op-header">
                  <span class="schema-op-title" :title="opId">{{ opId }}</span>
                  <span class="schema-op-total">{{ data.total }} respuestas</span>
                </div>

                <!-- MatchType Pills -->
                <div class="schema-badges-row">
                  <span class="schema-badge badge-exact" title="Coincidencia Exacta con Contrato">
                    Exact: {{ data.byMatchType.exact || 0 }}
                  </span>
                  <span class="schema-badge badge-wildcard" title="Coincidencia por Comodín (e.g. 4XX)">
                    Wildcard: {{ data.byMatchType.wildcard || 0 }}
                  </span>
                  <span class="schema-badge badge-default" title="Respuesta por cláusula Default">
                    Default: {{ data.byMatchType.default || 0 }}
                  </span>
                  <span class="schema-badge badge-5xx" title="Error 5xx No Especificado">
                    5xx: {{ data.byMatchType['5xx'] || 0 }}
                  </span>
                  <span class="schema-badge badge-none" title="Código No Documentado en Contrato">
                    None: {{ data.byMatchType.none || 0 }}
                  </span>
                </div>

                <!-- Status Code details table per operation -->
                <div class="schema-codes-table-wrapper" v-if="Object.keys(data.byStatusCode).length > 0">
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
      </div>

      <!-- Schema Probe Request Payload Validity Section -->
      <div class="schema-probe-section">
        <GlassCard title="Validación de Schemas de Solicitud (Schema Probe) por Operación">
          <div class="schema-summary-bar">
            <div class="schema-kpi total-probe">
              <span class="kpi-label">Total Solicitudes</span>
              <span class="kpi-val">{{ schemaProbeGlobalTotals.total }}</span>
              <span class="kpi-tag">Inspeccionadas</span>
            </div>
            <div class="schema-kpi exact">
              <span class="kpi-label">Válidas</span>
              <span class="kpi-val">{{ schemaProbeGlobalTotals.valid }}</span>
              <span class="kpi-tag">{{ schemaProbeGlobalTotals.validPct }}% Cumple Schema</span>
            </div>
            <div class="schema-kpi none">
              <span class="kpi-label">Inválidas</span>
              <span class="kpi-val">{{ schemaProbeGlobalTotals.invalid }}</span>
              <span class="kpi-tag">{{ schemaProbeGlobalTotals.invalidPct }}% Mutación / No Cumple</span>
            </div>
          </div>

          <div class="schema-layout">
            <!-- Chart Stacked by Operation -->
            <div class="chart-wrapper">
              <v-chart class="echart" :option="schemaProbeChartOption" autoresize />
            </div>

            <!-- Operations Breakdown List -->
            <div class="schema-ops-list">
              <div v-if="Object.keys(socketStore.metrics.schemaProbeByOperation).length === 0" class="empty-schema">
                Esperando eventos schema-probe:payload...
              </div>
              <div v-else v-for="(data, opId) in socketStore.metrics.schemaProbeByOperation" :key="opId"
                class="schema-op-card">
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
                    :style="{ width: (data.total > 0 ? (data.invalid / data.total * 100) : 0) + '%' }"
                    title="Inválidos"></div>
                </div>

                <!-- Counters Row -->
                <div class="schema-badges-row">
                  <span class="schema-badge badge-exact" title="Request cumple con el schema definido en contrato">
                    ✅ Válidos: {{ data.valid }} ({{ data.total > 0 ? Math.round(data.valid / data.total * 100) : 0 }}%)
                  </span>
                  <span class="schema-badge badge-none" title="Request NO cumple con el schema definido en contrato">
                    ❌ Inválidos: {{ data.invalid }} ({{ data.total > 0 ? Math.round(data.invalid / data.total * 100) : 0
                    }}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <!-- Schema Response Payload Validity Section -->
      <div class="schema-response-payload-section">
        <GlassCard title="Validación de Payloads de Respuesta (Schema Response Payload) por Operación">
          <div class="schema-summary-bar">
            <div class="schema-kpi total-payload">
              <span class="kpi-label">Total Respuestas</span>
              <span class="kpi-val">{{ schemaResponsePayloadGlobalTotals.total }}</span>
              <span class="kpi-tag">Payloads Inspeccionados</span>
            </div>
            <div class="schema-kpi exact">
              <span class="kpi-label">Payload Válido</span>
              <span class="kpi-val">{{ schemaResponsePayloadGlobalTotals.valid }}</span>
              <span class="kpi-tag">{{ schemaResponsePayloadGlobalTotals.validPct }}% Cumple Schema</span>
            </div>
            <div class="schema-kpi none">
              <span class="kpi-label">Payload Inválido</span>
              <span class="kpi-val">{{ schemaResponsePayloadGlobalTotals.invalid }}</span>
              <span class="kpi-tag">{{ schemaResponsePayloadGlobalTotals.invalidPct }}% Falla / Leak</span>
            </div>
            <div class="schema-kpi sev-critical-kpi">
              <span class="kpi-label">Critical (5)</span>
              <span class="kpi-val">{{ schemaResponsePayloadGlobalTotals.severities[5] }}</span>
              <span class="kpi-tag">Data Leak / Crítico</span>
            </div>
          </div>

          <div class="schema-layout">
            <!-- Chart Stacked by Operation -->
            <div class="chart-wrapper">
              <v-chart class="echart" :option="schemaResponsePayloadChartOption" autoresize />
            </div>

            <!-- Operations Breakdown List -->
            <div class="schema-ops-list">
              <div v-if="Object.keys(socketStore.metrics.schemaResponsePayloadByOperation).length === 0"
                class="empty-schema">
                Esperando eventos schema-response:payload...
              </div>
              <div v-else v-for="(data, opId) in socketStore.metrics.schemaResponsePayloadByOperation" :key="opId"
                class="schema-op-card">
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
                    :style="{ width: (data.total > 0 ? (data.invalid / data.total * 100) : 0) + '%' }"
                    title="Inválidos"></div>
                </div>

                <!-- Severity Level Counters -->
                <div class="schema-badges-row">
                  <span class="schema-badge badge-exact" title="Válidos">
                    ✅ Válidos: {{ data.valid }}
                  </span>
                  <span class="schema-badge badge-none" title="Inválidos">
                    ❌ Inválidos: {{ data.invalid }}
                  </span>
                  <span v-if="data.bySeverityLevel[5]" class="schema-badge badge-critical"
                    title="Severidad 5: CRITICAL">
                    🟣 Critical: {{ data.bySeverityLevel[5] }}
                  </span>
                  <span v-if="data.bySeverityLevel[4]" class="schema-badge badge-none" title="Severidad 4: HIGH">
                    🔴 High: {{ data.bySeverityLevel[4] }}
                  </span>
                  <span v-if="data.bySeverityLevel[3]" class="schema-badge badge-5xx" title="Severidad 3: MEDIUM">
                    🟠 Medium: {{ data.bySeverityLevel[3] }}
                  </span>
                </div>

                <!-- Finding Types breakdown list -->
                <div class="findings-types-list" v-if="Object.keys(data.byType).length > 0">
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
      </div>


      <!-- Validity Matrix Chart -->
      <div class="validity-section">
        <GlassCard title="Análisis de Validez: Request vs Response">
          <div class="validity-grid">
            <div class="chart-wrapper">
              <v-chart class="echart" :option="validityChartOption" autoresize />
            </div>
            <div class="validity-quadrants">
              <div class="quadrant expected">
                <span class="q-label">✅ Válido → 2xx</span>
                <span class="q-value">{{ socketStore.metrics.validityMatrix.validSuccess }}</span>
                <span class="q-desc">Comportamiento esperado</span>
              </div>
              <div class="quadrant danger">
                <span class="q-label">🔴 Inválido → 2xx</span>
                <span class="q-value">{{ socketStore.metrics.validityMatrix.invalidAccepted }}</span>
                <span class="q-desc">Posible vulnerabilidad</span>
              </div>
              <div class="quadrant warning">
                <span class="q-label">⚠️ Válido → Error</span>
                <span class="q-value">{{ socketStore.metrics.validityMatrix.validError }}</span>
                <span class="q-desc">Posible bug</span>
              </div>
              <div class="quadrant safe">
                <span class="q-label">✅ Inválido → Error</span>
                <span class="q-value">{{ socketStore.metrics.validityMatrix.invalidRejected }}</span>
                <span class="q-desc">Rechazo correcto</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <!-- False Positive / Penetration Levels -->
      <div class="fp-section">
        <GlassCard title="Niveles de Penetración (False Positives)">
          <div class="fp-layout">
            <!-- Level Counters -->
            <div class="fp-levels">
              <div class="fp-level-card high">
                <span class="fp-level-icon">🔴</span>
                <span class="fp-level-count">{{ socketStore.metrics.falsePositives.byLevel[4] }}</span>
                <span class="fp-level-label">HIGH</span>
              </div>
              <div class="fp-level-card medium">
                <span class="fp-level-icon">🟠</span>
                <span class="fp-level-count">{{ socketStore.metrics.falsePositives.byLevel[3] }}</span>
                <span class="fp-level-label">MEDIUM</span>
              </div>
              <div class="fp-level-card low">
                <span class="fp-level-icon">🟡</span>
                <span class="fp-level-count">{{ socketStore.metrics.falsePositives.byLevel[2] }}</span>
                <span class="fp-level-label">LOW</span>
              </div>
              <div class="fp-level-card other">
                <span class="fp-level-icon">⚪</span>
                <span class="fp-level-count">{{ socketStore.metrics.falsePositives.byLevel[1] }}</span>
                <span class="fp-level-label">SUCCESS</span>
              </div>
            </div>

            <!-- Chart by Operation -->
            <div class="chart-wrapper">
              <v-chart class="echart" :option="fpChartOption" autoresize />
            </div>
          </div>

          <!-- Recent Events -->
          <div class="fp-recent" v-if="socketStore.metrics.falsePositives.recent.length > 0">
            <span class="config-title">Últimos Eventos</span>
            <div class="fp-recent-list">
              <div class="fp-recent-item" v-for="(ev, idx) in socketStore.metrics.falsePositives.recent" :key="idx">
                <span class="fp-time">{{ ev.time }}</span>
                <span :class="'fp-badge level-' + ev.riskLevel">{{ riskLabel(ev.riskLevel) }}</span>
                <span class="fp-op">{{ ev.operationId }}</span>
                <span class="fp-ctx">{{ ev.context }}</span>
                <span class="fp-code">{{ ev.statusCode }}</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { computed } from 'vue'
import AppLayout from '../components/layout/AppLayout.vue'
import GlassCard from '../components/ui/GlassCard.vue'
import { useSocketStore } from '../store/socketStore'
import VChart from 'vue-echarts'

import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'

use([CanvasRenderer, BarChart, PieChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent])

const socketStore = useSocketStore()

const riskLabel = (level) => {
  const labels = { 1: 'SUCCESS', 2: 'LOW', 3: 'MEDIUM', 4: 'HIGH' };
  return labels[level] || 'N/A';
}

// ECharts Dynamic Configuration
const chartOption = computed(() => {
  const operationsMap = socketStore.metrics.statusCodesByOperation;
  const operations = Object.keys(operationsMap);

  if (operations.length === 0) {
    return {
      title: { text: 'Sin datos aún', textStyle: { color: '#a0a0b0' }, left: 'center', top: 'middle' }
    }
  }

  // Extraer todos los status codes únicos (200, 400, 500, etc.)
  const allCodesSet = new Set();
  operations.forEach(op => {
    Object.keys(operationsMap[op]).forEach(code => allCodesSet.add(code));
  });
  const allCodes = Array.from(allCodesSet).sort();

  // Ordenar operaciones de mayor a menor cantidad total de requests
  operations.sort((a, b) => {
    const totalA = Object.values(operationsMap[a]).reduce((sum, v) => sum + v, 0);
    const totalB = Object.values(operationsMap[b]).reduce((sum, v) => sum + v, 0);
    return totalA - totalB; // ECharts category axis: el último se muestra arriba
  });

  // Construir series para cada status code
  const series = allCodes.map(code => {
    // Definir color según el tipo de status
    let color = '#60a5fa'; // Blue (Info/Other)
    if (code.startsWith('2')) color = '#4ade80'; // Green (Success)
    if (code.startsWith('4')) color = '#fbbf24'; // Yellow (Client Error)
    if (code.startsWith('5')) color = '#f87171'; // Red (Server Error)

    return {
      name: `HTTP ${code}`,
      type: 'bar',
      stack: 'total',
      itemStyle: { color },
      data: operations.map(op => operationsMap[op][code] || 0)
    };
  });

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
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
    },
    yAxis: {
      type: 'category',
      data: operations,
      axisLabel: { color: '#a0a0b0' }
    },
    series
  };
})

// Validity Matrix Chart
const validityChartOption = computed(() => {
  const vm = socketStore.metrics.validityMatrix;
  vm.validSuccess = 50;
  const total = vm.validSuccess + vm.validError + vm.invalidRejected + vm.invalidAccepted;

  if (total === 0) {
    return {
      title: { text: 'Sin datos aún', textStyle: { color: '#a0a0b0' }, left: 'center', top: 'middle' }
    }
  }

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(28, 28, 40, 0.9)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#f0f0f5' },
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: 'rgba(0, 0, 0, 0.3)',
        borderWidth: 2
      },
      label: {
        show: true,
        color: '#a0a0b0',
        fontSize: 11
      },
      data: [
        { value: vm.validSuccess, name: 'Válido → 2xx', itemStyle: { color: '#4ade80' } },
        { value: vm.invalidAccepted, name: 'Inválido → 2xx', itemStyle: { color: '#f87171' } },
        { value: vm.validError, name: 'Válido → Error', itemStyle: { color: '#fbbf24' } },
        { value: vm.invalidRejected, name: 'Inválido → Error', itemStyle: { color: '#60a5fa' } }
      ].filter(d => d.value > 0)
    }]
  };
})

// False Positive Chart by Operation
const fpChartOption = computed(() => {
  const byOp = socketStore.metrics.falsePositives.byOperation;
  const operations = Object.keys(byOp);

  if (operations.length === 0) {
    return {
      title: { text: 'Sin datos aún', textStyle: { color: '#a0a0b0' }, left: 'center', top: 'middle' }
    }
  }

  // Ordenar por total descendente (último = arriba en ECharts)
  operations.sort((a, b) => {
    const totalA = Object.values(byOp[a]).reduce((s, v) => s + v, 0);
    const totalB = Object.values(byOp[b]).reduce((s, v) => s + v, 0);
    return totalA - totalB;
  });

  const levels = [
    { key: 4, name: 'HIGH', color: '#f87171' },
    { key: 3, name: 'MEDIUM', color: '#fb923c' },
    { key: 2, name: 'LOW', color: '#fbbf24' },
    { key: 1, name: 'SUCCESS', color: '#94a3b8' }
  ];

  const series = levels.map(l => ({
    name: l.name,
    type: 'bar',
    stack: 'risk',
    itemStyle: { color: l.color },
    data: operations.map(op => byOp[op][l.key] || 0)
  }));

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
  };
})

// Schema OpenAPI contract compliance totals
const schemaGlobalTotals = computed(() => {
  const byOp = socketStore.metrics.schemaResponsesByOperation || {};
  const totals = { exact: 0, wildcard: 0, default: 0, '5xx': 0, none: 0 };

  Object.values(byOp).forEach(opData => {
    const bm = opData.byMatchType || {};
    totals.exact += bm.exact || 0;
    totals.wildcard += bm.wildcard || 0;
    totals.default += bm.default || 0;
    totals['5xx'] += bm['5xx'] || 0;
    totals.none += bm.none || 0;
  });

  return totals;
});

// Schema Chart Option (Stacked Match Types by Operation)
const schemaChartOption = computed(() => {
  const byOp = socketStore.metrics.schemaResponsesByOperation || {};
  const operations = Object.keys(byOp);

  if (operations.length === 0) {
    return {
      title: { text: 'Sin datos aún', textStyle: { color: '#a0a0b0' }, left: 'center', top: 'middle' }
    };
  }

  // Sort operations ascending by total responses
  operations.sort((a, b) => (byOp[a].total || 0) - (byOp[b].total || 0));

  const matchTypes = [
    { key: 'exact', name: 'Exact Match', color: '#4ade80' },
    { key: 'wildcard', name: 'Wildcard', color: '#60a5fa' },
    { key: 'default', name: 'Default', color: '#fbbf24' },
    { key: '5xx', name: '5xx Undoc', color: '#fb923c' },
    { key: 'none', name: 'No Match', color: '#f87171' }
  ];

  const series = matchTypes.map(m => ({
    name: m.name,
    type: 'bar',
    stack: 'schemaContract',
    itemStyle: { color: m.color },
    data: operations.map(op => byOp[op]?.byMatchType[m.key] || 0)
  }));

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
  };
});

// Schema Probe Request Payload Validity Totals
const schemaProbeGlobalTotals = computed(() => {
  const byOp = socketStore.metrics.schemaProbeByOperation || {};
  let valid = 0;
  let invalid = 0;
  let total = 0;

  Object.values(byOp).forEach(opData => {
    valid += opData.valid || 0;
    invalid += opData.invalid || 0;
    total += opData.total || 0;
  });

  const validPct = total > 0 ? Math.round((valid / total) * 100) : 0;
  const invalidPct = total > 0 ? Math.round((invalid / total) * 100) : 0;

  return { valid, invalid, total, validPct, invalidPct };
});

// Schema Probe Chart Option (Stacked Bar: Valid vs Invalid per Operation)
const schemaProbeChartOption = computed(() => {
  const byOp = socketStore.metrics.schemaProbeByOperation || {};
  const operations = Object.keys(byOp);

  if (operations.length === 0) {
    return {
      title: { text: 'Sin datos aún', textStyle: { color: '#a0a0b0' }, left: 'center', top: 'middle' }
    };
  }

  // Sort operations ascending by total probes
  operations.sort((a, b) => (byOp[a].total || 0) - (byOp[b].total || 0));

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
  ];

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
  };
});

// Schema Response Payload Validity Totals
const schemaResponsePayloadGlobalTotals = computed(() => {
  const byOp = socketStore.metrics.schemaResponsePayloadByOperation || {};
  let total = 0;
  let valid = 0;
  let invalid = 0;
  const severities = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  Object.values(byOp).forEach(opData => {
    total += opData.total || 0;
    valid += opData.valid || 0;
    invalid += opData.invalid || 0;
    const bsl = opData.bySeverityLevel || {};
    severities[1] += bsl[1] || 0;
    severities[2] += bsl[2] || 0;
    severities[3] += bsl[3] || 0;
    severities[4] += bsl[4] || 0;
    severities[5] += bsl[5] || 0;
  });

  const validPct = total > 0 ? Math.round((valid / total) * 100) : 0;
  const invalidPct = total > 0 ? Math.round((invalid / total) * 100) : 0;

  return { total, valid, invalid, validPct, invalidPct, severities };
});

// Schema Response Payload Chart Option (Stacked Bar by Operation)
const schemaResponsePayloadChartOption = computed(() => {
  const byOp = socketStore.metrics.schemaResponsePayloadByOperation || {};
  const operations = Object.keys(byOp);

  if (operations.length === 0) {
    return {
      title: { text: 'Sin datos aún', textStyle: { color: '#a0a0b0' }, left: 'center', top: 'middle' }
    };
  }

  // Sort operations ascending by total responses
  operations.sort((a, b) => (byOp[a].total || 0) - (byOp[b].total || 0));

  const levels = [
    { key: 1, name: 'INFO', color: '#94a3b8' },
    { key: 2, name: 'LOW', color: '#fbbf24' },
    { key: 3, name: 'MEDIUM', color: '#fb923c' },
    { key: 4, name: 'HIGH', color: '#f87171' },
    { key: 5, name: 'CRITICAL', color: '#c084fc' }
  ];

  const series = levels.map(l => ({
    name: l.name,
    type: 'bar',
    stack: 'payloadSeverity',
    itemStyle: { color: l.color },
    data: operations.map(op => byOp[op]?.bySeverityLevel[l.key] || 0)
  }));

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
  };
});

const findingTypeBadgeClass = (typeName) => {
  const map = {
    'SCHEMA_VALIDATION_SUCCESS': 'badge-exact',
    'EMPTY_RESPONSE_VALID': 'badge-exact',
    'UNREADABLE_RESPONSE_PAYLOAD': 'badge-default',
    'MISSING_RESPONSE_BODY': 'badge-5xx',
    'SCHEMA_VALIDATION_ERROR': 'badge-none',
    'UNDOCUMENTED_DATA_LEAK': 'badge-critical'
  };
  return map[typeName] || 'badge-wildcard';
};
</script>

<style scoped>
.monitor-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.status-badge.connected {
  background: var(--accent-primary-glow);
  color: var(--accent-primary);
}

.status-badge.disconnected {
  background: rgba(248, 113, 113, 0.2);
  color: var(--accent-danger);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge.connected .pulse-dot {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(74, 222, 128, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(74, 222, 128, 0);
  }
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.05);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.kpi-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
}

.kpi-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.kpi-value {
  color: var(--text-primary);
  font-size: 36px;
  font-weight: 700;
  font-family: var(--font-heading);
}

.kpi-value.highlight {
  color: var(--accent-secondary);
}

.cases-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.op-cases-list {
  margin-top: 16px;
  max-height: 150px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 8px;
}

.op-cases-list::-webkit-scrollbar {
  width: 4px;
}

.op-cases-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.op-cases-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.op-case-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.2);
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.op-name {
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.op-count {
  color: var(--accent-primary);
  font-weight: bold;
  background: rgba(74, 222, 128, 0.1);
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 12px;
}

.engine-config-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  max-height: 150px;
  padding-right: 8px;
}

.engine-config-list::-webkit-scrollbar {
  width: 4px;
}

.engine-config-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.engine-config-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  font-weight: 600;
  text-align: left;
}

.config-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  padding: 4px 8px;
  border-radius: 4px;
}

.config-name {
  font-size: 12px;
  color: var(--text-secondary);
}

.config-badge {
  font-size: 11px;
  background: rgba(96, 165, 250, 0.1);
  color: #60a5fa;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
}

.monitor-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.chart-wrapper {
  height: 350px;
}

.echart {
  height: 350px;
  width: 100%;
}

.terminal-log {
  background: #000;
  height: 350px;
  max-height: 350px;
  padding: 16px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-log {
  color: var(--text-muted);
  text-align: center;
  margin-top: 20px;
}

.log-entry {
  display: flex;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 4px;
}

.log-time {
  color: var(--text-muted);
}

.log-type {
  color: var(--accent-primary);
  font-weight: bold;
}

.log-detail {
  color: var(--text-primary);
}

/* Validity Matrix */
.validity-section {
  /* margin-top: 24px; */
}

.validity-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: center;
}

.validity-quadrants {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.quadrant {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.quadrant.expected {
  background: rgba(74, 222, 128, 0.08);
}

.quadrant.danger {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.3);
}

.quadrant.warning {
  background: rgba(251, 191, 36, 0.08);
}

.quadrant.safe {
  background: rgba(96, 165, 250, 0.08);
}

.q-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.q-value {
  font-size: 28px;
  font-weight: 700;
  font-family: var(--font-heading);
  color: var(--text-primary);
}

.q-desc {
  font-size: 11px;
  color: var(--text-muted);
}

/* False Positives */
.fp-section {
  margin-top: 24px;
}

.fp-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 24px;
  align-items: start;
}

.fp-levels {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fp-level-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 180px;
}

.fp-level-card.high {
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.3);
}

.fp-level-card.medium {
  background: rgba(251, 146, 60, 0.1);
}

.fp-level-card.low {
  background: rgba(251, 191, 36, 0.08);
}

.fp-level-card.other {
  background: rgba(148, 163, 184, 0.08);
}

.fp-level-icon {
  font-size: 18px;
}

.fp-level-count {
  font-size: 24px;
  font-weight: 700;
  font-family: var(--font-heading);
  color: var(--text-primary);
}

.fp-level-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.fp-recent {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fp-recent-list {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fp-recent-list::-webkit-scrollbar {
  width: 4px;
}

.fp-recent-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.fp-recent-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.fp-recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.fp-time {
  color: var(--text-muted);
  min-width: 70px;
}

.fp-op {
  color: var(--text-secondary);
  flex: 1;
}

.fp-ctx {
  color: var(--text-muted);
  font-style: italic;
}

.fp-code {
  color: var(--text-primary);
  font-weight: bold;
}

.fp-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  min-width: 60px;
  text-align: center;
}

.fp-badge.level-4 {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.fp-badge.level-3 {
  background: rgba(251, 146, 60, 0.2);
  color: #fb923c;
}

.fp-badge.level-2 {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.fp-badge.level-1 {
  background: rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

/* Schema Response OpenAPI Section */
.schema-section {
  margin-top: 24px;
}

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

.schema-kpi.exact {
  border-left: 4px solid #4ade80;
}

.schema-kpi.wildcard {
  border-left: 4px solid #60a5fa;
}

.schema-kpi.default {
  border-left: 4px solid #fbbf24;
}

.schema-kpi.error5xx {
  border-left: 4px solid #fb923c;
}

.schema-kpi.none {
  border-left: 4px solid #f87171;
}

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

.schema-codes-table-wrapper {
  overflow-x: auto;
  margin-top: 8px;
}

.schema-codes-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.schema-codes-table th {
  text-align: left;
  color: var(--text-muted);
  font-size: 11px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 6px;
}

.schema-codes-table td {
  padding: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.code-val {
  color: var(--accent-primary);
  font-weight: bold;
}

.count-val {
  color: var(--text-primary);
  font-weight: bold;
}

.match-type-pill {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.match-exact {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.match-wildcard {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

.match-default {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.match-5xx {
  background: rgba(251, 146, 60, 0.2);
  color: #fb923c;
}

.match-none {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.sev-pill {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.sev-info {
  background: rgba(96, 165, 250, 0.15);
  color: #93c5fd;
}

.sev-low {
  background: rgba(251, 191, 36, 0.15);
  color: #fde047;
}

.sev-medium {
  background: rgba(251, 146, 60, 0.15);
  color: #fdba74;
}

.sev-high {
  background: rgba(248, 113, 113, 0.2);
  color: #fca5a5;
}

/* Schema Probe Section */
.schema-probe-section {
  margin-top: 24px;
}

.schema-kpi.total-probe {
  border-left: 4px solid #60a5fa;
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

/* Schema Response Payload Section */
.schema-response-payload-section {
  margin-top: 24px;
}

.schema-kpi.total-payload {
  border-left: 4px solid #c084fc;
}

.schema-kpi.sev-critical-kpi {
  border-left: 4px solid #e879f9;
}

.badge-critical {
  background: rgba(192, 132, 252, 0.15);
  color: #c084fc;
  border: 1px solid rgba(192, 132, 252, 0.3);
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

/* Responsive adjustments */
@media (max-width: 1024px) {
  .monitor-grid {
    grid-template-columns: 1fr;
    height: auto;
  }

  .terminal-log {
    height: 300px;
  }

  .validity-grid {
    grid-template-columns: 1fr;
  }

  .schema-layout {
    grid-template-columns: 1fr;
  }

  .fp-layout {
    grid-template-columns: 1fr;
  }

  .fp-levels {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
