const { app, BrowserWindow, ipcMain, dialog, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs/promises');

// Force dark theme so the window background and titlebar don't flash white
nativeTheme.themeSource = 'dark';

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        backgroundColor: '#121212',
        show: false,
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // WICHTIG: Sichert die App ab
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
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// ==========================================
// IPC HANDLER FÜR MAIN <-> RENDERER
// ==========================================

// 1. Dateiauswahl für Spritesheet
ipcMain.handle('select-image', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select Spritesheet',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
    });
    if (!canceled && filePaths.length > 0) {
        return filePaths[0];
    }
    return null;
});

// 2. Bild als Base64 laden (umgeht lokale Dateirestriktionen im Renderer)
ipcMain.handle('read-image-base64', async (event, filePath) => {
    try {
        const buffer = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase().substring(1);
        return `data:image/${ext};base64,${buffer.toString('base64')}`;
    } catch (error) {
        console.error("Fehler beim Lesen des Bildes:", error);
        return null;
    }
});

// 3. Projekt speichern (JSON)
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
        return filePath;
    } catch (error) {
        console.error("Fehler beim Speichern:", error);
        return null;
    }
});

// 4. Projekt öffnen (JSON)
ipcMain.handle('open-project', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Open Project',
        filters: [{ name: 'JSON Project', extensions: ['json'] }]
    });
    
    if (!canceled && filePaths.length > 0) {
        const filePath = filePaths[0];
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return { data: JSON.parse(data), filePath };
        } catch (error) {
            console.error("Fehler beim Öffnen:", error);
            return null;
        }
    }
    return null;
});

// 5. Haxe Klasse exportieren (.hx)
ipcMain.handle('export-haxe', async (event, { className, code, existingPath }) => {
    let filePath = existingPath;
    
    if (!filePath) {
        const { canceled, filePath: newPath } = await dialog.showSaveDialog({
            title: 'Export Haxe Class',
            defaultPath: `${className}.hx`,
            filters: [{ name: 'Haxe Class', extensions: ['hx'] }]
        });
        
        if (canceled || !newPath) {
            return { success: false };
        }
        filePath = newPath;
    }
    
    try {
        await fs.writeFile(filePath, code, 'utf-8');
        return { success: true, filePath };
    } catch (error) {
        console.error("Fehler beim Exportieren:", error);
        return { success: false };
    }
});

// 6. Beenden erzwingen (aus Frontend, falls keine ungespeicherten Änderungen vorliegen)
ipcMain.on('close-app', () => {
    // Da wir das oben per event listener fangen, lösen wir den 'close' event des Fensters aus, 
    // was wiederum 'request-close' auslöst, damit der Ablauf immer gleich ist!
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.close();
});

// 7. Dialog für ungespeicherte Änderungen
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
