/**
 * @file new-anim-modal.js
 * @description Modaler Dialog zum Erstellen und Konfigurieren einer neuen Animationssequenz.
 * Erfasst Name, FPS, Loop-Modus und initiale Spiegelungs-Flags mit Eingabevalidierung.
 * @module components/modals/new-anim-modal
 */

/**
 * @typedef {Object} NewAnimModalCallbacks
 * @property {(animData: import('../../core/store.js').AnimationData) => void} [onConfirm] - Callback bei Bestätigung der Animation.
 */

/**
 * Komponente für den Dialog "Neue Animation hinzufügen".
 * 
 * @class
 */
export class NewAnimModalComponent {
    /**
     * Erzeugt eine neue NewAnimModalComponent.
     * @param {NewAnimModalCallbacks} [callbacks] - Event-Callbacks.
     */
    constructor(callbacks) {
        /**
         * @type {NewAnimModalCallbacks}
         */
        this.callbacks = callbacks || {};

        /**
         * Haupt-Modal DOM-Element (`#modal-new-anim`).
         * @type {HTMLElement|null}
         */
        this.modal = document.getElementById('modal-new-anim');

        /**
         * Eingabefeld für den Animationsnamen (`#new-anim-name`).
         * @type {HTMLInputElement|null}
         */
        this.nameInput = document.getElementById('new-anim-name');

        /**
         * Eingabefeld für die Bildwiederholrate (FPS) (`#new-anim-fps`).
         * @type {HTMLInputElement|null}
         */
        this.fpsInput = document.getElementById('new-anim-fps');

        /**
         * Checkbox für Endlosschleife (`#new-anim-loop`).
         * @type {HTMLInputElement|null}
         */
        this.loopInput = document.getElementById('new-anim-loop');

        /**
         * Checkbox für horizontale Spiegelung (`#new-anim-flip-x`).
         * @type {HTMLInputElement|null}
         */
        this.flipXInput = document.getElementById('new-anim-flip-x');

        /**
         * Checkbox für vertikale Spiegelung (`#new-anim-flip-y`).
         * @type {HTMLInputElement|null}
         */
        this.flipYInput = document.getElementById('new-anim-flip-y');

        /**
         * Container für Fehlermeldungen (`#new-anim-warning`).
         * @type {HTMLElement|null}
         */
        this.warningEl = document.getElementById('new-anim-warning');

        /**
         * Abbrechen-Button (`#btn-cancel-new-anim`).
         * @type {HTMLButtonElement|null}
         */
        this.btnCancel = document.getElementById('btn-cancel-new-anim');

        /**
         * Bestätigen-Button (`#btn-confirm-new-anim`).
         * @type {HTMLButtonElement|null}
         */
        this.btnConfirm = document.getElementById('btn-confirm-new-anim');

        this.init();
    }

    /**
     * Initialisiert Klick-Events für Abbrechen und Bestätigen.
     */
    init() {
        if (!this.modal) return;

        if (this.btnCancel) {
            this.btnCancel.addEventListener('click', () => this.close());
        }

        if (this.btnConfirm) {
            this.btnConfirm.addEventListener('click', () => this.handleConfirm());
        }
    }

    /**
     * Öffnet den modalen Dialog, setzt Felder auf Standardwerte zurück und fokussiert das Namensfeld.
     */
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

    /**
     * Schließt den modalen Dialog.
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
     * Validiert die Benutzereingaben und löst bei Erfolg den `onConfirm`-Callback aus.
     */
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

