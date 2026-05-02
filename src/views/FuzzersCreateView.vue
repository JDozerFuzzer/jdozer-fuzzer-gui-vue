<template>
  <AppLayout>
    <div class="create-fuzzer-container">
      <GlassCard title="Nueva Prueba de Fuzzer">
        <div class="form-wrapper">
          <form @submit.prevent="submitForm" class="fuzzer-form">
            
            <div class="form-group">
              <label for="name">Nombre de la Prueba</label>
              <input 
                id="name" 
                v-model="formData.name" 
                type="text" 
                required 
                placeholder="Ej. API de Pagos - Prod"
                class="glass-input"
              />
            </div>

            <div class="form-group">
              <label for="version">Versión del API</label>
              <input 
                id="version" 
                v-model="formData.version" 
                type="text" 
                required 
                placeholder="Ej. v1.2.0"
                class="glass-input"
              />
            </div>

            <div class="form-group">
              <label for="contract">Contrato OpenAPI (YAML / JSON)</label>
              <div class="file-upload-wrapper" :class="{ 'has-file': formData.file }">
                <input 
                  id="contract" 
                  type="file" 
                  accept=".yaml,.yml,.json" 
                  @change="handleFileUpload" 
                  required
                  class="file-input"
                />
                <div class="file-upload-visual">
                  <UploadCloud class="upload-icon" />
                  <span v-if="!formData.file">Haz clic o arrastra para subir tu contrato</span>
                  <span v-else class="file-name">{{ formData.file.name }}</span>
                </div>
              </div>
            </div>

            <div v-if="submitMessage" :class="['response-message', submitStatus]">
              {{ submitMessage }}
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary" :disabled="isSubmitting">
                <span v-if="isSubmitting" class="spinner"></span>
                <span v-else>
                  <Play class="icon-sm" />
                  Iniciar Fuzzing
                </span>
              </button>
            </div>
          </form>
        </div>
      </GlassCard>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { UploadCloud, Play } from 'lucide-vue-next'
import AppLayout from '../components/layout/AppLayout.vue'
import GlassCard from '../components/ui/GlassCard.vue'
import { useFuzzerStore } from '../store/fuzzerStore'

const fuzzerStore = useFuzzerStore()
const router = useRouter()

const formData = ref({
  name: '',
  version: '',
  file: null
})

const isSubmitting = ref(false)
const submitMessage = ref('')
const submitStatus = ref('') // 'success' or 'error'

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    formData.value.file = file
  }
}

const submitForm = async () => {
  isSubmitting.value = true
  submitMessage.value = ''
  
  try {
    const result = await fuzzerStore.createFuzzer({
      name: formData.value.name,
      version: formData.value.version,
      file: formData.value.file
    })
    
    submitStatus.value = 'success'
    submitMessage.value = `¡Prueba iniciada con éxito! Fuzzer ID: ${result.id}`
    
    // Reset form
    formData.value.name = ''
    formData.value.version = ''
    formData.value.file = null
    document.getElementById('contract').value = ''
    
    // Redirigir al monitor inmediatamente para ver los eventos en vivo
    router.push('/fuzzers/monitor')
    
  } catch (error) {
    submitStatus.value = 'error'
    submitMessage.value = `Error: ${error.message}`
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.create-fuzzer-container {
  max-width: 800px;
  margin: 0 auto;
}

.form-wrapper {
  margin-top: 20px;
}

.fuzzer-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 14px;
}

.glass-input {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 15px;
  transition: all var(--transition-fast);
}

.glass-input:focus {
  outline: none;
  border-color: var(--accent-secondary);
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
}

/* File Upload Styles */
.file-upload-wrapper {
  position: relative;
  height: 120px;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.1);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.file-upload-wrapper:hover, .file-upload-wrapper.has-file {
  border-color: var(--accent-secondary);
  background: rgba(96, 165, 250, 0.05);
}

.file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.file-upload-visual {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);
  pointer-events: none;
  z-index: 1;
}

.upload-icon {
  width: 32px;
  height: 32px;
  color: var(--accent-secondary);
}

.file-name {
  color: var(--accent-primary);
  font-weight: 500;
  font-size: 16px;
}

/* Buttons and Messages */
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-primary);
  color: var(--bg-primary);
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--accent-primary-glow);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.icon-sm {
  width: 18px;
  height: 18px;
}

.response-message {
  padding: 16px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  text-align: center;
}

.response-message.success {
  background: var(--accent-primary-glow);
  color: var(--accent-primary);
  border: 1px solid rgba(74, 222, 128, 0.2);
}

.response-message.error {
  background: rgba(248, 113, 113, 0.1);
  color: var(--accent-danger);
  border: 1px solid rgba(248, 113, 113, 0.2);
}

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(0,0,0,0.3);
  border-radius: 50%;
  border-top-color: var(--bg-primary);
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
