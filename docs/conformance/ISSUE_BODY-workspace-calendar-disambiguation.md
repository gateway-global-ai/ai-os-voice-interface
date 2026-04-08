# [Workspace Calendar] Missing calendar disambiguation when user asks to check calendar for today

## Summary

**Voice/chat** can answer “I’ll pull up your calendar for today” without confirming **which calendar** when the account has **multiple** calendars (primary + transferred/shared). The **Calendar** governed panel **lists** five+ calendars and can load events for a **selected** calendar — but under-specified user intent can yield a **plausible but wrong** schedule if the product silently picks a default.

This is a **governed intent-resolution** issue (**AIOS-SPEC-009**): intent is **under-specified**, multiple valid targets exist; correct behavior is **disambiguation** (or explicit default + override), not silent selection.

## Expected behavior

- If **exactly one** eligible calendar: proceed (optional short disclosure of which calendar).
- If **multiple** eligible calendars: **ask** which calendar (“primary vs transferred vs …”), or run default **only** if **clearly disclosed** and user can change.

Example assistant response:

> You have multiple calendars. I can check your **primary** calendar for today, or a specific shared calendar. Which one?

## Scope

- Intent routing / agent prompts for **workspace.calendar.*** flows from **chat/voice**.
- Optional: default calendar selection in **WorkspaceHubSurface** when opening from under-specified intent.

## Evidence

- Runtime: Calendar panel lists multiple calendars; chat promised “calendar for today” without clarification (screenshots).
- Conformance: `docs/conformance/artifacts/workspace-control-plane-call-graph.md` §9.

## Out of scope

- **#13** Mail formatter; **#14** auth parity (separate issues).
