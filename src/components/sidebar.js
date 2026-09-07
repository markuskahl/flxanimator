/**
 * @file sidebar.js
 * @description UI-Komponente für die linke Seitenleiste (Sidebar).
 * Ermöglicht das Anlegen, Auswählen, Bearbeiten und Löschen von Animationen sowie die
 * Echtzeit-Modifikation von Parametern (Name, FPS, Loop, FlipX, FlipY, Default Animation).
 * @module components/sidebar
 */

import { Events } from '../core/events.js';
import { calculateGridDimensions } from '../core/grid-utils.js';

/**
 * @typedef {Object} SidebarCallbacks
 * @property {() => void} [onAddAnimation] - Callback beim Klick auf "Add Animation".
 * @property {() => void} [onBrowseImage] - Callback beim Klick auf "Browse" für das Spritesheet-Bild.
 */

/**
 * Komponente zur Steuerung der Animationsliste und der Animations-Detailformulare in der Seitenleiste.
 * 
 * @class
 */
export class SidebarComponent {
    /**
     * Erzeugt eine neue SidebarComponent.
     * @param {import('../core/store.js').Store} store - Der zentrale Anwendungs-Store.
     * @param {SidebarCallbacks} [callbacks] - Event-Callbacks.
     */
    constructor(store, callbacks) {
        /**
         * @type {import('../core/store.js').Store}
         */
        this.store = store;

        /**
         * @type {SidebarCallbacks}
         */
        this.callbacks = callbacks || {};

        /**
         * DOM-Element der Seitenleiste (`#sidebar`).
         * @type {HTMLElement|null}
         */
        this.sidebarEl = document.getElementById('sidebar');

        // --- Spritesheet & Grid Settings DOM Elements ---
        this.headerSpritesheetSettings = document.getElementById('header-spritesheet-settings');
        this.spritesheetSettingsBody = document.getElementById('spritesheet-settings-body');
        this.toggleSpritesheetIcon = document.getElementById('toggle-spritesheet-icon');
        this.badgeGridInfo = document.getElementById('badge-grid-info');
        this.sidebarImgPath = document.getElementById('sidebar-img-path');
        this.btnSidebarBrowseImg = document.getElementById('btn-sidebar-browse-img');
        this.sidebarWidth = document.getElementById('sidebar-proj-width');
        this.sidebarHeight = document.getElementById('sidebar-proj-height');
        this.sidebarSpacing = document.getElementById('sidebar-proj-spacing');
        this.sidebarMargin = document.getElementById('sidebar-proj-margin');
        this.imgSpritesheet = document.getElementById('spritesheet-img');

        /**
         * Button "Add Animation" (`#btn-add-anim`).
         * @type {HTMLButtonElement|null}
         */
        this.btnAddAnim = document.getElementById('btn-add-anim');

        /**
         * Container für die Bearbeitungsfelder der ausgewählten Animation (`#edit-anim-controls`).
         * @type {HTMLElement|null}
         */
        this.editAnimControls = document.getElementById('edit-anim-controls');

        /**
         * Eingabefeld für den Animationsnamen (`#anim-name`).
         * @type {HTMLInputElement|null}
         */
        this.editAnimName = document.getElementById('anim-name');

        /**
         * Eingabefeld für die FPS-Zahl (`#anim-fps`).
         * @type {HTMLInputElement|null}
         */
        this.editAnimFps = document.getElementById('anim-fps');

        /**
         * Checkbox für Loop (`#anim-loop`).
         * @type {HTMLInputElement|null}
         */
        this.editAnimLoop = document.getElementById('anim-loop');

        /**
         * Checkbox für horizontale Spiegelung (`#anim-flip-x`).
         * @type {HTMLInputElement|null}
         */
        this.editAnimFlipX = document.getElementById('anim-flip-x');

        /**
         * Checkbox für vertikale Spiegelung (`#anim-flip-y`).
         * @type {HTMLInputElement|null}
         */
        this.editAnimFlipY = document.getElementById('anim-flip-y');

        /**
         * Dropdown-Auswahl für die Standard-Animation (`#default-anim-select`).
         * @type {HTMLSelectElement|null}
         */
        this.selectDefaultAnim = document.getElementById('default-anim-select');

        /**
         * Listen-Element für Animationen (`#animation-list`).
         * @type {HTMLUListElement|null}
         */
        this.animListEl = document.getElementById('animation-list');

        this.init();
    }

    /**
     * Initialisiert Event-Abonnements auf dem Store für Animations- und View-Updates.
     * @listens Events#VIEW_CHANGED
     * @listens Events#PROJECT_LOADED
     * @listens Events#PROJECT_CONFIG_CHANGED
     * @listens Events#SPRITESHEET_LOADED
     * @listens Events#SPRITESHEET_READY
     * @listens Events#ANIMATIONS_CHANGED
     * @listens Events#ANIMATION_SELECTED
     * @listens Events#ANIMATION_UPDATED
     * @listens Events#FRAMES_CHANGED
     * @listens Events#DEFAULT_ANIMATION_CHANGED
     */
    init() {
        this.store.on(Events.VIEW_CHANGED, (e) => {
            if (this.sidebarEl) {
                this.sidebarEl.style.display = e.detail.view === 'workspace' ? 'flex' : 'none';
            }
        });

        this.store.on(Events.PROJECT_LOADED, () => this.updateSpritesheetFields());
        this.store.on(Events.PROJECT_CONFIG_CHANGED, () => this.updateSpritesheetFields());
        this.store.on(Events.SPRITESHEET_LOADED, () => this.updateSpritesheetFields());
        this.store.on(Events.SPRITESHEET_READY, () => this.updateGridBadge());

        this.store.on(Events.ANIMATIONS_CHANGED, () => {
            this.updateAnimationList();
            this.updateDefaultAnimationSelect();
            this.updateEditControls();
        });

        this.store.on(Events.ANIMATION_SELECTED, () => {
            this.updateSelectionHighlight();
            this.updateEditControls();
        });

        this.store.on(Events.ANIMATION_UPDATED, (e) => {
            this.updateListItemText(e.detail.index);
        });

        this.store.on(Events.FRAMES_CHANGED, (e) => {
            this.updateListItemText(e.detail.index);
        });

        this.store.on(Events.DEFAULT_ANIMATION_CHANGED, () => {
            this.updateDefaultAnimationSelect();
            this.updateAnimationList();
        });

        if (this.btnAddAnim && this.callbacks.onAddAnimation) {
            this.btnAddAnim.addEventListener('click', () => this.callbacks.onAddAnimation());
        }

        this.setupSpritesheetInputs();
        this.setupEditInputs();
    }

    /**
     * Richtet Event-Listener für Formulareingaben ein und synchronisiert Änderungen direkt mit dem Store.
     */
    setupEditInputs() {
        if (this.editAnimName) {
            this.editAnimName.addEventListener('input', (e) => {
                const idx = this.store.getSelectedAnimationIndex();
                if (idx >= 0) {
                    this.store.updateAnimation(idx, { name: e.target.value });
                    this.updateDefaultAnimationSelect();
                }
            });
        }

        if (this.editAnimFps) {
            this.editAnimFps.addEventListener('input', (e) => {
                const idx = this.store.getSelectedAnimationIndex();
                if (idx >= 0) {
                    this.store.updateAnimation(idx, { fps: parseInt(e.target.value, 10) || 1 });
                }
            });
        }

        if (this.editAnimLoop) {
            this.editAnimLoop.addEventListener('change', (e) => {
                const idx = this.store.getSelectedAnimationIndex();
                if (idx >= 0) {
                    this.store.updateAnimation(idx, { loop: e.target.checked });
                }
            });
        }

        if (this.editAnimFlipX) {
            this.editAnimFlipX.addEventListener('change', (e) => {
                const idx = this.store.getSelectedAnimationIndex();
                if (idx >= 0) {
                    this.store.updateAnimation(idx, { flipX: e.target.checked });
                }
            });
        }

        if (this.editAnimFlipY) {
            this.editAnimFlipY.addEventListener('change', (e) => {
                const idx = this.store.getSelectedAnimationIndex();
                if (idx >= 0) {
                    this.store.updateAnimation(idx, { flipY: e.target.checked });
                }
            });
        }

        if (this.selectDefaultAnim) {
            this.selectDefaultAnim.addEventListener('change', (e) => {
                const val = e.target.value.trim();
                this.store.setDefaultAnimation(val ? val : null);
            });
        }
    }

    /**
     * Aktualisiert die Eingabefelder im Bearbeitungsbereich anhand der aktuell ausgewählten Animation.
     */
    updateEditControls() {
        const anim = this.store.getSelectedAnimation();
        if (anim && this.editAnimControls) {
            this.editAnimControls.style.display = 'block';
            this.editAnimName.value = anim.name;
            this.editAnimFps.value = anim.fps;
            this.editAnimLoop.checked = anim.loop;
            this.editAnimFlipX.checked = !!anim.flipX;
            this.editAnimFlipY.checked = !!anim.flipY;
        } else if (this.editAnimControls) {
            this.editAnimControls.style.display = 'none';
        }
    }

    /**
     * Rendert die Liste aller im Projekt definierten Animationen mit Badges und Lösch-Buttons neu.
     */
    updateAnimationList() {
        if (!this.animListEl) return;
        this.animListEl.innerHTML = '';

        const project = this.store.getProject();
        const selectedIndex = this.store.getSelectedAnimationIndex();

        project.animations.forEach((anim, index) => {
            const li = document.createElement('li');
            li.className = `anim-item ${index === selectedIndex ? 'selected' : ''}`;

            const isDefault = project.defaultAnimation && project.defaultAnimation === anim.name;
            const span = document.createElement('span');
            span.innerHTML = `<strong>${anim.name}</strong>${isDefault ? ' <span class="badge-default">Default</span>' : ''} <small>(${anim.frames.length} frames)</small>`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Delete animation';

            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.store.deleteAnimation(index);
            };

            li.onclick = () => {
                this.store.selectAnimation(index);
            };

            li.appendChild(span);
            li.appendChild(removeBtn);
            this.animListEl.appendChild(li);
        });
    }

    /**
     * Aktualisiert die aktive Selektionsmarkierung (`.selected`) in der DOM-Liste.
     */
    updateSelectionHighlight() {
        if (!this.animListEl) return;
        const selectedIndex = this.store.getSelectedAnimationIndex();
        Array.from(this.animListEl.children).forEach((child, i) => {
            child.classList.toggle('selected', i === selectedIndex);
        });
    }

    /**
     * Aktualisiert die Textanzeige (Name, Frame-Anzahl, Default-Badge) eines spezifischen Listeneintrags.
     * @param {number} index - Index der Animation.
     */
    updateListItemText(index) {
        if (!this.animListEl || index < 0) return;
        const project = this.store.getProject();
        const anim = project.animations[index];
        if (!anim) return;

        const items = this.animListEl.querySelectorAll('.anim-item');
        if (items[index]) {
            const span = items[index].querySelector('span');
            const isDefault = project.defaultAnimation && project.defaultAnimation === anim.name;
            span.innerHTML = `<strong>${anim.name}</strong>${isDefault ? ' <span class="badge-default">Default</span>' : ''} <small>(${anim.frames.length} frames)</small>`;
        }
    }

    /**
     * Aktualisiert die Optionen im Dropdown-Menü zur Wahl der Standard-Animation.
     */
    updateDefaultAnimationSelect() {
        if (!this.selectDefaultAnim) return;
        const project = this.store.getProject();
        const currentVal = project.defaultAnimation || '';
        this.selectDefaultAnim.innerHTML = '<option value="">-- None --</option>';

        let found = false;
        project.animations.forEach(anim => {
            if (!anim.name) return;
            const opt = document.createElement('option');
            opt.value = anim.name;
            opt.textContent = anim.name;
            if (anim.name === currentVal) {
                opt.selected = true;
                found = true;
            }
            this.selectDefaultAnim.appendChild(opt);
        });

        if (!found && currentVal) {
            this.store.setDefaultAnimation(null);
            this.selectDefaultAnim.value = '';
        } else {
            this.selectDefaultAnim.value = project.defaultAnimation || '';
        }
    }

    /**
     * Richtet Event-Listener für die Spritesheet- und Raster-Eingabefelder in der Seitenleiste ein.
     */
    setupSpritesheetInputs() {
        if (this.headerSpritesheetSettings && this.spritesheetSettingsBody) {
            this.headerSpritesheetSettings.addEventListener('click', () => {
                const isCollapsed = this.spritesheetSettingsBody.classList.toggle('collapsed');
                if (this.toggleSpritesheetIcon) {
                    this.toggleSpritesheetIcon.style.transform = isCollapsed ? 'rotate(-90deg)' : 'none';
                }
            });
        }

        if (this.btnSidebarBrowseImg && this.callbacks.onBrowseImage) {
            this.btnSidebarBrowseImg.addEventListener('click', () => this.callbacks.onBrowseImage());
        }

        const handleConfigChange = (pushHistory) => {
            const width = parseInt(this.sidebarWidth.value, 10);
            const height = parseInt(this.sidebarHeight.value, 10);
            const spacing = parseInt(this.sidebarSpacing.value, 10);
            const margin = parseInt(this.sidebarMargin.value, 10);

            if (isNaN(width) || width <= 0) return;
            if (isNaN(height) || height <= 0) return;

            this.store.updateConfig({
                width,
                height,
                spacing: isNaN(spacing) ? 0 : spacing,
                margin: isNaN(margin) ? 0 : margin
            }, pushHistory);
            this.updateGridBadge();
        };

        const configInputs = [this.sidebarWidth, this.sidebarHeight, this.sidebarSpacing, this.sidebarMargin];
        configInputs.forEach(input => {
            if (!input) return;
            input.addEventListener('input', () => handleConfigChange(false));
            input.addEventListener('change', () => handleConfigChange(true));
        });
    }

    /**
     * Synchronisiert die Formularfelder der Spritesheet-Einstellungen mit den Store-Daten.
     */
    updateSpritesheetFields() {
        const project = this.store.getProject();
        if (this.sidebarImgPath) {
            this.sidebarImgPath.value = project.imagePath || '';
            this.sidebarImgPath.title = project.imagePath || '';
        }
        if (this.sidebarWidth && document.activeElement !== this.sidebarWidth) {
            this.sidebarWidth.value = project.config.width || 16;
        }
        if (this.sidebarHeight && document.activeElement !== this.sidebarHeight) {
            this.sidebarHeight.value = project.config.height || 16;
        }
        if (this.sidebarSpacing && document.activeElement !== this.sidebarSpacing) {
            this.sidebarSpacing.value = project.config.spacing ?? 0;
        }
        if (this.sidebarMargin && document.activeElement !== this.sidebarMargin) {
            this.sidebarMargin.value = project.config.margin ?? 0;
        }
        this.updateGridBadge();
    }

    /**
     * Aktualisiert die Badge-Anzeige mit den aktuellen Gitterabmessungen (Breite×Höhe, Spalten×Zeilen, Gesamtframes).
     */
    updateGridBadge() {
        if (!this.badgeGridInfo) return;
        const project = this.store.getProject();
        const { width, height } = project.config;
        const imgWidth = this.imgSpritesheet ? (this.imgSpritesheet.naturalWidth || this.imgSpritesheet.width) : 0;
        const imgHeight = this.imgSpritesheet ? (this.imgSpritesheet.naturalHeight || this.imgSpritesheet.height) : 0;

        if (imgWidth > 0 && imgHeight > 0) {
            const { cols, rows, totalCells } = calculateGridDimensions(imgWidth, imgHeight, project.config);
            this.badgeGridInfo.innerText = `${width}×${height} (${cols}×${rows} = ${totalCells})`;
        } else {
            this.badgeGridInfo.innerText = `${width}×${height}`;
        }
    }
}

