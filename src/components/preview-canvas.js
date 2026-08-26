import { Events } from '../core/events.js';
import { calculateGridDimensions, getFrameCoords, clampZoom, calculatePanOnZoom } from '../core/grid-utils.js';

export class PreviewCanvasComponent {
    constructor(store) {
        this.store = store;

        this.canvasPreview = document.getElementById('preview-canvas');
        this.ctxPreview = this.canvasPreview ? this.canvasPreview.getContext('2d') : null;
        this.previewScroll = document.getElementById('preview-scroll');
        this.previewTransformContainer = document.getElementById('preview-transform-container');
        this.imgSpritesheet = document.getElementById('spritesheet-img');

        this.previewZoom = 2;
        this.previewPanX = 0;
        this.previewPanY = 0;
        this.isPreviewPanning = false;
        this.previewStartX = 0;
        this.previewStartY = 0;

        this.previewInterval = null;
        this.currentPreviewFrame = 0;

        this.init();
    }

    init() {
        if (!this.canvasPreview || !this.previewScroll) return;

        this.store.on(Events.ANIMATION_SELECTED, () => this.startPreview());
        this.store.on(Events.ANIMATION_UPDATED, () => this.startPreview());
        this.store.on(Events.FRAMES_CHANGED, () => this.startPreview());
        this.store.on(Events.SPRITESHEET_LOADED, () => this.startPreview());
        this.store.on(Events.SPRITESHEET_READY, () => this.startPreview());

        this.setupPanAndZoom();
    }

    updateTransform() {
        if (this.previewTransformContainer) {
            this.previewTransformContainer.style.transform = `translate(${this.previewPanX}px, ${this.previewPanY}px) scale(${this.previewZoom})`;
        }
        this.store.setPreviewTransform({ zoom: this.previewZoom, panX: this.previewPanX, panY: this.previewPanY });
    }

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
