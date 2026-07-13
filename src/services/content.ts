const MAX_SIZE_BYTES = 500 * 1024; // 500KB

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface SanitizeResult {
  content: string;
  warnings: string[];
}

/**
 * Validate artifact content
 */
export function validateContent(content: string): ValidationResult {
  const sizeBytes = Buffer.byteLength(content, 'utf-8');

  if (sizeBytes > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `Content exceeds maximum size of ${MAX_SIZE_BYTES / 1024}KB`
    };
  }

  // Basic HTML structure check
  const lower = content.toLowerCase();
  const hasDoctype = lower.includes('<!doctype');
  const hasHtml = lower.includes('<html');

  if (!hasDoctype && !hasHtml) {
    return {
      valid: false,
      error: 'Content must be valid HTML (must contain <!DOCTYPE> or <html> tag)'
    };
  }

  return { valid: true };
}

/**
 * Sanitize and validate content with warnings
 */
export function sanitizeContent(content: string): SanitizeResult {
  const warnings: string[] = [];

  // Check for potentially dangerous patterns
  if (/on\w+\s*=/.test(content)) {
    warnings.push('Content contains inline event handlers');
  }

  if (/javascript:/i.test(content)) {
    warnings.push('Content contains javascript: URIs');
  }

  if (/<script/i.test(content)) {
    warnings.push('Content contains script tags');
  }

  return { content, warnings };
}
