<template>
  <MainNavbar @open-auth-modal="openAuthModal" />
  <div :class="BoxClass">
    <div>
      <div v-if="accessNotice" class="access-banner">
        {{ accessNotice }}
      </div>

      <textarea 
        ref="textarea"
        v-model="inputNumbers" 
        placeholder="ใส่ตัวเลข"
        :class="textAreaClass"
        @input="checkMultiline"
      ></textarea>

      <div class="button-container mb-4 buttons-grid">
        <button @click="resetAll" class="reset-button">
          เริ่มใหม่
        </button>
        <button @click="submitData" class="submit-button" :disabled="isCalculationBlocked">
          คำนวณ
        </button>
        <button @click="openPaymentModal" class="payment-button">
          วิธีชำระเงิน
        </button>
      </div>
    </div>
    <div :class="containerClass">
      <div v-if="lines.length < 2">
        <div :class="summaryClass">
          <div class="summary-box">
            <h3>2 ตัวปกติ</h3>
            <button @click="copyDoubleSummaryToClipboard(lines, false)" class="copy-button">
              คัดลอก
            </button>
            <div class="summary-content">
              <div class="summary-text">
                <span 
                  v-for="number in getDoubleSummary(lines)" 
                  :key="number"
                  :class="summaryNumberClass(number)"
                  class="summary-number"
                >
                  {{ number }}
                </span>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <h3>2 ตัวรวมเบิ้ล</h3>
            <button @click="copyDoubleIncludeDoublesSummaryToClipboard(lines, false)" class="copy-button">
              คัดลอก
            </button>
            <div class="summary-content">
              <div class="summary-text">
                <span 
                  v-for="number in getDoubleIncludeDoublesSummary(lines)" 
                  :key="number"
                  :class="summaryNumberClass(number)"
                  class="summary-number"
                >
                  {{ number }}
                </span>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <h3>3 ตัวปกติ</h3>
            <button @click="copyTripleSummaryToClipboard(lines, false)" class="copy-button">
              คัดลอก
            </button>
            <div class="summary-content">
              <div class="summary-text">
                <span 
                  v-for="number in getTripleSummary(lines)" 
                  :key="number"
                  :class="summaryNumberClass(number)"
                  class="summary-number"
                >
                  {{ number }}
                </span>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <h3>3 ตัวรวมตองรวมหาม</h3>
            <button @click="copyTripleIncludeDoublesSummaryToClipboard(lines, false)" class="copy-button">
              คัดลอก
            </button>
            <div class="summary-content">
              <div class="summary-text">
                <span 
                  v-for="number in getTripleIncludeDoublesSummary(lines)" 
                  :key="number"
                  :class="summaryNumberClass(number)"
                  class="summary-number"
                >
                  {{ number }}
                </span>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <h3>3 ตัวรวมหาม</h3>
            <button @click="copyTripleIncludeHamSummaryToClipboard(lines, false)" class="copy-button">
              คัดลอก
            </button>
            <div class="summary-content">
              <div class="summary-text">
                <span 
                  v-for="number in getTripleIncludeHamSummary(lines)" 
                  :key="number"
                  :class="summaryNumberClass(number)"
                  class="summary-number"
                >
                  {{ number }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else>
      <div v-if='isMultiline'>
        <div :class="summaryClass">
          <div class="summary-copy">
            <button @click="copyDoubleSummaryToClipboard(lines, true)" class="copy-button">
              <span>2 ตัวปกติ</span><br>
              คัดลอกทั้งหมด
            </button>
          </div>

          <div class="summary-copy">
            <button @click="copyDoubleIncludeDoublesSummaryToClipboard(lines, true)" class="copy-button">
              <span>2 ตัวรวมเบิ้ล</span><br>
              คัดลอกทั้งหมด
            </button>
          </div>

          <div class="summary-copy">
            <button @click="copyTripleSummaryToClipboard(lines, true)" class="copy-button">
              <span>3 ตัวปกติ</span><br>
              คัดลอกทั้งหมด
            </button>
          </div>

          <div class="summary-copy">
            <button @click="copyTripleIncludeDoublesSummaryToClipboard(lines, true)" class="copy-button">
              <span>3 ตัวรวมตองรวมหาม</span><br>
              คัดลอกทั้งหมด
            </button>
          </div>

          <div class="summary-copy">
            <button @click="copyTripleIncludeHamSummaryToClipboard(lines, true)" class="copy-button">
              <span>3 ตัวรวมหาม</span><br>
              คัดลอกทั้งหมด
            </button>
          </div>
        </div>
      </div>
      <div v-for="(line, index) in lines" :key="index">
        <div class="text-center">
          <div class="text-red">{{ line }}</div>
        </div>
        <div :class="summaryClass">
          <div class="summary-box">
            <h3>2 ตัวปกติ</h3>
            <button @click="copyDoubleSummaryToClipboard(line)" class="copy-button">
              คัดลอก
            </button>
            <div class="summary-content">
              <div class="summary-text">
                <span 
                  v-for="number in getDoubleSummary(line)" 
                  :key="number"
                  :class="summaryNumberClass(number)"
                  class="summary-number"
                >
                  {{ number }}
                </span>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <h3>2 ตัวรวมเบิ้ล</h3>
            <button @click="copyDoubleIncludeDoublesSummaryToClipboard(line)" class="copy-button">
              คัดลอก
            </button>
            <div class="summary-content">
              <div class="summary-text">
                <span 
                  v-for="number in getDoubleIncludeDoublesSummary(line)" 
                  :key="number"
                  :class="summaryNumberClass(number)"
                  class="summary-number"
                >
                  {{ number }}
                </span>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <h3>3 ตัวปกติ</h3>
            <button @click="copyTripleSummaryToClipboard(line)" class="copy-button">
              คัดลอก
            </button>
            <div class="summary-content">
              <div class="summary-text">
                <span 
                  v-for="number in getTripleSummary(line)" 
                  :key="number"
                  :class="summaryNumberClass(number)"
                  class="summary-number"
                >
                  {{ number }}
                </span>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <h3>3 ตัวรวมตองรวมหาม</h3>
            <button @click="copyTripleIncludeDoublesSummaryToClipboard(line)" class="copy-button">
              คัดลอก
            </button>
            <div class="summary-content">
              <div class="summary-text">
                <span 
                  v-for="number in getTripleIncludeDoublesSummary(line)" 
                  :key="number"
                  :class="summaryNumberClass(number)"
                  class="summary-number"
                >
                  {{ number }}
                </span>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <h3>3 ตัวรวมหาม</h3>
            <button @click="copyTripleIncludeHamSummaryToClipboard(line)" class="copy-button">
              คัดลอก
            </button>
            <div class="summary-content">
              <div class="summary-text">
                <span 
                  v-for="number in getTripleIncludeHamSummary(line)" 
                  :key="number"
                  :class="summaryNumberClass(number)"
                  class="summary-number"
                >
                  {{ number }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <div v-if="showCopyNotification" class="notification">
        คัดลอกเลขทั้งหมดแล้ว
      </div>
    </div>
  </div>
  <AuthModal
    :open="showAuthModal"
    :initialMode="authModalMode"
    @close="closeAuthModal"
    @auth-success="handleAuthSuccess"
  />
  <PaymentMethodModal
    :open="showPaymentModal"
    :settings="paymentSettings"
    @close="closePaymentModal"
  />
</template>


<script>
import AuthModal from '@/components/AuthModal.vue';
import MainNavbar from '@/components/MainNavbar.vue';
import PaymentMethodModal from '@/components/PaymentMethodModal.vue';
import { consumeAuthNotice, getCurrentUser, getUserAccessState, isAuthenticated } from '@/utils/auth';
import { fetchPaymentSettings } from '@/utils/payment';

export default {
  components: {
    AuthModal,
    MainNavbar,
    PaymentMethodModal,
  },
  name: 'HomePage',
  data() {
    return {
      selectedNumber: [],
      selectedNumberDuplicate: [],
      numbers: Array.from({ length: 10 }, (_, i) => i),
      inputNumbers: '',
      combinationLength: '2', // Default to '2' to avoid undefined errors
      highlightedNumbers: [],
      showCopyNotification: false,
      includeDoubles: false,
      onlyDoubles: false,
      lines: [],
      isMultiline: false,
      showAuthModal: false,
      showPaymentModal: false,
      authModalMode: 'login',
      pendingCalculation: false,
      accessNotice: '',
      paymentSettings: {
        lineQrImage: '',
        transferQrImage: '',
        paymentMessage: 'กรุณาโอนเงินตาม QR Code และส่งหลักฐานการโอนมาที่ Line ตาม QR Code ด้านล่าง',
      },
    };
  },
  created() {
    this.syncAccessNotice();
    this.loadPaymentSettings();
    window.addEventListener('auth-changed', this.handleAuthChanged);
  },
  beforeUnmount() {
    window.removeEventListener('auth-changed', this.handleAuthChanged);
  },
  computed: {
    textAreaClass() {
      return this.isMultiline ? 'textarea big' : 'textarea';
    },
    BoxClass() {
      return this.isMultiline ? 'big-box' : 'normal-box';
    },
    containerClass() {
      return this.isMultiline ? 'full-screen' : 'normal';
    },
    summaryClass() {
      return this.isMultiline ? 'summary-container-multiline' : 'summary-container';
    },
    accessState() {
      return getUserAccessState(getCurrentUser());
    },
    isCalculationBlocked() {
      return isAuthenticated() && this.accessState.blocked;
    }
  },
  methods: {
    handleAuthChanged() {
      this.syncAccessNotice();
    },
    syncAccessNotice() {
      const consumedNotice = consumeAuthNotice();

      if (consumedNotice) {
        this.accessNotice = consumedNotice;
        return;
      }

      const user = getCurrentUser();
      const accessState = getUserAccessState(user);
      this.accessNotice = accessState.message;
    },
    async loadPaymentSettings() {
      try {
        this.paymentSettings = await fetchPaymentSettings();
      } catch (error) {
        console.error(error);
      }
    },
    updateSummary() {
      this.lines = this.inputNumbers.split('\n')
      // console.log(this.inputNumbers)
      // console.log(this.lines)
    },
    checkMultiline() {
      // this.$nextTick(() => {
      //   const textarea = this.$refs.textarea;
      //   textarea.style.height = 'auto';
      //   // textarea.style.height = `${textarea.scrollHeight}px`;
      // });
      const lines = this.inputNumbers.split('\n');
      this.isMultiline = lines.length > 1;
    },
    addNumber(number) {
      if (this.selectedNumber.includes(number)) {
        this.selectedNumber = this.selectedNumber.filter(num => num !== number);
      } else {
        this.selectedNumber.push(number);
      }
    },
    handleButtonClick(number) {
      this.addNumber(number);
      this.updateTextarea();
    },
    updateTextarea() {
      this.inputNumbers = this.selectedNumber.join(',');
    },
    getDoubleSummary(number) {
      const combinations = [];
      const selected = this.updateSelectedNumbers(number, true);

      for (let i = 0; i < selected.length; i++) {
        for (let j = i + 1; j < selected.length; j++) {
          combinations.push(`${selected[i]}${selected[j]}`);
        }
      }

      return [...new Set(combinations)];
    },
    getDoubleIncludeDoublesSummary(number) {
      const combinations = [];
      const selected = this.updateSelectedNumbers(number, false);

      for (let i = 0; i < selected.length; i++) {
        // combinations.push(`${selected[i]}${selected[i]}`);
        for (let j = i + 1; j < selected.length; j++) {
          combinations.push(`${selected[i]}${selected[j]}`);
        }
      }
      
      selected.forEach(num => combinations.push(`${num}${num}`));

      return combinations;
    },
    getTripleSummary(number){
      const combinations = [];
      const selected = this.updateSelectedNumbers(number, false);

      for (let i = 0; i < selected.length; i++) {
        for (let j = i + 1; j < selected.length; j++) {
          for (let k = j + 1; k < selected.length; k++) {
            combinations.push(`${selected[i]}${selected[j]}${selected[k]}`);
          }
        }
      }

      return combinations;
    },
    getTripleIncludeDoublesSummary(number) {
      const combinations = [];
      const triples = [];
      const selected = this.updateSelectedNumbers(number, false);

      for (let i = 0; i < selected.length; i++) {
        for (let j = i; j < selected.length; j++) {
          for (let k = j; k < selected.length; k++) {
            const combination = `${selected[i]}${selected[j]}${selected[k]}`;

            if (selected[i] === selected[j] && selected[j] === selected[k]) {
              triples.push(combination); // Store triples separately
            } else {
              combinations.push(combination); // Non-triples first
            }
          }
        }
      }

      return [...combinations, ...triples]; // Combine non-triples and triples
    },
    getTripleIncludeHamSummary(number) {
      const combinations = [];
      const selected = this.updateSelectedNumbers(number, false);

      for (let i = 0; i < selected.length; i++) {
        for (let j = i; j < selected.length; j++) {
          for (let k = j; k < selected.length; k++) {
            // Ensure only two identical digits followed by a different digit
            if (i !== k) {
              combinations.push(`${selected[i]}${selected[j]}${selected[k]}`);
            }
          }
        }
      }

      return combinations;
    },
    updateSelectedNumbers(input, duplicate) {
      const sanitizedInput = input
        .toString()
        .replace(/[^0-9,\s-]/g, '');

      const digitsArray = sanitizedInput
        .replace(/,/g, '')
        .replace(/[\s-]+/g, '')
        .split('')
        .filter(char => char !== '')
        .map(char => parseInt(char, 10))
        .filter(num => !isNaN(num));

      // this.selectedNumber = Array.from(new Set(digitsArray));
      // this.selectedNumberDuplicate = Array.from(digitsArray);
      // return Array.from(digitsArray);

      return duplicate ? digitsArray : [...new Set(digitsArray)];
    },
    copyDoubleSummaryToClipboard(line, all) {
      let result = [];
      if (all) {
        result = this.lines.reduce((acc, line) => acc.concat(this.getDoubleSummary(line)), []);
      } else {
        result = this.getDoubleSummary(line);
      }

      const filteredSummary = result.filter(number => !this.highlightedNumbers.includes(number)).join('-');
      navigator.clipboard.writeText(filteredSummary).then(() => {
        this.showCopyNotification = true;

        setTimeout(() => {
          this.showCopyNotification = false;
        }, 3000);
      }, (err) => {
        console.error('Failed to copy summary: ', err);
      });
    },
    copyDoubleIncludeDoublesSummaryToClipboard(line, all) {
      let result = [];
      if (all) {
        result = this.lines.reduce((acc, line) => acc.concat(this.getDoubleIncludeDoublesSummary(line)), []);
      } else {
        result = this.getDoubleIncludeDoublesSummary(line);
      }

      const filteredSummary = result.filter(number => !this.highlightedNumbers.includes(number)).join('-');
      navigator.clipboard.writeText(filteredSummary).then(() => {
        this.showCopyNotification = true;

        setTimeout(() => {
          this.showCopyNotification = false;
        }, 3000);
      }, (err) => {
        console.error('Failed to copy summary: ', err);
      });
    },
    copyTripleSummaryToClipboard(line, all) {
      let result = [];
      if (all) {
        result = this.lines.reduce((acc, line) => acc.concat(this.getTripleSummary(line)), []);
      } else {
        result = this.getTripleSummary(line);
      }

      const filteredSummary = result.filter(number => !this.highlightedNumbers.includes(number)).join('-');
      navigator.clipboard.writeText(filteredSummary).then(() => {
        this.showCopyNotification = true;

        setTimeout(() => {
          this.showCopyNotification = false;
        }, 3000);
      }, (err) => {
        console.error('Failed to copy summary: ', err);
      });
    },
    copyTripleIncludeDoublesSummaryToClipboard(line, all) {
      let result = [];
      if (all) {
        result = this.lines.reduce((acc, line) => acc.concat(this.getTripleIncludeDoublesSummary(line)), []);
      } else {
        result = this.getTripleIncludeDoublesSummary(line);
      }

      const filteredSummary = result.filter(number => !this.highlightedNumbers.includes(number)).join('-');
      navigator.clipboard.writeText(filteredSummary).then(() => {
        this.showCopyNotification = true;

        setTimeout(() => {
          this.showCopyNotification = false;
        }, 3000);
      }, (err) => {
        console.error('Failed to copy summary: ', err);
      });
    },
    copyTripleIncludeHamSummaryToClipboard(line, all) {
      let result = [];
      if (all) {
        result = this.lines.reduce((acc, line) => acc.concat(this.getTripleIncludeHamSummary(line)), []);
      } else {
        result = this.getTripleIncludeHamSummary(line);
      }

      const filteredSummary = result.filter(number => !this.highlightedNumbers.includes(number)).join('-');
      navigator.clipboard.writeText(filteredSummary).then(() => {
        this.showCopyNotification = true;

        setTimeout(() => {
          this.showCopyNotification = false;
        }, 3000);
      }, (err) => {
        console.error('Failed to copy summary: ', err);
      });
    },
    resetAll() {
      this.lines = [];
      this.selectedNumber = [];
      this.inputNumbers = '';
      this.highlightedNumbers = [];
      this.includeDoubles = false;
      this.onlyDoubles = false;
      this.combinationLength = '2';
      this.isMultiline = false;
    },
    setCombinationLength(length) {
      this.combinationLength = length;
    },
    toggleNumber(number) {
      if (this.highlightedNumbers.includes(number)) {
        this.highlightedNumbers = this.highlightedNumbers.filter(num => num !== number);
      } else {
        this.highlightedNumbers.push(number);
      }
    },
    summaryNumberClass(number) {
      return {
        'bg-red-500 text-white': this.highlightedNumbers.includes(number),
        'bg-green-300 text-black': !this.highlightedNumbers.includes(number),
        'p-2 m-1 border rounded cursor-pointer': true
      };
    },
    buttonClass(number) {
      return {
        'bg-green-500 text-white': this.selectedNumber.includes(number),
        'bg-gray-300': !this.selectedNumber.includes(number)
      };
    },
    async submitData() {
      if (!isAuthenticated()) {
        this.pendingCalculation = true;
        this.openAuthModal('login');
        return;
      }

      this.syncAccessNotice();

      if (this.accessState.blocked) {
        this.pendingCalculation = false;
        return;
      }

      await this.countWin()
      this.updateSummary()
    },
    openAuthModal(mode = 'login') {
      this.authModalMode = mode === 'register' ? 'register' : 'login';
      this.showAuthModal = true;
    },
    closeAuthModal() {
      this.showAuthModal = false;
      this.pendingCalculation = false;
    },
    openPaymentModal() {
      this.showPaymentModal = true;
    },
    closePaymentModal() {
      this.showPaymentModal = false;
    },
    async handleAuthSuccess() {
      this.showAuthModal = false;
      this.syncAccessNotice();

      if (this.pendingCalculation) {
        this.pendingCalculation = false;
        await this.submitData();
      }
    },
    async countWin() {
      try {
        const response = await fetch('/count.json')
        let data = await response.json()

        data.win += 1

        await fetch('/count.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } catch (error) {
        console.error('Error updating count:', error)
      }
    }
  }
}
</script>


<style scoped>
.container {
  max-width: 600px;
  margin: auto;
}

.textarea {
  width: 100%;
  height: 80px;
  margin-bottom: 0.3em;
  padding: 0.5em;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1.75em;
  resize: vertical;
  text-align: center;
  line-height: 1.5;
  box-sizing: border-box;
  padding: 20;
}

.big {
  height: 500px;
  width: 200px;
}

.buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 0.5em;
}

.number-button {
  padding: 0.5em;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75em;
  transition: background-color 0.3s ease;
}

.radio-group {
  margin-bottom: 1em;
}

.radio-button {
  padding: 0.5em 1em;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75em;
  transition: background-color 0.3s ease;
  margin-right: 0.5em;
}

/* Base styles */
.summary-copy {
  position: relative;
  border-radius: 8px;
  margin-bottom: 1em;
  /* Flex layout for mobile by default */
  display: flex;
  flex-direction: column;
}

.summary-box {
  position: relative;
  padding: 1em;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
  margin-bottom: 1em;
  /* Flex layout for mobile by default */
  display: flex;
  flex-direction: column;
  padding-bottom: 0px;
  padding-top: 0px;
}

.summary-container {
  display: grid;
  gap: 1em;
}

.summary-container-multiline {
  display: grid;
  gap: 1em;
}

@media (min-width: 480px) {
  .summary-container {
    grid-template-columns: repeat(2, 1fr);
  }
  .summary-container-multiline {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 479px) {
  .summary-container {
    grid-template-columns: 1fr;
  }
  .summary-container-multiline {
    grid-template-columns: 1fr;
  }
}

.summary-content {
  padding: 1em 0;
}

.summary-text {
  font-size: 0.75em;
  font-weight: bold;
  margin-bottom: 0.5em;
}

.summary-number {
  display: inline-block;
  padding: 0.5em;
}

.copy-button {
  background-color: #48bb78;
  color: white;
  top: 1em;
  right: 1em;
  padding: 0.5em 1em;
  cursor: pointer;
}

.copy-button:hover {
  background-color: #38a169;
}

.bg-green-500 {
  background-color: #48bb78;
}

.bg-green-300 {
  background-color: #d4f5d4;
}

.bg-red-500 {
  background-color: #f56565;
}

.bg-gray-300 {
  background-color: #e2e8f0;
}

.mb-4 {
  margin-bottom: 20px;
}

.p-4 {
  padding: 10px;
}

.notification {
  position: fixed;
  top: 10px;
  right: 10px;
  padding: 1em;
  background-color: #48bb78;
  color: white;
  border-radius: 4px;
  box-shadow: 0px 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.access-banner {
  margin-bottom: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 8px;
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #f59e0b;
}

.checkbox-group {
  display: flex;
  align-items: center;
  margin-bottom: 1em;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  margin-right: 1em;
  cursor: pointer;
  font-size: 0.75em;
}

.checkbox-group input[type="checkbox"] {
  margin-right: 0.5em;
  width: 1.25em;
  height: 1.25em;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"]:checked {
  background-color: #48bb78;
  border-color: #38a169;
}

.checkbox-group label:hover input[type="checkbox"] {
  background-color: #edf2f7;
}

.button-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1em;
}

.paste-button {
  padding: 0.5em 1em;
  border: none;
  border-radius: 4px;
  background-color: #fbbf24;
  color: white;
  cursor: pointer;
  font-size: 0.75em;
}

.reformat-button {
  padding: 0.5em 1em;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  font-size: 0.75em;
}

.reformat-button:hover {
  background-color: #0056b3;
}

.reset-button {
  background-color: #f56565;
  padding: 0.5em 1em;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 1em;
}

.reset-button:hover {
  background-color: #e53e3e;
}

.paste-button:hover {
  background-color: #f59e0b;
}

h3 {
  margin-bottom: 5px;
  margin-top: 5px;
}

.submit-button {
  padding: 0.5em 1em;
  border: none;
  border-radius: 4px;
  background-color: #38a169;
  color: white;
  cursor: pointer;
  font-size: 1em;
}

.submit-button:hover {
  background-color: #2f855a;
}

.submit-button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.payment-button {
  padding: 0.5em 1em;
  border: none;
  border-radius: 4px;
  background-color: #2563eb;
  color: white;
  cursor: pointer;
  font-size: 1em;
}

.payment-button:hover {
  background-color: #1d4ed8;
}

.full-screen {
  /*position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  background-co*/lor: white;
  padding-left: 20px;
  /*box-sizing: border-box;
  overflow: auto;*/
}

.normal {
  max-width: 600px;
/*  margin-left: 50px;*/
}

.text-red {
  color: red;
  font-weight: bold;
}

.text-center {
  text-align: center;
}

.flex {
  display: flex;
}

.big-box {
  display: flex;
  padding: 20px;
}

.normal-box {
  max-width: 600px;
  margin: auto;
  padding: 10px;
}

</style>
