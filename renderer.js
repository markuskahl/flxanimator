// ==========================================
// RENDERER LOGIK (Vanilla JS)
// ==========================================

// --- App Zustand (State) ---
let project = {
    imagePath: null,
    imageBase64: null,
    config: {
        width: 16,
        height: 16,
        spacing: 0,
        margin: 0
    },
    animations: [] // Format: { name: string, fps: number, loop: boolean, frames: number[] }
};

let selectedAnimationIndex = -1;
let previewInterval = null;
let currentPreviewFrame = 0;
let currentFilePath = null;
let isDirty = false;

function updateTitle() {
    const baseTitle = "HaxeFlixel Animation Studio";
    let filename = "Untitled";
    
    if (currentFilePath) {
        filename = currentFilePath.split('\\').pop().split('/').pop();
    }
    
    document.title = `${isDirty ? '* ' : ''}${filename} - ${baseTitle}`;
}

function markDirty() {
    if (!isDirty) {
        isDirty = true;
        btnSaveProject.classList.add('dirty');
        updateTitle();
    }
}

function clearDirty() {
    isDirty = false;
    btnSaveProject.classList.remove('dirty');
    updateTitle();
}

// --- DOM Elemente holen ---
const modalNewProject = document.getElementById('modal-new-project');
const modalExport = document.getElementById('modal-export');
const modalNewAnim = document.getElementById('modal-new-anim');

const editAnimControls = document.getElementById('edit-anim-controls');
const editAnimName = document.getElementById('anim-name');
const editAnimFps = document.getElementById('anim-fps');
const editAnimLoop = document.getElementById('anim-loop');

const btnNewProject = document.getElementById('btn-new-project');
const btnOpenProject = document.getElementById('btn-open-project');
const btnSaveProject = document.getElementById('btn-save-project');
const btnExportHaxe = document.getElementById('btn-export-haxe');

const imgSpritesheet = document.getElementById('spritesheet-img');
const canvasGrid = document.getElementById('grid-canvas');
const ctxGrid = canvasGrid.getContext('2d');
const gridContainer = document.getElementById('grid-container');
const workspace = document.querySelector('.workspace-scroll');

const animList = document.getElementById('animation-list');
const canvasPreview = document.getElementById('preview-canvas');
const ctxPreview = canvasPreview.getContext('2d');

const resizer = document.getElementById('workspace-resizer');
const workspaceRight = document.getElementById('workspace-right');
const previewScroll = document.getElementById('preview-scroll');
const previewTransformContainer = document.getElementById('preview-transform-container');
const statusBar = document.getElementById('status-bar');

// --- Status Bar ---
let statusTimeout = null;
function showStatus(message, type = 'info') {
    statusBar.innerText = message;
    statusBar.className = `status-bar ${type}`;
    
    if (statusTimeout) clearTimeout(statusTimeout);
    
    // Auto-clear success messages after a few seconds
    if (type === 'success' || type === 'error') {
        statusTimeout = setTimeout(() => {
            statusBar.innerText = 'Ready';
            statusBar.className = 'status-bar';
        }, 4000);
    }
}

// --- Resizer Logik ---
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
});

window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const workspaceRect = document.querySelector('.workspace').getBoundingClientRect();
    const newRightWidth = workspaceRect.right - e.clientX;
    
    if (newRightWidth > 150 && newRightWidth < workspaceRect.width - 150) {
        workspaceRight.style.width = `${newRightWidth}px`;
    }
});

window.addEventListener('mouseup', () => {
    if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
    }
});

// --- Preview Pan & Zoom Logik ---
let previewZoom = 2;
let previewPanX = 0;
let previewPanY = 0;
let isPreviewPanning = false;
let previewStartX = 0;
let previewStartY = 0;

function updatePreviewTransform() {
    previewTransformContainer.style.transform = `translate(${previewPanX}px, ${previewPanY}px) scale(${previewZoom})`;
}

previewScroll.addEventListener('wheel', (e) => {
    if (selectedAnimationIndex < 0) return;
    e.preventDefault();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(0.1, previewZoom * zoomFactor), 30);
    
    const rect = previewScroll.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    previewPanX = mouseX - (mouseX - previewPanX) * (newZoom / previewZoom);
    previewPanY = mouseY - (mouseY - previewPanY) * (newZoom / previewZoom);
    
    previewZoom = newZoom;
    updatePreviewTransform();
});

previewScroll.addEventListener('mousedown', (e) => {
    if (e.button === 1 || e.button === 2 || e.target === previewScroll || e.target === previewTransformContainer) {
        e.preventDefault();
        isPreviewPanning = true;
        previewStartX = e.clientX - previewPanX;
        previewStartY = e.clientY - previewPanY;
        previewScroll.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isPreviewPanning) return;
    previewPanX = e.clientX - previewStartX;
    previewPanY = e.clientY - previewStartY;
    updatePreviewTransform();
});

window.addEventListener('mouseup', () => {
    if (isPreviewPanning) {
        isPreviewPanning = false;
        previewScroll.style.cursor = 'grab';
    }
});

previewScroll.addEventListener('contextmenu', e => e.preventDefault());

// --- Modals & Projekt Setup ---

function showWarning(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (message) {
        el.innerText = message;
        el.classList.add('active');
    } else {
        el.classList.remove('active');
        el.innerText = '';
    }
}

// Neues Projekt Modal öffnen
btnNewProject.addEventListener('click', () => {
    showWarning('new-project-warning', '');
    modalNewProject.classList.add('active');
});

// Neues Projekt Modal schließen
document.getElementById('btn-cancel-new').addEventListener('click', () => {
    modalNewProject.classList.remove('active');
});

// Bild über nativen Dialog auswählen (via IPC)
document.getElementById('btn-browse-img').addEventListener('click', async () => {
    const filePath = await window.api.selectImage();
    if (filePath) {
        document.getElementById('proj-img-path').value = filePath;
    }
});

// Projekt anlegen und Canvas vorbereiten
document.getElementById('btn-create-new').addEventListener('click', async () => {
    const imgPath = document.getElementById('proj-img-path').value;
    if (!imgPath) {
        showWarning('new-project-warning', "Please select a spritesheet.");
        return;
    }
    showWarning('new-project-warning', '');

    // Konfiguration aus dem Formular in den State laden
    project.imagePath = imgPath;
    project.config.width = parseInt(document.getElementById('proj-width').value) || 16;
    project.config.height = parseInt(document.getElementById('proj-height').value) || 16;
    project.config.spacing = parseInt(document.getElementById('proj-spacing').value) || 0;
    project.config.margin = parseInt(document.getElementById('proj-margin').value) || 0;
    project.animations = [];
    project.exportPath = null;
    project.exportClassName = null;
    selectedAnimationIndex = -1;
    currentFilePath = null;
    
    await loadSpritesheet();
    modalNewProject.classList.remove('active');
    updateAnimationList();
    markDirty();
    showStatus('New project created.', 'success');
});

// Lädt das Bild via Base64 (sicherer als lokale Dateipfade im Browser)
async function loadSpritesheet() {
    if (!project.imagePath) return;
    
    // Ruft IPC main auf, um Datei zu lesen und Base64-String zurückzugeben
    const base64 = await window.api.readImageBase64(project.imagePath);
    if (!base64) return;
    project.imageBase64 = base64;

    // Wenn das Bild geladen ist, setze die Grid-Canvas auf dieselbe Größe
    imgSpritesheet.onload = () => {
        imgSpritesheet.style.display = 'block';
        canvasGrid.width = imgSpritesheet.width;
        canvasGrid.height = imgSpritesheet.height;
        
        // Reset Zoom & Pan (Zentriere Bild)
        zoom = 1;
        const wsRect = workspace.getBoundingClientRect();
        panX = (wsRect.width - imgSpritesheet.width) / 2;
        panY = (wsRect.height - imgSpritesheet.height) / 2;
        updateTransform();

        drawGrid();
    };
    imgSpritesheet.src = base64;
}

// --- Grid & Frame Auswahl ---

// Zeichnet das interaktive Raster über das Spritesheet
function drawGrid() {
    if (!imgSpritesheet.src) return;

    // Crisp canvas trick: internal resolution matches zoom, visually remains 1:1
    canvasGrid.width = imgSpritesheet.width * zoom;
    canvasGrid.height = imgSpritesheet.height * zoom;
    canvasGrid.style.width = `${imgSpritesheet.width * zoom}px`;
    canvasGrid.style.height = `${imgSpritesheet.height * zoom}px`;
    canvasGrid.style.transform = `scale(${1/zoom})`;
    canvasGrid.style.transformOrigin = '0 0';

    ctxGrid.scale(zoom, zoom);
    
    ctxGrid.clearRect(0, 0, imgSpritesheet.width, imgSpritesheet.height);
    
    const { width, height, spacing, margin } = project.config;
    
    // Berechne Spalten und Zeilen
    const cols = Math.floor((imgSpritesheet.width - margin * 2 + spacing) / (width + spacing));
    const rows = Math.floor((imgSpritesheet.height - margin * 2 + spacing) / (height + spacing));

    ctxGrid.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctxGrid.lineWidth = 1 / zoom;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = margin + col * (width + spacing);
            const y = margin + row * (height + spacing);
            
            // Basis-Raster zeichnen
            ctxGrid.strokeRect(x, y, width, height);
            
            // Wenn eine Animation selektiert ist, hebe ihre Frames hervor
            if (selectedAnimationIndex >= 0) {
                const anim = project.animations[selectedAnimationIndex];
                const frameIndex = row * cols + col;
                
                const frameOrder = anim.frames.indexOf(frameIndex);
                if (frameOrder !== -1) {
                    // Frame gehört zur ausgewählten Animation
                    ctxGrid.fillStyle = 'rgba(0, 230, 118, 0.4)'; // Akzentfarbe transparent
                    ctxGrid.fillRect(x, y, width, height);
                    
                    // Schriftgröße bleibt scharf und proportional zur Zoomstufe
                    const maxFontSize = height * 0.8;
                    const fontSize = Math.min(Math.max(12 / zoom, 2), maxFontSize);
                    ctxGrid.font = `bold ${fontSize}px Inter`;
                    
                    const textStr = (frameOrder + 1).toString();
                    const textWidth = ctxGrid.measureText(textStr).width;
                    const radius = Math.max(textWidth, fontSize) / 2 + (4 / zoom);

                    // Schwarzer Kreis als Hintergrund
                    ctxGrid.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctxGrid.beginPath();
                    ctxGrid.arc(x + width/2, y + height/2, radius, 0, Math.PI * 2);
                    ctxGrid.fill();

                    // Text
                    ctxGrid.fillStyle = '#ffffff';
                    ctxGrid.textAlign = 'center';
                    ctxGrid.textBaseline = 'middle';
                    ctxGrid.fillText(textStr, x + width/2, y + height/2);
                }
            }
        }
    }
}

// Click-Event um Frames zur Animation hinzuzufügen/zu entfernen
canvasGrid.addEventListener('click', (e) => {
    if (selectedAnimationIndex < 0) {
        alert("Please create or select an animation in the left sidebar first.");
        return;
    }

    const rect = canvasGrid.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / zoom;
    const clickY = (e.clientY - rect.top) / zoom;

    const { width, height, spacing, margin } = project.config;
    const cols = Math.floor((canvasGrid.width - margin * 2 + spacing) / (width + spacing));
    const rows = Math.floor((canvasGrid.height - margin * 2 + spacing) / (height + spacing));

    // Prüfe welche Zelle geklickt wurde
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = margin + col * (width + spacing);
            const y = margin + row * (height + spacing);

            if (clickX >= x && clickX <= x + width && clickY >= y && clickY <= y + height) {
                const frameIndex = row * cols + col;
                const anim = project.animations[selectedAnimationIndex];
                
                const existingIndex = anim.frames.indexOf(frameIndex);
                if (existingIndex !== -1) {
                    anim.frames.splice(existingIndex, 1);
                } else {
                    anim.frames.push(frameIndex);
                }
                
                drawGrid();
                startPreview();
                markDirty();
                
                // Aktualisiere nur den Text des ausgewählten Elements, anstatt die ganze Liste neu zu bauen
                const items = animList.querySelectorAll('.anim-item');
                if (items[selectedAnimationIndex]) {
                    const span = items[selectedAnimationIndex].querySelector('span');
                    span.innerHTML = `<strong>${anim.name}</strong> <small>(${anim.frames.length} frames)</small>`;
                }
                return;
            }
        }
    }
});

// --- Animation Management ---

// Neue Animation Modal öffnen
document.getElementById('btn-add-anim').addEventListener('click', () => {
    if (!project.imagePath) {
        showStatus('Please create or open a project first.', 'error');
        return;
    }
    showWarning('new-anim-warning', '');
    modalNewAnim.classList.add('active');
});

document.getElementById('btn-cancel-new-anim').addEventListener('click', () => {
    modalNewAnim.classList.remove('active');
});

document.getElementById('btn-confirm-new-anim').addEventListener('click', () => {
    const nameInput = document.getElementById('new-anim-name');
    const fpsInput = document.getElementById('new-anim-fps');
    const loopInput = document.getElementById('new-anim-loop');

    const name = nameInput.value.trim();
    if (!name) {
        showWarning('new-anim-warning', "The animation name cannot be empty.");
        return;
    }
    showWarning('new-anim-warning', '');

    project.animations.push({
        name,
        fps: parseInt(fpsInput.value) || 15,
        loop: loopInput.checked,
        frames: []
    });

    nameInput.value = '';
    fpsInput.value = '15';
    loopInput.checked = true;
    
    modalNewAnim.classList.remove('active');

    // Automatisch die neu erstellte Animation auswählen
    selectedAnimationIndex = project.animations.length - 1;
    updateAnimationList();
    drawGrid();
    startPreview();
    markDirty();
});

// Event Listener für Editier-Inputs
editAnimName.addEventListener('input', (e) => {
    if (selectedAnimationIndex >= 0) {
        const anim = project.animations[selectedAnimationIndex];
        anim.name = e.target.value;
        // Aktualisiere nur das Text-Element in der Liste, ohne alles neu zu rendern
        const items = animList.querySelectorAll('.anim-item');
        if (items[selectedAnimationIndex]) {
            const span = items[selectedAnimationIndex].querySelector('span');
            span.innerHTML = `<strong>${anim.name}</strong> <small>(${anim.frames.length} frames)</small>`;
        }
        markDirty();
    }
});
editAnimFps.addEventListener('input', (e) => {
    if (selectedAnimationIndex >= 0) {
        project.animations[selectedAnimationIndex].fps = parseInt(e.target.value) || 1;
        startPreview();
        markDirty();
    }
});
editAnimLoop.addEventListener('change', (e) => {
    if (selectedAnimationIndex >= 0) {
        project.animations[selectedAnimationIndex].loop = e.target.checked;
        startPreview();
        markDirty();
    }
});

function updateEditControls() {
    if (selectedAnimationIndex >= 0 && selectedAnimationIndex < project.animations.length) {
        editAnimControls.style.display = 'block';
        const anim = project.animations[selectedAnimationIndex];
        editAnimName.value = anim.name;
        editAnimFps.value = anim.fps;
        editAnimLoop.checked = anim.loop;
    } else {
        editAnimControls.style.display = 'none';
    }
}

// Aktualisiert die DOM-Liste der Animationen in der Sidebar
function updateAnimationList() {
    animList.innerHTML = '';
    project.animations.forEach((anim, index) => {
        const li = document.createElement('li');
        li.className = `anim-item ${index === selectedAnimationIndex ? 'selected' : ''}`;
        
        const span = document.createElement('span');
        span.innerHTML = `<strong>${anim.name}</strong> <small>(${anim.frames.length} frames)</small>`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = "Delete animation";
        
        // Löschen
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            project.animations.splice(index, 1);
            if (selectedAnimationIndex === index) {
                selectedAnimationIndex = -1;
            } else if (selectedAnimationIndex > index) {
                selectedAnimationIndex--;
            }
            updateAnimationList();
            drawGrid();
            startPreview();
            markDirty();
        };

        // Auswählen
        li.onclick = () => {
            selectedAnimationIndex = index;
            // Anstatt das ganze DOM zu zerstören, nur die CSS-Klassen aktualisieren
            Array.from(animList.children).forEach((child, i) => {
                child.classList.toggle('selected', i === selectedAnimationIndex);
            });
            drawGrid();
            startPreview();
            updateEditControls();
        };

        li.appendChild(span);
        li.appendChild(removeBtn);
        animList.appendChild(li);
    });
    updateEditControls();
}

// --- Echtzeit Vorschau ---

// Startet den Loop für die Canvas-Vorschau
function startPreview() {
    clearInterval(previewInterval);
    currentPreviewFrame = 0;
    
    // Vorschau löschen, wenn nichts ausgewählt ist
    if (selectedAnimationIndex < 0) {
        ctxPreview.clearRect(0, 0, canvasPreview.width, canvasPreview.height);
        return;
    }

    const anim = project.animations[selectedAnimationIndex];
    if (anim.frames.length === 0) {
        ctxPreview.clearRect(0, 0, canvasPreview.width, canvasPreview.height);
        return;
    }

    // Funktion zum Zeichnen eines einzelnen Frames
    const drawFrame = () => {
        if (!imgSpritesheet.src) return;

        const { width, height, spacing, margin } = project.config;
        const cols = Math.floor((imgSpritesheet.width - margin * 2 + spacing) / (width + spacing));

        // Frame ID zu X/Y Koordinaten im Bild umwandeln
        const frameIndex = anim.frames[currentPreviewFrame];
        const col = frameIndex % cols;
        const row = Math.floor(frameIndex / cols);

        const sx = margin + col * (width + spacing);
        const sy = margin + row * (height + spacing);

        // Pass die Canvas-Größe der echten Frame-Größe an
        if (canvasPreview.width !== width || canvasPreview.height !== height) {
            canvasPreview.width = width;
            canvasPreview.height = height;
            
            // Zentriere die Vorschau beim ersten Mal oder bei Änderung der Frame-Größe
            const rect = previewScroll.getBoundingClientRect();
            previewPanX = (rect.width - width * previewZoom) / 2;
            previewPanY = (rect.height - height * previewZoom) / 2;
            updatePreviewTransform();
        }

        ctxPreview.clearRect(0, 0, width, height);
        ctxPreview.imageSmoothingEnabled = false; // Knackige Pixel-Art erhalten
        
        // Schneide das Segment aus dem Originalbild aus und zeichne es
        ctxPreview.drawImage(imgSpritesheet, sx, sy, width, height, 0, 0, width, height);

        currentPreviewFrame++;
        if (currentPreviewFrame >= anim.frames.length) {
            if (anim.loop) {
                currentPreviewFrame = 0; // Loop zurücksetzen
            } else {
                currentPreviewFrame = anim.frames.length - 1; // Am Ende stehenbleiben
            }
        }
    };

    drawFrame(); // Sofort einmal zeichnen
    if (anim.frames.length > 1 && anim.fps > 0) {
        // Intervall basierend auf FPS setzen
        previewInterval = setInterval(drawFrame, 1000 / anim.fps);
    }
}

// --- Projekt Speichern / Laden (JSON) ---

async function saveProjectData() {
    if (!project.imagePath) {
        showStatus("There is no project to save yet.", "error");
        return false;
    }
    
    // Wir klonen das Objekt und löschen base64, um die JSON-Datei schlank zu halten.
    // Das Bild wird beim Neuladen anhand des Pfads (imagePath) neu eingelesen.
    const dataToSave = { ...project };
    delete dataToSave.imageBase64;
    
    // IPC Call
    const savedPath = await window.api.saveProject(dataToSave, currentFilePath);
    if (savedPath) {
        currentFilePath = savedPath;
        clearDirty();
        const originalText = btnSaveProject.innerText;
        btnSaveProject.innerText = 'Saved!';
        showStatus('Project saved successfully.', 'success');
        setTimeout(() => btnSaveProject.innerText = originalText, 1500);
        return true;
    }
    return false;
}

btnSaveProject.addEventListener('click', saveProjectData);

function validateProjectSchema(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.config || typeof data.config !== 'object') return false;
    if (typeof data.config.width !== 'number' || typeof data.config.height !== 'number') return false;
    if (!Array.isArray(data.animations)) return false;
    return true;
}

btnOpenProject.addEventListener('click', async () => {
    // IPC Call
    const response = await window.api.openProject();
    if (response && response.data) {
        if (!validateProjectSchema(response.data)) {
            showStatus('Invalid project file format.', 'error');
            return;
        }
        project = response.data;
        currentFilePath = response.filePath;
        await loadSpritesheet();
        selectedAnimationIndex = -1;
        updateAnimationList();
        drawGrid();
        startPreview();
        clearDirty();
        showStatus('Project loaded.', 'success');
    }
});

// --- Haxe Code Export ---

btnExportHaxe.addEventListener('click', () => {
    if (project.animations.length === 0) {
        showStatus("Please add at least one animation first.", "error");
        return;
    }
    
    if (project.exportPath && project.exportClassName) {
        performHaxeExport(project.exportClassName, project.exportPath);
    } else {
        if (project.exportClassName) {
            document.getElementById('export-classname').value = project.exportClassName;
        }
        modalExport.classList.add('active');
    }
});

document.getElementById('btn-export-settings').addEventListener('click', () => {
    if (project.animations.length === 0) {
        showStatus("Please add at least one animation first.", "error");
        return;
    }
    
    if (project.exportClassName) {
        document.getElementById('export-classname').value = project.exportClassName;
    }
    modalExport.classList.add('active');
});

document.getElementById('btn-cancel-export').addEventListener('click', () => {
    modalExport.classList.remove('active');
});

async function performHaxeExport(className, existingPath) {
    // Wir erben explizit von FlxAnimationController (wie gefordert)
    let haxeCode = `package;\n\n`;
    haxeCode += `import flixel.FlxSprite;\n`;
    haxeCode += `import flixel.animation.FlxAnimationController;\n\n`;
    haxeCode += `class ${className} extends FlxAnimationController {\n\n`;
    
    haxeCode += `\tpublic function new(sprite:FlxSprite) {\n`;
    haxeCode += `\t\tsuper(sprite);\n`;
    haxeCode += `\t\tregisterAnimations();\n`;
    haxeCode += `\t}\n\n`;
    
    haxeCode += `\tprivate function registerAnimations():Void {\n`;
    
    project.animations.forEach(anim => {
        const framesStr = `[${anim.frames.join(', ')}]`;
        // Da wir direkt innerhalb von FlxAnimationController sind, rufen wir this.add() auf.
        // HaxeFlixel Syntax: add(Name, [FrameArray], Framerate, Looped)
        haxeCode += `\t\tthis.add("${anim.name}", ${framesStr}, ${anim.fps}, ${anim.loop});\n`;
    });
    
    haxeCode += `\t}\n}\n`;

    // IPC Call zum Speichern der .hx Datei
    const response = await window.api.exportHaxe({ className, code: haxeCode, existingPath });
    if (response && response.success) {
        project.exportClassName = className;
        project.exportPath = response.filePath;
        markDirty(); // Speichert den exportPath mit im Projekt
        modalExport.classList.remove('active');
        
        // Auto-save the project so the export path and any changes are persisted immediately
        const saved = await saveProjectData();
        if (saved) {
            showStatus('Haxe class exported & Project saved!', 'success');
        } else {
            showStatus('Haxe class exported, but project save failed.', 'error');
        }
    } else {
        showStatus('Export cancelled or failed.', 'error');
    }
}

// Generiert die Haxe-Klasse und öffnet den Speichern-Dialog
document.getElementById('btn-confirm-export').addEventListener('click', () => {
    const className = document.getElementById('export-classname').value.trim() || 'MyAnimationController';
    performHaxeExport(className, null);
});

// ==========================================
// PAN & ZOOM LOGIK
// ==========================================
let zoom = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

function updateTransform() {
    gridContainer.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
}

// Zoom über Mausrad
workspace.addEventListener('wheel', (e) => {
    if (!project.imagePath) return;
    e.preventDefault();
    
    // Zoom berechnen
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(0.1, zoom * zoomFactor), 30); // Max 30x Zoom für feines Pixelart
    
    // Position relativ zum Workspace finden
    const wsRect = workspace.getBoundingClientRect();
    const mouseX = e.clientX - wsRect.left;
    const mouseY = e.clientY - wsRect.top;
    
    // Neue Pan-Werte berechnen, sodass Maus über demselben Pixel bleibt
    panX = mouseX - (mouseX - panX) * (newZoom / zoom);
    panY = mouseY - (mouseY - panY) * (newZoom / zoom);
    
    zoom = newZoom;
    updateTransform();
    drawGrid();
});

// Panning starten
workspace.addEventListener('mousedown', (e) => {
    // Erlaube Pan mit mittlerer Maustaste, rechter Maustaste oder wenn man direkt in den leeren Hintergrund klickt
    if (e.button === 1 || e.button === 2 || e.target === workspace) {
        e.preventDefault();
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        workspace.style.cursor = 'grabbing';
    }
});

// Panning ausführen
window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
});

// Panning beenden
window.addEventListener('mouseup', () => {
    if (isPanning) {
        isPanning = false;
        workspace.style.cursor = 'grab';
    }
});

// Verhindere Standard-Kontextmenü auf Workspace für reibungsloses Panning
workspace.addEventListener('contextmenu', e => e.preventDefault());

// --- Fenster Steuerung & Speichern vor dem Schließen ---
document.getElementById('btn-close-app').addEventListener('click', () => {
    window.api.closeApp(); // Löst request-close aus
});

window.api.onRequestClose(async () => {
    if (!isDirty) {
        window.api.forceClose();
        return;
    }
    
    // User fragen, da es ungespeicherte Änderungen gibt
    const response = await window.api.confirmClose();
    // response: 0 = Save, 1 = Don't Save, 2 = Cancel
    if (response === 0) {
        // Speichern versuchen
        const saved = await saveProjectData();
        if (saved) {
            window.api.forceClose();
        }
        // Falls Speichern fehlschlägt oder abgebrochen wird, bleibt das Fenster offen
    } else if (response === 1) {
        // Nicht speichern, einfach schließen
        window.api.forceClose();
    }
    // Bei 2 (Cancel) machen wir nichts, das Fenster bleibt offen
});
