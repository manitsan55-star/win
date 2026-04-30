<template>
  <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
    <div class="payment-modal-card">
      <div class="payment-header">
        <h2>วิธีชำระเงิน</h2>
        <button type="button" class="close-button" @click="$emit('close')">ปิด</button>
      </div>

      <p class="payment-message">{{ settings.paymentMessage }}</p>

      <div class="payment-grid">
        <div class="payment-card">
          <h3>QR Code โอนเงิน</h3>
          <img v-if="settings.transferQrImage" :src="settings.transferQrImage" alt="QR Code โอนเงิน" class="payment-image" />
          <div v-else class="payment-placeholder">ยังไม่มี QR Code โอนเงิน</div>
        </div>

        <div class="payment-card">
          <h3>Line QR Code</h3>
          <img v-if="settings.lineQrImage" :src="settings.lineQrImage" alt="Line QR Code" class="payment-image" />
          <div v-else class="payment-placeholder">ยังไม่มี Line QR Code</div>
        </div>
      </div>

      <p class="payment-note">โอนเงินเรียบร้อยแล้ว กรุณาส่งหลักฐานการโอนมาที่ไลน์ตาม QR Code ที่แสดงไว้</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PaymentMethodModal',
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    settings: {
      type: Object,
      default: () => ({
        lineQrImage: '',
        transferQrImage: '',
        paymentMessage: 'กรุณาโอนเงินตาม QR Code และส่งหลักฐานการโอนมาที่ Line ตาม QR Code ด้านล่าง',
      }),
    },
  },
  emits: ['close'],
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1100;
}

.payment-modal-card {
  width: min(720px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  background-color: white;
  border-radius: 12px;
  padding: 1.25rem;
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.payment-message,
.payment-note {
  color: #374151;
  line-height: 1.6;
}

.payment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.payment-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
  background-color: #f9fafb;
}

.payment-image {
  width: 100%;
  border-radius: 8px;
  object-fit: contain;
  background-color: white;
}

.payment-placeholder {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  background-color: white;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
  text-align: center;
  padding: 1rem;
}

.close-button {
  border: none;
  background-color: #ef4444;
  color: white;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
}
</style>
