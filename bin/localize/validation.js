const tagPattern = /<\/?[a-zA-Z][^<>]*>/g;
const argumentPattern = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(,|$)/;
const directivePattern = /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*,\s*(plural|select|selectordinal)\s*,/;
/**
 * Parse placeholder names, ICU plural/select directives, nested branch
 * arguments, and markup without requiring a full MessageFormat parser.
 */
export function extractPlaceholders(text) {
    const argumentsFound = new Set();
    const directives = new Set();
    const branchArguments = new Set();
    function scan(source, inBranch) {
        let index = 0;
        while (index < source.length) {
            if (source[index] !== '{') {
                index++;
                continue;
            }
            let depth = 0;
            let end = index;
            for (; end < source.length; end++) {
                if (source[end] === '{') {
                    depth++;
                }
                else if (source[end] === '}') {
                    depth--;
                    if (depth === 0) {
                        break;
                    }
                }
            }
            if (end >= source.length) {
                break;
            }
            const inner = source.slice(index + 1, end);
            const argument = argumentPattern.exec(inner);
            const isDirective = directivePattern.test(inner);
            if (argument) {
                const name = argument[1];
                argumentsFound.add(name);
                if (isDirective) {
                    directives.add(name);
                }
                if (inBranch) {
                    branchArguments.add(name);
                }
            }
            scan(inner, inBranch || isDirective);
            index = end + 1;
        }
    }
    scan(text, false);
    return {
        arguments: argumentsFound,
        directives,
        branchArguments,
        tags: [...text.matchAll(tagPattern)].map((match) => match[0]).sort(),
    };
}
function hasBalancedBraces(text) {
    let depth = 0;
    for (const character of text) {
        if (character === '{') {
            depth++;
        }
        else if (character === '}') {
            depth--;
            if (depth < 0) {
                return false;
            }
        }
    }
    return depth === 0;
}
function difference(left, right) {
    return [...left].filter((value) => !right.has(value)).sort();
}
/**
 * Reject empty, runaway, malformed, or structurally lossy translations before
 * they can be printed as accepted output or written to Google Sheets.
 */
export function validateTranslation(source, translation) {
    if (typeof translation !== 'string') {
        return 'missing in response';
    }
    const text = translation.trim();
    if (!text) {
        return 'empty text';
    }
    if (text.includes('```')) {
        return 'markdown fence in text';
    }
    if (text.includes('\uFFFD')) {
        return 'contains replacement characters';
    }
    const budget = Math.max(160, source.length * 8);
    if (text.length > budget) {
        return `suspiciously long (${text.length} chars for a ${source.length}-char source)`;
    }
    const expected = extractPlaceholders(source);
    const actual = extractPlaceholders(text);
    if (hasBalancedBraces(source) && !hasBalancedBraces(text)) {
        return 'unbalanced braces in text';
    }
    const missing = difference(expected.arguments, actual.arguments);
    const extra = difference(actual.arguments, expected.arguments);
    if (missing.length || extra.length) {
        return `placeholder mismatch: missing ${JSON.stringify(missing)}, unexpected ${JSON.stringify(extra)}`;
    }
    const lostDirectives = difference(expected.directives, actual.directives);
    if (lostDirectives.length) {
        return `lost ICU directive for ${JSON.stringify(lostDirectives)}`;
    }
    const droppedInBranch = difference(expected.branchArguments, actual.branchArguments);
    if (droppedInBranch.length) {
        return `placeholder dropped inside an ICU branch: ${JSON.stringify(droppedInBranch)}`;
    }
    if (expected.tags.join('\n') !== actual.tags.join('\n')) {
        return `markup mismatch: expected ${JSON.stringify(expected.tags)}, got ${JSON.stringify(actual.tags)}`;
    }
    return null;
}
//# sourceMappingURL=validation.js.map