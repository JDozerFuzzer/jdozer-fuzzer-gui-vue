<template>
  <div v-if="show" class="modal-backdrop" @click.self="closeModal">
    <div class="modal-card swagger-modal-card">
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="modal-title-group">
          <div class="title-with-badge">
            <h3>Contrato API Remota</h3>
            <span class="badge-swagger">Swagger UI</span>
          </div>
          <div class="modal-sub-info">
            <span class="fuzzer-name-modal">{{ fuzzerName || 'Fuzzer' }}</span>
            <span class="fuzzer-id-modal">ID: {{ fuzzerId }}</span>
          </div>
        </div>
        <div class="header-actions">
          <!-- View Toggle -->
          <div v-if="contractData && !loading && !error" class="view-toggle">
            <button 
              :class="['toggle-btn', { active: viewMode === 'swagger' }]" 
              @click="viewMode = 'swagger'"
              title="Vista interactiva Swagger UI"
            >
              Swagger UI
            </button>
            <button 
              :class="['toggle-btn', { active: viewMode === 'json' }]" 
              @click="viewMode = 'json'"
              title="Vista JSON crudo"
            >
              JSON Raw
            </button>
          </div>
          
          <button @click="closeModal" class="btn-close-modal" title="Cerrar modal">
            <X class="icon-sm" />
          </button>
        </div>
      </div>

      <!-- Modal Body -->
      <div class="modal-body swagger-modal-body">
        <!-- Loading State -->
        <div v-if="loading" class="loading-state modal-loading">
          <RefreshCw class="spinning icon-md text-accent" />
          <span>Cargando contrato OpenAPI de la API remota...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="error-state modal-error">
          <AlertCircle class="icon-md text-danger" />
          <span>{{ error }}</span>
          <button @click="loadContract" class="btn-action btn-retry">
            Reintentar
          </button>
        </div>

        <!-- Swagger UI Render View -->
        <div 
          v-show="!loading && !error && viewMode === 'swagger'" 
          class="swagger-ui-wrapper"
        >
          <div id="swagger-ui-container" ref="swaggerContainer"></div>
        </div>

        <!-- Raw JSON Spec View -->
        <div 
          v-if="!loading && !error && viewMode === 'json'" 
          class="raw-json-wrapper"
        >
          <pre class="json-code"><code>{{ JSON.stringify(contractData, null, 2) }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { X, RefreshCw, AlertCircle } from 'lucide-vue-next'
import { useFuzzerStore } from '../../store/fuzzerStore'
import { SwaggerUIBundle } from 'swagger-ui-dist'
import 'swagger-ui-dist/swagger-ui.css'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  fuzzerId: {
    type: String,
    default: ''
  },
  fuzzerName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const fuzzerStore = useFuzzerStore()
const loading = ref(false)
const error = ref(null)
const contractData = ref(null)
const viewMode = ref('swagger') // 'swagger' | 'json'
const swaggerContainer = ref(null)

const closeModal = () => {
  emit('close')
}

const loadContract = async () => {
  if (!props.fuzzerId) return

  loading.value = true
  error.value = null
  contractData.value = null

  try {
    const data = await fuzzerStore.fetchFuzzerContract(props.fuzzerId)
    contractData.value = data
    
    await nextTick()
    renderSwaggerUI()
  } catch (err) {
    error.value = err.message || 'No se pudo cargar el contrato de la API remota'
  } finally {
    loading.value = false
  }
}

const renderSwaggerUI = () => {
  if (!contractData.value) return

  try {
    // Clear container content before initializing Swagger UI
    const container = document.getElementById('swagger-ui-container')
    if (container) {
      container.innerHTML = ''
    }

    SwaggerUIBundle({
      spec: contractData.value,
      dom_id: '#swagger-ui-container',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset
      ],
      layout: 'BaseLayout'
    })
  } catch (err) {
    console.error('Error rendering Swagger UI:', err)
  }
}

watch(
  () => [props.show, props.fuzzerId],
  ([newShow, newFuzzerId]) => {
    if (newShow && newFuzzerId) {
      loadContract()
    }
  },
  { immediate: true }
)

watch(viewMode, (newMode) => {
  if (newMode === 'swagger') {
    nextTick(() => {
      renderSwaggerUI()
    })
  }
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.swagger-modal-card {
  background: #181824;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 100%;
  max-width: 1100px;
  height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.2);
}

.modal-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-with-badge h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.badge-swagger {
  background: rgba(133, 234, 41, 0.15);
  color: #85ea29;
  border: 1px solid rgba(133, 234, 41, 0.3);
  font-size: 11px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 12px;
  text-transform: uppercase;
}

.modal-sub-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.fuzzer-name-modal {
  color: var(--accent-primary);
  font-weight: 600;
}

.fuzzer-id-modal {
  color: var(--text-muted);
  font-family: monospace;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.view-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 2px;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.toggle-btn.active {
  background: var(--accent-secondary);
  color: #000;
  font-weight: 600;
}

.btn-close-modal {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-close-modal:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.1);
}

.swagger-modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  background: #12121c;
}

.modal-loading, .modal-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}

.text-danger {
  color: var(--accent-danger);
}

.btn-retry {
  margin-top: 8px;
}

.swagger-ui-wrapper {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.raw-json-wrapper {
  flex: 1;
  overflow-y: auto;
}

.json-code {
  background: #09090f;
  padding: 16px;
  border-radius: 8px;
  color: #a6accd;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Custom dark styling overrides for Swagger UI */
:deep(.swagger-ui) {
  font-family: inherit;
  color: #e2e8f0;
}

:deep(.swagger-ui .info .title),
:deep(.swagger-ui .info li),
:deep(.swagger-ui .info p),
:deep(.swagger-ui .info table),
:deep(.swagger-ui .scheme-container),
:deep(.swagger-ui .opblock-tag),
:deep(.swagger-ui .opblock .opblock-summary-title),
:deep(.swagger-ui .opblock .opblock-summary-path),
:deep(.swagger-ui .opblock .opblock-summary-description),
:deep(.swagger-ui table thead tr td),
:deep(.swagger-ui table thead tr th),
:deep(.swagger-ui .response-col_status),
:deep(.swagger-ui .response-col_description),
:deep(.swagger-ui .parameter__name),
:deep(.swagger-ui .parameter__type),
:deep(.swagger-ui label),
:deep(.swagger-ui .tab li),
:deep(.swagger-ui .opblock-description-wrapper p),
:deep(.swagger-ui .response-col_links) {
  color: #e2e8f0 !important;
}

:deep(.swagger-ui .scheme-container),
:deep(.swagger-ui .opblock .opblock-section-header) {
  background: rgba(0, 0, 0, 0.4) !important;
  box-shadow: none !important;
  border-radius: 6px;
}

:deep(.swagger-ui select) {
  background: #1c1c28 !important;
  color: #f0f0f5 !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
}

:deep(.swagger-ui .opblock) {
  border-radius: 8px !important;
  background: rgba(255, 255, 255, 0.02) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  box-shadow: none !important;
}

:deep(.swagger-ui .opblock .opblock-summary) {
  border-bottom-color: rgba(255, 255, 255, 0.1) !important;
}

:deep(.swagger-ui .opblock-body pre.microlight) {
  background: #09090f !important;
  color: #a6accd !important;
  border-radius: 6px;
}

:deep(.swagger-ui input[type=text]) {
  background: #1c1c28 !important;
  color: #f0f0f5 !important;
  border-color: rgba(255, 255, 255, 0.2) !important;
}

:deep(.swagger-ui .model-box) {
  background: rgba(0, 0, 0, 0.3) !important;
}

:deep(.swagger-ui section.models) {
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px !important;
}

:deep(.swagger-ui section.models h4) {
  color: #e2e8f0 !important;
}

:deep(.swagger-ui .model-title) {
  color: #60a5fa !important;
}

:deep(.swagger-ui .prop-type) {
  color: #4ade80 !important;
}
</style>
