// Shared "AI-style" parser to extract structured emergency request details
// from free-form text (voice transcript or medical report text).
//
// This centralises the logic so both voice assist and report upload behave
// consistently, and can later be replaced by a real LLM call if desired.

const parseTextToRequest = (text) => {
    if (!text) return {};

    const lower = text.toLowerCase();
    const lines = text.split(/\r?\n/);

    let patientName = '';
    let conditionType = '';
    let urgency = '';
    let resourceType = '';
    let bloodGroup = '';
    let quantity = null;
    let organType = '';

    const getValue = (pattern) => {
        for (const line of lines) {
            const match = line.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return '';
    };

    // Structured "label : value" style lines (works for both text reports
    // and clearly dictated voice notes that the ASR renders with colons).
    patientName = getValue(/^\s*patient\s*name\s*[:\-]\s*(.+)$/i) || '';
    if (!patientName) {
        for (const line of lines) {
            if (/patient/i.test(line) && line.includes(':')) {
                const namePart = line.split(':').slice(1).join(':').trim();
                if (namePart) {
                    patientName = namePart;
                    break;
                }
            }
        }
    }

    const conditionRaw = getValue(/^\s*condition\s*type\s*[:\-]\s*(.+)$/i);
    const urgencyRaw = getValue(/^\s*urgency\s*level\s*[:\-]\s*(.+)$/i);
    const neededRaw = getValue(/^\s*what\s+is\s+needed\??\s*[:\-]\s*(.+)$/i);
    const bloodRaw = getValue(/^\s*blood\s*group\s*[:\-]\s*(.+)$/i);
    const qtyRaw = getValue(/^\s*quantity\s*[:\-]\s*(.+)$/i);

    if (conditionRaw) {
        const c = conditionRaw.toLowerCase();
        if (c.includes('surgery')) conditionType = 'Surgery';
        else if (c.includes('accident') || c.includes('trauma')) conditionType = 'Trauma / Accident';
        else if (c.includes('transplant')) conditionType = 'Organ Transplant';
        else conditionType = conditionRaw;
    }

    if (urgencyRaw) {
        const u = urgencyRaw.toLowerCase();
        if (u.includes('critical')) urgency = 'Critical';
        else if (u.includes('high')) urgency = 'High';
        else if (u.includes('medium')) urgency = 'Medium';
        else if (u.includes('low')) urgency = 'Low';
        else urgency = urgencyRaw;
    }

    if (neededRaw) {
        const n = neededRaw.toLowerCase();
        if (n.includes('blood')) resourceType = 'blood';
        else if (n.includes('organ')) resourceType = 'organ';
    }

    if (bloodRaw) {
        bloodGroup = bloodRaw.toUpperCase();
    }

    if (qtyRaw) {
        const parsedQty = parseInt(qtyRaw, 10);
        if (!Number.isNaN(parsedQty) && parsedQty > 0) {
            quantity = parsedQty;
        }
    }

    // Fallbacks from unstructured text (for more natural voice phrases)
    if (!bloodGroup) {
        const bloodGroups = ['a+', 'a-', 'b+', 'b-', 'ab+', 'ab-', 'o+', 'o-'];
        for (const bg of bloodGroups) {
            if (lower.includes(bg.toLowerCase())) {
                bloodGroup = bg.toUpperCase();
                break;
            }
        }
    }

    if (!urgency) {
        if (
            lower.includes('critical') ||
            lower.includes('life threatening') ||
            lower.includes('icu')
        ) {
            urgency = 'Critical';
        } else if (lower.includes('high') || lower.includes('urgent')) {
            urgency = 'High';
        } else if (lower.includes('medium')) {
            urgency = 'Medium';
        } else if (lower.includes('low')) {
            urgency = 'Low';
        }
    }

    if (!conditionType) {
        if (lower.includes('accident') || lower.includes('trauma')) {
            conditionType = 'Trauma / Accident';
        } else if (lower.includes('surgery') || lower.includes('operation')) {
            conditionType = 'Surgery';
        } else if (lower.includes('transplant')) {
            conditionType = 'Organ Transplant';
        } else if (lower.includes('bleeding') || lower.includes('hemorrhage') || lower.includes('haemorrhage')) {
            conditionType = 'Internal Bleeding';
        } else if (lower.includes('icu') || lower.includes('critical care') || lower.includes('ventilator')) {
            conditionType = 'ICU / Critical Care';
        }
    }

    if (!resourceType) {
        if (
            lower.includes('organ') ||
            lower.includes('kidney') ||
            lower.includes('liver') ||
            lower.includes('heart') ||
            lower.includes('lung') ||
            lower.includes('lungs')
        ) {
            resourceType = 'organ';
        } else {
            resourceType = 'blood';
        }
    }

    if (!organType) {
        if (lower.includes('kidney')) {
            organType = 'Kidney';
        } else if (lower.includes('liver')) {
            organType = 'Liver';
        } else if (lower.includes('heart')) {
            organType = 'Heart';
        } else if (lower.includes('lung') || lower.includes('lungs')) {
            organType = 'Lungs';
        }
    }

    if (quantity == null) {
        const qtyMatch = lower.match(/(\d+)\s+(unit|units|bag|bags)/);
        if (qtyMatch) {
            const q = parseInt(qtyMatch[1], 10);
            quantity = Number.isNaN(q) || q <= 0 ? 1 : q;
        } else {
            quantity = 1;
        }
    }

    return {
        patientName,
        urgency,
        conditionType,
        bloodGroup,
        resourceType,
        quantity,
        organType,
    };
};

module.exports = {
    parseTextToRequest,
};

