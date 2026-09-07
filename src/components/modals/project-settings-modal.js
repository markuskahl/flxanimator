/**
 * @file project-settings-modal.js
 * @description Modaler Dialog zur Laufzeit-Konfiguration der Projekteinstellungen.
 * Ermöglicht das Ändern des Spritesheet-Bildpfads sowie von Frame-Breite, -Höhe, Spacing und Margin.
 * @module components/modals/project-settings-modal
 */

/**
 * @typedef {Object} ProjectSettingsModalCallbacks
 * @property {(settings: { imagePath: string, config: import('../../core/store.js').SpritesheetConfig }) => void} [onSave] - Callback beim Speichern.
 */

/**
 * Komponente für den Dialog "Project Settings".
 * 
 * @class
 */
export class ProjectSettingsModalComponent {
    /**
     * Erzeugt eine neue ProjectSettingsModalComponent.
     * @param {import('../../core/store.js').Store} store - Der zentrale Anwendungs-Store.
     * @param {import('../../services/file-service.js').FileService} fileService - Dateisystem-Service.
     * @param {ProjectSettingsModalCallbacks} [callbacks] - Event-Callbacks.
     */
    constructor(store, fileService, callbacks) {
        /**
         * @type {import('../../core/store.js').Store}
         */
        this.store = store;

        /**
         * @type {import('../../services/file-service.js').FileService}
         */
        this.fileService = fileService;

        /**
         * @type {ProjectSettingsModalCallbacks}
         */
        this.callbacks = callbacks || {};

        /**
         * Haupt-Modal DOM-Element (`#modal-project-settings`).
         * @type {HTMLElement|null}
         */
        this.modal = document.getElementById('modal-project-settings');

        /**
         * Textfeld für den Spritesheet-Dateipfad (`#settings-img-path`).
         * @type {HTMLInputElement|null}
         */
        this.imgPathInput = document.getElementById('settings-img-path');

        /**
         * Durchsuchen-Button (`#btn-browse-settings-img`).
         * @type {HTMLButtonElement|null}
         */
        this.btnBrowse = document.getElementById('btn-browse-settings-img');

        /**
         * Eingabefeld für Frame-Breite (`#settings-width`).
         * @type {HTMLInputElement|null}
         */
        this.inputWidth = document.getElementById('settings-width');

        /**
         * Eingabefeld für Frame-Höhe (`#settings-height`).
         * @type {HTMLInputElement|null}
         */
        this.inputHeight = document.getElementById('settings-height');

        /**
         * Eingabefeld für Spacing/Zellenabstand (`#settings-spacing`).
         * @type {HTMLInputElement|null}
         */
        this.inputSpacing = document.getElementById('settings-spacing');

        /**
         * Eingabefeld für Margin/Randabstand (`#settings-margin`).
         * @type {HTMLInputElement|null}
         */
        this.inputMargin = document.getElementById('settings-margin');

        /**
         * Element zur Anzeige von Fehlermeldungen (`#settings-warning`).
         * @type {HTMLElement|null}
         */
        this.warningEl = document.getElementById('settings-warning');

        /**
         * Abbrechen-Button (`#btn-cancel-settings`).
         * @type {HTMLButtonElement|null}
         */
        this.btnCancel = document.getElementById('btn-cancel-settings');

        /**
         * Speichern-Button (`#btn-save-settings`).
         * @type {HTMLButtonElement|null}
         */
        this.btnSave = document.getElementById('btn-save-settings');

        this.init();
    }

    /**
     * Initialisiert Event-Listener für Durchsuchen, Abbrechen und Speichern.
     */
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

        if (this.btnSave) {
            this.btnSave.addEventListener('click', () => this.handleSave());
        }
    }

    /**
     * Öffnet das Einstellungsmodal und befüllt es mit den aktuellen Werten des Projekts.
     */
    open() {
        const project = this.store.getProject();
        if (this.imgPathInput) this.imgPathInput.value = project.imagePath || '';
        if (this.inputWidth) this.inputWidth.value = project.config.width || 16;
        if (this.inputHeight) this.inputHeight.value = project.config.height || 16;
        if (this.inputSpacing) this.inputSpacing.value = project.config.spacing ?? 0;
        if (this.inputMargin) this.inputMargin.value = project.config.margin ?? 0;

        this.showWarning('');
        if (this.modal) this.modal.classList.add('active');
    }

    /**
     * Schließt das Einstellungsmodal.
     */
    close() {
        if (this.modal) this.modal.classList.remove('active');
    }

    /**
     * Zeigt oder verbirgt einen Validierungshinweis im Dialog.
     * @param {string} message - Fehlermeldung oder leerer String zum Ausblenden.
     */
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

    /**
     * Validiert und übernimmt die Einstellungen.
     * @async
     */
    async handleSave() {
        const imgPath = this.imgPathInput ? this.imgPathInput.value.trim() : '';
        if (!imgPath) {
            this.showWarning('Please select a spritesheet image.');
            return;
        }

        const width = parseInt(this.inputWidth.value, 10);
        const height = parseInt(this.inputHeight.value, 10);
        const spacing = parseInt(this.inputSpacing.value, 10);
        const margin = parseInt(this.inputMargin.value, 10);

        if (isNaN(width) || width <= 0) {
            this.showWarning('Frame Width must be a positive integer.');
            return;
        }
        if (isNaN(height) || height <= 0) {
            this.showWarning('Frame Height must be a positive integer.');
            return;
        }
        if (isNaN(spacing) || spacing < 0) {
            this.showWarning('Spacing must be a non-negative integer.');
            return;
        }
        if (isNaN(margin) || margin < 0) {
            this.showWarning('Margin must be a non-negative integer.');
            return;
        }

        const currentProject = this.store.getProject();
        const imageChanged = imgPath !== currentProject.imagePath;

        if (imageChanged) {
            const imageSrc = await this.fileService.resolveImageSource(imgPath);
            if (!imageSrc) {
                this.showWarning('Failed to load the selected spritesheet image.');
                return;
            }
            this.store.updateSpritesheet(imgPath, imageSrc);
        }

        this.store.updateConfig({ width, height, spacing, margin });

        if (this.callbacks.onSave) {
            this.callbacks.onSave({
                imagePath: imgPath,
                config: { width, height, spacing, margin }
            });
        }

        this.close();
        this.store.showStatus('Project settings updated.', 'success');
    }
}
