import { Events } from '../core/events.js';

export class SidebarComponent {
    constructor(store, callbacks) {
        this.store = store;
        this.callbacks = callbacks || {};

        this.sidebarEl = document.getElementById('sidebar');
        this.btnAddAnim = document.getElementById('btn-add-anim');
        this.editAnimControls = document.getElementById('edit-anim-controls');
        this.editAnimName = document.getElementById('anim-name');
        this.editAnimFps = document.getElementById('anim-fps');
        this.editAnimLoop = document.getElementById('anim-loop');
        this.editAnimFlipX = document.getElementById('anim-flip-x');
        this.editAnimFlipY = document.getElementById('anim-flip-y');
        this.selectDefaultAnim = document.getElementById('default-anim-select');
        this.animListEl = document.getElementById('animation-list');

        this.init();
    }

    init() {
        this.store.on(Events.VIEW_CHANGED, (e) => {
            if (this.sidebarEl) {
                this.sidebarEl.style.display = e.detail.view === 'workspace' ? 'flex' : 'none';
            }
        });

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

        this.setupEditInputs();
    }

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

    updateSelectionHighlight() {
        if (!this.animListEl) return;
        const selectedIndex = this.store.getSelectedAnimationIndex();
        Array.from(this.animListEl.children).forEach((child, i) => {
            child.classList.toggle('selected', i === selectedIndex);
        });
    }

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
}
