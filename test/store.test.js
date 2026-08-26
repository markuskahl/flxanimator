import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../src/core/store.js';

describe('Store', () => {
    let store;

    beforeEach(() => {
        store = new Store();
    });

    it('initializes with default state', () => {
        const project = store.getProject();
        assert.equal(project.imagePath, null);
        assert.deepEqual(project.config, { width: 16, height: 16, spacing: 0, margin: 0 });
        assert.equal(store.getSelectedAnimationIndex(), -1);
        assert.equal(store.getIsDirty(), false);
    });

    it('loads project and clears dirty flag', () => {
        const testProject = {
            imagePath: 'test.png',
            config: { width: 32, height: 32, spacing: 1, margin: 2 },
            animations: [
                { name: 'walk', fps: 12, loop: true, flipX: false, flipY: false, frames: [0, 1] }
            ],
            defaultAnimation: 'walk'
        };

        store.setProject(testProject, 'C:/projects/test.json');

        assert.equal(store.getCurrentFilePath(), 'C:/projects/test.json');
        assert.equal(store.getIsDirty(), false);
        assert.equal(store.getSelectedAnimationIndex(), 0);
        assert.equal(store.getSelectedAnimation().name, 'walk');
    });

    it('adds, updates and deletes animations with dirty flag tracking', () => {
        store.addAnimation({ name: 'jump', fps: 10, loop: false, frames: [2, 3] });

        assert.equal(store.getIsDirty(), true);
        assert.equal(store.getProject().animations.length, 1);
        assert.equal(store.getSelectedAnimation().name, 'jump');

        store.updateAnimation(0, { fps: 20 });
        assert.equal(store.getSelectedAnimation().fps, 20);

        store.deleteAnimation(0);
        assert.equal(store.getProject().animations.length, 0);
        assert.equal(store.getSelectedAnimation(), null);
    });

    it('modifies frames in the selected animation', () => {
        store.addAnimation({ name: 'attack', fps: 15, loop: false, frames: [0, 1] });

        // Toggle frame 2 (appends 2)
        store.toggleFrame(2);
        assert.deepEqual(store.getSelectedAnimation().frames, [0, 1, 2]);

        // Toggle frame 1 (removes 1)
        store.toggleFrame(1);
        assert.deepEqual(store.getSelectedAnimation().frames, [0, 2]);

        // Duplicate frame at index 0
        store.duplicateFrame(0);
        assert.deepEqual(store.getSelectedAnimation().frames, [0, 0, 2]);

        // Delete frame at index 1
        store.deleteFrame(1);
        assert.deepEqual(store.getSelectedAnimation().frames, [0, 2]);

        // Replace frame at index 1 with 5
        store.replaceFrame(1, 5);
        assert.deepEqual(store.getSelectedAnimation().frames, [0, 5]);
    });

    it('supports undo and redo for animations and frames', () => {
        store.addAnimation({ name: 'idle', fps: 10, loop: true, frames: [0] });
        assert.equal(store.canUndo(), true);
        assert.equal(store.canRedo(), false);

        store.appendFrame(1);
        assert.deepEqual(store.getSelectedAnimation().frames, [0, 1]);

        store.appendFrame(2);
        assert.deepEqual(store.getSelectedAnimation().frames, [0, 1, 2]);

        // Undo frame append 2
        store.undo();
        assert.deepEqual(store.getSelectedAnimation().frames, [0, 1]);
        assert.equal(store.canRedo(), true);

        // Undo frame append 1
        store.undo();
        assert.deepEqual(store.getSelectedAnimation().frames, [0]);

        // Redo frame append 1
        store.redo();
        assert.deepEqual(store.getSelectedAnimation().frames, [0, 1]);

        // Redo frame append 2
        store.redo();
        assert.deepEqual(store.getSelectedAnimation().frames, [0, 1, 2]);
    });
});
