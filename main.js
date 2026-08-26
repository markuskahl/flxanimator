const { app, BrowserWindow, ipcMain, dialog, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs/promises');

// Deaktiviere Hardwarebeschleunigung, um 'GPU state invalid' Abstürze in Chromium zu verhindern
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('log-level', '3'); // Unterdrückt nervige Chromium-Fehlermeldungen im Terminal

// Force dark theme so the window background and titlebar don't flash white
nativeTheme.themeSource = 'dark';

const userDataPath = app.getPath('userData');
const recentProjectsPath = path.join(userDataPath, 'recent-projects.json');

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
        await addRecentProject(filePath);
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
            await addRecentProject(filePath);
            return { data: JSON.parse(data), filePath };
        } catch (error) {
            console.error("Fehler beim Öffnen:", error);
            return null;
        }
    }
    return null;
});

// 4b. Recent Projects
ipcMain.handle('get-recent-projects', async () => {
    return await getRecentProjects();
});

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
