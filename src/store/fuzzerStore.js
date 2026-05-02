import { defineStore } from 'pinia'

export const useFuzzerStore = defineStore('fuzzer', {
  state: () => ({
    fuzzers: [],
    loading: false,
    error: null,
    stats: {
      totalOperations: 0,
      totalVulnerabilities: 0
    }
  }),
  
  actions: {
    async fetchFuzzers() {
      this.loading = true;
      this.error = null;
      try {
        const response = await fetch('/bff/fuzzers');
        if (!response.ok) throw new Error('Failed to fetch fuzzers');
        
        const data = await response.json();
        this.fuzzers = data;
        
        // Calculate mock stats based on fuzzers or real if data contains it
        this.stats.totalOperations = this.fuzzers.length * 15; // Example
      } catch (err) {
        this.error = err.message;
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
    
    async createFuzzer(fuzzerData) {
      const formData = new FormData();
      formData.append('name', fuzzerData.name);
      formData.append('version', fuzzerData.version);
      formData.append('contract', fuzzerData.file);

      try {
        const response = await fetch('/bff/fuzzer', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Error al crear la prueba de fuzzer');
        }
        
        // Opcional: recargar la lista de fuzzers
        this.fetchFuzzers();
        
        return data;
      } catch (err) {
        throw err;
      }
    }
  }
})
