/**
 * @file preload.js
 * @description Electron Preload-Skript. Dient als sichere, isolierte Kommunikationsbrücke (Context Bridge)
 * zwischen dem Electron Main-Prozess (Node.js) und dem Renderer-Prozess (DOM/Browser-Kontext).
 * Exponiert das globale Objekt `window.api`.
 * @module preload
 */

const { contextBridge, ipcRenderer } = require('electron');
const { pathToFileURL } = require('url');

/**
 * Exponiert sichere IPC-Funktionen unter dem globalen Namensraum `window.api`.
 * Schützt die Anwendung vor unberechtigtem Node.js-Systemzugriff bei aktiviertem `contextIsolation`.
 */
contextBridge.exposeInMainWorld('api', {
    /**
     * Öffnet den nativen Dateidialog zur Auswahl einer Spritesheet-Bilddatei.
     * @returns {Promise<string|null>} Absoluter Bildpfad oder null.
     */
    selectImage: () => ipcRenderer.invoke('select-image'),

    /**
     * Liest eine Bilddatei ein und gibt sie als Base64 Data-URI zurück (Fallback).
     * @param {string} path - Absoluter Pfad der Bilddatei.
     * @returns {Promise<string|null>} Base64 Data-URI oder null.
     */
    readImageBase64: (path) => ipcRenderer.invoke('read-image-base64', path),

    /**
     * Konvertiert einen lokalen Dateipfad in das sichere, streamingfähige `app-asset://`-Protokoll.
     * @param {string} filePath - Absoluter Dateipfad auf der Festplatte.
     * @returns {string} Die generierte `app-asset://`-URL.
     */
    getAssetUrl: (filePath) => {
        if (!filePath) return '';
        try {
            const fileUrl = pathToFileURL(filePath).toString();
            return fileUrl.replace(/^file:\/\//, 'app-asset://');
        } catch (e) {
            return '';
        }
    },

    /**
     * Speichert das Projekt-JSON über den Main-Prozess auf der Festplatte.
     * @param {Object} data - Bereinigte JSON-Projektdaten.
     * @param {string|null} filePath - Zieldateipfad oder null für Speichern-Unter Dialog.
     * @returns {Promise<string|null>} Gespeicherter Dateipfad oder null.
     */
    saveProject: (data, filePath) => ipcRenderer.invoke('save-project', data, filePath),

    /**
     * Öffnet den nativen Dateidialog zum Laden einer JSON-Projektdatei.
     * @returns {Promise<{ data: Object, filePath: string }|null>} Geladene Projektdaten und Dateipfad.
     */
    openProject: () => ipcRenderer.invoke('open-project'),

    /**
     * Ruft die Liste der zuletzt verwendeten Projektdateien ab.
     * @returns {Promise<string[]>} Liste absoluter Dateipfade.
     */
    getRecentProjects: () => ipcRenderer.invoke('get-recent-projects'),

    /**
     * Lädt eine Projektdatei direkt anhand des Pfades.
     * @param {string} path - Absoluter Dateipfad.
     * @returns {Promise<{ data: Object, filePath: string }|null>} Geladene Projektdaten und Dateipfad.
     */
    openRecentProject: (path) => ipcRenderer.invoke('open-recent-project', path),

    /**
     * Weist den Main-Prozess an, das Anwendungsfenster zu schließen.
     */
    closeApp: () => ipcRenderer.send('close-app'),

    /**
     * Öffnet einen nativen Warndialog für ungespeicherte Änderungen.
     * @returns {Promise<number>} 0 = Speichern, 1 = Nicht speichern, 2 = Abbrechen.
     */
    confirmClose: () => ipcRenderer.invoke('confirm-close'),

    /**
     * Schließt die Anwendung sofort ohne weitere Rückfragen.
     */
    forceClose: () => ipcRenderer.send('force-close'),

    /**
     * Registriert einen Handler für das Fenster-Schließen-Event (z. B. Klick auf rotes X im Fenstertitel).
     * @param {Function} callback - Callback-Funktion.
     */
    onRequestClose: (callback) => ipcRenderer.on('request-close', callback),

    /**
     * Ruft die Versionsnummer der Anwendung aus package.json ab.
     * @returns {Promise<string>} Anwendungsversion.
     */
    getAppVersion: () => ipcRenderer.invoke('get-app-version')
});

