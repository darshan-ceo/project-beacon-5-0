/**
 * Column Mapping Service for Import Operations
 * Handles AI-assisted and manual column mapping with confidence scoring
 */

import { ColumnMapping, COLUMN_SYNONYMS, EntityType, TemplateColumn } from '@/types/importExport';
import { entityTemplatesService } from './entityTemplatesService';

interface MappingConfidence {
  column: string;
  confidence: number;
  reason: string;
}

class MappingService {
  /**
   * Auto-map columns using heuristics and AI assistance
   */
  async autoMapColumns(
    sourceHeaders: string[],
    entityType: EntityType,
    useAI: boolean = true
  ): Promise<{
    mapping: ColumnMapping;
    confidence: MappingConfidence[];
    unmapped: string[];
  }> {
    const template = await entityTemplatesService.getTemplate(entityType);
    const mapping: ColumnMapping = {};
    const confidence: MappingConfidence[] = [];
    const unmapped: string[] = [];

    // First, try AI-assisted mapping if available
    if (useAI) {
      try {
        const aiMapping = await this.getAIMapping(sourceHeaders, template.columns);
        if (aiMapping) {
          return aiMapping;
        }
      } catch (error) {
        console.warn('AI mapping failed, falling back to heuristics:', error);
      }
    }

    // Fallback to heuristic mapping
    const used = new Set<string>();

    console.log(`[MappingService] Starting auto-mapping for ${entityType}`);
    console.log(`[MappingService] Source headers:`, sourceHeaders);

    for (const templateColumn of template.columns) {
      const bestMatch = this.findBestMatch(templateColumn.key, sourceHeaders, used);
      
      console.log(`[MappingService] Template: "${templateColumn.key}" (${templateColumn.label}) → Best match:`, {
        sourceColumn: bestMatch?.header || 'NONE',
        confidence: bestMatch?.confidence || 0,
        reason: bestMatch?.reason || 'No match found',
        isRequired: templateColumn.isRequired
      });
      
      if (bestMatch) {
        mapping[templateColumn.key] = {
          sourceColumn: bestMatch.header,
          confidence: bestMatch.confidence,
          isRequired: templateColumn.isRequired,
          dataType: templateColumn.dataType,
          validationRules: templateColumn.validationRules
        };

        confidence.push({
          column: templateColumn.key,
          confidence: bestMatch.confidence,
          reason: bestMatch.reason
        });

        used.add(bestMatch.header);
      } else if (templateColumn.isRequired) {
        // Mark required fields as unmapped with zero confidence
        confidence.push({
          column: templateColumn.key,
          confidence: 0,
          reason: 'Required field not found'
        });
      }
    }

    // Identify unmapped source columns
    sourceHeaders.forEach(header => {
      if (!used.has(header)) {
        unmapped.push(header);
      }
    });

    return { mapping, confidence, unmapped };
  }

  /**
   * Find best matching column using synonyms and similarity
   */
  private findBestMatch(
    templateColumn: string,
    sourceHeaders: string[],
    used: Set<string>
  ): { header: string; confidence: number; reason: string } | null {
    let bestMatch = null;
    let highestConfidence = 0;

    for (const header of sourceHeaders) {
      if (used.has(header)) continue;

      const confidence = this.calculateSimilarity(templateColumn, header);
      if (confidence > highestConfidence && confidence > 0.4) {
        bestMatch = {
          header,
          confidence,
          reason: this.getMatchReason(templateColumn, header, confidence)
        };
        highestConfidence = confidence;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate similarity between template column and source header
   */
  private calculateSimilarity(templateColumn: string, sourceHeader: string): number {
    const template = this.normalizeHeader(templateColumn);
    const source = this.normalizeHeader(sourceHeader);

    // Exact match
    if (template === source) return 1.0;

    // Check synonyms for the template column key
    const synonyms = COLUMN_SYNONYMS[templateColumn] || [];
    for (const synonym of synonyms) {
      const normalizedSynonym = this.normalizeHeader(synonym);
      
      // Exact synonym match
      if (normalizedSynonym === source) {
        return 0.95;
      }
      
      // Partial synonym match with better scoring
      if (source.includes(normalizedSynonym) || normalizedSynonym.includes(source)) {
        const lengthRatio = Math.min(normalizedSynonym.length, source.length) / 
                           Math.max(normalizedSynonym.length, source.length);
        return 0.85 * lengthRatio;
      }
    }

    // Substring matching
    if (source.includes(template)) {
      return 0.75;
    }
    if (template.includes(source)) {
      return 0.70;
    }

    // Fuzzy matching (simplified Levenshtein distance)
    const distance = this.levenshteinDistance(template, source);
    const maxLength = Math.max(template.length, source.length);
    const similarity = 1 - (distance / maxLength);

    return similarity > 0.5 ? similarity * 0.8 : 0;
  }

  /**
   * Normalize header for comparison
   */
  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get human-readable reason for match
   */
  private getMatchReason(templateColumn: string, sourceHeader: string, confidence: number): string {
    const template = this.normalizeHeader(templateColumn);
    const source = this.normalizeHeader(sourceHeader);

    if (template === source) return 'Exact match';
    
    const synonyms = COLUMN_SYNONYMS[templateColumn] || [];
    for (const synonym of synonyms) {
      if (this.normalizeHeader(synonym) === source) {
        return 'Synonym match';
      }
    }

    if (confidence > 0.8) return 'High similarity';
    if (confidence > 0.6) return 'Partial match';
    
    return 'Low confidence match';
  }

  /**
   * Get AI-assisted mapping (placeholder for future LLM integration)
   */
  private async getAIMapping(
    sourceHeaders: string[],
    templateColumns: TemplateColumn[]
  ): Promise<{
    mapping: ColumnMapping;
    confidence: MappingConfidence[];
    unmapped: string[];
  } | null> {
    // Placeholder for AI mapping
    // In real implementation, this would call an LLM API
    // For now, return null to use heuristic mapping
    return null;
  }

  /**
   * Validate column mapping
   */
  validateMapping(mapping: ColumnMapping, sourceHeaders: string[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required fields
    Object.entries(mapping).forEach(([templateColumn, mapConfig]) => {
      if (mapConfig.isRequired && !mapConfig.sourceColumn) {
        errors.push(`Required field "${templateColumn}" is not mapped`);
      }

      if (mapConfig.sourceColumn && !sourceHeaders.includes(mapConfig.sourceColumn)) {
        errors.push(`Mapped column "${mapConfig.sourceColumn}" not found in source data`);
      }

      if (mapConfig.confidence < 0.5) {
        warnings.push(`Low confidence mapping for "${templateColumn}"`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate mapping profile name based on source headers
   */
  generateProfileName(sourceHeaders: string[], entityType: EntityType): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const headerSample = sourceHeaders.slice(0, 3).join(', ');
    return `${entityType} - ${headerSample} - ${timestamp}`;
  }
}

export const mappingService = new MappingService();