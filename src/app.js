/**
 * @file app.js
 * @description Haupteinstiegspunkt und Orchestrator des Frontend-Renderers von FlxAnimator.
 * Initialisiert und verknüpft alle UI-Komponenten mit dem zentralen Store und dem FileService,
 * konfiguriert globale Tastenkombinationen (Shortcuts) und handhabt den Anwendungs-Lebenszyklus.
 * @module app
 */

import { Store } from './core/store.js';
import { Events } from './core/events.js';
import { validateProject } from './core/validator.js';
import { FileService } from './services/file-service.js';

import { StatusBarComponent } from './components/status-bar.js';
import { HeaderComponent } from './components/header.js';
import { StartScreenComponent } from './components/start-screen.js';
import { SidebarComponent } from './components/sidebar.js';
import { GridCanvasComponent } from './components/grid-canvas.js';
import { PreviewCanvasComponent } from './components/preview-canvas.js';
import { TimelineComponent } from './components/timeline.js';
import { ResizerComponent } from './components/resizer.js';
import { NewProjectModalComponent } from './components/modals/new-project-modal.js';
import { NewAnimModalComponent } from './components/modals/new-anim-modal.js';

/**
 * Haupt-Anwendungsklasse (App Controller).
 * Orchestriert alle Teilkomponenten, verwaltet Benutzerinteraktionen und bindet native Electron-Events an.
 * 
 * @class
 */
class App {
    /**
     * Erzeugt die App-Instanz, initialisiert Store und FileService und startet die Komponentenverdrahtung.
     */
    constructor() {
        /**
         * Zentraler reaktiver Zustandsspeicher.
         * @type {Store}
         */
        this.store = new Store();

        /**
         * Service für Dateidialoge und IPC-Kommunikation.
         * @type {FileService}
         */
        this.fileService = new FileService();

        /**
         * DOM-Container für den oberen Arbeitsbereich (Grid & Preview).
         * @type {HTMLElement|null}
         */
        this.workspaceTopEl = document.getElementById('workspace-top');

        /**
         * DOM-Container für die Timeline.
         * @type {HTMLElement|null}
         */
        this.workspaceTimelineEl = document.getElementById('workspace-timeline');

        this.init();
    }

    /**
     * Instanziiert alle Subkomponenten, registriert globale Event-Listener und View-Wechsel.
     */
    init() {
        // Komponenten initialisieren
        this.statusBar = new StatusBarComponent(this.store);

        this.newProjectModal = new NewProjectModalComponent(this.fileService, {
            onCreate: (projectData) => this.handleCreateProject(projectData)
        });

        this.newAnimModal = new NewAnimModalComponent({
            onConfirm: (animData) => this.store.addAnimation(animData)
        });

        this.header = new HeaderComponent(this.store, {
            onNew: () => this.newProjectModal.open(),
            onOpen: () => this.handleOpenProject(),
            onSave: (forceSaveAs) => this.handleSaveProject(forceSaveAs),
            onClose: () => this.handleCloseApp()
        });

        this.startScreen = new StartScreenComponent(this.store, this.fileService, {
            onNew: () => this.newProjectModal.open(),
            onOpen: () => this.handleOpenProject(),
            onOpenRecent: (projPath) => this.handleOpenRecent(projPath)
        });

        this.sidebar = new SidebarComponent(this.store, {
            onAddAnimation: () => this.newAnimModal.open()
        });

        this.gridCanvas = new GridCanvasComponent(this.store);
        this.previewCanvas = new PreviewCanvasComponent(this.store);
        this.timeline = new TimelineComponent(this.store);
        this.resizer = new ResizerComponent();

        // Workspace View Wechsel Event-Handler
        this.store.on(Events.VIEW_CHANGED, (e) => {
            const isWorkspace = e.detail.view === 'workspace';
            if (this.workspaceTopEl) this.workspaceTopEl.style.display = isWorkspace ? 'flex' : 'none';
            if (this.workspaceTimelineEl) this.workspaceTimelineEl.style.display = isWorkspace ? 'flex' : 'none';
        });

        this.setupKeyboardShortcuts();
        this.setupAppLifecycle();
    }

    /**
     * Erstellt ein neues Projekt basierend auf den im Modal eingegebenen Daten,
     * lädt das Spritesheet-Bild und wechselt in den Workspace.
     *
     * @async
     * @param {import('./core/store.js').ProjectData} projectData - Initiale Projektdaten.
     * @returns {Promise<void>}
     */
    async handleCreateProject(projectData) {
        const imageSrc = await this.fileService.resolveImageSource(projectData.imagePath);
        if (!imageSrc) {
            this.store.showStatus('Failed to load spritesheet image.', 'error');
            return;
        }

        this.store.setProject(projectData, null);
        this.store.setSpritesheetSource(projectData.imagePath, imageSrc);
        this.store.markDirty();
        this.store.setView('workspace');
        this.store.showStatus('New project created.', 'success');
        this.startScreen.updateRecentProjects();
    }

    /**
     * Öffnet den Dateidialog zum Laden eines bestehenden Projekts.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async handleOpenProject() {
        const result = await this.fileService.openProject();
        if (result && result.data) {
            await this.loadProjectData(result.data, result.filePath);
        }
    }

    /**
     * Lädt ein Projekt aus der Recent-Projects-Liste.
     *
     * @async
     * @param {string} projPath - Absoluter Pfad der JSON-Projektdatei.
     * @returns {Promise<void>}
     */
    async handleOpenRecent(projPath) {
        const result = await this.fileService.openRecentProject(projPath);
        if (result && result.data) {
            await this.loadProjectData(result.data, result.filePath);
        } else {
            this.store.showStatus('Failed to load project file.', 'error');
            this.startScreen.updateRecentProjects();
        }
    }

    /**
     * Validiert und lädt JSON-Projektdaten in den Store und löst die Bildquelle auf.
     *
     * @async
     * @param {Object} data - Geparste JSON-Rohdaten des Projekts.
     * @param {string} filePath - Dateipfad des Projekts auf der Festplatte.
     * @returns {Promise<void>}
     */
    async loadProjectData(data, filePath) {
        const validation = validateProject(data);
        if (!validation.valid) {
            this.store.showStatus(`Invalid project: ${validation.errors[0]}`, 'error');
            return;
        }

        const imageSrc = await this.fileService.resolveImageSource(data.imagePath);
        if (!imageSrc) {
            this.store.showStatus('Failed to load spritesheet image.', 'error');
            return;
        }

        this.store.setProject(data, filePath);
        this.store.setSpritesheetSource(data.imagePath, imageSrc);
        this.store.setView('workspace');
        this.store.showStatus('Project loaded.', 'success');
        this.startScreen.updateRecentProjects();
    }

    /**
     * Speichert das aktuelle Projekt (Save oder Save As) und aktualisiert Recent Projects.
     *
     * @async
     * @param {boolean} [forceSaveAs=false] - True erzwingt den Dateidialog (Save As).
     * @returns {Promise<boolean>} True bei erfolgreicher Speicherung, sonst false.
     */
    async handleSaveProject(forceSaveAs = false) {
        const project = this.store.getProject();
        if (!project.imagePath) {
            this.store.showStatus('There is no project to save yet.', 'error');
            return false;
        }

        const existingPath = forceSaveAs ? null : this.store.getCurrentFilePath();
        const savedPath = await this.fileService.saveProject(project, existingPath);

        if (savedPath) {
            this.store.setCurrentFilePath(savedPath);
            this.store.clearDirty();
            this.header.flashSaved(forceSaveAs);
            this.store.showStatus('Project saved successfully.', 'success');
            this.startScreen.updateRecentProjects();
            return true;
        }
        return false;
    }

    /**
     * Initiiert das Schließen der Anwendung über den FileService.
     */
    handleCloseApp() {
        this.fileService.closeApp();
    }

    /**
     * Registriert globale Tastenkürzel für Speichern (Strg+S / Strg+Shift+S), Undo (Strg+Z) und Redo (Strg+Y / Strg+Shift+Z).
     */
    setupKeyboardShortcuts() {
        window.addEventListener('keydown', async (e) => {
            const isCmdOrCtrl = e.ctrlKey || e.metaKey;

            // Strg+S / Strg+Shift+S (Speichern)
            if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
                e.preventDefault();
                await this.handleSaveProject(e.shiftKey);
                return;
            }

            // Strg+Z (Undo)
            if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.store.undo();
                return;
            }

            // Strg+Y oder Strg+Shift+Z (Redo)
            if ((isCmdOrCtrl && e.key.toLowerCase() === 'y') || (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z')) {
                e.preventDefault();
                this.store.redo();
                return;
            }
        });
    }

    /**
     * Handhabt den Lebenszyklus des Schließvorgangs mit Überprüfung auf ungespeicherte Änderungen.
     */
    setupAppLifecycle() {
        this.fileService.onRequestClose(async () => {
            if (!this.store.getIsDirty()) {
                this.fileService.forceClose();
                return;
            }

            // User fragen, da es ungespeicherte Änderungen gibt
            const response = await this.fileService.confirmClose();
            // response: 0 = Save, 1 = Don't Save, 2 = Cancel
            if (response === 0) {
                const saved = await this.handleSaveProject(false);
                if (saved) {
                    this.fileService.forceClose();
                }
            } else if (response === 1) {
                this.fileService.forceClose();
            }
            // Bei 2 (Cancel) bleibt das Fenster geöffnet
        });
    }
}

// Initialisiere die Anwendung sobald der DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
    window.__flxApp = new App();
});

