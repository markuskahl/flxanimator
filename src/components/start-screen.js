/**
 * @file start-screen.js
 * @description UI-Komponente für den Willkommens- und Startbildschirm von FlxAnimator.
 * Ermöglicht schnelles Erstellen neuer Projekte, Öffnen existierender Dateien und Zugriff auf Recent Projects.
 * @module components/start-screen
 */

import { Events } from '../core/events.js';

/**
 * @typedef {Object} StartScreenCallbacks
 * @property {() => void} [onNew] - Callback beim Klick auf "Neues Projekt".
 * @property {() => void} [onOpen] - Callback beim Klick auf "Projekt öffnen".
 * @property {(filePath: string) => void} [onOpenRecent] - Callback beim Anklicken eines Recent Projects.
 */

/**
 * Komponente zur Steuerung des Begrüßungsbildschirms und der Recent-Projects-Historie.
 * 
 * @class
 */
export class StartScreenComponent {
    /**
     * Erzeugt eine neue StartScreenComponent.
     * @param {import('../core/store.js').Store} store - Der zentrale Anwendungs-Store.
     * @param {import('../services/file-service.js').FileService} fileService - Dateisystem-Service.
     * @param {StartScreenCallbacks} [callbacks] - Event-Callbacks.
     */
    constructor(store, fileService, callbacks) {
        /**
         * @type {import('../core/store.js').Store}
         */
        this.store = store;

        /**
         * @type {import('../services/file-service.js').FileService}
         */
        this.fileService = fileService;

        /**
         * @type {StartScreenCallbacks}
         */
        this.callbacks = callbacks || {};

        /**
         * DOM-Hauptcontainer des Startbildschirms (`#start-screen`).
         * @type {HTMLElement|null}
         */
        this.startScreenEl = document.getElementById('start-screen');

        /**
         * Button "Neues Projekt" (`#btn-start-new-project`).
         * @type {HTMLButtonElement|null}
         */
        this.btnStartNew = document.getElementById('btn-start-new-project');

        /**
         * Button "Projekt öffnen" (`#btn-start-open-project`).
         * @type {HTMLButtonElement|null}
         */
        this.btnStartOpen = document.getElementById('btn-start-open-project');

        /**
         * Listen-Element für zuletzt geöffnete Projekte (`#recent-projects-list`).
         * @type {HTMLUListElement|null}
         */
        this.recentListEl = document.getElementById('recent-projects-list');

        this.init();
    }

    /**
     * Initialisiert Event-Abonnements auf dem Store und Klick-Handler der Buttons.
     * @listens Events#VIEW_CHANGED
     */
    init() {
        this.store.on(Events.VIEW_CHANGED, (e) => {
            if (this.startScreenEl) {
                this.startScreenEl.style.display = e.detail.view === 'start' ? 'flex' : 'none';
            }
            if (e.detail.view === 'start') {
                this.updateRecentProjects();
            }
        });

        if (this.btnStartNew && this.callbacks.onNew) {
            this.btnStartNew.addEventListener('click', () => this.callbacks.onNew());
        }

        if (this.btnStartOpen && this.callbacks.onOpen) {
            this.btnStartOpen.addEventListener('click', () => this.callbacks.onOpen());
        }

        this.updateRecentProjects();
    }

    /**
     * Lädt die Liste der zuletzt verwendeten Projekte asynchron aus dem FileService
     * und baut die DOM-Listenansicht mit interaktiven Hover- und Klick-Effekten auf.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async updateRecentProjects() {
        if (!this.recentListEl) return;
        const projects = await this.fileService.getRecentProjects();
        this.recentListEl.innerHTML = '';

        if (projects.length === 0) {
            this.recentListEl.innerHTML = `
                <li class="empty-recent" style="padding: 1rem; color: var(--text-muted); text-align: center;">
                    No recent projects
                </li>
            `;
            return;
        }

        projects.forEach(projPath => {
            const li = document.createElement('li');
            li.className = 'recent-item';
            li.style.cssText = `
                background: rgba(255, 255, 255, 0.05);
                padding: 0.8rem 1rem;
                margin-bottom: 0.5rem;
                border-radius: 6px;
                cursor: pointer;
                border: 1px solid transparent;
                display: flex;
                flex-direction: column;
                gap: 0.2rem;
                transition: all 0.2s ease;
            `;

            li.onmouseover = () => {
                li.style.background = 'rgba(255, 255, 255, 0.1)';
                li.style.borderColor = 'var(--accent-color)';
            };
            li.onmouseout = () => {
                li.style.background = 'rgba(255, 255, 255, 0.05)';
                li.style.borderColor = 'transparent';
            };

            const filename = projPath.split('\\').pop().split('/').pop();
            const nameSpan = document.createElement('strong');
            nameSpan.innerText = filename;
            nameSpan.style.color = '#fff';

            const pathSpan = document.createElement('span');
            pathSpan.className = 'recent-path';
            pathSpan.innerText = projPath;
            pathSpan.style.fontSize = '0.8rem';
            pathSpan.style.color = 'var(--text-muted)';

            li.appendChild(nameSpan);
            li.appendChild(pathSpan);

            li.addEventListener('click', () => {
                if (this.callbacks.onOpenRecent) {
                    this.callbacks.onOpenRecent(projPath);
                }
            });

            this.recentListEl.appendChild(li);
        });
    }
}

