<template>
  <div class="app-layout">
    <Sidebar />
    <main class="main-content">
      <header class="topbar">
        <div class="breadcrumb">
          <span>JDozerFuzzer</span>
          <span class="separator">/</span>
          <span class="current">{{ currentRouteName }}</span>
        </div>
        <div class="user-controls">
          <div class="status-indicator" :class="{ 'disconnected': !socketStore.isConnected }">
            <span class="status-dot"></span>
            {{ socketStore.isConnected ? 'Socket Conectado' : 'Socket Desconectado' }}
          </div>
        </div>
      </header>
      <div class="content-wrapper">
        <slot></slot>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './Sidebar.vue'
import { useSocketStore } from '../../store/socketStore'

const route = useRoute()
const socketStore = useSocketStore()

const currentRouteName = computed(() => {
  if (route.name === 'dashboard') return 'Dashboard'
  return route.name
})

onMounted(() => {
  socketStore.connect()
})

onUnmounted(() => {
  socketStore.disconnect()
})
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  padding: 16px;
  gap: 24px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Prevents overflow */
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 32px 0;
}

.breadcrumb {
  font-size: 14px;
  color: var(--text-secondary);
  display: flex;
  gap: 8px;
}

.current {
  color: var(--text-primary);
  font-weight: 500;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--accent-primary);
  background: var(--accent-primary-glow);
  padding: 6px 12px;
  border-radius: 20px;
}

.status-indicator.disconnected {
  background: rgba(248, 113, 113, 0.2);
  color: var(--accent-danger);
}

.status-dot {
  width: 6px;
  height: 6px;
  background-color: currentColor;
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
}

.content-wrapper {
  flex: 1;
}
</style>
