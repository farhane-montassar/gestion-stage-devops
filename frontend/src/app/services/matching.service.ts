import { Injectable } from '@angular/core';
import { Student } from './student.service';
import { Offer } from './offer.service';

export interface MatchResult {
  score: number;                 // 0 - 100
  level: 'high' | 'medium' | 'low';
  color: 'green' | 'orange' | 'red';
  emoji: string;                 // 🟢 / 🟡 / 🔴
  missingSkills: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MatchingService {
  // Barème
  private readonly DOMAIN_POINTS = 40;
  private readonly LEVEL_POINTS = 20;
  private readonly SKILL_POINTS = 10;
  private readonly MAX_SCORE = 100;

  /**
   * Calcule la compatibilité entre un étudiant et une offre.
   * - Domaine identique      : +40
   * - Niveau compatible      : +20
   * - Chaque compétence commune : +10
   * Score plafonné à 100 %.
   */
  computeMatch(student: Student | null, offer: Offer): MatchResult {
    let score = 0;

    if (student) {
      if (this.equals(student.domain, offer.domain)) {
        score += this.DOMAIN_POINTS;
      }

      if (this.equals(student.level, offer.level)) {
        score += this.LEVEL_POINTS;
      }

      const studentSkills = this.normalizeList(student.skills);
      const requiredSkills = offer.requiredSkills || [];

      const common = requiredSkills.filter((skill) =>
        studentSkills.includes(this.normalize(skill))
      );

      score += common.length * this.SKILL_POINTS;
    }

    if (score > this.MAX_SCORE) {
      score = this.MAX_SCORE;
    }

    const missingSkills = (offer.requiredSkills || []).filter(
      (skill) => !this.normalizeList(student?.skills).includes(this.normalize(skill))
    );

    return {
      score,
      ...this.classify(score),
      missingSkills
    };
  }

  private classify(score: number): Pick<MatchResult, 'level' | 'color' | 'emoji'> {
    if (score >= 70) {
      return { level: 'high', color: 'green', emoji: '🟢' };
    }
    if (score >= 50) {
      return { level: 'medium', color: 'orange', emoji: '🟡' };
    }
    return { level: 'low', color: 'red', emoji: '🔴' };
  }

  private equals(a?: string, b?: string): boolean {
    return !!a && !!b && this.normalize(a) === this.normalize(b);
  }

  private normalize(value: string): string {
    return (value || '').trim().toLowerCase();
  }

  private normalizeList(list?: string[]): string[] {
    return (list || []).map((v) => this.normalize(v));
  }
}
