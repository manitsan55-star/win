<template>
  <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
    <div class="payment-modal-card">
      <div class="payment-header">
        <h2>วิธีชำระเงิน</h2>
        <button type="button" class="close-button" @click="$emit('close')">ปิด</button>
      </div>

      <p class="payment-message">{{ settings.paymentMessage }}</p>

      <div class="price-card">
        <h3>ราคา</h3>
        <div class="price-list">
          <div class="price-item">เดือนละ 200</div>
          <div class="price-item">ปีละ 2000</div>
        </div>
      </div>

      <div class="payment-grid">
        <div class="payment-card">
          <h3>QR Code โอนเงิน</h3>
          <img v-if="settings.transferQrImage" :src="settings.transferQrImage" alt="QR Code โอนเงิน" class="payment-image" />
          <div v-else class="payment-placeholder">ยังไม่มี QR Code โอนเงิน</div>
        </div>
      </div>

      <p class="payment-note">โอนเงินเรียบร้อยแล้ว กรุณาอัปโหลดสลิปการโอนเงินด้านล่าง</p>

      <div class="slip-upload-card">
        <h3>อัปโหลดสลิปการโอนเงิน</h3>
        <p class="slip-upload-note">หลังอัปโหลดแล้ว แอดมินจะเห็นสลิปนี้ในหน้าแอดมินทันที</p>
        <input type="file" accept="image/*" class="slip-input" :disabled="isSubmitting" @change="handleSlipChange" />
        <img v-if="slipPreview" :src="slipPreview" alt="Slip preview" class="slip-preview-image" />
        <div v-else class="payment-placeholder slip-placeholder">ยังไม่ได้เลือกไฟล์สลิป</div>
        <div v-if="errorMessage" class="slip-error">{{ errorMessage }}</div>
        <div v-if="successMessage" class="slip-success">{{ successMessage }}</div>
        <button type="button" class="upload-button" :disabled="isSubmitting || !slipPreview" @click="submitSlip">
          {{ isSubmitting ? 'กำลังอัปโหลด...' : 'ส่งสลิปให้แอดมิน' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { readFileAsDataUrl, uploadPaymentSlip } from '@/utils/payment';

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
        transferQrImage: '',
        paymentMessage: 'กรุณาโอนเงินตาม QR Code และอัปโหลดสลิปการโอนเงินด้านล่าง',
      }),
    },
  },
  emits: ['close'],
  data() {
    return {
      slipPreview: '',
      isSubmitting: false,
      errorMessage: '',
      successMessage: '',
    };
  },
  watch: {
    open(value) {
      if (value) {
        this.errorMessage = '';
        this.successMessage = '';
      }
    },
  },
  methods: {
    async handleSlipChange(event) {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      this.errorMessage = '';
      this.successMessage = '';

      try {
        this.slipPreview = await readFileAsDataUrl(file);
      } catch (error) {
        this.errorMessage = error.message || 'ไม่สามารถอ่านไฟล์สลิปได้';
      } finally {
        event.target.value = '';
      }
    },
    async submitSlip() {
      if (!this.slipPreview) {
        this.errorMessage = 'กรุณาเลือกไฟล์สลิปก่อน';
        return;
      }

      this.isSubmitting = true;
      this.errorMessage = '';
      this.successMessage = '';

      try {
        await uploadPaymentSlip(this.slipPreview);
        this.successMessage = 'ส่งสลิปให้แอดมินแล้ว';
        this.slipPreview = '';
      } catch (error) {
        this.errorMessage = error.message || 'ไม่สามารถส่งสลิปได้';
      } finally {
        this.isSubmitting = false;
      }
    },
  },
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
  grid-template-columns: minmax(220px, 1fr);
  gap: 1rem;
  margin: 1rem 0;
}

.price-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
  background-color: #f9fafb;
}

.price-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.price-item {
  font-weight: 600;
  color: #111827;
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

.slip-upload-card {
  margin-top: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
  background-color: #f9fafb;
}

.slip-upload-note {
  color: #4b5563;
  margin-bottom: 0.75rem;
}

.slip-input {
  width: 100%;
  margin-bottom: 0.75rem;
}

.slip-preview-image {
  width: 100%;
  max-height: 360px;
  object-fit: contain;
  border-radius: 8px;
  background-color: white;
  margin-bottom: 0.75rem;
}

.slip-placeholder {
  min-height: 160px;
  margin-bottom: 0.75rem;
}

.slip-error,
.slip-success {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
}

.slip-error {
  background-color: #fee2e2;
  color: #991b1b;
}

.slip-success {
  background-color: #dcfce7;
  color: #166534;
}

.upload-button {
  border: none;
  background-color: #059669;
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
}

.upload-button:disabled,
.slip-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
