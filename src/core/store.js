import { Events } from './events.js';

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

export class Store extends EventTarget {
    constructor() {
        super();
        this.project = {
            imagePath: null,
            imageSrc: null,
            config: { width: 16, height: 16, spacing: 0, margin: 0 },
            animations: [],
            defaultAnimation: null
        };
        this.selectedAnimationIndex = -1;
        this.currentFilePath = null;
        this.isDirty = false;
        this.activeView = 'start'; // 'start' | 'workspace'
        
        this.gridTransform = { zoom: 1, panX: 0, panY: 0 };
        this.previewTransform = { zoom: 2, panX: 0, panY: 0 };

        // Undo / Redo Stacks
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50;
    }

    // --- Event Emitter Helper ---
    on(event, callback) {
        this.addEventListener(event, callback);
        return () => this.removeEventListener(event, callback);
    }

    emit(event, detail = {}) {
        this.dispatchEvent(new CustomEvent(event, { detail }));
    }

    // --- State Getters ---
    getProject() {
        return this.project;
    }

    getSelectedAnimation() {
        if (this.selectedAnimationIndex >= 0 && this.selectedAnimationIndex < this.project.animations.length) {
            return this.project.animations[this.selectedAnimationIndex];
        }
        return null;
    }

    getSelectedAnimationIndex() {
        return this.selectedAnimationIndex;
    }

    getIsDirty() {
        return this.isDirty;
    }

    getCurrentFilePath() {
        return this.currentFilePath;
    }

    getGridTransform() {
        return { ...this.gridTransform };
    }

    getPreviewTransform() {
        return { ...this.previewTransform };
    }

    // --- History / Undo / Redo ---
    pushHistory() {
        this.undoStack.push(cloneProject(this.project));
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.emit(Events.HISTORY_CHANGED, { canUndo: this.canUndo(), canRedo: this.canRedo() });
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

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

    setSpritesheetSource(imagePath, imageSrc) {
        this.project.imagePath = imagePath;
        this.project.imageSrc = imageSrc;
        this.emit(Events.SPRITESHEET_LOADED, { imagePath, imageSrc });
    }

    setCurrentFilePath(filePath) {
        this.currentFilePath = filePath;
        this.emit(Events.PROJECT_PATH_CHANGED, { filePath });
    }

    markDirty() {
        if (!this.isDirty) {
            this.isDirty = true;
            this.emit(Events.PROJECT_DIRTY_CHANGED, { isDirty: true });
        }
    }

    clearDirty() {
        this.isDirty = false;
        this.emit(Events.PROJECT_DIRTY_CHANGED, { isDirty: false });
    }

    setView(view) {
        this.activeView = view;
        this.emit(Events.VIEW_CHANGED, { view });
    }

    // --- Animation Actions ---
    selectAnimation(index) {
        if (index < -1 || index >= this.project.animations.length) return;
        this.selectedAnimationIndex = index;
        this.emit(Events.ANIMATION_SELECTED, { index, anim: this.getSelectedAnimation() });
    }

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

    setDefaultAnimation(name) {
        this.project.defaultAnimation = name ? name : null;
        this.markDirty();
        this.emit(Events.DEFAULT_ANIMATION_CHANGED, { defaultAnimation: this.project.defaultAnimation });
        this.emit(Events.ANIMATIONS_CHANGED, { project: this.project });
    }

    // --- Frame Actions ---
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

    appendFrame(frameIndex) {
        const anim = this.getSelectedAnimation();
        if (!anim) return;

        this.pushHistory();
        anim.frames.push(frameIndex);
        this.markDirty();
        this.emit(Events.FRAMES_CHANGED, { anim, index: this.selectedAnimationIndex });
    }

    replaceFrame(timelineIndex, frameIndex) {
        const anim = this.getSelectedAnimation();
        if (!anim || timelineIndex < 0 || timelineIndex >= anim.frames.length) return;

        this.pushHistory();
        anim.frames[timelineIndex] = frameIndex;
        this.markDirty();
        this.emit(Events.FRAMES_CHANGED, { anim, index: this.selectedAnimationIndex });
    }

    duplicateFrame(timelineIndex) {
        const anim = this.getSelectedAnimation();
        if (!anim || timelineIndex < 0 || timelineIndex >= anim.frames.length) return;

        this.pushHistory();
        const frameVal = anim.frames[timelineIndex];
        anim.frames.splice(timelineIndex + 1, 0, frameVal);
        this.markDirty();
        this.emit(Events.FRAMES_CHANGED, { anim, index: this.selectedAnimationIndex });
    }

    deleteFrame(timelineIndex) {
        const anim = this.getSelectedAnimation();
        if (!anim || timelineIndex < 0 || timelineIndex >= anim.frames.length) return;

        this.pushHistory();
        anim.frames.splice(timelineIndex, 1);
        this.markDirty();
        this.emit(Events.FRAMES_CHANGED, { anim, index: this.selectedAnimationIndex });
    }

    // --- Canvas Transform Actions ---
    setGridTransform(transform) {
        this.gridTransform = { ...this.gridTransform, ...transform };
        this.emit(Events.GRID_TRANSFORM_CHANGED, this.gridTransform);
    }

    setPreviewTransform(transform) {
        this.previewTransform = { ...this.previewTransform, ...transform };
        this.emit(Events.PREVIEW_TRANSFORM_CHANGED, this.previewTransform);
    }

    // --- Feedback ---
    showStatus(message, type = 'info') {
        this.emit(Events.STATUS_MESSAGE, { message, type });
    }
}
