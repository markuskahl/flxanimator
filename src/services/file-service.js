/**
 * @file file-service.js
 * @description Service-Schicht zur Kapselung aller Dateisystem- und IPC-Interaktionen.
 * Kommuniziert über das im Preload-Skript exponierte `window.api`-Bridge-Objekt mit dem Electron Main-Prozess.
 * @module services/file-service
 */

/**
 * @typedef {Object} OpenProjectResult
 * @property {import('../core/store.js').ProjectData} data - Geparste Projektdaten aus der JSON-Datei.
 * @property {string} filePath - Absoluter Pfad der geöffneten Datei.
 */

/**
 * Kapselt alle asynchronen Datei- und Dialog-Operationen zwischen dem Renderer-Frontend und dem Electron Main-Prozess.
 * 
 * @class
 */
export class FileService {
    /**
     * Erzeugt eine neue Instanz des FileService und bindet die Electron-Preload-Bridge.
     */
    constructor() {
        /**
         * Das globale IPC-Bridge-Objekt aus dem Preload-Skript (`preload.js`).
         * @type {any}
         */
        this.api = window.api || {};
    }

    /**
     * Öffnet den nativen System-Dateiauswahldialog zur Wahl eines Spritesheet-Bildes (PNG, JPG, WEBP).
     *
     * @returns {Promise<string|null>} Absoluter Dateipfad des gewählten Bildes oder `null`, falls abgebrochen.
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
     * Löst den Dateipfad in eine renderfähige Bildquelle auf:
     * Bevorzugt das performante, streamingfähige `app-asset://`-Protokoll und fällt bei Bedarf auf Base64 zurück.
     *
     * @param {string} imagePath - Absoluter Dateipfad auf der Festplatte.
     * @returns {Promise<string|null>} Geladene URL oder Daten-URI, andernfalls `null`.
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
     * Speichert das Projekt als formatierte JSON-Datei auf der Festplatte.
     * Bereinigt zuvor temporäre Frontend-Felder (wie `imageSrc`).
     *
     * @param {import('../core/store.js').ProjectData} projectData - Die zu speichernden Projektdaten.
     * @param {string|null} [existingPath=null] - Bestehender Pfad für schnelles Speichern (Strg+S) oder null für Dateidialog (Save As).
     * @returns {Promise<string|null>} Der Pfad, unter dem die Datei gespeichert wurde, oder `null` bei Abbruch/Fehler.
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
     * Öffnet den nativen Dateidialog zum Auswählen und Laden einer bestehenden `.json`-Projektdatei.
     *
     * @returns {Promise<OpenProjectResult|null>} Geladene Projektdaten mit Dateipfad oder `null` bei Abbruch.
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
     * Ruft die persistierte Liste der zuletzt verwendeten Projektdateien ab.
     *
     * @returns {Promise<string[]>} Array mit maximal 10 Dateipfaden kürzlich geöffneter Projekte.
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
     * Lädt eine Projektdatei direkt anhand ihres absoluten Pfades aus der Liste der zuletzt geöffneten Projekte.
     *
     * @param {string} filePath - Absoluter Pfad der zu ladenden JSON-Projektdatei.
     * @returns {Promise<OpenProjectResult|null>} Geladene Projektdaten oder `null` bei Fehler.
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
     * Sendet eine IPC-Anforderung an das Hauptfenster, die Anwendung ordnungsgemäß zu schließen.
     */
    closeApp() {
        if (this.api.closeApp) this.api.closeApp();
    }

    /**
     * Zeigt eine native Dialogbox an, wenn ungespeicherte Änderungen vorliegen.
     *
     * @returns {Promise<number>} Antwortcode: `0` = Speichern, `1` = Nicht speichern, `2` = Abbrechen.
     */
    async confirmClose() {
        if (!this.api.confirmClose) return 1;
        return await this.api.confirmClose();
    }

    /**
     * Beendet die Anwendung sofort und ohne weitere Bestätigungsdialoge.
     */
    forceClose() {
        if (this.api.forceClose) this.api.forceClose();
    }

    /**
     * Registriert einen Event-Handler für das Schließen-Signal des Electron-Fensterrahmens.
     *
     * @param {() => void} callback - Callback-Funktion beim Schließen.
     */
    onRequestClose(callback) {
        if (this.api.onRequestClose) {
            this.api.onRequestClose(callback);
        }
    }
}

