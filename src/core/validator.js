/**
 * Validierungs-Logik für Projektdaten und Animationen.
 */

/**
 * Detaillierte Validierung eines Projekt-Objekts mit Fehlerbeschreibungen.
 * @param {any} data
 * @returns {{ valid: boolean, errors: string[] }}
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
 * Schnelle Boolesche Schema-Validierung für Ladeoperationen.
 * @param {any} data
 * @returns {boolean}
 */
export function validateProjectSchema(data) {
    return validateProject(data).valid;
}
