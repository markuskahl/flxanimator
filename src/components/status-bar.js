import { Events } from '../core/events.js';

export class StatusBarComponent {
    constructor(store) {
        this.store = store;
        this.statusBarEl = document.getElementById('status-bar');
        this.statusTimeout = null;

        this.init();
    }

    init() {
        if (!this.statusBarEl) return;

        this.store.on(Events.STATUS_MESSAGE, (e) => {
            const { message, type = 'info' } = e.detail;
            this.showMessage(message, type);
        });
    }

    showMessage(message, type = 'info') {
        if (!this.statusBarEl) return;

        this.statusBarEl.innerText = message;
        this.statusBarEl.className = `status-bar ${type}`;

        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
            this.statusTimeout = null;
        }

        if (type === 'success' || type === 'error') {
            this.statusTimeout = setTimeout(() => {
                this.statusBarEl.innerText = 'Ready';
                this.statusBarEl.className = 'status-bar';
            }, 4000);
        }
    }
}
