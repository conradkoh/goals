import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// This file sits in variants/. Paths below are relative to it.
const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(path.resolve(here, rel), 'utf8');

// The eight goal-details surfaces that must render the shared single-scroll body.
const SURFACES = [
  'DailyGoalPopover.tsx',
  'AdhocGoalPopover.tsx',
  'AdhocGoalPopoverContent.tsx',
  'QuarterlyGoalPopover.tsx',
  'WeeklyGoalPopover.tsx',
  'StandardGoalPopoverContent.tsx',
  '../../focus/GoalQuickViewModal.tsx',
  '../../focus/AdhocGoalQuickViewModal.tsx',
] as const;

// Matches a multi-line named import of GoalDetailsBody from any module.
const IMPORTS_GOAL_DETAILS_BODY =
  /import\s*\{[^}]*\bGoalDetailsBody\b[^}]*\}\s*from\s*['"][^'"]+['"]/;
const IMPORTS_TABS = /from\s*['"]@\/components\/ui\/tabs['"]/;
const MENTIONS_GOAL_LOG_TAB = /\bGoalLogTab\b/;

describe('goal details surfaces: single-scroll layout guard', () => {
  it.each(SURFACES)('%s imports the shared GoalDetailsBody', (rel) => {
    expect(read(rel)).toMatch(IMPORTS_GOAL_DETAILS_BODY);
  });

  it.each(SURFACES)('%s has no tab strip and no GoalLogTab reference', (rel) => {
    const source = read(rel);
    expect(source).not.toMatch(IMPORTS_TABS);
    expect(source).not.toMatch(MENTIONS_GOAL_LOG_TAB);
  });
});

describe('GoalLogSection: no nested scroll', () => {
  it('carries no overflow-*, max-h-*, or fixed-height arbitrary class', () => {
    // From variants/: ../ = goal-details-popover, ../../ = molecules.
    const source = read('../../goal-log/GoalLogSection.tsx');
    expect(source).not.toMatch(/\boverflow-/);
    expect(source).not.toMatch(/\bmax-h-/);
    expect(source).not.toMatch(/\bh-\[/);
  });
});
