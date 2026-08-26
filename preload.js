const { contextBridge, ipcRenderer } = require('electron');
const { pathToFileURL } = require('url');

// Brücke zwischen Main (Node) und Renderer (Browser)
// Stellt Funktionen unter dem globalen Objekt `window.api` bereit.
contextBridge.exposeInMainWorld('api', {
    selectImage: () => ipcRenderer.invoke('select-image'),
    readImageBase64: (path) => ipcRenderer.invoke('read-image-base64', path),
    getAssetUrl: (filePath) => {
        if (!filePath) return '';
        try {
            const fileUrl = pathToFileURL(filePath).toString();
            return fileUrl.replace(/^file:\/\//, 'app-asset://');
        } catch (e) {
            return '';
        }
    },
    saveProject: (data, filePath) => ipcRenderer.invoke('save-project', data, filePath),
    openProject: () => ipcRenderer.invoke('open-project'),
    getRecentProjects: () => ipcRenderer.invoke('get-recent-projects'),
    openRecentProject: (path) => ipcRenderer.invoke('open-recent-project', path),
    closeApp: () => ipcRenderer.send('close-app'),
    confirmClose: () => ipcRenderer.invoke('confirm-close'),
    forceClose: () => ipcRenderer.send('force-close'),
    onRequestClose: (callback) => ipcRenderer.on('request-close', callback)
});
