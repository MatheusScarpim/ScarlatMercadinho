<template>
  <div
    v-if="open"
    class="modal-backdrop"
    :class="{ 'modal-backdrop--top': top }"
    @pointerdown="onBackdropPointerDown"
    @click="onBackdropClick"
  >
    <div class="modal" :class="{ 'modal--small': small }">
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
const props = withDefaults(defineProps<{
  open: boolean;
  title: string;
  onClose: () => void;
  small?: boolean;
  top?: boolean;
}>(), {
  small: false,
  top: false
});

// Só fecha ao clicar no backdrop se o gesto TAMBÉM começou no backdrop.
// Evita o fechamento acidental no mobile quando o dedo começa num campo/scroll
// e o "click" termina fora (arrasto/scroll).
let pointerDownOnBackdrop = false;

function onBackdropPointerDown(event: PointerEvent) {
  pointerDownOnBackdrop = event.target === event.currentTarget;
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget && pointerDownOnBackdrop) {
    props.onClose();
  }
  pointerDownOnBackdrop = false;
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 50;
}
.modal-backdrop--top {
  z-index: 100;
}
.modal {
  width: min(1200px, 95%);
  max-height: 85vh;
  overflow: auto;
  padding: 24px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
}
.modal--small {
  width: min(500px, 95%);
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
