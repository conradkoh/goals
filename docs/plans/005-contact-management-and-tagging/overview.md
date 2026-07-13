# Feature: Contact Management and Tagging

## Summary

Enable users to maintain a private list of contacts and associate them with goals, goal logs, quarterly reviews, and markdown content. Contacts are normalized per-user entities linked to goals and logs through join tables, with centralized search and lookup reused across management, tagging, review generation, and editor mention flows.

## Goals

1. Let users create, search, edit, and delete contacts in a dedicated management area
2. Tag goals and goal logs to one or more contacts
3. Surface associated contacts when generating quarterly reviews
4. Support contact-name tagging in markdown with searchable autocomplete
5. Keep contact lookup and association logic centralized in `api.contact`

## Non-Goals

1. Shared or team-visible contacts
2. Contact avatars, phone numbers, aliases, or pagination
3. Separate contact detail routes (management is a compact list + dialog surface)
4. Soft deletion or contact merge/dedupe tooling
5. Real-time collaborative contact editing

## User Story

As a user, I should be able to maintain a list of contacts. I should be able to tag goals to individuals and look them up when generating reviews and work with them. This should work with the logs too. I should be able to tag their names in the markdown and search for matching contacts. There should also be a place I can use to manage contacts.

## Branch and PR Status

- **Branch:** `feature/contact-management-and-tagging`
- **PR:** Draft — work paused; resume by completing remaining phases in `phases.md`
