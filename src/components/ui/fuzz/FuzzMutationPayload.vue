<template>
  <div class="fuzz-mutation-payload">
    <!-- Loading State -->
    <div v-if="loading" class="fuzz-loading">
      <RefreshCw class="spinning icon-md text-accent" />
      <span>Analizando oráculo de Mutaciones de Payload (Mutation Payload)...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="!mutationData" class="fuzz-empty">
      <AlertCircle class="icon-md text-muted" />
      <span>No se encontraron registros de mutaciones para este caso.</span>
    </div>

    <!-- Content -->
    <div v-else class="mutation-content">
      <!-- Status Hero -->
      <div class="mutation-hero-card" :class="mutationData.isValid ? 'hero-valid' : 'hero-invalid'">
        <div class="hero-header">
          <div class="hero-status-title">
            <CheckCircle2 v-if="mutationData.isValid" class="icon-md text-accent" />
            <AlertTriangle v-else class="icon-md text-danger" />
            <div>
              <span class="hero-title">
                {{ mutationData.isValid ? 'Payload de Petición Conforme' : 'Mutaciones Detectadas en Petición' }}
              </span>
              <span class="hero-sub">
                {{ mutationData.isValid
                  ? 'El request payload cumplió estrictamente con todas las restricciones del contrato OpenAPI.'
                  : 'El oráculo detectó violaciones y modificaciones deliberadas respecto al JSON Schema original.' }}
              </span>
            </div>
          </div>

          <div class="hero-badges">
            <span :class="['validation-pill', mutationData.isValid ? 'valid' : 'invalid']">
              {{ mutationData.isValid ? '✓ Conforme' : '✗ ' + (mutationsList.length) + ' Mutaciones' }}
            </span>
            <span v-if="maxSeverity" :class="['severity-pill', parseSeverity(maxSeverity).cssClass]">
              Máx: {{ parseSeverity(maxSeverity).label }}
            </span>
          </div>
        </div>

        <!-- Metric Summary Chips -->
        <div class="metrics-row" v-if="metrics">
          <div class="metric-chip">
            <span class="chip-val">{{ metrics.count ?? mutationsList.length }}</span>
            <span class="chip-lbl">Total Violaciones</span>
          </div>
          <div class="metric-chip">
            <span class="chip-val">{{ (metrics.average ?? 0).toFixed(1) }}</span>
            <span class="chip-lbl">Severidad Promedio</span>
          </div>
          <div class="metric-chip">
            <span class="chip-val">{{ uniqueMutatedPaths.length }}</span>
            <span class="chip-lbl">Rutas Afectadas</span>
          </div>
          <div class="metric-chip" v-if="metrics.total !== undefined">
            <span class="chip-val font-accent">{{ metrics.total }}</span>
            <span class="chip-lbl">Puntos Ponderados</span>
          </div>
        </div>
      </div>

      <!-- Mutated Paths Quick Filter -->
      <div v-if="uniqueMutatedPaths.length > 0" class="filter-paths-section">
        <span class="filter-label">Filtrar por Ruta Mutada (JSON Pointer):</span>
        <div class="paths-pills">
          <button
            :class="['path-filter-btn', { active: selectedPathFilter === null }]"
            @click="selectedPathFilter = null"
          >
            Todas ({{ mutationsList.length }})
          </button>
          <button
            v-for="p in uniqueMutatedPaths"
            :key="p"
            :class="['path-filter-btn font-mono', { active: selectedPathFilter === p }]"
            @click="togglePathFilter(p)"
          >
            {{ p === '' ? '/ (raíz)' : p }}
          </button>
        </div>
      </div>

      <!-- Controls & Search Bar -->
      <div class="controls-bar" v-if="mutationsList.length > 0">
        <div class="search-box">
          <Search class="icon-xs text-muted" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por propiedad, keyword, mensaje o tipo..."
            class="search-input"
          />
        </div>

        <div class="filter-type-group">
          <select v-model="selectedTypeFilter" class="select-type">
            <option value="">Todos los Tipos de Hallazgo</option>
            <option v-for="(def, key) in mutationFindingTypeDefinitions" :key="key" :value="key">
              {{ def.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Mutations List -->
      <div v-if="filteredMutations.length > 0" class="mutations-list">
        <div
          v-for="(mut, idx) in filteredMutations"
          :key="mut.instancePath + '-' + mut.keyword + '-' + idx"
          class="mutation-card"
        >
          <!-- Card Header -->
          <div class="mutation-card-header">
            <div class="mut-header-main">
              <span class="mut-index">#{{ idx + 1 }}</span>
              <span class="mut-finding-badge">
                {{ formatMutationFindingType(mut.findingType) }}
              </span>
              <span v-if="mut.mutationType" class="mut-op-badge">
                {{ formatMutationType(mut.mutationType) }}
              </span>
              <span class="mut-keyword-tag font-mono">
                {{ mut.keyword }}
              </span>
            </div>

            <span v-if="mut.severity" :class="['severity-pill', parseSeverity(mut.severity).cssClass]">
              {{ parseSeverity(mut.severity).label }}
            </span>
          </div>

          <!-- Card Body -->
          <div class="mutation-card-body">
            <!-- Locations & Paths -->
            <div class="location-grid">
              <div class="loc-item">
                <span class="loc-lbl">Ubicación en Payload (instancePath):</span>
                <code class="loc-code">{{ mut.instancePath === '' ? '/ (raíz)' : mut.instancePath }}</code>
              </div>
              <div class="loc-item">
                <span class="loc-lbl">Regla en Esquema (schemaPath):</span>
                <code class="loc-code text-muted">{{ mut.schemaPath }}</code>
              </div>
            </div>

            <!-- Parameters detail if present -->
            <div v-if="mut.params && Object.keys(mut.params).length > 0" class="params-box">
              <span class="params-title">Parámetros de Violación:</span>
              <div class="params-tags">
                <span v-for="(v, k) in mut.params" :key="k" class="param-tag">
                  <strong>{{ k }}:</strong> {{ v }}
                </span>
              </div>
            </div>

            <!-- Description & Message -->
            <div class="msg-box">
              <p class="mut-desc" v-if="mut.description">{{ mut.description }}</p>
              <p class="mut-msg" v-if="mut.message">
                <span class="msg-prefix">Mensaje Ajv:</span> {{ mut.message }}
              </p>
            </div>

            <!-- Tags -->
            <div class="mut-tags" v-if="mut.tags && mut.tags.length > 0">
              <span v-for="tag in mut.tags" :key="tag" class="tag-pill">
                #{{ tag }}
              </span>
            </div>

            <!-- Expandable Schema Context Details -->
            <div v-if="mut.data !== undefined || mut.schema !== undefined || mut.parentSchema !== undefined" class="context-details">
              <button class="btn-toggle-context" @click="toggleContextExpand(idx)">
                <Code2 class="icon-xs" />
                <span>{{ isContextExpanded(idx) ? 'Ocultar Contexto Ajv' : 'Ver Contexto Completo Ajv' }}</span>
                <ChevronDown :class="['icon-xs', { rotate: isContextExpanded(idx) }]" />
              </button>

              <div v-if="isContextExpanded(idx)" class="expanded-context-box">
                <div v-if="mut.data !== undefined" class="code-block-item">
                  <span class="code-header">Valor detectado en dato (data):</span>
                  <pre class="json-code"><code>{{ JSON.stringify(mut.data, null, 2) }}</code></pre>
                </div>
                <div v-if="mut.schema !== undefined" class="code-block-item">
                  <span class="code-header">Fragmento del esquema violado (schema):</span>
                  <pre class="json-code"><code>{{ JSON.stringify(mut.schema, null, 2) }}</code></pre>
                </div>
                <div v-if="mut.parentSchema !== undefined" class="code-block-item">
                  <span class="code-header">Esquema padre (parentSchema):</span>
                  <pre class="json-code"><code>{{ JSON.stringify(mut.parentSchema, null, 2) }}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No mutations matching filter -->
      <div v-else-if="mutationsList.length > 0" class="no-filter-match">
        <span>No se encontraron mutaciones que coincidan con los filtros aplicados.</span>
        <button class="btn-reset-filter" @click="resetFilters">Restablecer Filtros</button>
      </div>

      <!-- Fallback when isValid with 0 mutations -->
      <div v-else class="clean-conformance-card">
        <CheckCircle2 class="icon-lg text-accent" />
        <span class="clean-title">El payload de petición es 100% conforme con el contrato</span>
        <span class="clean-sub">No se registraron mutaciones de propiedades ni violaciones de esquema.</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  CheckCircle2,
  AlertTriangle,
  Search,
  Code2,
  ChevronDown,
  RefreshCw,
  AlertCircle
} from 'lucide-vue-next'
import {
  parseSeverity,
  formatMutationFindingType,
  formatMutationType,
  mutationFindingTypeDefinitions
} from './fuzzUtils'

const props = defineProps({
  mutationData: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const searchQuery = ref('')
const selectedTypeFilter = ref('')
const selectedPathFilter = ref(null)
const expandedContextIndices = ref(new Set())

const mutationsList = computed(() => {
  return props.mutationData?.mutations || []
})

const metrics = computed(() => {
  return props.mutationData?.mutationsMetrics || null
})

const maxSeverity = computed(() => {
  if (metrics.value?.maxLevel) return metrics.value.maxLevel
  if (mutationsList.value.length === 0) return null
  // find max from array
  let max = { name: 'info', value: 0 }
  for (const m of mutationsList.value) {
    const parsed = parseSeverity(m.severity)
    if (parsed.value > max.value) {
      max = parsed
    }
  }
  return max
})

const uniqueMutatedPaths = computed(() => {
  if (props.mutationData?.mutatedPaths && Array.isArray(props.mutationData.mutatedPaths)) {
    return props.mutationData.mutatedPaths
  }
  const set = new Set()
  for (const m of mutationsList.value) {
    if (m.instancePath !== undefined) {
      set.add(m.instancePath)
    }
  }
  return Array.from(set)
})

const filteredMutations = computed(() => {
  let list = mutationsList.value

  if (selectedPathFilter.value !== null) {
    list = list.filter(m => m.instancePath === selectedPathFilter.value)
  }

  if (selectedTypeFilter.value) {
    list = list.filter(m => m.findingType === selectedTypeFilter.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(m => {
      return (
        m.instancePath?.toLowerCase().includes(q) ||
        m.keyword?.toLowerCase().includes(q) ||
        m.findingType?.toLowerCase().includes(q) ||
        m.message?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        JSON.stringify(m.params || {}).toLowerCase().includes(q)
      )
    })
  }

  return list
})

const togglePathFilter = (path) => {
  if (selectedPathFilter.value === path) {
    selectedPathFilter.value = null
  } else {
    selectedPathFilter.value = path
  }
}

const toggleContextExpand = (idx) => {
  const set = new Set(expandedContextIndices.value)
  if (set.has(idx)) {
    set.delete(idx)
  } else {
    set.add(idx)
  }
  expandedContextIndices.value = set
}

const isContextExpanded = (idx) => {
  return expandedContextIndices.value.has(idx)
}

const resetFilters = () => {
  searchQuery.value = ''
  selectedTypeFilter.value = ''
  selectedPathFilter.value = null
}
</script>

<style scoped>
.fuzz-mutation-payload {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fuzz-loading,
.fuzz-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 14px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.mutation-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Status Hero */
.mutation-hero-card {
  border-radius: var(--radius-md);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid var(--border-color);
  background: rgba(0, 0, 0, 0.25);
}

.mutation-hero-card.hero-invalid {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(0, 0, 0, 0.35));
  border-color: rgba(251, 191, 36, 0.3);
}

.mutation-hero-card.hero-valid {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.08), rgba(0, 0, 0, 0.35));
  border-color: rgba(74, 222, 128, 0.3);
}

.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-status-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  display: block;
}

.hero-sub {
  font-size: 12px;
  color: var(--text-muted);
  display: block;
}

.hero-badges {
  display: flex;
  align-items: center;
  gap: 10px;
}

.validation-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
}

.validation-pill.valid {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.35);
}

.validation-pill.invalid {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.35);
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

@media (max-width: 640px) {
  .metrics-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

.metric-chip {
  background: rgba(0, 0, 0, 0.3);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.chip-val {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.chip-lbl {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.font-accent {
  color: var(--accent-primary);
}

/* Mutated Paths */
.filter-paths-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
}

.paths-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.path-filter-btn {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.path-filter-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.path-filter-btn.active {
  background: rgba(96, 165, 250, 0.2);
  border-color: var(--accent-secondary);
  color: var(--accent-secondary);
  font-weight: 600;
}

/* Controls Bar */
.controls-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 220px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-box svg {
  position: absolute;
  left: 12px;
}

.search-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 12px 8px 34px;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: border-color var(--transition-fast);
}

.search-input:focus {
  border-color: var(--accent-secondary);
}

.select-type {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

/* Mutations List */
.mutations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mutation-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.mutation-card-header {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.mut-header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.mut-index {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

.mut-finding-badge {
  font-size: 12px;
  font-weight: 700;
  color: #fbbf24;
}

.mut-op-badge {
  font-size: 10px;
  font-weight: 600;
  background: rgba(192, 132, 252, 0.18);
  color: #c084fc;
  padding: 2px 6px;
  border-radius: 4px;
}

.mut-keyword-tag {
  font-size: 11px;
  background: rgba(0, 0, 0, 0.4);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

.mutation-card-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.location-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 640px) {
  .location-grid {
    grid-template-columns: 1fr;
  }
}

.loc-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.loc-lbl {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.loc-code {
  font-size: 12px;
  color: var(--accent-secondary);
  background: rgba(0, 0, 0, 0.25);
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

.params-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 12px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.params-title {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}

.params-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.param-tag {
  font-size: 11px;
  font-family: monospace;
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
  padding: 2px 6px;
  border-radius: 4px;
}

.msg-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mut-desc {
  font-size: 12px;
  color: var(--text-primary);
  line-height: 1.45;
  margin: 0;
}

.mut-msg {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0;
}

.msg-prefix {
  font-weight: 600;
  color: var(--text-secondary);
}

.mut-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag-pill {
  font-size: 10px;
  font-family: monospace;
  background: rgba(0, 0, 0, 0.35);
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

.context-details {
  border-top: 1px solid var(--border-color);
  padding-top: 8px;
  margin-top: 4px;
}

.btn-toggle-context {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: color var(--transition-fast);
  padding: 4px 0;
}

.btn-toggle-context:hover {
  color: var(--text-primary);
}

.btn-toggle-context svg.rotate {
  transform: rotate(180deg);
}

.expanded-context-box {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.code-block-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.code-header {
  font-size: 10px;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
}

.json-code {
  background: #09090f;
  padding: 10px 12px;
  border-radius: 6px;
  color: #a6accd;
  font-family: monospace;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 180px;
  overflow-y: auto;
  margin: 0;
}

.no-filter-match {
  padding: 32px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 13px;
}

.btn-reset-filter {
  background: rgba(96, 165, 250, 0.15);
  border: 1px solid var(--accent-secondary);
  color: var(--accent-secondary);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
}

.clean-conformance-card {
  padding: 40px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.clean-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.clean-sub {
  font-size: 12px;
  color: var(--text-muted);
}

.severity-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
}

.sev-critical { background: rgba(248, 113, 113, 0.25); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.4); }
.sev-high { background: rgba(251, 146, 60, 0.25); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.4); }
.sev-medium { background: rgba(251, 191, 36, 0.25); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); }
.sev-low { background: rgba(96, 165, 250, 0.25); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.4); }
.sev-info { background: rgba(148, 163, 184, 0.2); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }
</style>

