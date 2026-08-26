/**
 * @file main.js
 * @description Electron Main-Prozess für FlxAnimator.
 * Verwaltet das Anwendungsfenster (BrowserWindow), das native Menü, IPC-Kommunikationskanäle,
 * Streaming lokaler Bilddateien über das benutzerdefinierte Protokoll `app-asset://`
 * sowie die Persistenz der zuletzt verwendeten Projektdateien (Recent Projects).
 * @module main
 */

const { app, BrowserWindow, ipcMain, dialog, nativeTheme, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { pathToFileURL, fileURLToPath } = require('url');

// Registriere sicheres Schema für schnelles, speicherschonendes Asset-Streaming
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'app-asset',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            bypassCSP: true,
            stream: true,
            corsEnabled: true
        }
    }
]);

// Chromium Log-Level dämpfen (nur schwerwiegende Fehler)
app.commandLine.appendSwitch('log-level', '3');

// Dunkles Theme erzwingen, um weiße Blitze beim Starten zu verhindern
nativeTheme.themeSource = 'dark';

/**
 * Pfad zum Verzeichnis der Benutzerdaten.
 * @type {string}
 */
const userDataPath = app.getPath('userData');

/**
 * Pfad zur JSON-Datei der zuletzt geöffneten Projekte.
 * @type {string}
 */
const recentProjectsPath = path.join(userDataPath, 'recent-projects.json');

/**
 * Liest die Liste der zuletzt verwendeten Projektdateien aus der JSON-Konfigurationsdatei.
 * Entfernt automatisch Pfade zu nicht mehr existierenden Dateien.
 *
 * @async
 * @function getRecentProjects
 * @returns {Promise<string[]>} Array mit validierten absoluten Dateipfaden.
 */
async function getRecentProjects() {
    try {
        const data = await fs.readFile(recentProjectsPath, 'utf-8');
        let projects = JSON.parse(data);
        
        let validProjects = [];
        let changed = false;
        for (const proj of projects) {
            try {
                await fs.access(proj);
                validProjects.push(proj);
            } catch (err) {
                changed = true;
            }
        }
        
        if (changed) {
            await fs.writeFile(recentProjectsPath, JSON.stringify(validProjects, null, 2), 'utf-8');
        }
        
        return validProjects;
    } catch (e) {
        return [];
    }
}

/**
 * Fügt einen Dateipfad an den Anfang der Recent-Projects-Liste hinzu und begrenzt die Liste auf 10 Einträge.
 *
 * @async
 * @function addRecentProject
 * @param {string} filePath - Absoluter Pfad der geöffneten/gespeicherten Projektdatei.
 * @returns {Promise<void>}
 */
async function addRecentProject(filePath) {
    let projects = await getRecentProjects();
    projects = projects.filter(p => p !== filePath);
    projects.unshift(filePath);
    
    if (projects.length > 10) {
        projects = projects.slice(0, 10);
    }
    
    try {
        await fs.writeFile(recentProjectsPath, JSON.stringify(projects, null, 2), 'utf-8');
    } catch (e) {
        console.error("Failed to save recent projects:", e);
    }
}

/**
 * Erzeugt und konfiguriert das Hauptfenster der Electron-Anwendung.
 *
 * @function createWindow
 * @returns {BrowserWindow} Die erzeugte BrowserWindow-Instanz.
 */
function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        backgroundColor: '#0f1115',
        show: false,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // WICHTIG: Sichert die App ab (Trennung von Node und DOM)
            nodeIntegration: false  // Deaktiviert Node.js direkt im Frontend
        }
    });

    win.setMenu(null);
    win.loadFile('index.html');
    
    win.once('ready-to-show', () => {
        win.show();
    });

    let isClosingConfirmed = false;
    win.on('close', (e) => {
        if (!isClosingConfirmed) {
            e.preventDefault();
            win.webContents.send('request-close');
        }
    });

    ipcMain.once('force-close', () => {
        isClosingConfirmed = true;
        app.quit();
    });

    return win;
}

// Electron Lifecycle Initialisierung
app.whenReady().then(() => {
    /**
     * Protokoll-Handler für das benutzerdefinierte `app-asset://`-Schema.
     * Ermöglicht extrem schnelles, speicherschonendes Streamen lokaler Spritesheet-Bilddateien
     * ohne vorherige Base64-Kodierung.
     */
    protocol.handle('app-asset', async (request) => {
        try {
            const fileUrl = request.url.replace(/^app-asset:\/\//, 'file://');
            const filePath = fileURLToPath(fileUrl);
            const buffer = await fs.readFile(filePath);
            const ext = path.extname(filePath).toLowerCase().substring(1) || 'png';
            const mimeTypes = {
                png: 'image/png',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                webp: 'image/webp'
            };
            const mimeType = mimeTypes[ext] || 'image/png';
            return new Response(buffer, {
                headers: { 'Content-Type': mimeType }
            });
        } catch (error) {
            console.error("Fehler beim Laden von app-asset:", error);
            return new Response('Asset not found', { status: 404 });
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Anwendungsbeendigung unter Windows/Linux
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ==========================================
// IPC HANDLER FÜR MAIN <-> RENDERER
// ==========================================

/**
 * 1. Dateiauswahl-Dialog für Spritesheet-Bilder.
 * @listens ipcMain:select-image
 * @returns {Promise<string|null>} Ausgewählter Dateipfad oder null.
 */
ipcMain.handle('select-image', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select Spritesheet',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    });
    if (!canceled && filePaths.length > 0) {
        return filePaths[0];
    }
    return null;
});

/**
 * 2. Bilddatei als Base64 einlesen (Fallback falls Streaming nicht greift).
 * @listens ipcMain:read-image-base64
 * @param {Electron.IpcMainInvokeEvent} event - IPC-Event
 * @param {string} filePath - Absoluter Pfad der Bilddatei
 * @returns {Promise<string|null>} Data-URI oder null bei Lesefehler.
 */
ipcMain.handle('read-image-base64', async (event, filePath) => {
    try {
        const buffer = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase().substring(1) || 'png';
        return `data:image/${ext};base64,${buffer.toString('base64')}`;
    } catch (error) {
        console.error("Fehler beim Lesen des Bildes:", error);
        return null;
    }
});

/**
 * 3. Projekt speichern (JSON-Format).
 * @listens ipcMain:save-project
 * @param {Electron.IpcMainInvokeEvent} event - IPC-Event
 * @param {Object} projectData - Zu speicherndes Projektdatenobjekt
 * @param {string|null} existingPath - Bestehender Dateipfad oder null für Speichern-Unter Dialog
 * @returns {Promise<string|null>} Gespeicherter Dateipfad oder null.
 */
ipcMain.handle('save-project', async (event, projectData, existingPath) => {
    let filePath = existingPath;
    
    if (!filePath) {
        const { canceled, filePath: newPath } = await dialog.showSaveDialog({
            title: 'Save Project',
            filters: [{ name: 'JSON Project', extensions: ['json'] }]
        });
        
        if (canceled || !newPath) {
            return null;
        }
        filePath = newPath;
    }
    
    try {
        await fs.writeFile(filePath, JSON.stringify(projectData, null, 2), 'utf-8');
        await addRecentProject(filePath);
        return filePath;
    } catch (error) {
        console.error("Fehler beim Speichern:", error);
        return null;
    }
});

/**
 * 4. Projektdatei öffnen (JSON-Format).
 * @listens ipcMain:open-project
 * @returns {Promise<{ data: Object, filePath: string }|null>} Geparstes Projekt und Pfad.
 */
ipcMain.handle('open-project', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Open Project',
        filters: [{ name: 'JSON Project', extensions: ['json'] }]
    });
    
    if (!canceled && filePaths.length > 0) {
        const filePath = filePaths[0];
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            await addRecentProject(filePath);
            return { data: JSON.parse(data), filePath };
        } catch (error) {
            console.error("Fehler beim Öffnen:", error);
            return null;
        }
    }
    return null;
});

/**
 * 5. Zuletzt verwendete Projekte abrufen.
 * @listens ipcMain:get-recent-projects
 * @returns {Promise<string[]>} Liste von Pfaden.
 */
ipcMain.handle('get-recent-projects', async () => {
    return await getRecentProjects();
});

/**
 * 6. Projekt aus der Recent-Projects-Liste öffnen.
 * @listens ipcMain:open-recent-project
 * @param {Electron.IpcMainInvokeEvent} event - IPC-Event
 * @param {string} filePath - Absoluter Pfad der Projektdatei
 * @returns {Promise<{ data: Object, filePath: string }|null>} Geparstes Projekt und Pfad.
 */
ipcMain.handle('open-recent-project', async (event, filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        await addRecentProject(filePath);
        return { data: JSON.parse(data), filePath };
    } catch (error) {
        console.error("Fehler beim Öffnen des Recent Projects:", error);
        return null;
    }
});

/**
 * 7. Hauptfenster schließen anfordern.
 * @listens ipcMain:close-app
 */
ipcMain.on('close-app', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.close();
});

/**
 * 8. Dialog für ungespeicherte Änderungen anzeigen.
 * @listens ipcMain:confirm-close
 * @returns {Promise<number>} Antwortindex (0 = Speichern, 1 = Verwerfen, 2 = Abbrechen).
 */
ipcMain.handle('confirm-close', async () => {
    const { response } = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Save', "Don't Save", 'Cancel'],
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want to save your project before exiting?',
        defaultId: 0,
        cancelId: 2
    });
    return response;
});

/**
 * 9. Anwendungsversion aus package.json abrufen.
 * @listens ipcMain:get-app-version
 * @returns {string} Version der Anwendung.
 */
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

