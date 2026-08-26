import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateProject, validateProjectSchema } from '../src/core/validator.js';

describe('validator', () => {
    it('validates a correct project schema', () => {
        const validProject = {
            imagePath: 'C:/assets/player.png',
            config: {
                width: 16,
                height: 16,
                spacing: 0,
                margin: 0
            },
            animations: [
                {
                    name: 'idle',
                    fps: 12,
                    loop: true,
                    flipX: false,
                    flipY: false,
                    frames: [0, 1, 2]
                },
                {
                    name: 'run',
                    fps: 15,
                    loop: true,
                    frames: [3, 4, 5, 6]
                }
            ],
            defaultAnimation: 'idle'
        };

        const result = validateProject(validProject);
        assert.equal(result.valid, true);
        assert.equal(result.errors.length, 0);
        assert.equal(validateProjectSchema(validProject), true);
    });

    it('rejects invalid config parameters', () => {
        const invalidConfig = {
            config: {
                width: -1,
                height: 0,
                spacing: -2
            },
            animations: []
        };

        const result = validateProject(invalidConfig);
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('config.width')));
        assert.ok(result.errors.some(e => e.includes('config.height')));
        assert.ok(result.errors.some(e => e.includes('config.spacing')));
    });

    it('rejects missing or invalid animations array', () => {
        const invalidAnimations = {
            config: { width: 16, height: 16 },
            animations: 'not-an-array'
        };

        const result = validateProject(invalidAnimations);
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('animations array')));
    });

    it('rejects animations with invalid names or negative FPS', () => {
        const invalidAnimData = {
            config: { width: 16, height: 16 },
            animations: [
                {
                    name: '   ',
                    fps: -5,
                    frames: [0, -1, 'invalid']
                }
            ]
        };

        const result = validateProject(invalidAnimData);
        assert.equal(result.valid, false);
        assert.ok(result.errors.some(e => e.includes('invalid or empty name')));
        assert.ok(result.errors.some(e => e.includes('fps > 0')));
        assert.ok(result.errors.some(e => e.includes('invalid frame index')));
    });
});
