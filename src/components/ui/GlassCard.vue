<template>
  <div class="glass-card glass-panel" :class="{ 'no-padding': noPadding }">
    <div v-if="title || $slots.header" class="card-header">
      <slot name="header">
        <h3 class="card-title">{{ title }}</h3>
      </slot>
    </div>
    <div class="card-body">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  noPadding: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
.glass-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform var(--transition-normal);
}

.glass-card:hover {
  transform: translateY(-2px);
}

.card-header {
  padding: 20px 24px 0 24px;
}

.card-title {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.card-body {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.no-padding .card-body {
  padding: 0;
}
</style>
