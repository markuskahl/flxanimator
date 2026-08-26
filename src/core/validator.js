/**
 * @file validator.js
 * @description Validierungs-Logik und Schema-Prüfung für FlxAnimator-Projektdaten und Animationsstrukturen.
 * Stellt sicher, dass geladene oder importierte JSON-Dateien dem erwarteten Format entsprechen.
 * @module core/validator
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - `true`, wenn das Projekt alle Schema-Anforderungen erfüllt, andernfalls `false`.
 * @property {string[]} errors - Liste aufgetretener Validierungs- und Formatierungsfehler.
 */

/**
 * Führt eine tiefgehende Validierung eines Projekt-Datenobjekts durch und sammelt alle Fehlerbeschreibungen.
 * 
 * Geprüft werden:
 * - Objektstruktur und Basistypen
 * - Gitterkonfiguration (`config.width`, `config.height`, `config.spacing`, `config.margin`)
 * - Animationsarray mit Name, FPS (> 0), booleschem Loop-Flag und ganzzahligen Frame-Indizes (>= 0)
 * - Gültigkeit der Standard-Animation (`defaultAnimation`)
 *
 * @param {unknown} data - Die zu überprüfenden Rohdaten (z. B. aus JSON geparst).
 * @returns {ValidationResult} Ergebnisobjekt mit `valid`-Status und Fehlermeldungsliste.
 * 
 * @example
 * const result = validateProject({
 *   config: { width: 32, height: 32, spacing: 0, margin: 0 },
 *   animations: [{ name: 'idle', fps: 12, loop: true, frames: [0, 1, 2] }]
 * });
 * if (!result.valid) {
 *   console.error('Validierungsfehler:', result.errors);
 * }
 */
export function validateProject(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Project data must be an object.'] };
    }

    // Config-Prüfung
    if (!data.config || typeof data.config !== 'object') {
        errors.push('Project must contain a config object.');
    } else {
        const { width, height, spacing, margin } = data.config;
        if (typeof width !== 'number' || width <= 0 || !Number.isInteger(width)) {
            errors.push('config.width must be a positive integer.');
        }
        if (typeof height !== 'number' || height <= 0 || !Number.isInteger(height)) {
            errors.push('config.height must be a positive integer.');
        }
        if (spacing !== undefined && (typeof spacing !== 'number' || spacing < 0 || !Number.isInteger(spacing))) {
            errors.push('config.spacing must be a non-negative integer.');
        }
        if (margin !== undefined && (typeof margin !== 'number' || margin < 0 || !Number.isInteger(margin))) {
            errors.push('config.margin must be a non-negative integer.');
        }
    }

    // Animations-Prüfung
    if (!Array.isArray(data.animations)) {
        errors.push('Project must contain an animations array.');
    } else {
        data.animations.forEach((anim, idx) => {
            if (!anim || typeof anim !== 'object') {
                errors.push(`Animation at index ${idx} must be an object.`);
                return;
            }
            if (typeof anim.name !== 'string' || anim.name.trim().length === 0) {
                errors.push(`Animation at index ${idx} has an invalid or empty name.`);
            }
            if (typeof anim.fps !== 'number' || anim.fps <= 0) {
                errors.push(`Animation "${anim.name || idx}" must have fps > 0.`);
            }
            if (anim.loop !== undefined && typeof anim.loop !== 'boolean') {
                errors.push(`Animation "${anim.name || idx}" loop must be boolean.`);
            }
            if (!Array.isArray(anim.frames)) {
                errors.push(`Animation "${anim.name || idx}" must contain a frames array.`);
            } else {
                const invalidFrame = anim.frames.find(f => typeof f !== 'number' || f < 0 || !Number.isInteger(f));
                if (invalidFrame !== undefined) {
                    errors.push(`Animation "${anim.name || idx}" contains invalid frame index: ${invalidFrame}.`);
                }
            }
        });
    }

    // Default Animation Prüfung
    if (data.defaultAnimation !== undefined && data.defaultAnimation !== null) {
        if (typeof data.defaultAnimation !== 'string') {
            errors.push('defaultAnimation must be a string or null.');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Führt eine schnelle boolesche Schema-Validierung für Ladeoperationen durch.
 *
 * @param {unknown} data - Zu überprüfende Projektdaten.
 * @returns {boolean} `true`, wenn valide, andernfalls `false`.
 */
export function validateProjectSchema(data) {
    return validateProject(data).valid;
}

