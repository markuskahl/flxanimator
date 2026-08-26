/**
 * Kapselt alle Electron IPC-Aufrufe über das `window.api` Bridge-Objekt.
 */
export class FileService {
    constructor() {
        this.api = window.api || {};
    }

    /**
     * Öffnet den nativen Dateidialog zur Auswahl eines Spritesheet-Bildes.
     * @returns {Promise<string|null>}
     */
    async selectImage() {
        if (!this.api.selectImage) return null;
        try {
            return await this.api.selectImage();
        } catch (err) {
            console.error('Error selecting image:', err);
            return null;
        }
    }

    /**
     * Ermittelt die optimale Bild-URL (app-asset:// oder Fallback Base64).
     * @param {string} imagePath
     * @returns {Promise<string|null>}
     */
    async resolveImageSource(imagePath) {
        if (!imagePath) return null;

        // Wenn getAssetUrl unterstützt wird (app-asset:// Streaming)
        if (this.api.getAssetUrl) {
            const assetUrl = this.api.getAssetUrl(imagePath);
            if (assetUrl) return assetUrl;
        }

        // Fallback: Base64
        if (this.api.readImageBase64) {
            try {
                return await this.api.readImageBase64(imagePath);
            } catch (err) {
                console.error('Error reading image base64:', err);
            }
        }

        return null;
    }

    /**
     * Speichert das Projekt als JSON.
     * @param {object} projectData
     * @param {string|null} existingPath
     * @returns {Promise<string|null>} Neuer Pfad oder null
     */
    async saveProject(projectData, existingPath = null) {
        if (!this.api.saveProject) return null;

        // Bereinige temporäre UI-Felder (wie imageSrc) vor dem Speichern
        const payload = {
            imagePath: projectData.imagePath,
            config: { ...projectData.config },
            animations: (projectData.animations || []).map(a => ({
                name: a.name,
                fps: a.fps,
                loop: a.loop,
                flipX: a.flipX,
                flipY: a.flipY,
                frames: [...a.frames]
            })),
            defaultAnimation: projectData.defaultAnimation || null
        };

        try {
            return await this.api.saveProject(payload, existingPath);
        } catch (err) {
            console.error('Error saving project:', err);
            return null;
        }
    }

    /**
     * Öffnet den nativen Dateidialog zum Laden einer JSON-Projektdatei.
     * @returns {Promise<{ data: object, filePath: string }|null>}
     */
    async openProject() {
        if (!this.api.openProject) return null;
        try {
            return await this.api.openProject();
        } catch (err) {
            console.error('Error opening project:', err);
            return null;
        }
    }

    /**
     * Ruft die Liste der zuletzt verwendeten Projekte ab.
     * @returns {Promise<string[]>}
     */
    async getRecentProjects() {
        if (!this.api.getRecentProjects) return [];
        try {
            return (await this.api.getRecentProjects()) || [];
        } catch (err) {
            console.error('Error fetching recent projects:', err);
            return [];
        }
    }

    /**
     * Lädt ein Projekt aus der Recent-Projects-Liste.
     * @param {string} filePath
     * @returns {Promise<{ data: object, filePath: string }|null>}
     */
    async openRecentProject(filePath) {
        if (!this.api.openRecentProject) return null;
        try {
            return await this.api.openRecentProject(filePath);
        } catch (err) {
            console.error('Error opening recent project:', err);
            return null;
        }
    }

    /**
     * Schließt die App.
     */
    closeApp() {
        if (this.api.closeApp) this.api.closeApp();
    }

    /**
     * Zeigt den Bestätigungsdialog für ungespeicherte Änderungen.
     * @returns {Promise<number>} 0 = Save, 1 = Don't Save, 2 = Cancel
     */
    async confirmClose() {
        if (!this.api.confirmClose) return 1;
        return await this.api.confirmClose();
    }

    /**
     * Beendet die App ohne weitere Prüfungen.
     */
    forceClose() {
        if (this.api.forceClose) this.api.forceClose();
    }

    /**
     * Registriert einen Handler für das Schließen des Fensters.
     * @param {Function} callback
     */
    onRequestClose(callback) {
        if (this.api.onRequestClose) {
            this.api.onRequestClose(callback);
        }
    }
}
