<template>
  <GlassCard class="operation-requests-card">
    <!-- Header -->
    <div class="card-header-flex">
      <div class="header-title-group">
        <Layers class="icon-sm text-accent" />
        <span class="grid-title">
          {{ title }} — Operation:
          <code class="op-code">{{ operationId || 'No Operation' }}</code>
        </span>
        <span class="grid-count-badge" v-if="totalRecords > 0">
          {{ totalRecords }} Cases
        </span>
        <span class="page-indicator-pill" v-if="totalPages > 1">
          Page {{ currentPage }} / {{ totalPages }}
        </span>
      </div>

      <div class="header-actions-group">
        <button v-if="fuzzerId && operationId" @click="fetchData" class="btn-icon-header" :title="'Recargar registros'"
          :disabled="loading">
          <RefreshCw :class="['icon-sm', { spinning: loading }]" />
        </button>
        <button v-if="closable" @click="$emit('close')" class="btn-close-grid" title="Cerrar grilla">
          <X class="icon-sm" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && summaryList.length === 0" class="loading-state">
      <RefreshCw class="spinning icon-md text-accent" />
      <span>Loading test cases for <strong>{{ operationId }}</strong>...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error && summaryList.length === 0" class="error-state">
      <div class="error-content">
        <AlertCircle class="icon-sm text-danger" />
        <span>{{ error }}</span>
      </div>
      <button @click="fetchData" class="btn-retry">
        <RefreshCw class="icon-xs" />
        Reintentar
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="summaryList.length === 0" class="empty-state">
      <span>No se encontraron solicitudes registradas para la operación <strong>{{ operationId }}</strong>.</span>
    </div>

    <!-- Data Grid / Table -->
    <div v-else class="table-wrapper">
      <div class="table-container">
        <table class="data-table requests-table">
          <thead>
            <tr>
              <th class="th-index">#</th>
              <th>Petición (REQ)</th>
              <th>Respuesta (RES)</th>
              <th>Validación Esquema</th>
              <th>Vector (VEC)</th>
              <th class="th-action">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in summaryList" :key="item.id || item.SUMMARY?.id || index" class="request-row">
              <!-- Index Column -->
              <td class="index-col">
                {{ getRowNumber(index) }}
              </td>

              <!-- REQ / Attack Surface -->
              <td>
                <div class="req-cell">
                  <span :class="['method-badge', getMethod(item).toLowerCase()]">
                    {{ getMethod(item) }}
                  </span>
                  <span class="url-path" :title="getUrl(item)">
                    {{ getPath(item) }}
                  </span>
                </div>
              </td>

              <!-- RES / Result -->
              <td>
                <div class="res-cell" v-if="hasResponse(item)">
                  <div class="res-status-row">
                    <span :class="['status-badge-res', getStatusClass(getStatusCode(item))]">
                      {{ getStatusCode(item) }} {{ getStatusMessage(item) }}
                    </span>
                    <span class="time-latency" v-if="getTotalTime(item) !== undefined">
                      ⚡ {{ getTotalTime(item) }}ms
                    </span>
                  </div>
                  <span v-if="item.result?.time" class="time-stamp" :title="formatTimestamp(item.result.time)">
                    {{ formatTimeOnly(item.result.time) }}
                  </span>
                </div>
                <span v-else class="text-muted">Sin respuesta</span>
              </td>

              <!-- Schema Validations & Findings -->
              <td>
                <div class="schema-validations-cell">
                  <!-- Schema Mutations Payload (testCaseSummaryList schema) -->
                  <div v-if="item.mutationsPayload" class="val-item">
                    <span class="val-label">Mutations:</span>
                    <span :class="['val-badge', item.mutationsPayload.isValid ? 'valid' : 'invalid']">
                      {{ item.mutationsPayload.isValid ? '✓ Conforme' : '✗ Violation' }}
                    </span>
                    <span class="val-sub-info" v-if="item.mutationsPayload.mutationsCant !== undefined">
                      {{ item.mutationsPayload.mutationsCant }} mut. ({{ item.mutationsPayload.totalPoints ?? 0 }} pts)
                    </span>
                    <span v-if="item.mutationsPayload.severity?.name"
                      :class="['val-sev-pill', 'sev-' + item.mutationsPayload.severity.name.toLowerCase()]">
                      {{ item.mutationsPayload.severity.name }}
                    </span>
                  </div>

                  <!-- Response Payload Check (testCaseSummaryList schema) -->
                  <div v-if="item.responsePayloadCheck" class="val-item">
                    <span class="val-label">Response:</span>
                    <span :class="['val-badge', item.responsePayloadCheck.isValid ? 'valid' : 'invalid']">
                      {{ item.responsePayloadCheck.isValid ? '✓ Valid' : '✗ ' +
                        formatFindingType(item.responsePayloadCheck.findingType) }}
                    </span>
                    <span v-if="item.responsePayloadCheck.severity?.name && !item.responsePayloadCheck.isValid"
                      :class="['val-sev-pill', 'sev-' + item.responsePayloadCheck.severity.name.toLowerCase()]">
                      {{ item.responsePayloadCheck.severity.name }}
                    </span>
                  </div>

                  <!-- Status Code Drift (testCaseSummaryList schema) -->
                  <div v-if="item.statusCodeDrift" class="val-item">
                    <span class="val-label">Drift Status:</span>
                    <span :class="['val-badge', getDriftBadgeClass(item.statusCodeDrift.matchType)]">
                      Match: {{ item.statusCodeDrift.matchType }}
                    </span>
                    <span v-if="item.statusCodeDrift.severity?.name && item.statusCodeDrift.matchType !== 'exact'"
                      :class="['val-sev-pill', 'sev-' + item.statusCodeDrift.severity.name.toLowerCase()]">
                      {{ item.statusCodeDrift.severity.name }}
                    </span>
                  </div>

                  <!-- Aggregated Max Severity Pill -->
                  <div v-if="item.severity?.maxLevel" class="val-item">
                    <span class="val-label">Max Severity:</span>
                    <span :class="['val-sev-pill', 'sev-' + item.severity.maxLevel.name.toLowerCase()]">
                      Max: {{ item.severity.maxLevel.name.toUpperCase() }}
                    </span>
                    <span class="val-sub-info" v-if="item.severity.count !== undefined">
                      ({{ item.severity.count }} {{ item.severity.count === 1 ? 'finding' : 'findings' }})
                    </span>
                  </div>

                  <!-- Backward Compatibility with Legacy Schema -->
                  <template v-if="!item.mutationsPayload && !item.statusCodeDrift">
                    <div v-if="item.schemaRequestPayload" class="val-item">
                      <span class="val-label">Req Payload:</span>
                      <span :class="['val-badge', item.schemaRequestPayload.isValid ? 'valid' : 'invalid']">
                        {{ item.schemaRequestPayload.isValid ? '✓ Valid' : '✗ Invalid' }}
                      </span>
                      <span v-if="item.schemaRequestPayload.type" class="val-type-tag">
                        {{ item.schemaRequestPayload.type }}
                      </span>
                    </div>

                    <div v-if="item.schemaResponsePayload" class="val-item">
                      <span class="val-label">Res Payload:</span>
                      <span :class="['val-badge', item.schemaResponsePayload.isValid ? 'valid' : 'invalid']">
                        {{ item.schemaResponsePayload.isValid ? '✓ Valid' : '✗ Invalid' }}
                      </span>
                    </div>

                    <div v-if="item.schemaResponseStatusCode" class="val-item">
                      <span class="val-label">Status Code:</span>
                      <span class="val-badge info">
                        Match: {{ item.schemaResponseStatusCode.matchType || 'N/A' }}
                      </span>
                    </div>

                    <div v-if="item.fuzzingCase" class="val-item">
                      <span class="val-label">Fuzzing Case:</span>
                      <span :class="['val-badge', item.fuzzingCase.isValidRequest ? 'valid' : 'invalid']">
                        {{ item.fuzzingCase.isValidRequest ? '✓ Valid Request' : '✗ Invalid Request' }}
                      </span>
                    </div>
                  </template>
                </div>
              </td>

              <!-- Vector (VEC) -->
              <td>
                <!-- New Schema: injectionVector -->
                <div v-if="item.injectionVector" class="vec-cell">
                  <div class="vec-header">
                    <span class="vec-badge-type">{{ item.injectionVector.type || 'Vector' }}</span>
                    <span v-if="item.injectionVector.outcome"
                      :class="['vec-badge-outcome', getOutcomeClass(item.injectionVector.outcome)]">
                      {{ item.injectionVector.outcome }}
                    </span>
                    <span v-if="item.injectionVector.reflection && item.injectionVector.reflection !== 'NONE'"
                      class="vec-badge-reflection">
                      {{ item.injectionVector.reflection }}
                    </span>
                  </div>
                  <div class="vec-owasp" v-if="item.injectionVector.owasp">
                    {{ item.injectionVector.owasp }}
                  </div>
                  <div class="vec-cat" v-if="item.injectionVector.category">
                    {{ item.injectionVector.category }}
                  </div>
                </div>

                <!-- Legacy Schema: VEC -->
                <div v-else-if="item.VEC" class="vec-cell">
                  <div class="vec-header">
                    <span class="vec-badge-type">{{ item.VEC.type || 'Vector' }}</span>
                    <span v-if="item.VEC.insertion" class="vec-badge-insertion">Inyectado</span>
                  </div>
                  <div class="vec-owasp" v-if="item.VEC.owasp">{{ item.VEC.owasp }}</div>
                  <div class="vec-cat" v-if="item.VEC.category">{{ item.VEC.category }}</div>
                </div>

                <!-- No vector -->
                <div v-else class="no-vec">
                  <span class="text-muted">Sin vector</span>
                </div>
              </td>

              <!-- Action / Inspector -->
              <td class="action-col">
                <button @click="$emit('inspect', item)" class="btn-action btn-inspect"
                  title="Ver detalle del caso de prueba">
                  <Info class="icon-xs" />
                  Detalles
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Toolbar -->
      <div class="pagination-bar">
        <div class="pagination-info">
          <span>
            Showing
            <strong class="highlight-num">{{ startRecord }}</strong>
            -
            <strong class="highlight-num">{{ endRecord }}</strong>
            of
            <strong class="highlight-num">{{ totalRecords }}</strong>
            cases
          </span>
        </div>

        <div class="pagination-controls" v-if="totalPages > 1">
          <!-- First Page -->
          <button @click="goToPage(1)" :disabled="currentPage === 1 || loading" class="btn-page-nav" title="First page">
            <ChevronsLeft class="icon-xs" />
          </button>

          <!-- Prev Page -->
          <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1 || loading" class="btn-page-nav"
            title="Previous page">
            <ChevronLeft class="icon-xs" />
          </button>

          <!-- Page Numbers -->
          <div class="page-numbers">
            <template v-for="(p, pIdx) in pageNumbers" :key="pIdx">
              <span v-if="p === '...'" class="page-ellipsis">...</span>
              <button v-else @click="goToPage(p)" :class="['btn-page-num', { active: p === currentPage }]"
                :disabled="loading">
                {{ p }}
              </button>
            </template>
          </div>

          <!-- Next Page -->
          <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= totalPages || loading"
            class="btn-page-nav" title="Next page">
            <ChevronRight class="icon-xs" />
          </button>

          <!-- Last Page -->
          <button @click="goToPage(totalPages)" :disabled="currentPage >= totalPages || loading" class="btn-page-nav"
            title="Last page">
            <ChevronsRight class="icon-xs" />
          </button>
        </div>

        <!-- Page Size Selector -->
        <div class="pagination-size-selector">
          <label class="size-label">Rows:</label>
          <select v-model="pageSize" @change="handlePageSizeChange" class="size-select" :disabled="loading">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </div>
      </div>
    </div>
  </GlassCard>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  RefreshCw,
  X,
  Info,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle
} from 'lucide-vue-next'
import GlassCard from './GlassCard.vue'
import { useFuzzerStore } from '../../store/fuzzerStore'

const props = defineProps({
  fuzzerId: {
    type: String,
    default: null
  },
  operationId: {
    type: String,
    default: null
  },
  title: {
    type: String,
    default: 'Test Cases'
  },
  initialPage: {
    type: Number,
    default: 1
  },
  initialLength: {
    type: Number,
    default: 10
  },
  pageSizeOptions: {
    type: Array,
    default: () => [5, 10, 20, 50, 100]
  },
  autoFetch: {
    type: Boolean,
    default: true
  },
  closable: {
    type: Boolean,
    default: true
  },
  data: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'close',
  'inspect',
  'page-change',
  'length-change',
  'loaded'
])

const fuzzerStore = useFuzzerStore()

const currentPage = ref(props.initialPage)
const pageSize = ref(props.initialLength)
const loading = ref(false)
const error = ref(null)
const internalData = ref(null)

// Current paginated object either from props.data or internalData
const activeData = computed(() => {
  return props.data || internalData.value
})

// Summary list of test cases
const summaryList = computed(() => {
  if (!activeData.value) return []
  if (Array.isArray(activeData.value.summaryList)) {
    return activeData.value.summaryList
  }
  if (Array.isArray(activeData.value)) {
    return activeData.value
  }
  return []
})

// Total record count from schema
const totalRecords = computed(() => {
  if (activeData.value && typeof activeData.value.totalRecord === 'number') {
    return activeData.value.totalRecord
  }
  return summaryList.value.length
})

// Total pages count from schema or calculated
const totalPages = computed(() => {
  if (activeData.value && typeof activeData.value.totalIndex === 'number') {
    return Math.max(1, activeData.value.totalIndex)
  }
  return Math.max(1, Math.ceil(totalRecords.value / pageSize.value))
})

// 1-based start index of records in page
const startRecord = computed(() => {
  if (summaryList.value.length === 0) return 0
  if (activeData.value && typeof activeData.value.start === 'number' && activeData.value.start > 0) {
    return activeData.value.start
  }
  return (currentPage.value - 1) * pageSize.value + 1
})

// 1-based end index of records in page
const endRecord = computed(() => {
  if (summaryList.value.length === 0) return 0
  if (activeData.value && typeof activeData.value.end === 'number' && activeData.value.end > 0) {
    return activeData.value.end
  }
  return Math.min(startRecord.value + summaryList.value.length - 1, totalRecords.value)
})

// Smart pagination page numbers list with ellipsis
const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages = []
  pages.push(1)

  if (current > 3) {
    pages.push('...')
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) {
    pages.push('...')
  }

  pages.push(total)
  return pages
})

// Fetch operation requests from store using new paginated schema
const fetchData = async () => {
  if (!props.fuzzerId || !props.operationId) return

  loading.value = true
  error.value = null

  try {
    const data = await fuzzerStore.fetchOperationRequests(
      props.fuzzerId,
      props.operationId,
      currentPage.value,
      pageSize.value
    )
    internalData.value = data
    emit('loaded', data)
  } catch (err) {
    error.value = err.message || 'Error al cargar las solicitudes de la operación'
    internalData.value = null
  } finally {
    loading.value = false
  }
}

const goToPage = (page) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  emit('page-change', page, pageSize.value)
  if (props.autoFetch) {
    fetchData()
  }
}

const handlePageSizeChange = () => {
  currentPage.value = 1
  emit('length-change', pageSize.value)
  if (props.autoFetch) {
    fetchData()
  }
}

// Watchers
watch(
  () => [props.fuzzerId, props.operationId],
  ([newFuzzer, newOp]) => {
    currentPage.value = 1
    if (newFuzzer && newOp && props.autoFetch) {
      fetchData()
    } else {
      internalData.value = null
    }
  }
)

onMounted(() => {
  if (props.fuzzerId && props.operationId && props.autoFetch && !props.data) {
    fetchData()
  }
})

// Helper methods for schema mapping
const getRowNumber = (index) => {
  return startRecord.value + index
}

const getMethod = (item) => {
  return item.attackSurface?.method || item.REQ?.method || 'REQ'
}

const getPath = (item) => {
  return item.attackSurface?.path || item.attackSurface?.url || item.REQ?.path || item.REQ?.url || '—'
}

const getUrl = (item) => {
  return item.attackSurface?.url || item.attackSurface?.path || item.REQ?.url || item.REQ?.path || ''
}

const hasResponse = (item) => {
  return !!(item.result || item.RES)
}

const getStatusCode = (item) => {
  return item.result?.statusCode ?? item.RES?.statusCode ?? '—'
}

const getStatusMessage = (item) => {
  return item.result?.statusMessage || item.RES?.statusMessage || ''
}

const getTotalTime = (item) => {
  return item.result?.totalTime ?? item.RES?.totalTime
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

const getDriftBadgeClass = (matchType) => {
  if (!matchType) return 'info'
  const m = matchType.toLowerCase()
  if (m === 'exact') return 'valid'
  if (m === 'wildcard') return 'info'
  if (m === 'default') return 'warning'
  if (m === '5xx' || m === 'none') return 'invalid'
  return 'info'
}

const getOutcomeClass = (outcome) => {
  if (!outcome) return 'outcome-unknown'
  const o = outcome.toLowerCase()
  if (o === 'accepted') return 'outcome-accepted'
  if (o === 'rejected') return 'outcome-rejected'
  if (o === 'sanitized') return 'outcome-sanitized'
  return 'outcome-unknown'
}

const formatFindingType = (type) => {
  if (!type) return 'Desconocido'
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const formatTimeOnly = (timestamp) => {
  if (!timestamp) return ''
  try {
    const d = new Date(timestamp)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}

const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return String(timestamp)
  }
}
</script>

<style scoped>
.operation-requests-card {
  margin-top: 8px;
  background: var(--glass-bg, rgba(28, 28, 40, 0.7));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.card-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  gap: 12px;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.grid-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #f0f0f5);
}

.op-code {
  background: rgba(96, 165, 250, 0.15);
  color: var(--accent-secondary, #60a5fa);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.grid-count-badge {
  background: var(--accent-primary-glow, rgba(74, 222, 128, 0.2));
  color: var(--accent-primary, #4ade80);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.page-indicator-pill {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary, #a0a0b0);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.header-actions-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon-header,
.btn-close-grid {
  background: transparent;
  border: none;
  color: var(--text-muted, #6b6b7b);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast, 0.2s ease);
}

.btn-icon-header:hover,
.btn-close-grid:hover {
  color: var(--text-primary, #f0f0f5);
  background: rgba(255, 255, 255, 0.08);
}

.btn-icon-header:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state,
.empty-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 12px;
  color: var(--text-secondary, #a0a0b0);
  font-size: 14px;
  text-align: center;
}

.error-state {
  background: rgba(248, 113, 113, 0.06);
  border: 1px dashed rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-md, 12px);
}

.error-content {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-danger, #f87171);
}

.btn-retry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(248, 113, 113, 0.15);
  color: var(--accent-danger, #f87171);
  border: 1px solid rgba(248, 113, 113, 0.3);
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s ease);
}

.btn-retry:hover {
  background: rgba(248, 113, 113, 0.25);
}

.table-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-container {
  overflow-x: auto;
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
}

.data-table th {
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary, #a0a0b0);
  font-weight: 600;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  white-space: nowrap;
}

.th-index {
  width: 50px;
}

.th-action {
  width: 100px;
}

.data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  vertical-align: middle;
}

.request-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.index-col {
  color: var(--text-muted, #6b6b7b);
  font-size: 12px;
  font-weight: 600;
  font-family: monospace;
}

/* REQ Column */
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
  letter-spacing: 0.03em;
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

.method-badge.options,
.method-badge.head {
  background: rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
}

.url-path {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-primary, #f0f0f5);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* RES Column */
.res-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.res-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.status-badge-res {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  width: fit-content;
  white-space: nowrap;
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

.status-badge-res.other {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
}

.time-latency {
  font-size: 11px;
  color: var(--text-secondary, #a0a0b0);
}

.time-stamp {
  font-size: 10px;
  color: var(--text-muted, #6b6b7b);
  font-family: monospace;
}

/* Schema Validations Column */
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
  flex-wrap: wrap;
}

.val-label {
  color: var(--text-muted, #6b6b7b);
  min-width: 70px;
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

.val-badge.warning {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.val-sub-info {
  font-size: 10px;
  color: var(--text-secondary, #a0a0b0);
}

.val-sev-pill {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  text-transform: uppercase;
}

.val-sev-pill.sev-info {
  background: rgba(96, 165, 250, 0.15);
  color: #60a5fa;
}

.val-sev-pill.sev-low {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.val-sev-pill.sev-medium {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.val-sev-pill.sev-high {
  background: rgba(251, 146, 60, 0.2);
  color: #fb923c;
}

.val-sev-pill.sev-critical {
  background: rgba(248, 113, 113, 0.25);
  color: #f87171;
}

.val-type-tag {
  font-family: monospace;
  font-size: 10px;
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  padding: 1px 4px;
  border-radius: 3px;
}

/* Vector (VEC) Column */
.vec-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  padding: 4px 8px;
  border-radius: 6px;
  max-width: 220px;
}

.vec-header {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.vec-badge-type {
  font-weight: 700;
  font-size: 11px;
  color: #f87171;
}

.vec-badge-outcome {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
}

.vec-badge-outcome.outcome-accepted {
  background: rgba(248, 113, 113, 0.25);
  color: #f87171;
}

.vec-badge-outcome.outcome-rejected {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.vec-badge-outcome.outcome-sanitized {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

.vec-badge-outcome.outcome-unknown {
  background: rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
}

.vec-badge-reflection {
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 4px;
  border-radius: 3px;
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
  color: var(--text-secondary, #a0a0b0);
  word-break: break-word;
}

.vec-cat {
  font-size: 10px;
  color: var(--text-muted, #6b6b7b);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-vec {
  font-size: 12px;
}

/* Action Column */
.action-col {
  text-align: right;
}

.btn-inspect {
  font-size: 12px;
  padding: 4px 10px;
  background: rgba(96, 165, 250, 0.15);
  color: var(--accent-secondary, #60a5fa);
  border: 1px solid rgba(96, 165, 250, 0.3);
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all var(--transition-fast, 0.2s ease);
}

.btn-inspect:hover {
  background: rgba(96, 165, 250, 0.25);
  border-color: var(--accent-secondary, #60a5fa);
}

/* Pagination Bar */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 4px;
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-info {
  font-size: 12px;
  color: var(--text-secondary, #a0a0b0);
}

.highlight-num {
  color: var(--text-primary, #f0f0f5);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-page-nav,
.btn-page-num {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  color: var(--text-secondary, #a0a0b0);
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  transition: all var(--transition-fast, 0.2s ease);
}

.btn-page-nav:hover:not(:disabled),
.btn-page-num:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary, #f0f0f5);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-page-num.active {
  background: var(--accent-primary, #4ade80);
  color: #000;
  font-weight: 700;
  border-color: var(--accent-primary, #4ade80);
  box-shadow: 0 0 10px var(--accent-primary-glow, rgba(74, 222, 128, 0.4));
}

.btn-page-nav:disabled,
.btn-page-num:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-ellipsis {
  padding: 0 4px;
  color: var(--text-muted, #6b6b7b);
  font-size: 12px;
}

.pagination-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary, #a0a0b0);
}

.size-select {
  background: var(--bg-tertiary, #1c1c28);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-primary, #f0f0f5);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  outline: none;
}

.size-select:focus {
  border-color: var(--accent-secondary, #60a5fa);
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

@media (max-width: 768px) {
  .card-header-flex {
    flex-direction: column;
    align-items: flex-start;
  }

  .pagination-bar {
    flex-direction: column;
    align-items: center;
  }
}
</style>
