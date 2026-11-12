# AUS LLMEO Platform TODO

## Product expansion

- Add live provider integrations for ChatGPT, Perplexity, Gemini, and Google AI Overview-style capture workflows.
- Add scheduled background runs and queued job processing.
- Add billing, GST-aware invoicing primitives, and plan entitlements.
- Add agency mode, client portfolio switching, and white-label reporting.
- Add team collaboration, roles, invite flows, and audit history.
- Add notifications for visibility drops, competitor spikes, and new citation sources.

## Data and analytics

- Refine scoring weights using real production feedback.
- Track prompt clusters over time at the prompt level, not only snapshot level.
- Add more explicit ranking extraction and answer parsing confidence.
- Add location-aware source authority scoring for Australian directories and local entities.
- Add content gap clustering and recommendation evidence linking.

## UX

- Add export-to-PDF and branded report download.
- Add richer empty states and first-run educational guidance.
- Add search, filters, and bulk actions on prompt and source views.
- Add mobile navigation polish and more granular loading states.

## Platform hardening

- Add automated tests for auth, onboarding, prompt generation, and scoring services.
- Add migration files once the schema stabilises beyond the MVP.
- Move secrets and deployment config into environment-specific profiles.
- Add observability, error reporting, and structured audit logging.
