import { Events } from '../core/events.js';

export class HeaderComponent {
    constructor(store, callbacks) {
        this.store = store;
        this.callbacks = callbacks || {};

        this.headerEl = document.getElementById('app-header');
        this.btnNew = document.getElementById('btn-new-project');
        this.btnOpen = document.getElementById('btn-open-project');
        this.btnSave = document.getElementById('btn-save-project');
        this.btnSaveAs = document.getElementById('btn-save-as-project');
        this.btnClose = document.getElementById('btn-close-app');

        this.init();
    }

    init() {
        this.store.on(Events.PROJECT_PATH_CHANGED, () => this.updateTitle());
        this.store.on(Events.PROJECT_DIRTY_CHANGED, (e) => {
            this.updateTitle();
            this.updateSaveButton(e.detail.isDirty);
        });

        this.store.on(Events.VIEW_CHANGED, (e) => {
            if (this.headerEl) {
                this.headerEl.style.display = e.detail.view === 'workspace' ? 'flex' : 'none';
            }
        });

        if (this.btnNew && this.callbacks.onNew) {
            this.btnNew.addEventListener('click', () => this.callbacks.onNew());
        }

        if (this.btnOpen && this.callbacks.onOpen) {
            this.btnOpen.addEventListener('click', () => this.callbacks.onOpen());
        }

        if (this.btnSave && this.callbacks.onSave) {
            this.btnSave.addEventListener('click', () => this.callbacks.onSave(false));
        }

        if (this.btnSaveAs && this.callbacks.onSave) {
            this.btnSaveAs.addEventListener('click', () => this.callbacks.onSave(true));
        }

        if (this.btnClose && this.callbacks.onClose) {
            this.btnClose.addEventListener('click', () => this.callbacks.onClose());
        }
    }

    updateTitle() {
        const baseTitle = 'FlxAnimator';
        const filePath = this.store.getCurrentFilePath();
        let filename = 'Untitled';

        if (filePath) {
            filename = filePath.split('\\').pop().split('/').pop();
        }

        const isDirty = this.store.getIsDirty();
        document.title = `${isDirty ? '* ' : ''}${filename} - ${baseTitle}`;
    }

    updateSaveButton(isDirty) {
        if (!this.btnSave) return;
        if (isDirty) {
            this.btnSave.classList.add('dirty');
        } else {
            this.btnSave.classList.remove('dirty');
        }
    }

    flashSaved(forceSaveAs = false) {
        const btn = forceSaveAs ? this.btnSaveAs : this.btnSave;
        if (!btn) return;
        const originalText = btn.innerText;
        btn.innerText = 'Saved!';
        setTimeout(() => {
            btn.innerText = originalText;
        }, 1500);
    }
}
