<template>
  <transition name="fade">
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" @click.self="$emit('close')">
      <div class="bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full text-center">
        <h3 class="text-xl font-semibold mb-4">{{ title }}</h3>
        <div class="flex justify-center">
          <qrcode-vue :value="url" :size="200" level="H" />
        </div>
        <p class="text-sm text-gray-600 mt-4 break-all">{{ url }}</p>
        <button @click="$emit('close')" class="mt-6 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
          Close
        </button>
      </div>
    </div>
  </transition>
</template>

<script>
import QrcodeVue from 'qrcode.vue'

export default {
  name: 'QrCodeModal',
  components: {
    QrcodeVue,
  },
  props: {
    show: { type: Boolean, required: true },
    url: { type: String, required: true },
    title: { type: String, default: 'Scan QR Code' },
  },
  emits: ['close'],
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>