<template>
  <GlassCard class="target-api-card">
    <template #header>
      <div class="card-header-content">
        <div class="header-left">
          <div class="api-icon-wrapper">
            <Globe class="api-icon" />
          </div>
          <div class="header-text">
            <div class="title-row">
              <h3 class="card-title">{{ normalizedFuzzer.name || title }}</h3>
              <span v-if="normalizedFuzzer.version" class="version-badge">
                v{{ normalizedFuzzer.version }}
              </span>
            </div>
            <div class="sub-info-row">
              <span v-if="normalizedFuzzer.id" class="fuzzer-id-pill" title="ID de la API Remota">
                ID: {{ normalizedFuzzer.id }}
              </span>
              <span v-if="primaryServer" class="server-url-pill"
                :title="primaryServer.description || 'Servidor remoto'">
                <Server class="icon-xs" />
                {{ primaryServer.url }}
              </span>
            </div>
          </div>
        </div>

        <div class="header-right">
          <button v-if="operationsList.length > 0" @click="isExpanded = !isExpanded" class="btn-toggle-expand"
            :title="isExpanded ? 'Contraer operaciones' : 'Ver Operaciones'">
            <span>{{ isExpanded ? 'Contraer' : 'Ver Operaciones' }}</span>
            <ChevronDown :class="['chevron-icon', { rotated: isExpanded }]" />
          </button>
        </div>
      </div>
    </template>

    <!-- Card Body -->
    <div class="target-api-body">
      <!-- Loading State -->
      <div v-if="loading" class="api-state-container loading">
        <RefreshCw class="spinning icon-md text-accent" />
        <span>Cargando datos de la API remota...</span>
      </div>

      <!-- Empty State (No Fuzzer Data yet) -->
      <div v-else-if="!hasData" class="api-state-container empty">
        <Radio class="pulse-icon icon-lg text-muted" />
        <div class="empty-text">
          <span class="empty-title">Esperando datos de la API remota</span>
          <span class="empty-sub">Escuchando eventos <code>fuzzer:created</code> y <code>operations:created</code> en el
            socket...</span>
        </div>
      </div>

      <!-- Normal Content View -->
      <div v-else class="api-content">
        <!-- KPI Summary Bar -->
        <div class="kpi-summary-bar">
          <!-- Total Operations KPI -->
          <div class="summary-stat stat-total">
            <span class="stat-label">Total Operaciones</span>
            <span class="stat-value">{{ totalOpsCount }}</span>
          </div>

          <!-- Total Test Cases KPI -->
          <div v-if="socketStore.metrics.totalCasesCreated > 0" class="summary-stat stat-cases">
            <span class="stat-label">Casos Generados</span>
            <span class="stat-value text-success">{{ socketStore.metrics.totalCasesCreated }}</span>
          </div>

          <!-- Servers List if multiple -->
          <div v-if="normalizedFuzzer.servers && normalizedFuzzer.servers.length > 1" class="summary-servers">
            <span class="stat-label">Servidores ({{ normalizedFuzzer.servers.length }})</span>
            <div class="servers-list">
              <span v-for="(srv, sIdx) in normalizedFuzzer.servers" :key="sIdx" class="server-mini-pill"
                :title="srv.description">
                {{ srv.url }}
              </span>
            </div>
          </div>

          <!-- Method Breakdown Counters -->
          <div class="summary-methods">
            <span class="stat-label">Desglose por Métodos HTTP</span>
            <div class="method-badges-group">
              <span v-for="(count, method) in methodBreakdown" :key="method"
                :class="['method-count-pill', `method-${method.toLowerCase()}`, { active: selectedMethodFilter === method }]"
                @click="toggleMethodFilter(method)">
                <span class="m-name">{{ method }}</span>
                <span class="m-count">{{ count }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Operations Section (Collapsible / Expandable) -->
        <transition name="fade-slide">
          <div v-if="isExpanded && operationsList.length > 0" class="operations-container">
            <!-- Search & Filters Toolbar -->
            <div class="ops-toolbar">
              <div class="search-input-wrapper">
                <Search class="search-icon icon-xs" />
                <input type="text" v-model="searchQuery" placeholder="Buscar por ruta (/pet), nombre o ID..."
                  class="ops-search-input" />
                <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search-btn">
                  &times;
                </button>
              </div>

              <div class="ops-filter-pills">
                <button :class="['filter-pill', { active: selectedMethodFilter === 'ALL' }]"
                  @click="selectedMethodFilter = 'ALL'">
                  Todos ({{ operationsList.length }})
                </button>
                <button v-for="(count, method) in methodBreakdown" :key="'flt-' + method"
                  :class="['filter-pill', `method-${method.toLowerCase()}`, { active: selectedMethodFilter === method }]"
                  @click="selectedMethodFilter = method">
                  {{ method }} ({{ count }})
                </button>
              </div>
            </div>

            <!-- Operations Grid / List -->
            <div class="ops-list">
              <div v-for="op in filteredOperations" :key="op.id || op.name" class="op-item-card">
                <div class="op-item-main">
                  <div class="op-method-badge" :class="`method-${(op.method || 'GET').toLowerCase()}`">
                    {{ (op.method || 'GET').toUpperCase() }}
                  </div>
                  <div class="op-details">
                    <div class="op-path-row">
                      <span class="op-path font-mono">{{ op.path }}</span>
                    </div>
                    <div class="op-name-row">
                      <span class="op-name">{{ op.name }}</span>
                    </div>
                  </div>

                  <!-- Test Cases Summary per Operation -->
                  <div v-if="getTestCasesForOp(op)" class="op-tc-summary">
                    <div v-if="hasBreakdown(getTestCasesForOp(op))" class="op-breakdown-list">
                      <span v-for="(count, key) in getTestCasesForOp(op).breakdown" :key="key"
                        :class="['breakdown-pill', getPillClass(key)]" :title="`${key}: ${count}`">
                        <span class="pill-label">{{ formatKey(key) }}</span>
                        <span class="pill-val">{{ count }}</span>
                      </span>
                    </div>
                    <span class="op-tc-total font-mono" title="Casos de prueba generados">
                      {{ getTestCasesForOp(op).total }} casos
                    </span>
                  </div>
                </div>

                <!-- Operation ID at full-width bottom -->
                <div v-if="op.id" class="op-id-footer">
                  <span class="op-id-tag font-mono">id: {{ op.id }}</span>
                </div>
              </div>

              <div v-if="filteredOperations.length === 0" class="no-ops-found">
                No se encontraron operaciones con los filtros aplicados.
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </GlassCard>
</template>

<script setup>
import { ref, computed } from 'vue'
import GlassCard from './GlassCard.vue'
import { useSocketStore } from '../../store/socketStore'
import {
  Globe,
  Server,
  ChevronDown,
  Search,
  RefreshCw,
  Radio
} from 'lucide-vue-next'

const socketStore = useSocketStore()

const props = defineProps({
  fuzzerInfo: {
    type: Object,
    default: null
  },
  operationsInfo: {
    type: [Object, Array],
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'API Remota Objetivo'
  },
  defaultExpanded: {
    type: Boolean,
    default: true
  }
})

const isExpanded = ref(props.defaultExpanded)
const searchQuery = ref('')
const selectedMethodFilter = ref('ALL')

// Normalize Fuzzer payload (unwraps event wrappers like { payload: { ... } } or raw objects)
const normalizedFuzzer = computed(() => {
  if (!props.fuzzerInfo) return {}
  if (props.fuzzerInfo.payload) return props.fuzzerInfo.payload
  return props.fuzzerInfo
})

// Primary remote target server
const primaryServer = computed(() => {
  const servers = normalizedFuzzer.value.servers
  if (Array.isArray(servers) && servers.length > 0) {
    return servers[0]
  }
  return null
})

// Normalize operations list (unwraps event wrappers or direct arrays)
const operationsList = computed(() => {
  if (!props.operationsInfo) return []

  // If operationsInfo is directly an Array
  if (Array.isArray(props.operationsInfo)) {
    return props.operationsInfo
  }

  // If operationsInfo is event object or payload object with operations property
  const payload = props.operationsInfo.payload || props.operationsInfo
  if (payload && Array.isArray(payload.operations)) {
    return payload.operations
  }

  return []
})

// Check if component has received any remote API data
const hasData = computed(() => {
  return Boolean(normalizedFuzzer.value.name || normalizedFuzzer.value.id || operationsList.value.length > 0)
})

// Total count of operations
const totalOpsCount = computed(() => {
  if (operationsList.value.length > 0) return operationsList.value.length
  if (normalizedFuzzer.value.operationIds && Array.isArray(normalizedFuzzer.value.operationIds)) {
    return normalizedFuzzer.value.operationIds.length
  }
  return 0
})

// Count by HTTP Method
const methodBreakdown = computed(() => {
  const counts = {}
  operationsList.value.forEach(op => {
    const method = (op.method || 'OTHER').toUpperCase()
    counts[method] = (counts[method] || 0) + 1
  })
  return counts
})

// Toggle method filter
const toggleMethodFilter = (method) => {
  if (selectedMethodFilter.value === method) {
    selectedMethodFilter.value = 'ALL'
  } else {
    selectedMethodFilter.value = method
  }
}

// Filtered operations list based on search and method filter
const filteredOperations = computed(() => {
  return operationsList.value.filter(op => {
    const method = (op.method || '').toUpperCase()
    const matchesMethod = selectedMethodFilter.value === 'ALL' || method === selectedMethodFilter.value

    if (!matchesMethod) return false

    if (!searchQuery.value.trim()) return true

    const query = searchQuery.value.toLowerCase()
    const nameMatch = (op.name || '').toLowerCase().includes(query)
    const pathMatch = (op.path || '').toLowerCase().includes(query)
    const idMatch = (op.id || '').toLowerCase().includes(query)

    return nameMatch || pathMatch || idMatch
  })
})

const getTestCasesForOp = (op) => {
  const detailsMap = socketStore.metrics.casesDetailsByOperation || {}
  const simpleMap = socketStore.metrics.casesByOperation || {}

  const candidates = [op.id, op.name, op.operationId].filter(Boolean)
  let key = candidates.find(k => detailsMap[k] || simpleMap[k] !== undefined)

  if (!key) {
    const allKeys = Array.from(new Set([...Object.keys(detailsMap), ...Object.keys(simpleMap)]))
    key = allKeys.find(k => candidates.some(c => c.toLowerCase() === k.toLowerCase()))
  }

  if (key) {
    if (detailsMap[key]) {
      return {
        total: detailsMap[key].total !== undefined ? detailsMap[key].total : (simpleMap[key] || 0),
        breakdown: detailsMap[key].breakdown || {}
      }
    }
    const val = simpleMap[key]
    return {
      total: typeof val === 'number' ? val : (val?.total || 0),
      breakdown: {}
    }
  }

  return null
}

const hasBreakdown = (tcData) => {
  return tcData && tcData.breakdown && Object.keys(tcData.breakdown).length > 0
}

const formatKey = (key) => {
  if (key === 'grammar-based') return 'Grammar'
  if (key === 'seeds') return 'Seeds'
  return key
}

const getPillClass = (key) => {
  const k = (key || '').toLowerCase()
  if (k.includes('seed')) return 'pill-seeds'
  if (k.includes('grammar')) return 'pill-grammar'
  if (k.includes('header')) return 'pill-headers'
  if (k.includes('query')) return 'pill-query'
  if (k.includes('path')) return 'pill-path'
  if (k.includes('form') || k.includes('body')) return 'pill-body'
  return 'pill-default'
}
</script>

<style scoped>
.target-api-card {
  margin-bottom: 24px;
}

.card-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.api-icon-wrapper {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(96, 165, 250, 0.12);
  border: 1px solid rgba(96, 165, 250, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-secondary);
}

.api-icon {
  width: 22px;
  height: 22px;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.version-badge {
  background: rgba(74, 222, 128, 0.15);
  color: var(--accent-primary);
  border: 1px solid rgba(74, 222, 128, 0.3);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}

.sub-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.fuzzer-id-pill {
  color: var(--text-muted);
  font-family: monospace;
}

.server-url-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-secondary);
  font-family: monospace;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.icon-xs {
  width: 13px;
  height: 13px;
}

.btn-toggle-expand {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-toggle-expand:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.chevron-icon {
  width: 16px;
  height: 16px;
  transition: transform var(--transition-normal);
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

/* States styling */
.target-api-body {
  width: 100%;
}

.api-state-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  border: 1px dashed var(--border-color);
}

.empty-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.empty-title {
  font-weight: 600;
  color: var(--text-primary);
}

.empty-sub {
  font-size: 12px;
  color: var(--text-muted);
}

.empty-sub code {
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--accent-secondary);
}

.pulse-icon {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.98);
  }

  50% {
    opacity: 1;
    transform: scale(1.05);
  }
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

/* KPI Summary Bar */
.kpi-summary-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  margin-bottom: 16px;
}

.summary-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-primary);
  font-family: var(--font-heading);
}

.summary-servers {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.servers-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.server-mini-pill {
  font-size: 11px;
  font-family: monospace;
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--text-secondary);
}

.summary-methods {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.method-badges-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.method-count-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.method-count-pill:hover {
  transform: translateY(-1px);
  filter: brightness(1.2);
}

.method-count-pill.active {
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.m-count {
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 11px;
}

/* HTTP Method Badge Palette */
.method-get {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.3);
}

.method-post {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
  border-color: rgba(96, 165, 250, 0.3);
}

.method-put {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.3);
}

.method-delete {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}

.method-patch {
  background: rgba(192, 132, 252, 0.15);
  color: #c084fc;
  border-color: rgba(192, 132, 252, 0.3);
}

.method-other {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  border-color: rgba(148, 163, 184, 0.3);
}

/* Toolbar & Filter Bar */
.ops-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 240px;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
}

.ops-search-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 30px 8px 32px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color var(--transition-fast);
}

.ops-search-input:focus {
  border-color: var(--accent-secondary);
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
}

.ops-filter-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-pill {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-pill:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
}

.filter-pill.active {
  background: var(--accent-secondary);
  color: #000;
  font-weight: 600;
  border-color: var(--accent-secondary);
}

/* Operations Grid */
.ops-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.op-item-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 14px;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.op-item-main {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.op-id-footer {
  width: 100%;
  padding-top: 4px;
  border-top: 1px dashed rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
}

.op-item-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
}

.op-method-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 6px;
  letter-spacing: 0.04em;
  text-align: center;
  min-width: 58px;
  border: 1px solid currentColor;
}

.op-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.op-path-row {
  display: flex;
  align-items: center;
}

.op-path {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.op-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.op-name {
  font-size: 12px;
  color: var(--accent-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.op-id-tag {
  font-size: 10.5px;
  color: var(--text-muted);
  letter-spacing: 0.02em;
  word-break: break-all;
}

.no-ops-found {
  grid-column: 1 / -1;
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 13px;
}

.font-mono {
  font-family: monospace;
}

.text-accent {
  color: var(--accent-primary);
}

.text-success {
  color: #4ade80;
}

.text-muted {
  color: var(--text-muted);
}

/* Test Cases per Operation */
.op-tc-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.op-breakdown-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: auto;
  margin-right: 10px;
}

.breakdown-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono, monospace);
}

.pill-label {
  opacity: 0.8;
}

.pill-val {
  font-weight: 700;
}

.pill-seeds {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.pill-grammar {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.25);
}

.pill-headers {
  background: rgba(234, 179, 8, 0.15);
  color: #fde047;
  border: 1px solid rgba(234, 179, 8, 0.25);
}

.pill-query {
  background: rgba(20, 184, 166, 0.15);
  color: #2dd4bf;
  border: 1px solid rgba(20, 184, 166, 0.25);
}

.pill-path {
  background: rgba(249, 115, 22, 0.15);
  color: #fdba74;
  border: 1px solid rgba(249, 115, 22, 0.25);
}

.pill-body {
  background: rgba(236, 72, 153, 0.15);
  color: #f472b6;
  border: 1px solid rgba(236, 72, 153, 0.25);
}

.pill-default {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.op-tc-total {
  font-weight: 700;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.25);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
