export class NewAnimModalComponent {
    constructor(callbacks) {
        this.callbacks = callbacks || {};

        this.modal = document.getElementById('modal-new-anim');
        this.nameInput = document.getElementById('new-anim-name');
        this.fpsInput = document.getElementById('new-anim-fps');
        this.loopInput = document.getElementById('new-anim-loop');
        this.flipXInput = document.getElementById('new-anim-flip-x');
        this.flipYInput = document.getElementById('new-anim-flip-y');
        this.warningEl = document.getElementById('new-anim-warning');
        this.btnCancel = document.getElementById('btn-cancel-new-anim');
        this.btnConfirm = document.getElementById('btn-confirm-new-anim');

        this.init();
    }

    init() {
        if (!this.modal) return;

        if (this.btnCancel) {
            this.btnCancel.addEventListener('click', () => this.close());
        }

        if (this.btnConfirm) {
            this.btnConfirm.addEventListener('click', () => this.handleConfirm());
        }
    }

    open() {
        this.showWarning('');
        if (this.nameInput) this.nameInput.value = '';
        if (this.fpsInput) this.fpsInput.value = '15';
        if (this.loopInput) this.loopInput.checked = true;
        if (this.flipXInput) this.flipXInput.checked = false;
        if (this.flipYInput) this.flipYInput.checked = false;

        if (this.modal) this.modal.classList.add('active');
        if (this.nameInput) this.nameInput.focus();
    }

    close() {
        if (this.modal) this.modal.classList.remove('active');
    }

    showWarning(message) {
        if (!this.warningEl) return;
        if (message) {
            this.warningEl.innerText = message;
            this.warningEl.classList.add('active');
        } else {
            this.warningEl.classList.remove('active');
            this.warningEl.innerText = '';
        }
    }

    handleConfirm() {
        const name = this.nameInput ? this.nameInput.value.trim() : '';
        if (!name) {
            this.showWarning('The animation name cannot be empty.');
            return;
        }

        const fps = parseInt(this.fpsInput.value, 10) || 15;
        const loop = this.loopInput ? this.loopInput.checked : true;
        const flipX = this.flipXInput ? this.flipXInput.checked : false;
        const flipY = this.flipYInput ? this.flipYInput.checked : false;

        if (this.callbacks.onConfirm) {
            this.callbacks.onConfirm({
                name,
                fps,
                loop,
                flipX,
                flipY,
                frames: []
            });
        }

        this.close();
    }
}
