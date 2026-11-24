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
// Matches an import of any module under goal-log/ (surfaces must mount GoalDetailsBody only).
const IMPORTS_GOAL_LOG = /from\s*['"][^'"]*\/goal-log(?:\/[^'"]*)?['"]/;

describe('goal details surfaces: single-scroll layout guard', () => {
  it.each(SURFACES)('%s imports the shared GoalDetailsBody', (rel) => {
    expect(read(rel)).toMatch(IMPORTS_GOAL_DETAILS_BODY);
  });

  it.each(SURFACES)('%s has no tab strip and no direct goal-log import', (rel) => {
    const source = read(rel);
    expect(source).not.toMatch(IMPORTS_TABS);
    expect(source).not.toMatch(IMPORTS_GOAL_LOG);
  });
});

// Surfaces whose child list is collapsible. The goal page keeps its always-expanded list.
const COLLAPSIBLE_CHILD_LIST_SURFACES = [
  'WeeklyGoalPopover.tsx',
  'QuarterlyGoalPopover.tsx',
  'StandardGoalPopoverContent.tsx',
  '../../focus/GoalQuickViewModal.tsx',
] as const;

// Each opening <GoalDetailsChildrenList ...> tag. Props never contain '>', so [^>]* is safe.
const CHILDREN_LIST_TAG = /<GoalDetailsChildrenList\b[^>]*>/g;

describe('goal details surfaces: collapsible child lists', () => {
  it.each(COLLAPSIBLE_CHILD_LIST_SURFACES)(
    '%s passes collapsible to every GoalDetailsChildrenList',
    (rel) => {
      const tags = read(rel).match(CHILDREN_LIST_TAG) ?? [];
      expect(tags.length).toBeGreaterThan(0);
      for (const tag of tags) {
        expect(tag).toMatch(/\bcollapsible\b/);
      }
    }
  );

  it('WeeklyGoalPageContent keeps the always-expanded child list', () => {
    const tags = read('WeeklyGoalPageContent.tsx').match(CHILDREN_LIST_TAG) ?? [];
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(tag).not.toMatch(/\bcollapsible\b/);
    }
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
