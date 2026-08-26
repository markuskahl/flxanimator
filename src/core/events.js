/**
 * @file events.js
 * @description Zentrale Event-Konstanten für das nachrichtenbasierte Publish/Subscribe-System
 * zwischen dem reaktiven Store und den UI-Komponenten von FlxAnimator.
 * @module core/events
 */

/**
 * Anwendungsweite Event-Namen, die vom {@link Store} über `CustomEvent` gefeuert werden.
 * 
 * @readonly
 * @enum {string}
 */
export const Events = {
    /**
     * Wird ausgelöst, wenn ein Projekt vollständig geladen und initialisiert wurde.
     * @event Events#PROJECT_LOADED
     * @type {string}
     * @property {Object} detail - Kein zusätzlicher Payload.
     */
    PROJECT_LOADED: 'project:loaded',

    /**
     * Wird ausgelöst, wenn sich die Spritesheet-Gitterkonfiguration (Breite, Höhe, Spacing, Margin) ändert.
     * @event Events#PROJECT_CONFIG_CHANGED
     * @type {string}
     * @property {Object} detail
     * @property {import('./store.js').SpritesheetConfig} detail.config - Die aktualisierte Konfiguration.
     */
    PROJECT_CONFIG_CHANGED: 'project:config-changed',

    /**
     * Wird ausgelöst, wenn sich der Änderungsstatus (ungespeicherte Änderungen vorhanden / gespeichert) ändert.
     * @event Events#PROJECT_DIRTY_CHANGED
     * @type {string}
     * @property {Object} detail
     * @property {boolean} detail.isDirty - True, wenn ungespeicherte Änderungen vorliegen.
     */
    PROJECT_DIRTY_CHANGED: 'project:dirty-changed',

    /**
     * Wird ausgelöst, wenn sich der Dateipfad des aktuellen Projekts ändert (z. B. nach Speichern oder Öffnen).
     * @event Events#PROJECT_PATH_CHANGED
     * @type {string}
     * @property {Object} detail
     * @property {string|null} detail.filePath - Der neue absolute Dateipfad oder null.
     */
    PROJECT_PATH_CHANGED: 'project:path-changed',

    /**
     * Wird ausgelöst, wenn eine Spritesheet-Bildquelle gesetzt wurde.
     * @event Events#SPRITESHEET_LOADED
     * @type {string}
     * @property {Object} detail
     * @property {string} detail.imagePath - Ursprünglicher Dateipfad der Bilddatei.
     * @property {string} detail.imageSrc - Aufgelöste Bild-URL (z. B. app-asset:// oder data:).
     */
    SPRITESHEET_LOADED: 'spritesheet:loaded',

    /**
     * Wird ausgelöst, sobald das Spritesheet-Image-Element im DOM vollständig gerendert und abmessbar ist.
     * @event Events#SPRITESHEET_READY
     * @type {string}
     * @property {Object} detail
     * @property {HTMLImageElement} detail.image - Das geladene HTML-Image-Element.
     * @property {number} detail.width - Natürliche Breite des Spritesheet-Bildes in Pixeln.
     * @property {number} detail.height - Natürliche Höhe des Spritesheet-Bildes in Pixeln.
     */
    SPRITESHEET_READY: 'spritesheet:ready',

    /**
     * Wird ausgelöst, wenn Animationen hinzugefügt, gelöscht oder in der Reihenfolge geändert wurden.
     * @event Events#ANIMATIONS_CHANGED
     * @type {string}
     * @property {Object} detail
     * @property {Array<import('./store.js').AnimationData>} detail.animations - Liste aller Animationen.
     */
    ANIMATIONS_CHANGED: 'animations:changed',

    /**
     * Wird ausgelöst, wenn eine andere Animation in der Seitenleiste ausgewählt wurde.
     * @event Events#ANIMATION_SELECTED
     * @type {string}
     * @property {Object} detail
     * @property {number} detail.index - Index der ausgewählten Animation (-1 falls keine ausgewählt).
     * @property {import('./store.js').AnimationData|null} detail.animation - Die ausgewählte Animation.
     */
    ANIMATION_SELECTED: 'animation:selected',

    /**
     * Wird ausgelöst, wenn Eigenschaften einer spezifischen Animation geändert wurden (Name, FPS, Loop, FlipX, FlipY).
     * @event Events#ANIMATION_UPDATED
     * @type {string}
     * @property {Object} detail
     * @property {number} detail.index - Index der modifizierten Animation.
     * @property {import('./store.js').AnimationData} detail.animation - Die aktualisierten Animationsdaten.
     */
    ANIMATION_UPDATED: 'animation:updated',

    /**
     * Wird ausgelöst, wenn die Standard-Animation (Default Animation) für den Export geändert wurde.
     * @event Events#DEFAULT_ANIMATION_CHANGED
     * @type {string}
     * @property {Object} detail
     * @property {string|null} detail.defaultAnimation - Name der neuen Standard-Animation oder null.
     */
    DEFAULT_ANIMATION_CHANGED: 'default-animation:changed',

    /**
     * Wird ausgelöst, wenn Frames der aktuell ausgewählten Animation hinzugefügt, entfernt oder verschoben wurden.
     * @event Events#FRAMES_CHANGED
     * @type {string}
     * @property {Object} detail
     * @property {number} detail.index - Index der Animation, deren Frames verändert wurden.
     * @property {number[]} detail.frames - Das aktualisierte Array von Frame-Indizes.
     */
    FRAMES_CHANGED: 'frames:changed',

    /**
     * Wird ausgelöst, wenn sich Zoom- oder Pan-Transformationen des Haupt-Grid-Canvas ändern.
     * @event Events#GRID_TRANSFORM_CHANGED
     * @type {string}
     * @property {Object} detail
     * @property {import('./store.js').TransformState} detail.transform - Aktueller Transformationszustand.
     */
    GRID_TRANSFORM_CHANGED: 'grid:transform-changed',

    /**
     * Wird ausgelöst, wenn sich Zoom- oder Pan-Transformationen des Vorschau-Canvas ändern.
     * @event Events#PREVIEW_TRANSFORM_CHANGED
     * @type {string}
     * @property {Object} detail
     * @property {import('./store.js').TransformState} detail.transform - Aktueller Transformationszustand.
     */
    PREVIEW_TRANSFORM_CHANGED: 'preview:transform-changed',

    /**
     * Wird ausgelöst, um Statusmeldungen in der Statusleiste anzuzeigen.
     * @event Events#STATUS_MESSAGE
     * @type {string}
     * @property {Object} detail
     * @property {string} detail.message - Anzuzeigender Text.
     * @property {'info'|'success'|'error'|'warn'} [detail.type='info'] - Status-Typ für farbliche Hervorhebung.
     */
    STATUS_MESSAGE: 'status:message',

    /**
     * Wird ausgelöst, wenn zwischen Startbildschirm und Arbeitsbereich gewechselt wird.
     * @event Events#VIEW_CHANGED
     * @type {string}
     * @property {Object} detail
     * @property {'start'|'workspace'} detail.view - Aktive Ansicht.
     */
    VIEW_CHANGED: 'view:changed',

    /**
     * Wird ausgelöst, wenn sich die Undo/Redo-Historie ändert (Verfügbarkeit von Rückgängig/Wiederholen).
     * @event Events#HISTORY_CHANGED
     * @type {string}
     * @property {Object} detail
     * @property {boolean} detail.canUndo - True, wenn Aktionen rückgängig gemacht werden können.
     * @property {boolean} detail.canRedo - True, wenn Aktionen wiederhergestellt werden können.
     */
    HISTORY_CHANGED: 'history:changed'
};

