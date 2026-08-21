import { defineStore } from 'pinia'

export const useFuzzerStore = defineStore('fuzzer', {
  state: () => ({
    fuzzers: [],
    selectedFuzzerId: null,
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
        const response = await fetch('http://localhost:3000/jdozerfuzzer/fuzzers');
        if (!response.ok) throw new Error('Failed to fetch fuzzers');

        const data = await response.json();
        this.fuzzers = data;

        if (this.fuzzers.length > 0 && !this.selectedFuzzerId) {
          this.selectedFuzzerId = this.fuzzers[0].id;
        }

        this.stats.totalOperations = this.fuzzers.reduce((acc, f) => acc + (f.operationIds ? f.operationIds.length : 0), 0);
      } catch (err) {
        this.error = err.message;
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    selectFuzzer(id) {
      this.selectedFuzzerId = id;
    },

    async createFuzzer(fuzzerData) {
      const formData = new FormData();
      formData.append('contract', fuzzerData.file);

      try {
        const response = await fetch('http://localhost:3000/jdozerfuzzer/fuzzer', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Error al crear la prueba de fuzzer');
        }
        this.fetchFuzzers();

        return data;
      } catch (err) {
        throw err;
      }
    },

    async fetchOperationRequests(fuzzerId, operationId) {
      if (!fuzzerId || !operationId) return [];
      try {
        const response = await fetch(`http://localhost:3000/jdozerfuzzer/fuzzers/${fuzzerId}/operations/${operationId}/requests`);
        if (!response.ok) throw new Error('Error al obtener solicitudes de la operación');
        const data = await response.json();
        return data;
      } catch (err) {
        console.error('Error fetching operation requests:', err);
        throw err;
      }
    },

    async fetchCaseDetails(fuzzerId, operationId, caseId) {
      if (!fuzzerId || !operationId || !caseId) return null;
      try {
        const response = await fetch(`http://localhost:3000/jdozerfuzzer/fuzzers/${fuzzerId}/operations/${operationId}/case/${caseId}`);
        if (!response.ok) throw new Error('Error al obtener detalle del caso de prueba');
        const data = await response.json();
        return data;
      } catch (err) {
        console.error('Error fetching case details:', err);
        throw err;
      }
    },

    async fetchOperationSpec(fuzzerId, operationId) {
      if (!fuzzerId || !operationId) return null;
      try {
        const response = await fetch(`http://localhost:3000/jdozerfuzzer/fuzzers/${fuzzerId}/operations/${operationId}`);
        if (!response.ok) throw new Error('Error al obtener especificación OpenAPI de la operación');
        const data = await response.json();
        return data;
      } catch (err) {
        console.error('Error fetching operation spec:', err);
        throw err;
      }
    },

    async fetchFuzzerContract(fuzzerId) {
      if (!fuzzerId) return null;
      try {
        const response = await fetch(`http://localhost:3000/jdozerfuzzer/fuzzers/${fuzzerId}/contract`);
        if (!response.ok) throw new Error('Error al obtener el contrato OpenAPI de la API remota');
        const data = await response.json();
        return data;
      } catch (err) {
        console.error('Error fetching fuzzer contract:', err);
        throw err;
      }
    }
  }
})
