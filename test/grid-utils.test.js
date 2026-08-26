/**
 * @file grid-utils.test.js
 * @description Unit-Tests für mathematische Raster- und Koordinatenberechnungen in grid-utils.js.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateGridDimensions,
    getFrameCoords,
    getFrameIndexAtCoords,
    clampZoom,
    calculatePanOnZoom,
    calculateFittedScale
} from '../src/core/grid-utils.js';

describe('grid-utils', () => {
    describe('calculateGridDimensions', () => {
        it('calculates cols and rows correctly for standard spritesheets', () => {
            const config = { width: 16, height: 16, spacing: 0, margin: 0 };
            const result = calculateGridDimensions(64, 32, config);
            assert.equal(result.cols, 4);
            assert.equal(result.rows, 2);
            assert.equal(result.totalCells, 8);
        });

        it('takes spacing and margin into account', () => {
            // Breite: margin(2) + frame(16) + spacing(2) + frame(16) + margin(2) = 38
            // Höhe: margin(2) + frame(16) + margin(2) = 20
            const config = { width: 16, height: 16, spacing: 2, margin: 2 };
            const result = calculateGridDimensions(38, 20, config);
            assert.equal(result.cols, 2);
            assert.equal(result.rows, 1);
            assert.equal(result.totalCells, 2);
        });

        it('returns zero for zero or negative dimensions', () => {
            const result = calculateGridDimensions(0, 0, { width: 16, height: 16 });
            assert.equal(result.cols, 0);
            assert.equal(result.rows, 0);
            assert.equal(result.totalCells, 0);
        });
    });

    describe('getFrameCoords', () => {
        it('returns correct x and y for frame index', () => {
            const config = { width: 16, height: 16, spacing: 2, margin: 4 };
            const cols = 4;
            
            // Frame 0: Zeile 0, Spalte 0
            const frame0 = getFrameCoords(0, cols, config);
            assert.deepEqual(frame0, { x: 4, y: 4, width: 16, height: 16 });

            // Frame 5: Zeile 1 (5/4=1), Spalte 1 (5%4=1)
            // x = 4 + 1 * (16 + 2) = 22
            // y = 4 + 1 * (16 + 2) = 22
            const frame5 = getFrameCoords(5, cols, config);
            assert.deepEqual(frame5, { x: 22, y: 22, width: 16, height: 16 });
        });

        it('returns null for negative frame index or zero cols', () => {
            assert.equal(getFrameCoords(-1, 4, { width: 16, height: 16 }), null);
            assert.equal(getFrameCoords(0, 0, { width: 16, height: 16 }), null);
        });
    });

    describe('getFrameIndexAtCoords', () => {
        it('finds frame index for valid coordinates', () => {
            const config = { width: 16, height: 16, spacing: 0, margin: 0 };
            const cols = 4;
            const rows = 2;

            assert.equal(getFrameIndexAtCoords(8, 8, cols, rows, config), 0);
            assert.equal(getFrameIndexAtCoords(20, 8, cols, rows, config), 1);
            assert.equal(getFrameIndexAtCoords(20, 20, cols, rows, config), 5);
        });

        it('returns -1 for coordinates outside cells (e.g. in margin or spacing)', () => {
            const config = { width: 16, height: 16, spacing: 4, margin: 10 };
            const cols = 2;
            const rows = 2;

            // Im Margin-Bereich (x < 10)
            assert.equal(getFrameIndexAtCoords(5, 5, cols, rows, config), -1);

            // Im Spacing-Bereich (x = 28, Zelle 0 ist [10..26], Spacing ist [26..30])
            assert.equal(getFrameIndexAtCoords(28, 15, cols, rows, config), -1);
        });
    });

    describe('clampZoom & calculatePanOnZoom', () => {
        it('clamps zoom within bounds', () => {
            assert.equal(clampZoom(1, 2, 0.1, 30), 2);
            assert.equal(clampZoom(25, 2, 0.1, 30), 30);
            assert.equal(clampZoom(0.2, 0.1, 0.1, 30), 0.1);
        });

        it('computes pan so mouse point remains stationary on zoom', () => {
            const mouseX = 100;
            const mouseY = 100;
            const oldPanX = 0;
            const oldPanY = 0;
            const oldZoom = 1;
            const newZoom = 2;

            const { panX, panY } = calculatePanOnZoom(mouseX, mouseY, oldPanX, oldPanY, oldZoom, newZoom);
            // Formel: mouseX - (mouseX - oldPanX) * (newZoom / oldZoom) = 100 - (100) * 2 = -100
            assert.equal(panX, -100);
            assert.equal(panY, -100);
        });
    });

    describe('calculateFittedScale', () => {
        it('scales down when target is smaller preserving aspect ratio', () => {
            const scale = calculateFittedScale(160, 80, 80, 80);
            assert.equal(scale, 0.5);
        });

        it('scales up when target is larger', () => {
            const scale = calculateFittedScale(16, 16, 80, 80);
            assert.equal(scale, 5);
        });
    });
});

