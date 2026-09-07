/**
 * @file grid-canvas.js
 * @description UI-Komponente für das Haupt-Spritesheet-Canvas (Workspace Grid Canvas).
 * Rendert das Spritesheet-Bild mit dem überlagerten Schnittmuster-Raster (Grid Overlay),
 * steuert Pan- und Zoom-Navigation und implementiert interaktive Klick-Selektion sowie Drag & Drop von Frames auf die Timeline.
 * @module components/grid-canvas
 */

import { Events } from '../core/events.js';
import {
    calculateGridDimensions,
    getFrameIndexAtCoords,
    clampZoom,
    calculatePanOnZoom
} from '../core/grid-utils.js';

/**
 * Komponente zur Steuerung des interaktiven Spritesheet-Arbeitsbereichs.
 * 
 * @class
 */
export class GridCanvasComponent {
    /**
     * Erzeugt eine neue GridCanvasComponent.
     * @param {import('../core/store.js').Store} store - Der zentrale Anwendungs-Store.
     */
    constructor(store) {
        /**
         * @type {import('../core/store.js').Store}
         */
        this.store = store;

        /**
         * DOM-Element des Spritesheet-Bildes (`#spritesheet-img`).
         * @type {HTMLImageElement|null}
         */
        this.imgSpritesheet = document.getElementById('spritesheet-img');

        /**
         * Canvas-Element für das Raster-Overlay (`#grid-canvas`).
         * @type {HTMLCanvasElement|null}
         */
        this.canvasGrid = document.getElementById('grid-canvas');

        /**
         * 2D-Rendering-Kontext des Raster-Canvas.
         * @type {CanvasRenderingContext2D|null}
         */
        this.ctxGrid = this.canvasGrid ? this.canvasGrid.getContext('2d') : null;

        /**
         * Container-Element für Bild und Canvas (`#grid-container`).
         * @type {HTMLElement|null}
         */
        this.gridContainer = document.getElementById('grid-container');

        /**
         * Übergeordneter Scroll-/Viewport-Bereich (`#workspace-scroll`).
         * @type {HTMLElement|null}
         */
        this.workspaceScroll = document.getElementById('workspace-scroll');

        /**
         * Aktueller Zoomfaktor des Workspace (1.0 = 100%).
         * @type {number}
         */
        this.zoom = 1;

        /**
         * Horizontale Verschiebung (Pan Offset) in Pixeln.
         * @type {number}
         */
        this.panX = 0;

        /**
         * Vertikale Verschiebung (Pan Offset) in Pixeln.
         * @type {number}
         */
        this.panY = 0;

        /**
         * Statusflag für aktives Verschieben des Workspace.
         * @type {boolean}
         */
        this.isPanning = false;

        /**
         * X-Startposition beim Beginn eines Pan-Vorgangs.
         * @type {number}
         */
        this.panStartX = 0;

        /**
         * Y-Startposition beim Beginn eines Pan-Vorgangs.
         * @type {number}
         */
        this.panStartY = 0;

        /**
         * X-Mauskoordinate beim Start eines Drag-Vorgangs.
         * @type {number}
         */
        this.dragStartX = 0;

        /**
         * Y-Mauskoordinate beim Start eines Drag-Vorgangs.
         * @type {number}
         */
        this.dragStartY = 0;

        /**
         * Statusflag, ob momentan ein Frame zur Timeline gezogen wird.
         * @type {boolean}
         */
        this.isDraggingFrame = false;

        /**
         * Frame-Index des momentan gezogenen Frames.
         * @type {number}
         */
        this.draggedFrameIndex = -1;

        /**
         * DOM-Element des mit dem Mauszeiger mitgeführten Ghost-Thumbnails beim Drag & Drop.
         * @type {HTMLElement|null}
         */
        this.dragGhost = null;

        this.init();
    }

    /**
     * Initialisiert Store-Event-Abonnements und Maus-Interaktionen.
     * @listens Events#SPRITESHEET_LOADED
     * @listens Events#PROJECT_LOADED
     */
    init() {
        if (!this.canvasGrid || !this.workspaceScroll) return;

        this.store.on(Events.SPRITESHEET_LOADED, (e) => {
            this.loadImage(e.detail.imageSrc);
        });

        this.store.on(Events.PROJECT_LOADED, () => {
            this.drawGrid();
        });

        this.store.on(Events.PROJECT_CONFIG_CHANGED, () => {
            this.drawGrid();
        });

        this.setupPanAndZoom();
        this.setupGridInteractions();
    }

    /**
     * Lädt die Spritesheet-Bildquelle in das HTML-Image-Element, zentriert die Ansicht
     * und stößt das Neuzeichnen des Rasters an.
     *
     * @param {string} src - Bildquelle (app-asset:// URL oder Base64 Daten-URI).
     * @fires Events#SPRITESHEET_READY
     */
    loadImage(src) {
        if (!src || !this.imgSpritesheet) return;

        this.imgSpritesheet.onload = () => {
            this.imgSpritesheet.style.display = 'block';
            this.canvasGrid.width = this.imgSpritesheet.width;
            this.canvasGrid.height = this.imgSpritesheet.height;

            // Zentriere das Bild im Workspace
            this.zoom = 1;
            const wsRect = this.workspaceScroll.getBoundingClientRect();
            this.panX = Math.round((wsRect.width - this.imgSpritesheet.width) / 2);
            this.panY = Math.round((wsRect.height - this.imgSpritesheet.height) / 2);

            this.updateTransform();
            this.drawGrid();

            this.store.emit(Events.SPRITESHEET_READY, {
                image: this.imgSpritesheet,
                width: this.imgSpritesheet.naturalWidth || this.imgSpritesheet.width,
                height: this.imgSpritesheet.naturalHeight || this.imgSpritesheet.height
            });
        };

        this.imgSpritesheet.onerror = () => {
            this.store.showStatus('Failed to render spritesheet image.', 'error');
        };

        this.imgSpritesheet.src = src;
    }

    /**
     * Aktualisiert die CSS-Transformation des Grid-Containers und synchronisiert die Werte mit dem Store.
     */
    updateTransform() {
        if (this.gridContainer) {
            this.gridContainer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
        }
        this.store.setGridTransform({ zoom: this.zoom, panX: this.panX, panY: this.panY });
    }

    /**
     * Zeichnet das Schnittraster auf das Canvas-Overlay über dem Spritesheet-Bild.
     * Passt die Linienstärke dynamisch an den Zoomfaktor an, um konstante 1px-Sichtbarkeit zu gewährleisten.
     */
    drawGrid() {
        if (!this.imgSpritesheet || !this.imgSpritesheet.src || !this.ctxGrid) return;

        const MAX_CANVAS_DIMENSION = 4096;
        let canvasScale = this.zoom;

        if (this.imgSpritesheet.width * canvasScale > MAX_CANVAS_DIMENSION) {
            canvasScale = MAX_CANVAS_DIMENSION / this.imgSpritesheet.width;
        }
        if (this.imgSpritesheet.height * canvasScale > MAX_CANVAS_DIMENSION) {
            canvasScale = Math.min(canvasScale, MAX_CANVAS_DIMENSION / this.imgSpritesheet.height);
        }

        this.canvasGrid.width = this.imgSpritesheet.width * canvasScale;
        this.canvasGrid.height = this.imgSpritesheet.height * canvasScale;

        this.canvasGrid.style.width = `${this.imgSpritesheet.width}px`;
        this.canvasGrid.style.height = `${this.imgSpritesheet.height}px`;
        this.canvasGrid.style.transform = 'none';

        this.ctxGrid.scale(canvasScale, canvasScale);
        this.ctxGrid.clearRect(0, 0, this.imgSpritesheet.width, this.imgSpritesheet.height);

        const project = this.store.getProject();
        const { width, height, spacing, margin } = project.config;
        const { cols, rows } = calculateGridDimensions(this.imgSpritesheet.width, this.imgSpritesheet.height, project.config);

        this.ctxGrid.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctxGrid.lineWidth = 1 / Math.max(0.1, this.zoom);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = margin + col * (width + spacing);
                const y = margin + row * (height + spacing);
                this.ctxGrid.strokeRect(x, y, width, height);
            }
        }
    }

    /**
     * Konfiguriert Mausrad-Zoom und Workspace-Panning (mittlere Maustaste oder Rechtsklick/Drag).
     */
    setupPanAndZoom() {
        // Zoom via Mausrad
        this.workspaceScroll.addEventListener('wheel', (e) => {
            const project = this.store.getProject();
            if (!project.imagePath && !project.imageSrc) return;
            e.preventDefault();

            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = clampZoom(this.zoom, factor, 0.1, 30);

            const wsRect = this.workspaceScroll.getBoundingClientRect();
            const mouseX = e.clientX - wsRect.left;
            const mouseY = e.clientY - wsRect.top;

            const { panX, panY } = calculatePanOnZoom(mouseX, mouseY, this.panX, this.panY, this.zoom, newZoom);
            this.zoom = newZoom;
            this.panX = panX;
            this.panY = panY;

            this.updateTransform();
            this.drawGrid();
        });

        // Pan Start
        this.workspaceScroll.addEventListener('mousedown', (e) => {
            if (e.button === 1 || e.button === 2 || e.target === this.workspaceScroll) {
                e.preventDefault();
                this.isPanning = true;
                this.panStartX = e.clientX - this.panX;
                this.panStartY = e.clientY - this.panY;
                this.workspaceScroll.style.cursor = 'grabbing';
            }
        });

        // Pan Move
        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;
            this.panX = e.clientX - this.panStartX;
            this.panY = e.clientY - this.panStartY;
            this.updateTransform();
        });

        // Pan End
        window.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.workspaceScroll.style.cursor = 'grab';
            }
        });

        this.workspaceScroll.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Richtet Interaktionen für Klicks auf Rasterzellen und Drag & Drop von Frames ein.
     */
    setupGridInteractions() {
        this.canvasGrid.addEventListener('click', (e) => {
            const selectedIdx = this.store.getSelectedAnimationIndex();
            if (selectedIdx < 0) {
                this.store.showStatus('Please create or select an animation first.', 'info');
                return;
            }

            const dist = Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY);
            if (dist > 5) return; // Es war ein Drag, kein Klick

            const rect = this.canvasGrid.getBoundingClientRect();
            const clickX = (e.clientX - rect.left) / this.zoom;
            const clickY = (e.clientY - rect.top) / this.zoom;

            const project = this.store.getProject();
            const { cols, rows } = calculateGridDimensions(this.imgSpritesheet.width, this.imgSpritesheet.height, project.config);
            const frameIndex = getFrameIndexAtCoords(clickX, clickY, cols, rows, project.config);

            if (frameIndex >= 0) {
                this.store.toggleFrame(frameIndex);
            }
        });

        // Drag & Drop Init
        this.canvasGrid.addEventListener('mousedown', (e) => {
            if (this.store.getSelectedAnimationIndex() < 0 || e.button !== 0) return;

            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;

            const rect = this.canvasGrid.getBoundingClientRect();
            const clickX = (e.clientX - rect.left) / this.zoom;
            const clickY = (e.clientY - rect.top) / this.zoom;

            const project = this.store.getProject();
            const { cols, rows } = calculateGridDimensions(this.imgSpritesheet.width, this.imgSpritesheet.height, project.config);
            const frameIndex = getFrameIndexAtCoords(clickX, clickY, cols, rows, project.config);

            if (frameIndex >= 0) {
                this.isDraggingFrame = true;
                this.draggedFrameIndex = frameIndex;

                const { width, height, spacing, margin } = project.config;
                const col = frameIndex % cols;
                const row = Math.floor(frameIndex / cols);
                const x = margin + col * (width + spacing);
                const y = margin + row * (height + spacing);

                this.dragGhost = document.createElement('div');
                this.dragGhost.style.width = `${width}px`;
                this.dragGhost.style.height = `${height}px`;
                this.dragGhost.style.backgroundImage = `url(${this.imgSpritesheet.src})`;
                this.dragGhost.style.backgroundPosition = `-${x}px -${y}px`;
                this.dragGhost.style.imageRendering = 'pixelated';
                this.dragGhost.style.position = 'fixed';
                this.dragGhost.style.pointerEvents = 'none';
                this.dragGhost.style.zIndex = '1000';
                this.dragGhost.style.opacity = '0.85';
                this.dragGhost.style.left = `${e.clientX}px`;
                this.dragGhost.style.top = `${e.clientY}px`;
                this.dragGhost.style.transform = 'translate(-50%, -50%) scale(2)';
                document.body.appendChild(this.dragGhost);
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDraggingFrame && this.dragGhost) {
                this.dragGhost.style.left = `${e.clientX}px`;
                this.dragGhost.style.top = `${e.clientY}px`;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (this.isDraggingFrame) {
                this.isDraggingFrame = false;
                if (this.dragGhost) {
                    this.dragGhost.remove();
                    this.dragGhost = null;
                }

                const elem = document.elementFromPoint(e.clientX, e.clientY);
                const frameEl = elem ? elem.closest('.timeline-frame') : null;
                const timelineArea = elem ? elem.closest('#workspace-timeline') : null;

                if (frameEl) {
                    const tIdx = parseInt(frameEl.getAttribute('data-timeline-idx'), 10);
                    this.store.replaceFrame(tIdx, this.draggedFrameIndex);
                } else if (timelineArea) {
                    this.store.appendFrame(this.draggedFrameIndex);
                }
            }
        });
    }
}

