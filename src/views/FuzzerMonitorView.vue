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
            <div v-if="!socketStore.metrics.engineConfig" class="kpi-value highlight" style="font-size: 20px; padding-top: 10px;">
              Esperando motor...
            </div>
            <div v-else class="engine-config-list">
              <div class="config-section">
                <span class="config-title">Fases ({{ socketStore.metrics.engineConfig.phases.length }})</span>
                <div class="config-items">
                  <div class="config-item" v-for="(phase, idx) in socketStore.metrics.engineConfig.phases" :key="'phase-'+idx">
                    <span class="config-name">{{ phase.name || `Phase ${idx+1}` }}</span>
                    <span class="config-badge">{{ phase.duration }}s</span>
                  </div>
                </div>
              </div>
              <div class="config-section">
                <span class="config-title">Escenarios ({{ Object.keys(socketStore.metrics.engineConfig.scenarios).length }})</span>
                <div class="config-items">
                  <div class="config-item" v-for="(val, scenario) in socketStore.metrics.engineConfig.scenarios" :key="'scen-'+scenario">
                    <span class="config-name">{{ scenario }}</span>
                    <span class="config-badge">{{ val.weight || val }}</span>
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
              <div 
                v-for="(event, idx) in socketStore.eventsLog" 
                :key="idx" 
                class="log-entry"
              >
                <span class="log-time">[{{ event.time }}]</span>
                <span class="log-type">{{ event.type }}</span>
                <span v-if="event.type === 'fuzzer-processor:status-code'" class="log-detail">
                  Op: {{ event.payload.scenarioName }} | Code: {{ event.payload.statusCode }}
                </span>
                <span v-else-if="event.payload?.fuzzerId" class="log-detail">
                  Fuzzer: {{ event.payload.fuzzerId.substring(0,8) }}...
                </span>
              </div>
            </div>
          </GlassCard>
        </div>
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
                <span class="fp-level-count">{{ socketStore.metrics.falsePositives.byLevel[3] }}</span>
                <span class="fp-level-label">HIGH (2xx)</span>
              </div>
              <div class="fp-level-card medium">
                <span class="fp-level-icon">🟠</span>
                <span class="fp-level-count">{{ socketStore.metrics.falsePositives.byLevel[2] }}</span>
                <span class="fp-level-label">MEDIUM (5xx)</span>
              </div>
              <div class="fp-level-card low">
                <span class="fp-level-icon">🟡</span>
                <span class="fp-level-count">{{ socketStore.metrics.falsePositives.byLevel[1] }}</span>
                <span class="fp-level-label">LOW (4xx)</span>
              </div>
              <div class="fp-level-card other">
                <span class="fp-level-icon">⚪</span>
                <span class="fp-level-count">{{ socketStore.metrics.falsePositives.byLevel[0] }}</span>
                <span class="fp-level-label">OTHER</span>
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
  const labels = { 0: 'OTHER', 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH' };
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
    { key: 3, name: 'HIGH', color: '#f87171' },
    { key: 2, name: 'MEDIUM', color: '#fb923c' },
    { key: 1, name: 'LOW', color: '#fbbf24' },
    { key: 0, name: 'OTHER', color: '#94a3b8' }
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
  0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); }
  100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
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

.fp-level-card.high { background: rgba(248, 113, 113, 0.1); border-color: rgba(248, 113, 113, 0.3); }
.fp-level-card.medium { background: rgba(251, 146, 60, 0.1); }
.fp-level-card.low { background: rgba(251, 191, 36, 0.08); }
.fp-level-card.other { background: rgba(148, 163, 184, 0.08); }

.fp-level-icon { font-size: 18px; }

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

.fp-recent-list::-webkit-scrollbar { width: 4px; }
.fp-recent-list::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
.fp-recent-list::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

.fp-recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.fp-time { color: var(--text-muted); min-width: 70px; }
.fp-op { color: var(--text-secondary); flex: 1; }
.fp-ctx { color: var(--text-muted); font-style: italic; }
.fp-code { color: var(--text-primary); font-weight: bold; }

.fp-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  min-width: 60px;
  text-align: center;
}

.fp-badge.level-3 { background: rgba(248,113,113,0.2); color: #f87171; }
.fp-badge.level-2 { background: rgba(251,146,60,0.2); color: #fb923c; }
.fp-badge.level-1 { background: rgba(251,191,36,0.2); color: #fbbf24; }
.fp-badge.level-0 { background: rgba(148,163,184,0.2); color: #94a3b8; }

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

  .fp-layout {
    grid-template-columns: 1fr;
  }

  .fp-levels {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
