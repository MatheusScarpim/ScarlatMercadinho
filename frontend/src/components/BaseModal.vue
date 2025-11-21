<template>
  <div v-if="open" class="modal-backdrop" @click.self="onClose">
    <div class="modal">
      <header class="modal-header">
        <h3>{{ title }}</h3>
        <button class="btn btn-ghost" @click="onClose">Fechar</button>
      </header>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
  onClose: () => void;
}>();
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 50;
}
.modal {
  width: min(760px, 95%);
  max-height: 90vh;
  overflow: auto;
  padding: 24px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.modal-body {
  display: grid;
  gap: 16px;
}
</style>
