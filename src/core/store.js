/**
 * @file store.js
 * @description Zentraler reaktiver Zustandsbehälter (State Store) für FlxAnimator.
 * Verwaltet Projektdaten, Animationssequenzen, Frame-Listen, Undo/Redo-Historie,
 * Zoom/Pan-Zustände sowie View-Modi und feuert granulare Events via EventTarget.
 * @module core/store
 */

import { Events } from './events.js';

/**
 * @typedef {Object} SpritesheetConfig
 * @property {number} width - Einzelne Frame-Breite in Pixeln (z. B. 16, 32).
 * @property {number} height - Einzelne Frame-Höhe in Pixeln (z. B. 16, 32).
 * @property {number} spacing - Abstand zwischen Frame-Zellen in Pixeln (Standard 0).
 * @property {number} margin - Äußerer Abstand des Rasters zum Bildrand in Pixeln (Standard 0).
 */

/**
 * @typedef {Object} AnimationData
 * @property {string} name - Eindeutiger Bezeichner der Animation (z. B. "idle", "walk", "jump").
 * @property {number} fps - Wiedergabegeschwindigkeit in Bildern pro Sekunde (Standard 15).
 * @property {boolean} loop - Gibt an, ob die Animation in Endlosschleife wiederholt wird.
 * @property {boolean} flipX - Horizontale Spiegelung beim Rendern.
 * @property {boolean} flipY - Vertikale Spiegelung beim Rendern.
 * @property {number[]} frames - Geordnete Liste von linearen Frame-Indizes des Spritesheets.
 */

/**
 * @typedef {Object} ProjectData
 * @property {string|null} imagePath - Absoluter Dateipfad des Spritesheet-Bildes auf der Festplatte.
 * @property {string|null} [imageSrc] - Geladene Bildquelle (app-asset:// URL oder Base64 Daten-URI).
 * @property {SpritesheetConfig} config - Rasterkonfiguration für die Frame-Zerlegung.
 * @property {AnimationData[]} animations - Liste aller im Projekt definierten Animationen.
 * @property {string|null} defaultAnimation - Name der standardmäßig ausgewählten Animation für den Spielstart.
 */

/**
 * @typedef {Object} TransformState
 * @property {number} zoom - Aktueller Vergrößerungsfaktor (1.0 = 100%).
 * @property {number} panX - Horizontale Verschiebung (Pan Offset) in Pixeln.
 * @property {number} panY - Vertikale Verschiebung (Pan Offset) in Pixeln.
 */

/**
 * Erstellt eine tiefe, unveränderliche Kopie eines Projekt-Objekts zur Historienverwaltung (Undo/Redo).
 *
 * @private
 * @param {ProjectData|null} proj - Das zu klonende Projekt-Objekt.
 * @returns {ProjectData|null} Tiefe Kopie des Projekts oder null.
 */
function cloneProject(proj) {
    if (!proj) return null;
    return {
        imagePath: proj.imagePath || null,
        imageSrc: proj.imageSrc || null,
        config: {
            width: proj.config?.width ?? 16,
            height: proj.config?.height ?? 16,
            spacing: proj.config?.spacing ?? 0,
            margin: proj.config?.margin ?? 0
        },
        animations: (proj.animations || []).map(a => ({
            name: a.name || '',
            fps: a.fps || 15,
            loop: a.loop ?? true,
            flipX: !!a.flipX,
            flipY: !!a.flipY,
            frames: [...(a.frames || [])]
        })),
        defaultAnimation: proj.defaultAnimation || null
    };
}

/**
 * Der reaktive Zustandsspeicher der Anwendung, basierend auf dem nativen `EventTarget`-Interface.
 * Ermöglicht Publish/Subscribe-Kommunikation ohne externe Framework-Abhängigkeiten.
 * 
 * @class
 * @extends {EventTarget}
 */
export class Store extends EventTarget {
    /**
     * Erzeugt eine neue Instanz des Store mit Standardwerten.
     */
    constructor() {
        super();

        /**
         * Das aktuell geladene Projekt.
         * @type {ProjectData}
         */
        this.project = {
            imagePath: null,
            imageSrc: null,
            config: { width: 16, height: 16, spacing: 0, margin: 0 },
            animations: [],
            defaultAnimation: null
        };

        /**
         * 0-basierter Index der momentan im Editor aktiven Animation (-1 wenn keine).
         * @type {number}
         */
        this.selectedAnimationIndex = -1;

        /**
         * Dateipfad der geladenen JSON-Projektdatei oder null bei ungespeicherten Projekten.
         * @type {string|null}
         */
        this.currentFilePath = null;

        /**
         * Zeigt an, ob ungespeicherte Änderungen vorliegen.
         * @type {boolean}
         */
        this.isDirty = false;

        /**
         * Die aktuell sichtbare Ansicht ('start' = Startscreen, 'workspace' = Arbeitsbereich).
         * @type {'start'|'workspace'}
         */
        this.activeView = 'start';
        
        /**
         * Transformation für das Haupt-Spritesheet-Canvas.
         * @type {TransformState}
         */
        this.gridTransform = { zoom: 1, panX: 0, panY: 0 };

        /**
         * Transformation für das Animations-Vorschau-Canvas.
         * @type {TransformState}
         */
        this.previewTransform = { zoom: 2, panX: 0, panY: 0 };

        /**
         * Stapel früherer Projektzustände für Undo-Operationen.
         * @type {ProjectData[]}
         */
        this.undoStack = [];

        /**
         * Stapel rückgängig gemachter Zustände für Redo-Operationen.
         * @type {ProjectData[]}
         */
        this.redoStack = [];

        /**
         * Maximale Anzahl an Historien-Snapshots.
         * @type {number}
         */
        this.maxHistory = 50;
    }

    // --- Event Emitter Helper ---

    /**
     * Registriert einen Event-Listener auf dem Store und gibt eine Abmeldefunktion zurück.
     *
     * @param {string} event - Name des Events aus {@link Events}.
     * @param {EventListenerOrEventListenerObject} callback - Handler-Funktion.
     * @returns {() => void} Funktion zum Entfernen des Listeners.
     */
    on(event, callback) {
        this.addEventListener(event, callback);
        return () => this.removeEventListener(event, callback);
    }

    /**
     * Feuert ein `CustomEvent` mit optionalen Detaildaten an alle registrierten Abonnenten.
     *
     * @param {string} event - Name des Events aus {@link Events}.
     * @param {Object} [detail={}] - Nutzdaten des Events.
     */
    emit(event, detail = {}) {
        this.dispatchEvent(new CustomEvent(event, { detail }));
    }

    // --- State Getters ---

    /**
     * Gibt das aktuelle Projekt-Objekt zurück.
     * @returns {ProjectData} Das aktuelle Projekt.
     */
    getProject() {
        return this.project;
    }

    /**
     * Gibt die aktuell im Editor selektierte Animation zurück.
     * @returns {AnimationData|null} Die ausgewählte Animation oder null.
     */
    getSelectedAnimation() {
        if (this.selectedAnimationIndex >= 0 && this.selectedAnimationIndex < this.project.animations.length) {
            return this.project.animations[this.selectedAnimationIndex];
        }
        return null;
    }

    /**
     * Gibt den Index der aktuell ausgewählten Animation zurück.
     * @returns {number} 0-basierter Animationsindex oder -1.
     */
    getSelectedAnimationIndex() {
        return this.selectedAnimationIndex;
    }

    /**
     * Gibt zurück, ob das Projekt ungespeicherte Änderungen aufweist.
     * @returns {boolean} True bei ungespeicherten Änderungen.
     */
    getIsDirty() {
        return this.isDirty;
    }

    /**
     * Gibt den Dateipfad der aktuell geöffneten JSON-Projektdatei zurück.
     * @returns {string|null} Pfad oder null.
     */
    getCurrentFilePath() {
        return this.currentFilePath;
    }

    /**
     * Gibt eine Kopie des aktuellen Transformationszustands für das Spritesheet-Grid zurück.
     * @returns {TransformState}
     */
    getGridTransform() {
        return { ...this.gridTransform };
    }

    /**
     * Gibt eine Kopie des aktuellen Transformationszustands für die Vorschau zurück.
     * @returns {TransformState}
     */
    getPreviewTransform() {
        return { ...this.previewTransform };
    }

    // --- History / Undo / Redo ---

    /**
     * Speichert einen Snapshot des aktuellen Projektzustands auf dem Undo-Stack.
     * Leert den Redo-Stack und informiert Listener über {@link Events#HISTORY_CHANGED}.
     */
    pushHistory() {
        this.undoStack.push(cloneProject(this.project));
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.emit(Events.HISTORY_CHANGED, { canUndo: this.canUndo(), canRedo: this.canRedo() });
    }

    /**
     * Prüft, ob eine Rückgängig-Aktion möglich ist.
     * @returns {boolean} True, wenn Zustände im Undo-Stack vorhanden sind.
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Prüft, ob eine Wiederherstellen-Aktion möglich ist.
     * @returns {boolean} True, wenn Zustände im Redo-Stack vorhanden sind.
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * Macht die letzte Bearbeitungsaktion rückgängig und stellt den vorherigen Zustand wieder her.
     * @fires Events#ANIMATIONS_CHANGED
     * @fires Events#ANIMATION_SELECTED
     * @fires Events#FRAMES_CHANGED
     * @fires Events#DEFAULT_ANIMATION_CHANGED
     * @fires Events#HISTORY_CHANGED
     */
    undo() {
        if (!this.canUndo()) return;
        const currentSnapshot = cloneProject(this.project);
        this.redoStack.push(currentSnapshot);

        const previousSnapshot = this.undoStack.pop();
        this.project = previousSnapshot;

        // Validierung des ausgewählten Index nach Undo
        if (this.selectedAnimationIndex >= this.project.animations.length) {
            this.selectedAnimationIndex = this.project.animations.length - 1;
        }

        this.markDirty();
        this.emit(Events.ANIMATIONS_CHANGED, { project: this.project });
        this.emit(Events.ANIMATION_SELECTED, { index: this.selectedAnimationIndex, anim: this.getSelectedAnimation() });
        this.emit(Events.FRAMES_CHANGED, { anim: this.getSelectedAnimation() });
        this.emit(Events.DEFAULT_ANIMATION_CHANGED, { defaultAnimation: this.project.defaultAnimation });
        this.emit(Events.HISTORY_CHANGED, { canUndo: this.canUndo(), canRedo: this.canRedo() });
        this.showStatus('Undo', 'info');
    }

    /**
     * Stellt die zuvor rückgängig gemachte Bearbeitungsaktion wieder her.
     * @fires Events#ANIMATIONS_CHANGED
     * @fires Events#ANIMATION_SELECTED
     * @fires Events#FRAMES_CHANGED
     * @fires Events#DEFAULT_ANIMATION_CHANGED
     * @fires Events#HISTORY_CHANGED
     */
    redo() {
        if (!this.canRedo()) return;
        const currentSnapshot = cloneProject(this.project);
        this.undoStack.push(currentSnapshot);

        const nextSnapshot = this.redoStack.pop();
        this.project = nextSnapshot;

        if (this.selectedAnimationIndex >= this.project.animations.length) {
            this.selectedAnimationIndex = this.project.animations.length - 1;
        }

        this.markDirty();
        this.emit(Events.ANIMATIONS_CHANGED, { project: this.project });
        this.emit(Events.ANIMATION_SELECTED, { index: this.selectedAnimationIndex, anim: this.getSelectedAnimation() });
        this.emit(Events.FRAMES_CHANGED, { anim: this.getSelectedAnimation() });
        this.emit(Events.DEFAULT_ANIMATION_CHANGED, { defaultAnimation: this.project.defaultAnimation });
        this.emit(Events.HISTORY_CHANGED, { canUndo: this.canUndo(), canRedo: this.canRedo() });
        this.showStatus('Redo', 'info');
    }

    // --- State Mutators ---

    /**
     * Initialisiert den Store mit einem geladenen oder neu erstellten Projekt.
     *
     * @param {ProjectData} data - Projektdaten.
     * @param {string|null} [filePath=null] - Dateipfad der JSON-Datei.
     * @fires Events#PROJECT_LOADED
     * @fires Events#PROJECT_PATH_CHANGED
     * @fires Events#ANIMATIONS_CHANGED
     * @fires Events#ANIMATION_SELECTED
     * @fires Events#DEFAULT_ANIMATION_CHANGED
     * @fires Events#HISTORY_CHANGED
     */
    setProject(data, filePath = null) {
        this.project = cloneProject(data);
        this.currentFilePath = filePath;
        this.selectedAnimationIndex = this.project.animations.length > 0 ? 0 : -1;
        this.undoStack = [];
        this.redoStack = [];
        this.clearDirty();

        this.emit(Events.PROJECT_LOADED, { project: this.project, filePath });
        this.emit(Events.PROJECT_PATH_CHANGED, { filePath });
        this.emit(Events.ANIMATIONS_CHANGED, { project: this.project });
        this.emit(Events.ANIMATION_SELECTED, { index: this.selectedAnimationIndex, anim: this.getSelectedAnimation() });
        this.emit(Events.DEFAULT_ANIMATION_CHANGED, { defaultAnimation: this.project.defaultAnimation });
        this.emit(Events.HISTORY_CHANGED, { canUndo: false, canRedo: false });
    }

    /**
     * Aktualisiert die Spritesheet-Bildquelle und informiert alle Canvas-Komponenten.
     *
     * @param {string} imagePath - Original-Dateipfad des Bildes.
     * @param {string} imageSrc - Aufgelöste Bild-URL (z. B. app-asset:// oder data:).
     * @fires Events#SPRITESHEET_LOADED
     */
    setSpritesheetSource(imagePath, imageSrc) {
        this.project.imagePath = imagePath;
        this.project.imageSrc = imageSrc;
        this.emit(Events.SPRITESHEET_LOADED, { imagePath, imageSrc });
    }

    /**
     * Aktualisiert den aktuellen Dateipfad nach dem Speichern (Save / Save As).
     *
     * @param {string} filePath - Neuer Speicherpfad.
     * @fires Events#PROJECT_PATH_CHANGED
     */
    setCurrentFilePath(filePath) {
        this.currentFilePath = filePath;
        this.emit(Events.PROJECT_PATH_CHANGED, { filePath });
    }

    /**
     * Markiert das Projekt als ungespeichert (isDirty = true).
     * @fires Events#PROJECT_DIRTY_CHANGED
     */
    markDirty() {
        if (!this.isDirty) {
            this.isDirty = true;
            this.emit(Events.PROJECT_DIRTY_CHANGED, { isDirty: true });
        }
    }

    /**
     * Setzt den Dirty-Flag zurück (z. B. nach erfolgreichem Speichern).
     * @fires Events#PROJECT_DIRTY_CHANGED
     */
    clearDirty() {
        this.isDirty = false;
        this.emit(Events.PROJECT_DIRTY_CHANGED, { isDirty: false });
    }

    /**
     * Schaltet zwischen den Hauptansichten der Anwendung um.
     *
     * @param {'start'|'workspace'} view - Zielansicht.
     * @fires Events#VIEW_CHANGED
     */
    setView(view) {
        this.activeView = view;
        this.emit(Events.VIEW_CHANGED, { view });
    }

    // --- Animation Actions ---

    /**
     * Wählt eine Animation anhand ihres Index aus.
     *
     * @param {number} index - Index der Animation (-1 bis animations.length - 1).
     * @fires Events#ANIMATION_SELECTED
     */
    selectAnimation(index) {
        if (index < -1 || index >= this.project.animations.length) return;
        this.selectedAnimationIndex = index;
        this.emit(Events.ANIMATION_SELECTED, { index, anim: this.getSelectedAnimation() });
    }

    /**
     * Fügt eine neue Animation zum Projekt hinzu und wählt diese automatisch aus.
     *
     * @param {Partial<AnimationData>} animData - Initiale Eigenschaften der Animation.
     * @fires Events#ANIMATIONS_CHANGED
     * @fires Events#ANIMATION_SELECTED
     * @fires Events#DEFAULT_ANIMATION_CHANGED
     */
    addAnimation(animData) {
        this.pushHistory();
        const newAnim = {
            name: animData.name || 'anim',
            fps: animData.fps || 15,
            loop: animData.loop ?? true,
            flipX: !!animData.flipX,
            flipY: !!animData.flipY,
            frames: animData.frames ? [...animData.frames] : []
        };
        this.project.animations.push(newAnim);
        this.selectedAnimationIndex = this.project.animations.length - 1;
        this.markDirty();

        this.emit(Events.ANIMATIONS_CHANGED, { project: this.project });
        this.emit(Events.ANIMATION_SELECTED, { index: this.selectedAnimationIndex, anim: newAnim });
        this.emit(Events.DEFAULT_ANIMATION_CHANGED, { defaultAnimation: this.project.defaultAnimation });
    }

    /**
     * Aktualisiert Attribute einer existierenden Animation (Name, FPS, Loop, etc.).
     *
     * @param {number} index - Index der zu aktualisierenden Animation.
     * @param {Partial<AnimationData>} patch - Die zu überschreibenden Eigenschaften.
     * @fires Events#ANIMATION_UPDATED
     * @fires Events#DEFAULT_ANIMATION_CHANGED
     */
    updateAnimation(index, patch) {
        if (index < 0 || index >= this.project.animations.length) return;
        const anim = this.project.animations[index];
        const oldName = anim.name;

        Object.assign(anim, patch);

        if (patch.name && this.project.defaultAnimation === oldName) {
            this.project.defaultAnimation = patch.name;
            this.emit(Events.DEFAULT_ANIMATION_CHANGED, { defaultAnimation: this.project.defaultAnimation });
        }

        this.markDirty();
        this.emit(Events.ANIMATION_UPDATED, { index, anim, patch });
    }

    /**
     * Entfernt eine Animation anhand ihres Index aus dem Projekt.
     *
     * @param {number} index - Index der zu löschenden Animation.
     * @fires Events#ANIMATIONS_CHANGED
     * @fires Events#ANIMATION_SELECTED
     * @fires Events#DEFAULT_ANIMATION_CHANGED
     */
    deleteAnimation(index) {
        if (index < 0 || index >= this.project.animations.length) return;
        this.pushHistory();

        const deletedAnim = this.project.animations[index];
        this.project.animations.splice(index, 1);

        if (this.project.defaultAnimation === deletedAnim.name) {
            this.project.defaultAnimation = null;
            this.emit(Events.DEFAULT_ANIMATION_CHANGED, { defaultAnimation: null });
        }

        if (this.selectedAnimationIndex === index) {
            this.selectedAnimationIndex = this.project.animations.length > 0 ? Math.min(index, this.project.animations.length - 1) : -1;
        } else if (this.selectedAnimationIndex > index) {
            this.selectedAnimationIndex--;
        }

        this.markDirty();
        this.emit(Events.ANIMATIONS_CHANGED, { project: this.project });
        this.emit(Events.ANIMATION_SELECTED, { index: this.selectedAnimationIndex, anim: this.getSelectedAnimation() });
        this.emit(Events.DEFAULT_ANIMATION_CHANGED, { defaultAnimation: this.project.defaultAnimation });
    }

    /**
     * Legt die Standard-Animation (Default Animation) für das Projekt fest.
     *
     * @param {string|null} name - Name der Animation oder null zum Deaktivieren.
     * @fires Events#DEFAULT_ANIMATION_CHANGED
     * @fires Events#ANIMATIONS_CHANGED
     */
    setDefaultAnimation(name) {
        this.project.defaultAnimation = name ? name : null;
        this.markDirty();
        this.emit(Events.DEFAULT_ANIMATION_CHANGED, { defaultAnimation: this.project.defaultAnimation });
        this.emit(Events.ANIMATIONS_CHANGED, { project: this.project });
    }

    // --- Frame Actions ---

    /**
     * Schaltet einen Frame in der aktuell ausgewählten Animation um:
     * Falls bereits enthalten, wird er entfernt; andernfalls am Ende angehängt.
     *
     * @param {number} frameIndex - Linearer Spritesheet-Frame-Index.
     * @fires Events#FRAMES_CHANGED
     */
    toggleFrame(frameIndex) {
        const anim = this.getSelectedAnimation();
        if (!anim) return;

        this.pushHistory();
        const existingIdx = anim.frames.indexOf(frameIndex);
        if (existingIdx !== -1) {
            anim.frames.splice(existingIdx, 1);
        } else {
            anim.frames.push(frameIndex);
        }

        this.markDirty();
        this.emit(Events.FRAMES_CHANGED, { anim, index: this.selectedAnimationIndex });
    }

    /**
     * Hängt einen Frame-Index an das Ende der Timeline der aktuellen Animation an.
     *
     * @param {number} frameIndex - Linearer Spritesheet-Frame-Index.
     * @fires Events#FRAMES_CHANGED
     */
    appendFrame(frameIndex) {
        const anim = this.getSelectedAnimation();
        if (!anim) return;

        this.pushHistory();
        anim.frames.push(frameIndex);
        this.markDirty();
        this.emit(Events.FRAMES_CHANGED, { anim, index: this.selectedAnimationIndex });
    }

    /**
     * Ersetzt einen Frame an einer bestimmten Timeline-Position mit einem neuen Frame-Index.
     *
     * @param {number} timelineIndex - 0-basierter Index auf der Timeline.
     * @param {number} frameIndex - Neuer linearer Spritesheet-Frame-Index.
     * @fires Events#FRAMES_CHANGED
     */
    replaceFrame(timelineIndex, frameIndex) {
        const anim = this.getSelectedAnimation();
        if (!anim || timelineIndex < 0 || timelineIndex >= anim.frames.length) return;

        this.pushHistory();
        anim.frames[timelineIndex] = frameIndex;
        this.markDirty();
        this.emit(Events.FRAMES_CHANGED, { anim, index: this.selectedAnimationIndex });
    }

    /**
     * Dupliziert einen Frame an einer bestimmten Timeline-Position und fügt ihn direkt dahinter ein.
     *
     * @param {number} timelineIndex - Position des zu duplizierenden Frames.
     * @fires Events#FRAMES_CHANGED
     */
    duplicateFrame(timelineIndex) {
        const anim = this.getSelectedAnimation();
        if (!anim || timelineIndex < 0 || timelineIndex >= anim.frames.length) return;

        this.pushHistory();
        const frameVal = anim.frames[timelineIndex];
        anim.frames.splice(timelineIndex + 1, 0, frameVal);
        this.markDirty();
        this.emit(Events.FRAMES_CHANGED, { anim, index: this.selectedAnimationIndex });
    }

    /**
     * Entfernt einen Frame an einer bestimmten Timeline-Position.
     *
     * @param {number} timelineIndex - Position des zu entfernenden Frames auf der Timeline.
     * @fires Events#FRAMES_CHANGED
     */
    deleteFrame(timelineIndex) {
        const anim = this.getSelectedAnimation();
        if (!anim || timelineIndex < 0 || timelineIndex >= anim.frames.length) return;

        this.pushHistory();
        anim.frames.splice(timelineIndex, 1);
        this.markDirty();
        this.emit(Events.FRAMES_CHANGED, { anim, index: this.selectedAnimationIndex });
    }

    // --- Canvas Transform Actions ---

    /**
     * Aktualisiert den Transformationszustand (Zoom, Pan) des Spritesheet-Grid-Canvas.
     *
     * @param {Partial<TransformState>} transform - Zu aktualisierende Transformationswerte.
     * @fires Events#GRID_TRANSFORM_CHANGED
     */
    setGridTransform(transform) {
        this.gridTransform = { ...this.gridTransform, ...transform };
        this.emit(Events.GRID_TRANSFORM_CHANGED, this.gridTransform);
    }

    /**
     * Aktualisiert den Transformationszustand (Zoom, Pan) des Animations-Vorschau-Canvas.
     *
     * @param {Partial<TransformState>} transform - Zu aktualisierende Transformationswerte.
     * @fires Events#PREVIEW_TRANSFORM_CHANGED
     */
    setPreviewTransform(transform) {
        this.previewTransform = { ...this.previewTransform, ...transform };
        this.emit(Events.PREVIEW_TRANSFORM_CHANGED, this.previewTransform);
    }

    // --- Feedback ---

    /**
     * Feuert eine Statusnachricht zur Anzeige in der UI-Statusleiste.
     *
     * @param {string} message - Anzuzeigender Text.
     * @param {'info'|'success'|'error'|'warn'} [type='info'] - Statuskategorie für Styling.
     * @fires Events#STATUS_MESSAGE
     */
    showStatus(message, type = 'info') {
        this.emit(Events.STATUS_MESSAGE, { message, type });
    }
}

