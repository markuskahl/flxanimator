export class NewProjectModalComponent {
    constructor(fileService, callbacks) {
        this.fileService = fileService;
        this.callbacks = callbacks || {};

        this.modal = document.getElementById('modal-new-project');
        this.imgPathInput = document.getElementById('proj-img-path');
        this.btnBrowse = document.getElementById('btn-browse-img');
        this.inputWidth = document.getElementById('proj-width');
        this.inputHeight = document.getElementById('proj-height');
        this.inputSpacing = document.getElementById('proj-spacing');
        this.inputMargin = document.getElementById('proj-margin');
        this.warningEl = document.getElementById('new-project-warning');
        this.btnCancel = document.getElementById('btn-cancel-new');
        this.btnCreate = document.getElementById('btn-create-new');

        this.init();
    }

    init() {
        if (!this.modal) return;

        if (this.btnCancel) {
            this.btnCancel.addEventListener('click', () => this.close());
        }

        if (this.btnBrowse) {
            this.btnBrowse.addEventListener('click', async () => {
                const filePath = await this.fileService.selectImage();
                if (filePath && this.imgPathInput) {
                    this.imgPathInput.value = filePath;
                    this.showWarning('');
                }
            });
        }

        if (this.btnCreate) {
            this.btnCreate.addEventListener('click', () => this.handleCreate());
        }
    }

    open() {
        this.showWarning('');
        if (this.modal) this.modal.classList.add('active');
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

    handleCreate() {
        const imgPath = this.imgPathInput ? this.imgPathInput.value.trim() : '';
        if (!imgPath) {
            this.showWarning('Please select a spritesheet.');
            return;
        }

        const width = parseInt(this.inputWidth.value, 10) || 16;
        const height = parseInt(this.inputHeight.value, 10) || 16;
        const spacing = parseInt(this.inputSpacing.value, 10) || 0;
        const margin = parseInt(this.inputMargin.value, 10) || 0;

        if (this.callbacks.onCreate) {
            this.callbacks.onCreate({
                imagePath: imgPath,
                config: { width, height, spacing, margin },
                animations: [],
                defaultAnimation: null
            });
        }

        this.close();
    }
}
