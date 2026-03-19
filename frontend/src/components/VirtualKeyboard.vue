<template>
  <div class="vk-overlay" v-if="visible">
    <div class="vk-container">
      <div class="vk-display">
        <span class="vk-label">{{ label }}</span>
        <span class="vk-value">{{ isPassword ? '•'.repeat(modelValue.length) : modelValue }}<span class="vk-cursor">|</span></span>
      </div>
      <div class="vk-rows">
        <div class="vk-row" v-for="(row, i) in currentLayout" :key="i">
          <button
            v-for="key in row"
            :key="key"
            :class="['vk-key', keyClass(key)]"
            @click="onKey(key)"
          >
            {{ keyLabel(key) }}
          </button>
        </div>
        <div class="vk-row vk-row-bottom">
          <button class="vk-key vk-key--cancel" @click="$emit('cancel')">Cancelar</button>
          <button class="vk-key vk-key--space" @click="onKey(' ')">Espaço</button>
          <button class="vk-key vk-key--confirm" @click="$emit('confirm')">OK</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: string;
  visible: boolean;
  label?: string;
  isPassword?: boolean;
  numbersOnly?: boolean;
}>(), {
  label: '',
  isPassword: false,
  numbersOnly: false
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  confirm: [];
  cancel: [];
}>();

const shifted = ref(false);

const letterRows = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['SHIFT','z','x','c','v','b','n','m','BACK'],
];

const numberRows = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['BACK','0',''],
];

const currentLayout = computed(() => {
  if (props.numbersOnly) return numberRows;
  return letterRows;
});

function keyClass(key: string) {
  if (key === 'SHIFT') return 'vk-key--fn';
  if (key === 'BACK') return 'vk-key--fn';
  if (key === '') return 'vk-key--empty';
  return '';
}

function keyLabel(key: string) {
  if (key === 'SHIFT') return shifted.value ? '⇧' : '⇪';
  if (key === 'BACK') return '⌫';
  if (key === '') return '';
  return shifted.value ? key.toUpperCase() : key;
}

function onKey(key: string) {
  if (key === '') return;
  if (key === 'SHIFT') {
    shifted.value = !shifted.value;
    return;
  }
  if (key === 'BACK') {
    emit('update:modelValue', props.modelValue.slice(0, -1));
    return;
  }
  const char = shifted.value ? key.toUpperCase() : key;
  emit('update:modelValue', props.modelValue + char);
  if (shifted.value) shifted.value = false;
}
</script>

<style scoped>
.vk-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
}

.vk-container {
  width: 100%;
  max-width: 720px;
  background: #f1f3f5;
  border-radius: 18px 18px 0 0;
  padding: 16px 12px 12px;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.18);
}

.vk-display {
  background: #fff;
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 14px;
  border: 2px solid var(--border, #e2e8f0);
  min-height: 50px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vk-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.vk-value {
  font-size: 20px;
  font-weight: 500;
  color: var(--text, #1f2937);
  word-break: break-all;
}

.vk-cursor {
  animation: blink 1s step-end infinite;
  color: var(--primary, #10b49d);
  font-weight: 300;
}

@keyframes blink {
  50% { opacity: 0; }
}

.vk-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vk-row {
  display: flex;
  justify-content: center;
  gap: 5px;
}

.vk-key {
  flex: 1;
  max-width: 64px;
  height: 52px;
  border-radius: 10px;
  border: none;
  background: #fff;
  color: var(--text, #1f2937);
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: background 0.1s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vk-key:active {
  background: #e2e8f0;
  transform: scale(0.95);
}

.vk-key--fn {
  flex: 1.4;
  max-width: 80px;
  background: #d1d5db;
  font-size: 20px;
}

.vk-key--empty {
  visibility: hidden;
}

.vk-row-bottom {
  margin-top: 4px;
}

.vk-key--space {
  flex: 4;
  max-width: none;
  font-size: 14px;
  color: var(--muted, #64748b);
}

.vk-key--cancel {
  flex: 2;
  max-width: none;
  background: #fee2e2;
  color: #dc2626;
  font-size: 14px;
  font-weight: 600;
}

.vk-key--confirm {
  flex: 2;
  max-width: none;
  background: var(--primary, #10b49d);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.vk-key--confirm:active {
  background: #0d9488;
}

.vk-key--cancel:active {
  background: #fecaca;
}
</style>
