/**
 * Reine mathematische Hilfsfunktionen für Raster-, Koordinaten- und Zoom-Berechnungen.
 */

/**
 * Berechnet Anzahl der Spalten und Zeilen im Spritesheet basierend auf Dimensionen und Konfiguration.
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
 * Ermittelt die Pixelkoordinaten (x, y) eines Frames innerhalb des Spritesheets.
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
 * Ermittelt den Frame-Index für gegebene Pixel-Koordinaten (im unskalierten Bild-Raum).
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
 * Begrenzt und berechnet einen neuen Zoomfaktor.
 */
export function clampZoom(currentZoom, factor, minZoom = 0.1, maxZoom = 30) {
    const newZoom = currentZoom * factor;
    return Math.min(Math.max(minZoom, newZoom), maxZoom);
}

/**
 * Berechnet neue Pan-Koordinaten, sodass der Punkt unter dem Mauszeiger stabil bleibt.
 */
export function calculatePanOnZoom(mouseX, mouseY, oldPanX, oldPanY, oldZoom, newZoom) {
    if (oldZoom <= 0) return { panX: oldPanX, panY: oldPanY };
    const ratio = newZoom / oldZoom;
    const panX = mouseX - (mouseX - oldPanX) * ratio;
    const panY = mouseY - (mouseY - oldPanY) * ratio;
    return { panX, panY };
}

/**
 * Berechnet den Skalierungsfaktor zur zentrierten Einpassung unter Erhaltung des Seitenverhältnisses.
 */
export function calculateFittedScale(width, height, targetWidth, targetHeight) {
    if (width <= 0 || height <= 0 || targetWidth <= 0 || targetHeight <= 0) return 1;
    return Math.min(targetWidth / width, targetHeight / height);
}
