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

class App {
    constructor() {
        this.store = new Store();
        this.fileService = new FileService();

        this.workspaceTopEl = document.getElementById('workspace-top');
        this.workspaceTimelineEl = document.getElementById('workspace-timeline');

        this.init();
    }

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

    async handleOpenProject() {
        const result = await this.fileService.openProject();
        if (result && result.data) {
            await this.loadProjectData(result.data, result.filePath);
        }
    }

    async handleOpenRecent(projPath) {
        const result = await this.fileService.openRecentProject(projPath);
        if (result && result.data) {
            await this.loadProjectData(result.data, result.filePath);
        } else {
            this.store.showStatus('Failed to load project file.', 'error');
            this.startScreen.updateRecentProjects();
        }
    }

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

    handleCloseApp() {
        this.fileService.closeApp();
    }

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
