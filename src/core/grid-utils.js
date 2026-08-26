/**
 * @file grid-utils.js
 * @description Reine mathematische Hilfsfunktionen für Spritesheet-Rasterberechnungen,
 * Frame-Positionsbestimmung, Koordinatentransformationen sowie Zoom- und Pan-Physik.
 * @module core/grid-utils
 */

/**
 * @typedef {Object} GridDimensions
 * @property {number} cols - Anzahl der Spalten im Spritesheet-Raster.
 * @property {number} rows - Anzahl der Zeilen im Spritesheet-Raster.
 * @property {number} totalCells - Gesamtzahl verfügbarer Zellen (cols * rows).
 */

/**
 * @typedef {Object} FrameCoordinates
 * @property {number} x - X-Koordinate der oberen linken Ecke des Frames in Pixeln.
 * @property {number} y - Y-Koordinate der oberen linken Ecke des Frames in Pixeln.
 * @property {number} width - Breite des Frames in Pixeln.
 * @property {number} height - Höhe des Frames in Pixeln.
 */

/**
 * @typedef {Object} PanCoordinates
 * @property {number} panX - Neue X-Verschiebung in Pixeln.
 * @property {number} panY - Neue Y-Verschiebung in Pixeln.
 */

/**
 * Berechnet die Anzahl der Spalten und Zeilen im Spritesheet basierend auf den Gesamtabmessungen
 * des Bildes und den Rastereinstellungen (Frame-Größe, Spacing und Margin).
 * 
 * Formel:
 * - `availableWidth = imageWidth - margin * 2 + spacing`
 * - `cols = floor(availableWidth / (width + spacing))`
 *
 * @param {number} imageWidth - Breite des Quellbildes in Pixeln.
 * @param {number} imageHeight - Höhe des Quellbildes in Pixeln.
 * @param {import('./store.js').SpritesheetConfig} [config] - Raster-Konfiguration (width, height, spacing, margin).
 * @returns {GridDimensions} Das berechnete Raster mit Spalten, Zeilen und Gesamtzellenzahl.
 * 
 * @example
 * const dims = calculateGridDimensions(256, 128, { width: 32, height: 32, spacing: 0, margin: 0 });
 * // returns { cols: 8, rows: 4, totalCells: 32 }
 */
export function calculateGridDimensions(imageWidth, imageHeight, config) {
    const { width = 16, height = 16, spacing = 0, margin = 0 } = config || {};
    
    if (imageWidth <= 0 || imageHeight <= 0 || width <= 0 || height <= 0) {
        return { cols: 0, rows: 0, totalCells: 0 };
    }

    const availableWidth = imageWidth - margin * 2 + spacing;
    const availableHeight = imageHeight - margin * 2 + spacing;

    const cols = Math.max(0, Math.floor(availableWidth / (width + spacing)));
    const rows = Math.max(0, Math.floor(availableHeight / (height + spacing)));

    return {
        cols,
        rows,
        totalCells: cols * rows
    };
}

/**
 * Ermittelt die Pixel-Koordinaten (x, y) und Dimensionen eines Frames innerhalb des Spritesheets anhand seines linearen Index.
 *
 * @param {number} frameIndex - Linearer 0-basierter Index des gesuchten Frames (0 bis totalCells - 1).
 * @param {number} cols - Anzahl der Spalten im Spritesheet-Raster (ermittelt via {@link calculateGridDimensions}).
 * @param {import('./store.js').SpritesheetConfig} [config] - Raster-Konfiguration.
 * @returns {FrameCoordinates|null} Die Pixelkoordinaten und Maße des Frames oder `null`, wenn der Index ungültig ist.
 * 
 * @example
 * const coords = getFrameCoords(5, 4, { width: 16, height: 16, spacing: 2, margin: 4 });
 * // col = 1, row = 1 -> x = 4 + 1*(16+2) = 22, y = 4 + 1*(16+2) = 22
 */
export function getFrameCoords(frameIndex, cols, config) {
    if (frameIndex < 0 || cols <= 0) return null;

    const { width = 16, height = 16, spacing = 0, margin = 0 } = config || {};
    const col = frameIndex % cols;
    const row = Math.floor(frameIndex / cols);

    const x = margin + col * (width + spacing);
    const y = margin + row * (height + spacing);

    return { x, y, width, height };
}

/**
 * Ermittelt den 0-basierten Frame-Index für eine gegebene Pixel-Koordinate im Koordinatensystem des unskalierten Originalbildes.
 * Liegt der Punkt im Spacing oder Margin, wird `-1` zurückgegeben.
 *
 * @param {number} pixelX - X-Position im Quellbild in Pixeln.
 * @param {number} pixelY - Y-Position im Quellbild in Pixeln.
 * @param {number} cols - Anzahl der Spalten im Raster.
 * @param {number} rows - Anzahl der Zeilen im Raster.
 * @param {import('./store.js').SpritesheetConfig} [config] - Raster-Konfiguration.
 * @returns {number} Der gefundene Frame-Index oder `-1`, wenn außerhalb gültiger Zellen.
 * 
 * @example
 * const index = getFrameIndexAtCoords(18, 5, 8, 4, { width: 16, height: 16, spacing: 0, margin: 0 });
 * // returns 1
 */
export function getFrameIndexAtCoords(pixelX, pixelY, cols, rows, config) {
    const { width = 16, height = 16, spacing = 0, margin = 0 } = config || {};

    if (cols <= 0 || rows <= 0) return -1;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = margin + col * (width + spacing);
            const y = margin + row * (height + spacing);

            if (pixelX >= x && pixelX < x + width && pixelY >= y && pixelY < y + height) {
                return row * cols + col;
            }
        }
    }

    return -1;
}

/**
 * Begrenzt und berechnet einen neuen Zoomfaktor anhand eines Multiplikators und Min-/Max-Grenzen.
 *
 * @param {number} currentZoom - Der aktuelle Zoomfaktor (z. B. 1.0 = 100%).
 * @param {number} factor - Multiplikationsfaktor (z. B. 1.1 für Zoom-In, 0.9 für Zoom-Out).
 * @param {number} [minZoom=0.1] - Minimal zulässiger Zoomfaktor.
 * @param {number} [maxZoom=30] - Maximal zulässiger Zoomfaktor.
 * @returns {number} Der begrenzte neue Zoomfaktor.
 */
export function clampZoom(currentZoom, factor, minZoom = 0.1, maxZoom = 30) {
    const newZoom = currentZoom * factor;
    return Math.min(Math.max(minZoom, newZoom), maxZoom);
}

/**
 * Berechnet neue Pan-Offsets (Verschiebung), sodass der Punkt unter dem Mauszeiger
 * während eines Zooms an der exakt gleichen Bildschirmposition fixiert bleibt (Fokus-Zoom).
 *
 * @param {number} mouseX - X-Position des Mauszeigers relativ zum Container.
 * @param {number} mouseY - Y-Position des Mauszeigers relativ zum Container.
 * @param {number} oldPanX - Bisheriger horizontaler Pan-Wert.
 * @param {number} oldPanY - Bisheriger vertikaler Pan-Wert.
 * @param {number} oldZoom - Bisheriger Zoomfaktor.
 * @param {number} newZoom - Neuer Zoomfaktor.
 * @returns {PanCoordinates} Das neue Pan-Offset `{ panX, panY }`.
 */
export function calculatePanOnZoom(mouseX, mouseY, oldPanX, oldPanY, oldZoom, newZoom) {
    if (oldZoom <= 0) return { panX: oldPanX, panY: oldPanY };
    const ratio = newZoom / oldZoom;
    const panX = mouseX - (mouseX - oldPanX) * ratio;
    const panY = mouseY - (mouseY - oldPanY) * ratio;
    return { panX, panY };
}

/**
 * Berechnet den optimalen Skalierungsfaktor zur zentrierten, pixelperfekten Einpassung
 * eines Objekts in einen Zielbereich unter strikter Erhaltung des Seitenverhältnisses (Aspect Ratio).
 *
 * @param {number} width - Ursprüngliche Breite des Objekts in Pixeln.
 * @param {number} height - Ursprüngliche Höhe des Objekts in Pixeln.
 * @param {number} targetWidth - Verfügbare Zielbreite in Pixeln.
 * @param {number} targetHeight - Verfügbare Zielhöhe in Pixeln.
 * @returns {number} Der berechnete Skalierungsfaktor (z. B. 0.5 für 50% Verkleinerung).
 */
export function calculateFittedScale(width, height, targetWidth, targetHeight) {
    if (width <= 0 || height <= 0 || targetWidth <= 0 || targetHeight <= 0) return 1;
    return Math.min(targetWidth / width, targetHeight / height);
}

