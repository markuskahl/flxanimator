/**
 * @file new-project-modal.js
 * @description Modaler Dialog zur Initialisierung eines neuen Spritesheet-Projekts.
 * Beinhaltet Bilddateiauswahl via nativem File-Dialog sowie Konfiguration von Frame-Breite, -Höhe, Spacing und Margin.
 * @module components/modals/new-project-modal
 */

/**
 * @typedef {Object} NewProjectModalCallbacks
 * @property {(projectData: import('../../core/store.js').ProjectData) => void} [onCreate] - Callback beim erfolgreichen Erstellen des Projekts.
 */

/**
 * Komponente für den Dialog "Neues Projekt anlegen".
 * 
 * @class
 */
export class NewProjectModalComponent {
    /**
     * Erzeugt eine neue NewProjectModalComponent.
     * @param {import('../../services/file-service.js').FileService} fileService - Dateisystem-Service.
     * @param {NewProjectModalCallbacks} [callbacks] - Event-Callbacks.
     */
    constructor(fileService, callbacks) {
        /**
         * @type {import('../../services/file-service.js').FileService}
         */
        this.fileService = fileService;

        /**
         * @type {NewProjectModalCallbacks}
         */
        this.callbacks = callbacks || {};

        /**
         * Haupt-Modal DOM-Element (`#modal-new-project`).
         * @type {HTMLElement|null}
         */
        this.modal = document.getElementById('modal-new-project');

        /**
         * Textfeld für den Spritesheet-Dateipfad (`#proj-img-path`).
         * @type {HTMLInputElement|null}
         */
        this.imgPathInput = document.getElementById('proj-img-path');

        /**
         * Durchsuchen-Button (`#btn-browse-img`).
         * @type {HTMLButtonElement|null}
         */
        this.btnBrowse = document.getElementById('btn-browse-img');

        /**
         * Eingabefeld für Frame-Breite (`#proj-width`).
         * @type {HTMLInputElement|null}
         */
        this.inputWidth = document.getElementById('proj-width');

        /**
         * Eingabefeld für Frame-Höhe (`#proj-height`).
         * @type {HTMLInputElement|null}
         */
        this.inputHeight = document.getElementById('proj-height');

        /**
         * Eingabefeld für Spacing/Zellenabstand (`#proj-spacing`).
         * @type {HTMLInputElement|null}
         */
        this.inputSpacing = document.getElementById('proj-spacing');

        /**
         * Eingabefeld für Margin/Randabstand (`#proj-margin`).
         * @type {HTMLInputElement|null}
         */
        this.inputMargin = document.getElementById('proj-margin');

        /**
         * Element zur Anzeige von Fehlermeldungen (`#new-project-warning`).
         * @type {HTMLElement|null}
         */
        this.warningEl = document.getElementById('new-project-warning');

        /**
         * Abbrechen-Button (`#btn-cancel-new`).
         * @type {HTMLButtonElement|null}
         */
        this.btnCancel = document.getElementById('btn-cancel-new');

        /**
         * Erstellen-Button (`#btn-create-new`).
         * @type {HTMLButtonElement|null}
         */
        this.btnCreate = document.getElementById('btn-create-new');

        this.init();
    }

    /**
     * Initialisiert Event-Listener für Durchsuchen, Abbrechen und Erstellen.
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

        if (this.btnCreate) {
            this.btnCreate.addEventListener('click', () => this.handleCreate());
        }
    }

    /**
     * Öffnet das Erstellungsmodal und setzt Warnmeldungen zurück.
     */
    open() {
        this.showWarning('');
        if (this.modal) this.modal.classList.add('active');
    }

    /**
     * Schließt das Erstellungsmodal.
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
     * Validiert die eingegebenen Rastermaße und das Spritesheet-Bild
     * und ruft bei Erfolg `callbacks.onCreate` auf.
     */
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

