/**
 * @file header.js
 * @description UI-Komponente für die obere Kopfleiste (App Header).
 * Verwaltet Datei-Aktionen (Neu, Öffnen, Speichern, Speichern unter, Schließen),
 * Fenstertitel-Synchronisation inkl. Dirty-Marker (`*`) und Visuelles Feedback beim Speichern.
 * @module components/header
 */

import { Events } from '../core/events.js';

/**
 * @typedef {Object} HeaderCallbacks
 * @property {() => void} [onNew] - Callback bei "Neues Projekt".
 * @property {() => void} [onOpen] - Callback bei "Projekt öffnen".
 * @property {(forceSaveAs: boolean) => void} [onSave] - Callback bei "Speichern" (false) oder "Speichern unter" (true).
 * @property {() => void} [onClose] - Callback beim Schließen des Fensters.
 */

/**
 * Komponente für die obere Hauptmenüleiste und Fensterstatus-Aktualisierung.
 * 
 * @class
 */
export class HeaderComponent {
    /**
     * Erzeugt eine neue HeaderComponent.
     * @param {import('../core/store.js').Store} store - Der zentrale Anwendungs-Store.
     * @param {HeaderCallbacks} [callbacks] - Event-Callbacks für Datei- und App-Aktionen.
     */
    constructor(store, callbacks) {
        /**
         * @type {import('../core/store.js').Store}
         */
        this.store = store;

        /**
         * @type {HeaderCallbacks}
         */
        this.callbacks = callbacks || {};

        /**
         * DOM-Element der Menüleiste (`#app-header`).
         * @type {HTMLElement|null}
         */
        this.headerEl = document.getElementById('app-header');

        /**
         * Button "Neu" (`#btn-new-project`).
         * @type {HTMLButtonElement|null}
         */
        this.btnNew = document.getElementById('btn-new-project');

        /**
         * Button "Öffnen" (`#btn-open-project`).
         * @type {HTMLButtonElement|null}
         */
        this.btnOpen = document.getElementById('btn-open-project');

        /**
         * Button "Speichern" (`#btn-save-project`).
         * @type {HTMLButtonElement|null}
         */
        this.btnSave = document.getElementById('btn-save-project');

        /**
         * Button "Speichern unter..." (`#btn-save-as-project`).
         * @type {HTMLButtonElement|null}
         */
        this.btnSaveAs = document.getElementById('btn-save-as-project');

        /**
         * Button "Schließen" (`#btn-close-app`).
         * @type {HTMLButtonElement|null}
         */
        this.btnClose = document.getElementById('btn-close-app');

        this.init();
    }

    /**
     * Registriert Store-Events für Pfad- und Dirty-Status sowie Button-Klick-Handler.
     * @listens Events#PROJECT_PATH_CHANGED
     * @listens Events#PROJECT_DIRTY_CHANGED
     * @listens Events#VIEW_CHANGED
     */
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

    /**
     * Aktualisiert den Browsertitel (`document.title`) im Format `[* ]<Dateiname> - FlxAnimator`.
     */
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

    /**
     * Hebt den Speichern-Button optisch hervor (CSS `.dirty`), wenn ungespeicherte Änderungen vorliegen.
     * @param {boolean} isDirty - Status der ungespeicherten Änderungen.
     */
    updateSaveButton(isDirty) {
        if (!this.btnSave) return;
        if (isDirty) {
            this.btnSave.classList.add('dirty');
        } else {
            this.btnSave.classList.remove('dirty');
        }
    }

    /**
     * Zeigt kurzzeitig den Text "Saved!" auf dem jeweiligen Speichern-Button als visuelle Rückmeldung an.
     * @param {boolean} [forceSaveAs=false] - True, falls der Save-As-Button animiert werden soll.
     */
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

