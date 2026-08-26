/**
 * @file resizer.js
 * @description UI-Komponente für den vertikalen Splitter/Trennstrich (Split Pane Resizer).
 * Ermöglicht das stufenlose Verändern der Breite des rechten Panels (Vorschau & Animationseinstellungen).
 * @module components/resizer
 */

/**
 * Komponente zur interaktiven Breitenanpassung des rechten Seitenpanels per Drag & Drop.
 * 
 * @class
 */
export class ResizerComponent {
    /**
     * Erzeugt eine neue ResizerComponent und bindet DOM-Elemente.
     */
    constructor() {
        /**
         * Das DOM-Element des Splitters (`#workspace-resizer`).
         * @type {HTMLElement|null}
         */
        this.resizer = document.getElementById('workspace-resizer');

        /**
         * Das rechte Container-Element (`#workspace-right`).
         * @type {HTMLElement|null}
         */
        this.workspaceRight = document.getElementById('workspace-right');

        /**
         * Der übergeordnete Workspace-Top-Container (`#workspace-top`).
         * @type {HTMLElement|null}
         */
        this.workspaceTop = document.getElementById('workspace-top');

        /**
         * Statusflag, ob der Resizer momentan mit gedrückter Maustaste gezogen wird.
         * @type {boolean}
         */
        this.isResizing = false;

        this.init();
    }

    /**
     * Initialisiert Maus-Events für Drag & Drop (mousedown, mousemove, mouseup).
     */
    init() {
        if (!this.resizer || !this.workspaceRight || !this.workspaceTop) return;

        this.resizer.addEventListener('mousedown', () => {
            this.isResizing = true;
            document.body.style.cursor = 'col-resize';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;
            const workspaceRect = this.workspaceTop.getBoundingClientRect();
            const newRightWidth = workspaceRect.right - e.clientX;

            if (newRightWidth > 150 && newRightWidth < workspaceRect.width - 150) {
                this.workspaceRight.style.width = `${newRightWidth}px`;
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.isResizing = false;
                document.body.style.cursor = '';
            }
        });
    }
}

