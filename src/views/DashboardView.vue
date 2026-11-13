<template>
  <AppLayout>
    <div class="dashboard">

      <!-- Fuzzer Selector Row -->
      <div class="selector-row">
        <GlassCard>
          <div class="selector-container">
            <div class="selector-label-group">
              <Layers class="icon-md text-accent" />
              <div class="label-text">
                <span class="label-title">Selección de Fuzzer</span>
                <span class="label-sub">Selecciona un fuzzer activo para consultar su estado</span>
              </div>
            </div>

            <div class="selector-controls">
              <select id="fuzzer-select" v-model="fuzzerStore.selectedFuzzerId" class="glass-select">
                <option v-if="fuzzerStore.loading" value="" disabled>Cargando fuzzers...</option>
                <option v-else-if="fuzzerStore.fuzzers.length === 0" value="" disabled>No hay fuzzers disponibles
                </option>
                <option v-for="fuzzer in fuzzerStore.fuzzers" :key="fuzzer.id" :value="fuzzer.id">
                  {{ fuzzer.name || 'Fuzzer sin nombre' }} (v{{ fuzzer.version || '1.0' }}) — {{ fuzzer.id.substring(0,
                    8) }}...
                </option>
              </select>

              <button @click="fuzzerStore.fetchFuzzers()" class="btn-refresh" title="Actualizar lista">
                <RefreshCw :class="{ 'spinning': fuzzerStore.loading }" class="icon-sm" />
              </button>
            </div>
          </div>

          <!-- Selected Fuzzer Metadata Summary -->
          <div v-if="selectedFuzzer" class="selected-fuzzer-summary">
            <div class="summary-header-row">
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-key">Nombre:</span>
                  <span class="summary-val highlight-name">{{ selectedFuzzer.name }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-key">Versión:</span>
                  <span class="summary-val badge-version">v{{ selectedFuzzer.version }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-key">ID:</span>
                  <span class="summary-val font-mono">{{ selectedFuzzer.id }}</span>
                </div>
              </div>

              <!-- Button to view remote API contract via Swagger UI -->
              <button @click="showSwaggerModal = true" class="btn-swagger-contract"
                title="Ver contrato original de la API remota (Swagger UI)">
                <FileText class="icon-sm" />
                <span>Ver Contrato API (Swagger)</span>
              </button>
            </div>

            <!-- Servidores Target -->
            <div v-if="selectedFuzzer.servers && selectedFuzzer.servers.length > 0" class="summary-section">
              <span class="summary-section-title">Servidores Target ({{ selectedFuzzer.servers.length }})</span>
              <div class="servers-list">
                <div v-for="(server, idx) in selectedFuzzer.servers" :key="idx" class="server-badge">
                  <span class="server-url">{{ server.url }}</span>
                  <span v-if="server.description" class="server-desc">({{ server.description }})</span>
                </div>
              </div>
            </div>

            <!-- Lista de Operaciones -->
            <div v-if="selectedFuzzer.operationIds && selectedFuzzer.operationIds.length > 0" class="summary-section">
              <span class="summary-section-title">Operaciones ({{ selectedFuzzer.operationIds.length }}) — Haz clic para
                ver solicitudes</span>
              <div class="operations-tags">
                <span v-for="opId in selectedFuzzer.operationIds" :key="opId" class="op-tag"
                  :class="{ 'active': selectedOperationId === opId }" @click="selectOperation(opId)">
                  {{ opId }}
                </span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <!-- Operation Requests Grid Row -->
      <div v-if="selectedOperationId" class="operation-requests-row">
        <OperationRequestsCard
          :fuzzer-id="fuzzerStore.selectedFuzzerId"
          :operation-id="selectedOperationId"
          @close="clearSelectedOperation"
          @inspect="openCaseDetails"
        />
      </div>

      <!-- Case Details Modal (Modular Fuzz Component) -->
      <FuzzCaseModal
        :show="showCaseModal"
        :fuzzer-id="fuzzerStore.selectedFuzzerId"
        :operation-id="selectedOperationId"
        :case-id="activeCaseId"
        :case-item="activeCaseItem"
        :operation-spec="operationSpec"
        @close="closeCaseModal"
      />

      <!-- Top Stats Row -->
      <div class="stats-grid">
        <GlassCard>
          <div class="stat-content">
            <div class="stat-info">
              <span class="stat-label">Fuzzers Activos</span>
              <span class="stat-value">{{ fuzzerStore.fuzzers.length }}</span>
            </div>
            <div class="stat-icon-wrapper success">
              <ShieldCheck class="stat-icon" />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div class="stat-content">
            <div class="stat-info">
              <span class="stat-label">Operaciones Probadas</span>
              <span class="stat-value">{{ fuzzerStore.stats.totalOperations }}</span>
            </div>
            <div class="stat-icon-wrapper info">
              <Activity class="stat-icon" />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div class="stat-content">
            <div class="stat-info">
              <span class="stat-label">Vulnerabilidades Detectadas</span>
              <span class="stat-value danger-text">{{ fuzzerStore.stats.totalVulnerabilities }}</span>
            </div>
            <div class="stat-icon-wrapper danger">
              <AlertTriangle class="stat-icon" />
            </div>
          </div>
        </GlassCard>
      </div>

      <!-- Main Chart Area -->
      <div class="main-chart-row">
        <GlassCard title="Actividad de Fuzzing (Tiempo Real)">
          <div class="chart-container">
            <v-chart class="chart" :option="chartOption" autoresize />
          </div>
        </GlassCard>
      </div>

      <!-- Fuzzers List -->
      <div class="fuzzers-list-row">
        <GlassCard title="Instancias de Fuzzers">
          <div v-if="fuzzerStore.loading" class="loading-state">
            Cargando instancias...
          </div>
          <div v-else-if="fuzzerStore.fuzzers.length === 0" class="empty-state">
            No se encontraron fuzzers en el backend.
          </div>
          <div v-else class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Versión</th>
                  <th>Fuzzer ID</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="fuzzer in fuzzerStore.fuzzers" :key="fuzzer.id"
                  :class="{ 'selected-row': fuzzer.id === fuzzerStore.selectedFuzzerId }">
                  <td class="font-bold">{{ fuzzer.name }}</td>
                  <td><span class="badge-version">v{{ fuzzer.version }}</span></td>
                  <td class="font-mono">{{ fuzzer.id }}</td>
                  <td>
                    <span class="badge success">Activo</span>
                  </td>
                  <td>
                    <button @click="fuzzerStore.selectFuzzer(fuzzer.id)" class="btn-action">
                      {{ fuzzer.id === fuzzerStore.selectedFuzzerId ? 'Seleccionado' : 'Seleccionar' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <!-- Swagger UI Contract Modal -->
      <SwaggerModal :show="showSwaggerModal" :fuzzer-id="fuzzerStore.selectedFuzzerId"
        :fuzzer-name="selectedFuzzer?.name" @close="showSwaggerModal = false" />
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { ShieldCheck, Activity, AlertTriangle, Layers, RefreshCw, X, Info, FileText } from 'lucide-vue-next'
import AppLayout from '../components/layout/AppLayout.vue'
import GlassCard from '../components/ui/GlassCard.vue'
import SwaggerModal from '../components/ui/SwaggerModal.vue'
import OperationRequestsCard from '../components/ui/OperationRequestsCard.vue'
import FuzzCaseModal from '../components/ui/fuzz/FuzzCaseModal.vue'
import { useFuzzerStore } from '../store/fuzzerStore'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
])

const fuzzerStore = useFuzzerStore()

const selectedOperationId = ref(null)

// Swagger Contract Modal state
const showSwaggerModal = ref(false)

// Case Details Modal state
const showCaseModal = ref(false)
const activeCaseId = ref(null)
const activeCaseItem = ref(null)
const operationSpec = ref(null)

onMounted(() => {
  fuzzerStore.fetchFuzzers()
})

watch(() => fuzzerStore.selectedFuzzerId, () => {
  selectedOperationId.value = null
})

const selectedFuzzer = computed(() => {
  return fuzzerStore.fuzzers.find(f => f.id === fuzzerStore.selectedFuzzerId) || null
})

const selectOperation = (opId) => {
  selectedOperationId.value = opId
}

const openCaseDetails = async (item) => {
  const caseId = item.id || item.SUMMARY?.id || item.REQ?.uuid || item.REQ?.uuidReq || item.RES?.uuidReq
  if (!caseId) return

  activeCaseId.value = caseId
  activeCaseItem.value = item
  showCaseModal.value = true

  try {
    const fuzzerId = fuzzerStore.selectedFuzzerId
    const opId = selectedOperationId.value
    if (fuzzerId && opId) {
      operationSpec.value = await fuzzerStore.fetchOperationSpec(fuzzerId, opId)
    }
  } catch (err) {
    console.warn('Could not fetch operation spec for modal:', err)
  }
}

const closeCaseModal = () => {
  showCaseModal.value = false
  activeCaseId.value = null
  activeCaseItem.value = null
  operationSpec.value = null
}

const clearSelectedOperation = () => {
  selectedOperationId.value = null
}

const getStatusClass = (code) => {
  if (!code) return 'other'
  const c = Number(code)
  if (c >= 200 && c < 300) return 'success-2xx'
  if (c >= 300 && c < 400) return 'redirect-3xx'
  if (c >= 400 && c < 500) return 'client-4xx'
  if (c >= 500) return 'server-5xx'
  return 'other'
}

// ECharts configuration
const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(28, 28, 40, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    textStyle: { color: '#f0f0f5' }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30'],
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } },
    axisLabel: { color: '#a0a0b0' }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
    axisLabel: { color: '#a0a0b0' }
  },
  series: [
    {
      name: 'Peticiones/seg',
      type: 'line',
      smooth: true,
      lineStyle: {
        width: 3,
        color: '#60a5fa'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(96, 165, 250, 0.5)' },
            { offset: 1, color: 'rgba(96, 165, 250, 0.01)' }
          ]
        }
      },
      data: [120, 132, 101, 134, 90, 230, 210]
    },
    {
      name: 'Vulnerabilidades',
      type: 'line',
      smooth: true,
      lineStyle: {
        width: 3,
        color: '#f87171'
      },
      data: [0, 2, 1, 0, 5, 1, 0]
    }
  ]
}))
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.selector-row {
  margin-bottom: 8px;
}

.selector-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.selector-label-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.text-accent {
  color: var(--accent-secondary);
}

.icon-md {
  width: 24px;
  height: 24px;
}

.icon-sm {
  width: 16px;
  height: 16px;
}

.label-text {
  display: flex;
  flex-direction: column;
}

.label-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.label-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.selector-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  max-width: 500px;
}

.glass-select {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.glass-select option {
  background: #1c1c28;
  color: #f0f0f5;
}

.glass-select:focus {
  border-color: var(--accent-secondary);
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

.btn-refresh {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-refresh:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: var(--accent-secondary);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.selected-fuzzer-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.btn-swagger-contract {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(133, 234, 41, 0.12);
  color: #85ea29;
  border: 1px solid rgba(133, 234, 41, 0.3);
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-swagger-contract:hover {
  background: rgba(133, 234, 41, 0.25);
  border-color: #85ea29;
  box-shadow: 0 0 12px rgba(133, 234, 41, 0.3);
  transform: translateY(-1px);
}

.summary-grid {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.summary-key {
  color: var(--text-secondary);
  font-weight: 500;
}

.summary-val {
  color: var(--text-primary);
  font-weight: 500;
}

.highlight-name {
  color: var(--accent-primary);
  font-weight: 600;
}

.summary-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-section-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  font-weight: 600;
}

.servers-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.server-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
}

.server-url {
  font-family: monospace;
  color: var(--accent-secondary);
}

.server-desc {
  color: var(--text-muted);
  font-size: 11px;
}

.operations-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-height: 120px;
  overflow-y: auto;
  padding-right: 4px;
}

.operations-tags::-webkit-scrollbar {
  width: 4px;
}

.operations-tags::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.operations-tags::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.op-tag {
  background: rgba(74, 222, 128, 0.1);
  color: var(--accent-primary);
  border: 1px solid rgba(74, 222, 128, 0.2);
  padding: 3px 8px;
  margin-top: 10px;
  border-radius: 12px;
  font-size: 11px;
  font-family: monospace;
  cursor: pointer;
  user-select: none;
  transition: all var(--transition-fast);
}

.badge-version {
  background: rgba(96, 165, 250, 0.15);
  color: var(--accent-secondary);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.font-bold {
  font-weight: 600;
}

.selected-row {
  background: rgba(96, 165, 250, 0.08);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  font-family: var(--font-heading);
  color: var(--text-primary);
  line-height: 1;
}

.danger-text {
  color: var(--accent-danger);
}

.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon-wrapper.success {
  background: var(--accent-primary-glow);
  color: var(--accent-primary);
}

.stat-icon-wrapper.info {
  background: rgba(96, 165, 250, 0.2);
  color: var(--accent-secondary);
}

.stat-icon-wrapper.danger {
  background: rgba(248, 113, 113, 0.2);
  color: var(--accent-danger);
}

.main-chart-row {
  height: 400px;
}

.chart-container {
  flex: 1;
  min-height: 300px;
}

.chart {
  height: 100%;
  width: 100%;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.data-table th {
  text-align: left;
  padding: 16px;
  color: var(--text-secondary);
  font-weight: 500;
  border-bottom: 1px solid var(--border-color);
}

.data-table td {
  padding: 16px;
  border-bottom: 1px solid var(--glass-border);
  color: var(--text-primary);
}

.font-mono {
  font-family: monospace;
  font-size: 13px;
  color: var(--accent-secondary);
}

.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge.success {
  background: var(--accent-primary-glow);
  color: var(--accent-primary);
}

.btn-action {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-action:hover {
  background: rgba(255, 255, 255, 0.1);
}

.loading-state,
.empty-state,
.error-state {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.error-state {
  color: var(--accent-danger);
}

.op-tag:hover {
  background: rgba(74, 222, 128, 0.25);
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.op-tag.active {
  background: var(--accent-primary);
  color: #000;
  font-weight: bold;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.4);
}

.operation-requests-row {
  margin-top: 8px;
}

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.grid-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.op-code {
  background: rgba(96, 165, 250, 0.15);
  color: var(--accent-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.grid-count-badge {
  background: var(--accent-primary-glow);
  color: var(--accent-primary);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.btn-close-grid,
.btn-close-modal {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: all var(--transition-fast);
}

.btn-close-grid:hover,
.btn-close-modal:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.1);
}

.requests-table th {
  font-size: 13px;
}

.index-col {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.req-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.method-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  font-family: monospace;
}

.method-badge.post {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

.method-badge.get {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.method-badge.put {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.method-badge.delete {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.method-badge.patch {
  background: rgba(168, 85, 247, 0.2);
  color: #a855f7;
}

.url-path {
  font-family: monospace;
  font-size: 13px;
  color: var(--text-primary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.res-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-badge-res {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  width: fit-content;
}

.status-badge-res.success-2xx {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.status-badge-res.redirect-3xx {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.status-badge-res.client-4xx {
  background: rgba(251, 146, 60, 0.15);
  color: #fb923c;
}

.status-badge-res.server-5xx {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.time-latency {
  font-size: 11px;
  color: var(--text-secondary);
}

.schema-validations-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.val-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.val-label {
  color: var(--text-muted);
}

.val-badge {
  font-weight: 600;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
}

.val-badge.valid {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.val-badge.invalid {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.val-badge.info {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
}

.val-type-tag {
  font-family: monospace;
  font-size: 10px;
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  padding: 1px 4px;
  border-radius: 3px;
}

.vec-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  padding: 4px 8px;
  border-radius: 6px;
}

.vec-header {
  display: flex;
  gap: 6px;
  align-items: center;
}

.vec-badge-type {
  font-weight: 700;
  font-size: 11px;
  color: #f87171;
}

.vec-badge-insertion {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
}

.vec-owasp {
  font-size: 10px;
  color: var(--text-secondary);
}

.vec-cat {
  font-size: 10px;
  color: var(--text-muted);
  font-style: italic;
}

.no-vec {
  font-size: 12px;
}

.btn-inspect {
  font-size: 12px;
  padding: 4px 8px;
}

/* Modal styles */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  background: #181824;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 100%;
  max-width: 750px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.case-modal-card {
  max-width: 920px;
  max-height: 85vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 16px;
  color: var(--text-primary);
  margin: 0;
}

.modal-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-sub-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.op-badge-modal {
  background: rgba(96, 165, 250, 0.2);
  color: var(--accent-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.case-id-modal {
  color: var(--text-muted);
  font-family: monospace;
}

.modal-loading {
  padding: 60px 20px;
}

.modal-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.2);
  padding: 0 16px;
  overflow-x: auto;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
  background: rgba(255, 255, 255, 0.03);
}

.modal-tab-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Findings Cards */
.finding-card {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.finding-card.danger {
  background: rgba(248, 113, 113, 0.08);
  border-color: rgba(248, 113, 113, 0.3);
}

.finding-card.warning {
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.3);
}

.finding-card.info {
  background: rgba(96, 165, 250, 0.08);
  border-color: rgba(96, 165, 250, 0.3);
}

.finding-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.finding-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.severity-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
}

.severity-badge.sev-4,
.severity-badge.sev-5 {
  background: rgba(248, 113, 113, 0.25);
  color: #f87171;
}

.severity-badge.sev-3 {
  background: rgba(251, 146, 60, 0.25);
  color: #fb923c;
}

.severity-badge.sev-1,
.severity-badge.sev-2,
.severity-badge.sev-level {
  background: rgba(251, 191, 36, 0.25);
  color: #fbbf24;
}

.finding-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.finding-desc {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
}

.finding-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-pill {
  font-size: 10px;
  font-family: monospace;
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

.finding-recommendation {
  background: rgba(0, 0, 0, 0.3);
  border-left: 3px solid var(--accent-primary);
  padding: 10px 14px;
  border-radius: 0 6px 6px 0;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
}

.finding-recommendation ul {
  margin: 6px 0 0 16px;
  padding: 0;
}

.status-match-info {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* Vector detail */
.vector-detail-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vec-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 8px;
}

.vec-prop {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vec-prop-key {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.vec-prop-val {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.text-danger {
  color: #f87171;
}

.badge-inserted {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  width: fit-content;
}

.vec-desc-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-primary);
}

/* HTTP Split view */
.http-split-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.http-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.http-card-title {
  background: rgba(255, 255, 255, 0.04);
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.http-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kv-item {
  font-size: 12px;
  color: var(--text-secondary);
}

.code-sub-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-top: 8px;
}

.json-code.compact {
  max-height: 180px;
  font-size: 11px;
  padding: 10px;
}

/* OpenAPI Spec Card */
.openapi-spec-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spec-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}

.spec-method {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-family: monospace;
}

.spec-path {
  font-family: monospace;
  color: var(--text-primary);
}

.spec-name {
  color: var(--text-muted);
  font-size: 13px;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.json-code {
  background: #0d0d14;
  padding: 16px;
  border-radius: 8px;
  color: #a6accd;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
