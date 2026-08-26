/**
 * @file timeline.js
 * @description UI-Komponente für die Animations-Timeline am unteren Bildschirmrand.
 * Rendert visuelle Thumbnails jedes Frames der aktiven Animation, nummerierte Badges
 * und Aktions-Overlays zum Duplizieren und Löschen von Frames.
 * @module components/timeline
 */

import { Events } from '../core/events.js';
import { calculateGridDimensions, getFrameCoords, calculateFittedScale } from '../core/grid-utils.js';

/**
 * Komponente zur Steuerung und interaktiven Darstellung der Timeline-Frames.
 * 
 * @class
 */
export class TimelineComponent {
    /**
     * Erzeugt eine neue TimelineComponent.
     * @param {import('../core/store.js').Store} store - Der zentrale Anwendungs-Store.
     */
    constructor(store) {
        /**
         * @type {import('../core/store.js').Store}
         */
        this.store = store;

        /**
         * Übergeordnetes Timeline-Container-Element (`#workspace-timeline`).
         * @type {HTMLElement|null}
         */
        this.timelineEl = document.getElementById('workspace-timeline');

        /**
         * Container für die gerenderten Frame-Elemente (`#timeline-frames`).
         * @type {HTMLElement|null}
         */
        this.timelineFrames = document.getElementById('timeline-frames');

        /**
         * Button zum Anhängen eines Standard-Frames (`#btn-timeline-add`).
         * @type {HTMLButtonElement|null}
         */
        this.btnAddFrame = document.getElementById('btn-timeline-add');

        /**
         * HTML-Image-Element des geladenen Spritesheets (`#spritesheet-img`).
         * @type {HTMLImageElement|null}
         */
        this.imgSpritesheet = document.getElementById('spritesheet-img');

        this.init();
    }

    /**
     * Initialisiert Event-Abonnements auf dem Store für Animationsauswahl, Frame-Änderungen und Spritesheet-Laden.
     * @listens Events#VIEW_CHANGED
     * @listens Events#ANIMATION_SELECTED
     * @listens Events#FRAMES_CHANGED
     * @listens Events#SPRITESHEET_LOADED
     * @listens Events#SPRITESHEET_READY
     */
    init() {
        if (!this.timelineFrames) return;

        this.store.on(Events.VIEW_CHANGED, (e) => {
            if (this.timelineEl) {
                this.timelineEl.style.display = e.detail.view === 'workspace' ? 'flex' : 'none';
            }
        });

        this.store.on(Events.ANIMATION_SELECTED, () => this.updateTimeline());
        this.store.on(Events.FRAMES_CHANGED, () => this.updateTimeline());
        this.store.on(Events.SPRITESHEET_LOADED, () => this.updateTimeline());
        this.store.on(Events.SPRITESHEET_READY, () => this.updateTimeline());

        if (this.btnAddFrame) {
            this.btnAddFrame.addEventListener('click', () => {
                const anim = this.store.getSelectedAnimation();
                if (anim) {
                    this.store.appendFrame(0);
                }
            });
        }
    }

    /**
     * Baut die Timeline-DOM-Kacheln für die aktuell ausgewählte Animation komplett neu auf.
     * Berechnet die CSS-Background-Position für pixelperfekte Frame-Vorschauen im Thumbnail.
     */
    updateTimeline() {
        if (!this.timelineFrames) return;
        this.timelineFrames.innerHTML = '';

        const anim = this.store.getSelectedAnimation();
        if (!anim) return;

        const project = this.store.getProject();
        const { width, height } = project.config;
        const imgWidth = this.imgSpritesheet ? (this.imgSpritesheet.naturalWidth || this.imgSpritesheet.width) : 0;
        const imgHeight = this.imgSpritesheet ? (this.imgSpritesheet.naturalHeight || this.imgSpritesheet.height) : 0;
        const { cols } = calculateGridDimensions(imgWidth, imgHeight, project.config);

        anim.frames.forEach((frameIndex, idx) => {
            const frameEl = document.createElement('div');
            frameEl.className = 'timeline-frame glass-panel';
            frameEl.style.cssText = `
                width: 120px; height: 120px; min-width: 120px;
                position: relative; cursor: grab;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                border: 2px solid transparent; transition: border-color 0.2s;
                overflow: hidden;
            `;
            frameEl.setAttribute('data-timeline-idx', idx);

            const frameImg = document.createElement('div');
            frameImg.style.width = '100%';
            frameImg.style.height = '100%';
            frameImg.style.imageRendering = 'pixelated';
            frameImg.style.backgroundRepeat = 'no-repeat';
            frameEl.appendChild(frameImg);

            if (this.imgSpritesheet && this.imgSpritesheet.src && cols > 0) {
                const coords = getFrameCoords(frameIndex, cols, project.config);
                if (coords) {
                    const scale = calculateFittedScale(width, height, 90, 90);
                    const scaledWidth = width * scale;
                    const scaledHeight = height * scale;

                    frameImg.style.backgroundImage = `url(${this.imgSpritesheet.src})`;
                    frameImg.style.backgroundSize = `${imgWidth * scale}px ${imgHeight * scale}px`;
                    frameImg.style.backgroundPosition = `-${coords.x * scale}px -${coords.y * scale}px`;
                    frameImg.style.width = `${scaledWidth}px`;
                    frameImg.style.height = `${scaledHeight}px`;
                }
            }

            const idxLabel = document.createElement('div');
            idxLabel.innerText = idx + 1;
            idxLabel.style.cssText = `
                position: absolute; bottom: 4px; left: 4px;
                background: rgba(0, 0, 0, 0.8); color: #fff;
                font-weight: bold; font-size: 0.8rem;
                padding: 2px 6px; border-radius: 4px;
                pointer-events: none; box-shadow: 0 1px 3px rgba(0,0,0,0.5);
                z-index: 10;
            `;
            frameEl.appendChild(idxLabel);

            const actionsEl = document.createElement('div');
            actionsEl.className = 'frame-actions';
            actionsEl.style.cssText = `
                position: absolute; bottom: 0; left: 0; right: 0;
                background: rgba(0,0,0,0.7); display: none;
                justify-content: space-around; padding: 2px 0;
            `;

            const btnDup = document.createElement('button');
            btnDup.innerHTML = '⧉';
            btnDup.title = 'Duplicate Frame';
            btnDup.style.cssText = 'background: transparent; border: none; color: #fff; padding: 2px 5px; font-size: 0.8rem; cursor: pointer; min-width: 0;';
            btnDup.onclick = (e) => {
                e.stopPropagation();
                this.store.duplicateFrame(idx);
            };

            const btnDel = document.createElement('button');
            btnDel.innerHTML = '×';
            btnDel.title = 'Delete Frame';
            btnDel.style.cssText = 'background: transparent; border: none; color: var(--danger-color); padding: 2px 5px; font-size: 1rem; cursor: pointer; min-width: 0; line-height: 1;';
            btnDel.onclick = (e) => {
                e.stopPropagation();
                this.store.deleteFrame(idx);
            };

            actionsEl.appendChild(btnDup);
            actionsEl.appendChild(btnDel);
            frameEl.appendChild(actionsEl);

            frameEl.onmouseover = () => { actionsEl.style.display = 'flex'; };
            frameEl.onmouseout = () => { actionsEl.style.display = 'none'; };

            this.timelineFrames.appendChild(frameEl);
        });
    }
}

