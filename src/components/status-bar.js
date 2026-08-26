/**
 * @file status-bar.js
 * @description UI-Komponente für die Fußzeilen-Statusleiste (Status Bar).
 * Zeigt Systemmeldungen, Benachrichtigungen über Speicher- und Ladevorgänge sowie Fehler mit automatischer Rücksetzung an.
 * @module components/status-bar
 */

import { Events } from '../core/events.js';

/**
 * Komponente zur Steuerung und Aktualisierung der Statusleiste am unteren Bildschirmrand.
 * 
 * @class
 */
export class StatusBarComponent {
    /**
     * Erzeugt eine neue StatusBarComponent.
     * @param {import('../core/store.js').Store} store - Der zentrale Anwendungs-Store.
     */
    constructor(store) {
        /**
         * @type {import('../core/store.js').Store}
         */
        this.store = store;

        /**
         * DOM-Element der Statusleiste (`#status-bar`).
         * @type {HTMLElement|null}
         */
        this.statusBarEl = document.getElementById('status-bar');

        /**
         * DOM-Element des Statustextes (`#status-message`).
         * @type {HTMLElement|null}
         */
        this.statusMessageEl = document.getElementById('status-message') || this.statusBarEl;

        /**
         * Timer-Handle für das automatische Zurücksetzen der Nachricht.
         * @type {number|null}
         */
        this.statusTimeout = null;

        this.init();
    }

    /**
     * Initialisiert Event-Abonnements auf dem Store.
     * @listens Events#STATUS_MESSAGE
     */
    init() {
        if (!this.statusBarEl) return;

        this.store.on(Events.STATUS_MESSAGE, (e) => {
            const { message, type = 'info' } = e.detail;
            this.showMessage(message, type);
        });
    }

    /**
     * Zeigt eine formatierte Statusnachricht mit optionalem Farb-Typ an und startet einen Auto-Reset-Timer.
     *
     * @param {string} message - Der anzuzeigende Statustext.
     * @param {'info'|'success'|'error'|'warn'} [type='info'] - Nachrichtentyp für CSS-Styling.
     */
    showMessage(message, type = 'info') {
        if (!this.statusBarEl) return;

        if (this.statusMessageEl) {
            this.statusMessageEl.innerText = message;
        }
        this.statusBarEl.className = `status-bar ${type}`;

        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
            this.statusTimeout = null;
        }

        if (type === 'success' || type === 'error') {
            this.statusTimeout = setTimeout(() => {
                if (this.statusMessageEl) {
                    this.statusMessageEl.innerText = 'Ready';
                }
                this.statusBarEl.className = 'status-bar';
            }, 4000);
        }
    }
}

