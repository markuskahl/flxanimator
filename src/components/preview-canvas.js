/**
 * @file preview-canvas.js
 * @description UI-Komponente für die Echtzeit-Animationsvorschau (Live Preview Canvas).
 * Spielt die Frame-Sequenz der selektierten Animation mit konfigurierter Framerate (FPS) ab
 * und unterstützt horizontales/vertikales Flippen (flipX/flipY) sowie interaktives Zoomen und Verschieben (Pan).
 * @module components/preview-canvas
 */

import { Events } from '../core/events.js';
import { calculateGridDimensions, getFrameCoords, clampZoom, calculatePanOnZoom } from '../core/grid-utils.js';

/**
 * Komponente zur Steuerung und Wiedergabe der Live-Animationsvorschau auf einem HTML5-Canvas.
 * 
 * @class
 */
export class PreviewCanvasComponent {
    /**
     * Erzeugt eine neue PreviewCanvasComponent.
     * @param {import('../core/store.js').Store} store - Der zentrale Anwendungs-Store.
     */
    constructor(store) {
        /**
         * @type {import('../core/store.js').Store}
         */
        this.store = store;

        /**
         * Das Vorschau-Canvas DOM-Element (`#preview-canvas`).
         * @type {HTMLCanvasElement|null}
         */
        this.canvasPreview = document.getElementById('preview-canvas');

        /**
         * 2D-Rendering-Kontext des Vorschau-Canvas.
         * @type {CanvasRenderingContext2D|null}
         */
        this.ctxPreview = this.canvasPreview ? this.canvasPreview.getContext('2d') : null;

        /**
         * Scroll-Container der Vorschau (`#preview-scroll`).
         * @type {HTMLElement|null}
         */
        this.previewScroll = document.getElementById('preview-scroll');

        /**
         * CSS-Transform-Container für Zoom & Pan (`#preview-transform-container`).
         * @type {HTMLElement|null}
         */
        this.previewTransformContainer = document.getElementById('preview-transform-container');

        /**
         * DOM-Element des geladenen Spritesheet-Bildes (`#spritesheet-img`).
         * @type {HTMLImageElement|null}
         */
        this.imgSpritesheet = document.getElementById('spritesheet-img');

        /**
         * Aktueller Zoomfaktor der Vorschau (Standard 2 = 200%).
         * @type {number}
         */
        this.previewZoom = 2;

        /**
         * Horizontale Verschiebung (Pan Offset) in Pixeln.
         * @type {number}
         */
        this.previewPanX = 0;

        /**
         * Vertikale Verschiebung (Pan Offset) in Pixeln.
         * @type {number}
         */
        this.previewPanY = 0;

        /**
         * Statusflag für aktives Verschieben per Maus.
         * @type {boolean}
         */
        this.isPreviewPanning = false;

        /**
         * X-Startposition beim Beginn eines Pan-Vorgangs.
         * @type {number}
         */
        this.previewStartX = 0;

        /**
         * Y-Startposition beim Beginn eines Pan-Vorgangs.
         * @type {number}
         */
        this.previewStartY = 0;

        /**
         * Timer-Handle des setInterval-Loops für die Frame-Wiedergabe.
         * @type {number|null}
         */
        this.previewInterval = null;

        /**
         * Index des momentan in der Vorschau gerenderten Frames aus `anim.frames`.
         * @type {number}
         */
        this.currentPreviewFrame = 0;

        this.init();
    }

    /**
     * Initialisiert Event-Abonnements auf dem Store zur Aktualisierung der Animationsvorschau.
     * @listens Events#ANIMATION_SELECTED
     * @listens Events#ANIMATION_UPDATED
     * @listens Events#FRAMES_CHANGED
     * @listens Events#SPRITESHEET_LOADED
     * @listens Events#SPRITESHEET_READY
     */
    init() {
        if (!this.canvasPreview || !this.previewScroll) return;

        this.store.on(Events.ANIMATION_SELECTED, () => this.startPreview());
        this.store.on(Events.ANIMATION_UPDATED, () => this.startPreview());
        this.store.on(Events.FRAMES_CHANGED, () => this.startPreview());
        this.store.on(Events.SPRITESHEET_LOADED, () => this.startPreview());
        this.store.on(Events.SPRITESHEET_READY, () => this.startPreview());

        this.setupPanAndZoom();
    }

    /**
     * Wendet die aktuellen Pan- und Zoom-Werte via CSS-Transform auf den Vorschau-Container an.
     */
    updateTransform() {
        if (this.previewTransformContainer) {
            this.previewTransformContainer.style.transform = `translate(${this.previewPanX}px, ${this.previewPanY}px) scale(${this.previewZoom})`;
        }
        this.store.setPreviewTransform({ zoom: this.previewZoom, panX: this.previewPanX, panY: this.previewPanY });
    }

    /**
     * Konfiguriert Mausrad-Zoom und Drag-to-Pan für das Vorschaufenster.
     */
    setupPanAndZoom() {
        this.previewScroll.addEventListener('wheel', (e) => {
            if (this.store.getSelectedAnimationIndex() < 0) return;
            e.preventDefault();

            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = clampZoom(this.previewZoom, factor, 0.1, 30);

            const rect = this.previewScroll.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const { panX, panY } = calculatePanOnZoom(mouseX, mouseY, this.previewPanX, this.previewPanY, this.previewZoom, newZoom);
            this.previewZoom = newZoom;
            this.previewPanX = panX;
            this.previewPanY = panY;

            this.updateTransform();
        });

        this.previewScroll.addEventListener('mousedown', (e) => {
            if (e.button === 1 || e.button === 2 || e.target === this.previewScroll || e.target === this.previewTransformContainer) {
                e.preventDefault();
                this.isPreviewPanning = true;
                this.previewStartX = e.clientX - this.previewPanX;
                this.previewStartY = e.clientY - this.previewPanY;
                this.previewScroll.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isPreviewPanning) return;
            this.previewPanX = e.clientX - this.previewStartX;
            this.previewPanY = e.clientY - this.previewStartY;
            this.updateTransform();
        });

        window.addEventListener('mouseup', () => {
            if (this.isPreviewPanning) {
                this.isPreviewPanning = false;
                this.previewScroll.style.cursor = 'grab';
            }
        });

        this.previewScroll.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Startet oder aktualisiert den Frame-Wiedergabe-Timer für die momentan ausgewählte Animation.
     * Berücksichtigt FPS, Looping, FlipX und FlipY.
     */
    startPreview() {
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
            this.previewInterval = null;
        }
        this.currentPreviewFrame = 0;

        const anim = this.store.getSelectedAnimation();
        if (!anim || anim.frames.length === 0 || !this.imgSpritesheet || !this.imgSpritesheet.src) {
            if (this.ctxPreview) {
                this.ctxPreview.clearRect(0, 0, this.canvasPreview.width, this.canvasPreview.height);
            }
            return;
        }

        const drawFrame = () => {
            if (!this.imgSpritesheet || !this.imgSpritesheet.src || !this.ctxPreview) return;

            const project = this.store.getProject();
            const { width, height } = project.config;
            const imgWidth = this.imgSpritesheet.naturalWidth || this.imgSpritesheet.width;
            const imgHeight = this.imgSpritesheet.naturalHeight || this.imgSpritesheet.height;
            const { cols } = calculateGridDimensions(imgWidth, imgHeight, project.config);

            const frameIndex = anim.frames[this.currentPreviewFrame];
            const coords = getFrameCoords(frameIndex, cols, project.config);
            if (!coords) return;

            // Canvas-Größe anpassen falls geändert
            if (this.canvasPreview.width !== width || this.canvasPreview.height !== height) {
                this.canvasPreview.width = width;
                this.canvasPreview.height = height;

                const rect = this.previewScroll.getBoundingClientRect();
                this.previewPanX = Math.round((rect.width - width * this.previewZoom) / 2);
                this.previewPanY = Math.round((rect.height - height * this.previewZoom) / 2);
                this.updateTransform();
            }

            this.ctxPreview.clearRect(0, 0, width, height);
            this.ctxPreview.imageSmoothingEnabled = false;

            this.ctxPreview.save();
            const translateX = anim.flipX ? width : 0;
            const translateY = anim.flipY ? height : 0;
            const scaleX = anim.flipX ? -1 : 1;
            const scaleY = anim.flipY ? -1 : 1;

            this.ctxPreview.translate(translateX, translateY);
            this.ctxPreview.scale(scaleX, scaleY);
            this.ctxPreview.drawImage(
                this.imgSpritesheet,
                coords.x, coords.y, width, height,
                0, 0, width, height
            );
            this.ctxPreview.restore();

            this.currentPreviewFrame++;
            if (this.currentPreviewFrame >= anim.frames.length) {
                this.currentPreviewFrame = anim.loop ? 0 : anim.frames.length - 1;
            }
        };

        drawFrame();

        if (anim.frames.length > 1 && anim.fps > 0) {
            this.previewInterval = setInterval(drawFrame, 1000 / anim.fps);
        }
    }
}

