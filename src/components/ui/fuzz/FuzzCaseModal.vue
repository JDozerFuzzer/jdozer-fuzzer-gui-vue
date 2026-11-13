<template>
  <div v-if="show" class="modal-backdrop" @click.self="handleClose">
    <div class="modal-card case-modal-card">

      <!-- ==================== HEADER ==================== -->
      <div class="modal-header">
        <div class="modal-title-group">
          <div class="header-main-title">
            <Layers class="icon-sm text-accent" />
            <h3>Detalle del Caso de Prueba</h3>
          </div>
          <div class="modal-sub-info">
            <span class="op-badge-modal" v-if="operationId">{{ operationId }}</span>
            <div class="case-id-group" v-if="caseId">
              <span class="case-id-modal">ID: {{ caseId }}</span>
              <button class="btn-copy-id" @click="handleCopyCaseId" :title="'Copiar Case ID (' + caseId + ')'">
                <Check v-if="copiedId" class="icon-xs text-accent" />
                <Copy v-else class="icon-xs" />
              </button>
            </div>
          </div>
        </div>

        <div class="header-right-actions">
          <button @click="reloadData" class="btn-icon-header" title="Recargar detalles del caso" :disabled="loadingAny">
            <RefreshCw :class="['icon-sm', { spinning: loadingAny }]" />
          </button>
          <button @click="handleClose" class="btn-close-modal" title="Cerrar modal (Esc)">
            <X class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- ==================== NAVIGATION TABS ==================== -->
      <div class="modal-tabs">
        <!-- Tab 1: Resumen Ejecutivo (testCaseSummary-api.yaml) -->
        <button
          :class="['tab-btn', { active: activeTab === 'summary' }]"
          @click="activeTab = 'summary'"
        >
          📊 Resumen Ejecutivo
        </button>

        <!-- Tab 2: Vector de Inyección (vector-api.yaml) -->
        <button
          :class="['tab-btn', { active: activeTab === 'vector' }]"
          @click="activeTab = 'vector'"
        >
          ⚡ Vector de Inyección
          <span v-if="hasVectorApplied" class="tab-pill-dot text-danger">●</span>
        </button>

        <!-- Tab 3: Mutaciones de Payload (mutationPayload-api.yaml) -->
        <button
          :class="['tab-btn', { active: activeTab === 'mutations' }]"
          @click="activeTab = 'mutations'"
        >
          🧬 Mutaciones de Payload
          <span v-if="mutationsCount > 0" class="tab-counter-badge">
            {{ mutationsCount }}
          </span>
        </button>

        <!-- Tab 4: Desviación Status Code (statuCodeDrift-api.yaml) -->
        <button
          :class="['tab-btn', { active: activeTab === 'drift' }]"
          @click="activeTab = 'drift'"
        >
          🎯 Desviación Status Code
          <span v-if="driftBadgeText" :class="['tab-mini-pill', driftBadgeClass]">
            {{ driftBadgeText }}
          </span>
        </button>

        <!-- Tab 5: Ejecución HTTP Req/Res (execution-api.yaml) -->
        <button
          :class="['tab-btn', { active: activeTab === 'execution' }]"
          @click="activeTab = 'execution'"
        >
          🌐 Ejecución HTTP
        </button>

        <!-- Tab 6: Contrato OpenAPI -->
        <button
          :class="['tab-btn', { active: activeTab === 'openapi' }]"
          @click="activeTab = 'openapi'"
        >
          📜 Contrato OpenAPI
        </button>

        <!-- Tab 7: JSON Raw -->
        <button
          :class="['tab-btn', { active: activeTab === 'raw' }]"
          @click="activeTab = 'raw'"
        >
          { } JSON Raw
        </button>
      </div>

      <!-- ==================== BODY CONTENT ==================== -->
      <div class="modal-body-wrapper">

        <!-- Initial Full Loading Indicator -->
        <div v-if="loadingInitial" class="modal-loading-state">
          <RefreshCw class="spinning icon-md text-accent" />
          <span>Obteniendo contratos y oráculos del caso de prueba...</span>
        </div>

        <template v-else>
          <!-- TAB 1: TestCaseSummary -->
          <div v-show="activeTab === 'summary'" class="tab-pane">
            <FuzzTestCaseSummary
              :summary="effectiveSummary"
              :loading="loadingSummary"
              @select-tab="handleSelectTab"
            />
          </div>

          <!-- TAB 2: Injection Vector -->
          <div v-show="activeTab === 'vector'" class="tab-pane">
            <FuzzVector
              :vector-data="effectiveVector"
              :loading="loadingVector"
            />
          </div>

          <!-- TAB 3: Mutation Payload -->
          <div v-show="activeTab === 'mutations'" class="tab-pane">
            <FuzzMutationPayload
              :mutation-data="effectiveMutation"
              :loading="loadingMutation"
            />
          </div>

          <!-- TAB 4: Status Code Drift -->
          <div v-show="activeTab === 'drift'" class="tab-pane">
            <FuzzStatusCodeDrift
              :drift-data="effectiveDrift"
              :loading="loadingDrift"
            />
          </div>

          <!-- TAB 5: Raw Execution (HTTP Req/Res) -->
          <div v-show="activeTab === 'execution'" class="tab-pane">
            <FuzzExecution
              :execution-data="effectiveExecution"
              :loading="loadingExecution"
            />
          </div>

          <!-- TAB 6: OpenAPI Contract Specification -->
          <div v-show="activeTab === 'openapi'" class="tab-pane">
            <div v-if="effectiveSpec" class="openapi-spec-view">
              <div class="spec-header-box">
                <span :class="['spec-method-badge', (effectiveSpec.method || 'GET').toLowerCase()]">
                  {{ (effectiveSpec.method || 'GET').toUpperCase() }}
                </span>
                <span class="spec-path-title">{{ effectiveSpec.path || '/' }}</span>
                <span class="spec-op-id" v-if="effectiveSpec.name || effectiveSpec.operationId">
                  ({{ effectiveSpec.name || effectiveSpec.operationId }})
                </span>
              </div>

              <div class="spec-schema-section" v-if="effectiveSpec.req?.payload || effectiveSpec.requestBody">
                <div class="spec-subtitle">Esquema del Payload de Petición (Request Schema):</div>
                <pre class="json-code"><code>{{ JSON.stringify(effectiveSpec.req?.payload || effectiveSpec.requestBody, null, 2) }}</code></pre>
              </div>

              <div class="spec-schema-section" v-if="effectiveSpec.res || effectiveSpec.responses">
                <div class="spec-subtitle">Respuestas Definidas en Contrato (Response Schemas):</div>
                <pre class="json-code"><code>{{ JSON.stringify(effectiveSpec.res || effectiveSpec.responses, null, 2) }}</code></pre>
              </div>
            </div>

            <div v-else class="empty-contract-state">
              <AlertCircle class="icon-md text-muted" />
              <span>No se encontró especificación OpenAPI disponible para la operación <strong>{{ operationId }}</strong>.</span>
            </div>
          </div>

          <!-- TAB 7: JSON Raw -->
          <div v-show="activeTab === 'raw'" class="tab-pane">
            <div class="raw-actions-bar">
              <span class="raw-subtitle">Datos agregados recopilados para este caso de prueba:</span>
              <button class="btn-copy-raw" @click="handleCopyRaw">
                <Copy class="icon-xs" />
                <span>{{ copiedRaw ? '¡Copiado!' : 'Copiar JSON Completo' }}</span>
              </button>
            </div>
            <pre class="json-code raw-json-viewer"><code>{{ JSON.stringify(rawAggregateData, null, 2) }}</code></pre>
          </div>
        </template>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  Layers,
  X,
  Copy,
  Check,
  RefreshCw,
  AlertCircle
} from 'lucide-vue-next'
import { useFuzzerStore } from '../../../store/fuzzerStore'
import { copyToClipboard } from './fuzzUtils'

// Subcomponents for each OpenAPI contract
import FuzzTestCaseSummary from './FuzzTestCaseSummary.vue'
import FuzzStatusCodeDrift from './FuzzStatusCodeDrift.vue'
import FuzzMutationPayload from './FuzzMutationPayload.vue'
import FuzzExecution from './FuzzExecution.vue'
import FuzzVector from './FuzzVector.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  fuzzerId: {
    type: String,
    default: null
  },
  operationId: {
    type: String,
    default: null
  },
  caseId: {
    type: String,
    default: null
  },
  caseItem: {
    type: Object,
    default: null
  },
  operationSpec: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'update:show'])

const fuzzerStore = useFuzzerStore()

const activeTab = ref('summary')
const copiedId = ref(false)
const copiedRaw = ref(false)

// State for fetched drill-downs
const loadingInitial = ref(false)
const loadingSummary = ref(false)
const loadingVector = ref(false)
const loadingMutation = ref(false)
const loadingDrift = ref(false)
const loadingExecution = ref(false)

const fetchedSummary = ref(null)
const fetchedVector = ref(null)
const fetchedMutation = ref(null)
const fetchedDrift = ref(null)
const fetchedExecution = ref(null)
const fetchedSpec = ref(null)

const loadingAny = computed(() => {
  return (
    loadingInitial.value ||
    loadingSummary.value ||
    loadingVector.value ||
    loadingMutation.value ||
    loadingDrift.value ||
    loadingExecution.value
  )
})

// Effective data with fallbacks to props.caseItem
const effectiveSummary = computed(() => {
  if (fetchedSummary.value && Object.keys(fetchedSummary.value).length > 0) {
    return fetchedSummary.value
  }
  return props.caseItem || null
})

const effectiveVector = computed(() => {
  if (fetchedVector.value && Object.keys(fetchedVector.value).length > 0) {
    return fetchedVector.value
  }
  if (props.caseItem?.injectionVector) {
    return {
      vectorApplied: props.caseItem.injectionVector,
      finding: {
        reflection: props.caseItem.injectionVector.reflection,
        outcome: props.caseItem.injectionVector.outcome,
        verdict: props.caseItem.injectionVector.outcome === 'ACCEPTED' && props.caseItem.injectionVector.reflection !== 'NONE'
          ? 'POTENTIAL_INJECTION'
          : (props.caseItem.injectionVector.outcome === 'ACCEPTED' ? 'NO_REFLECTION' : 'BLOCKED'),
        confidence: 0.1,
        severity: props.caseItem.injectionVector.severity,
        insertion: true
      },
      statusCode: props.caseItem.result?.statusCode || props.caseItem.statusCode
    }
  }
  if (props.caseItem?.VEC) {
    return {
      vectorApplied: props.caseItem.VEC.vectorApplied || props.caseItem.VEC,
      VEC: props.caseItem.VEC,
      statusCode: props.caseItem.RES?.statusCode
    }
  }
  return null
})

const effectiveMutation = computed(() => {
  if (fetchedMutation.value && Object.keys(fetchedMutation.value).length > 0) {
    return fetchedMutation.value
  }
  if (props.caseItem?.mutationsPayload) {
    return {
      id: props.caseId,
      isValid: props.caseItem.mutationsPayload.isValid,
      mutations: props.caseItem.mutationsPayload.mutations || [],
      mutatedPaths: props.caseItem.mutationsPayload.mutatedPaths || [],
      mutationsMetrics: props.caseItem.mutationsPayload.mutationsMetrics || {
        count: props.caseItem.mutationsPayload.mutationsCant,
        total: props.caseItem.mutationsPayload.totalPoints,
        maxLevel: props.caseItem.mutationsPayload.severity
      }
    }
  }
  if (props.caseItem?.schemaRequestPayload) {
    return {
      id: props.caseId,
      isValid: props.caseItem.schemaRequestPayload.isValid,
      mutations: props.caseItem.schemaRequestPayload.mutations || [],
      mutatedPaths: props.caseItem.schemaRequestPayload.mutatedPaths || []
    }
  }
  return null
})

const effectiveDrift = computed(() => {
  if (fetchedDrift.value && Object.keys(fetchedDrift.value).length > 0) {
    return fetchedDrift.value
  }
  if (props.caseItem?.statusCodeDrift) {
    return {
      statusCode: props.caseItem.statusCodeDrift.statusCode || props.caseItem.result?.statusCode,
      finding: props.caseItem.statusCodeDrift
    }
  }
  if (props.caseItem?.schemaResponseStatusCode) {
    return {
      statusCode: props.caseItem.RES?.statusCode,
      finding: props.caseItem.schemaResponseStatusCode
    }
  }
  return null
})

const effectiveExecution = computed(() => {
  if (fetchedExecution.value && Object.keys(fetchedExecution.value).length > 0) {
    return fetchedExecution.value
  }
  // Try mapping from caseItem (Fase 2 raw interaction if present)
  if (props.caseItem?.REQ || props.caseItem?.RES) {
    return {
      ...props.caseItem.REQ,
      response: props.caseItem.RES
    }
  }
  // Or if caseItem has attackSurface and result
  if (props.caseItem?.attackSurface) {
    return {
      url: props.caseItem.attackSurface.url,
      method: props.caseItem.attackSurface.method,
      defaultName: props.caseItem.attackSurface.path,
      response: {
        statusCode: props.caseItem.result?.statusCode,
        statusMessage: props.caseItem.result?.statusMessage,
        timings: {
          phases: {
            total: props.caseItem.result?.totalTime ?? 0
          }
        },
        time: props.caseItem.result?.time
      }
    }
  }
  return null
})

const effectiveSpec = computed(() => {
  return fetchedSpec.value || props.operationSpec || null
})

// Tab Badges & Indicators
const hasVectorApplied = computed(() => {
  return !!(effectiveVector.value?.vectorApplied || effectiveVector.value?.VEC)
})

const mutationsCount = computed(() => {
  const m = effectiveMutation.value
  if (!m) return 0
  if (m.mutations && Array.isArray(m.mutations)) return m.mutations.length
  if (m.mutationsMetrics?.count !== undefined) return m.mutationsMetrics.count
  return 0
})

const driftBadgeText = computed(() => {
  const d = effectiveDrift.value?.finding?.matchType || effectiveDrift.value?.matchType
  if (!d) return null
  if (d === 'none') return 'Hard Drift'
  if (d === 'default') return 'Soft Drift'
  return null
})

const driftBadgeClass = computed(() => {
  const d = effectiveDrift.value?.finding?.matchType || effectiveDrift.value?.matchType
  if (d === 'none') return 'badge-danger'
  if (d === 'default') return 'badge-warning'
  return 'badge-info'
})

// Raw Aggregate Object
const rawAggregateData = computed(() => ({
  caseId: props.caseId,
  fuzzerId: props.fuzzerId,
  operationId: props.operationId,
  testCaseSummary: effectiveSummary.value,
  vectorOracle: effectiveVector.value,
  mutationPayloadOracle: effectiveMutation.value,
  statusCodeDriftOracle: effectiveDrift.value,
  executionEvidence: effectiveExecution.value,
  operationSpec: effectiveSpec.value
}))

// Fetching all 5 contract endpoints
const loadAllContracts = async () => {
  if (!props.fuzzerId || !props.operationId || !props.caseId) return

  loadingInitial.value = true

  try {
    const fId = props.fuzzerId
    const opId = props.operationId
    const cId = props.caseId

    // 1. Fetch Summary
    loadingSummary.value = true
    fuzzerStore.fetchTestCaseSummary(fId, opId, cId)
      .then(res => { fetchedSummary.value = res })
      .catch(() => {})
      .finally(() => { loadingSummary.value = false })

    // 2. Fetch Vector
    loadingVector.value = true
    fuzzerStore.fetchVector(fId, opId, cId)
      .then(res => { fetchedVector.value = res })
      .catch(() => {})
      .finally(() => { loadingVector.value = false })

    // 3. Fetch Mutation Payload
    loadingMutation.value = true
    fuzzerStore.fetchMutationPayload(fId, opId, cId)
      .then(res => { fetchedMutation.value = res })
      .catch(() => {})
      .finally(() => { loadingMutation.value = false })

    // 4. Fetch Status Code Drift
    loadingDrift.value = true
    fuzzerStore.fetchStatusCodeDrift(fId, opId, cId)
      .then(res => { fetchedDrift.value = res })
      .catch(() => {})
      .finally(() => { loadingDrift.value = false })

    // 5. Fetch Execution
    loadingExecution.value = true
    fuzzerStore.fetchTestCaseExecution(fId, opId, cId)
      .then(res => { fetchedExecution.value = res })
      .catch(() => {})
      .finally(() => { loadingExecution.value = false })

    // 6. Fetch Operation Spec if not passed
    if (!props.operationSpec) {
      fuzzerStore.fetchOperationSpec(fId, opId)
        .then(res => { fetchedSpec.value = res })
        .catch(() => {})
    }
  } catch (err) {
    console.error('Error fetching modal contract details:', err)
  } finally {
    loadingInitial.value = false
  }
}

const reloadData = () => {
  loadAllContracts()
}

const handleClose = () => {
  emit('update:show', false)
  emit('close')
}

const handleSelectTab = (tabName) => {
  activeTab.value = tabName
}

const handleCopyCaseId = async () => {
  if (!props.caseId) return
  const ok = await copyToClipboard(props.caseId)
  if (ok) {
    copiedId.value = true
    setTimeout(() => { copiedId.value = false }, 2000)
  }
}

const handleCopyRaw = async () => {
  const jsonStr = JSON.stringify(rawAggregateData.value, null, 2)
  const ok = await copyToClipboard(jsonStr)
  if (ok) {
    copiedRaw.value = true
    setTimeout(() => { copiedRaw.value = false }, 2000)
  }
}

const onKeyDown = (e) => {
  if (e.key === 'Escape' && props.show) {
    handleClose()
  }
}

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      activeTab.value = 'summary'
      loadAllContracts()
    } else {
      fetchedSummary.value = null
      fetchedVector.value = null
      fetchedMutation.value = null
      fetchedDrift.value = null
      fetchedExecution.value = null
      fetchedSpec.value = null
    }
  }
)

watch(
  () => props.caseId,
  (newId) => {
    if (newId && props.show) {
      loadAllContracts()
    }
  }
)

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  if (props.show && props.caseId) {
    loadAllContracts()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(10, 10, 15, 0.82);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 24px;
}

.case-modal-card {
  width: 100%;
  max-width: 960px;
  max-height: 88vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

/* Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
}

.modal-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-main-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-main-title h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.modal-sub-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.op-badge-modal {
  background: rgba(96, 165, 250, 0.2);
  color: var(--accent-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
}

.case-id-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.case-id-modal {
  color: var(--text-muted);
  font-family: monospace;
  font-size: 11px;
}

.btn-copy-id {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  transition: color var(--transition-fast);
}

.btn-copy-id:hover {
  color: var(--text-primary);
}

.header-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon-header {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  padding: 6px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-icon-header:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.btn-icon-header:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-close-modal {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-close-modal:hover {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

/* Modal Tabs */
.modal-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.25);
  padding: 0 16px;
  overflow-x: auto;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 12px 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
  background: rgba(255, 255, 255, 0.03);
  font-weight: 600;
}

.tab-pill-dot {
  font-size: 8px;
}

.tab-counter-badge {
  background: rgba(251, 191, 36, 0.25);
  color: #fbbf24;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
}

.tab-mini-pill {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
}

.badge-danger { background: rgba(248, 113, 113, 0.25); color: #f87171; }
.badge-warning { background: rgba(251, 191, 36, 0.25); color: #fbbf24; }
.badge-info { background: rgba(96, 165, 250, 0.25); color: #60a5fa; }

/* Body Content */
.modal-body-wrapper {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  max-height: calc(88vh - 120px);
}

.modal-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 16px;
  gap: 12px;
  color: var(--text-secondary);
}

.tab-pane {
  display: flex;
  flex-direction: column;
}

/* OpenAPI Spec View */
.openapi-spec-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.spec-header-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.3);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.spec-method-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  font-family: monospace;
}

.spec-method-badge.post { background: rgba(96, 165, 250, 0.25); color: #60a5fa; }
.spec-method-badge.get { background: rgba(74, 222, 128, 0.25); color: #4ade80; }
.spec-method-badge.put { background: rgba(251, 191, 36, 0.25); color: #fbbf24; }
.spec-method-badge.delete { background: rgba(248, 113, 113, 0.25); color: #f87171; }
.spec-method-badge.patch { background: rgba(192, 132, 252, 0.25); color: #c084fc; }

.spec-path-title {
  font-family: monospace;
  color: var(--text-primary);
  font-weight: 600;
}

.spec-op-id {
  color: var(--text-muted);
  font-size: 12px;
}

.spec-schema-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.spec-subtitle {
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
}

.empty-contract-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  gap: 12px;
  color: var(--text-secondary);
}

/* Raw JSON View */
.raw-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.raw-subtitle {
  font-size: 11px;
  color: var(--text-muted);
}

.btn-copy-raw {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--accent-secondary);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-copy-raw:hover {
  background: rgba(96, 165, 250, 0.15);
  border-color: var(--accent-secondary);
}

.json-code {
  background: #09090f;
  padding: 14px 16px;
  border-radius: var(--radius-sm);
  color: #a6accd;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.raw-json-viewer {
  max-height: 500px;
  overflow-y: auto;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

