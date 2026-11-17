# TrustiFlow – Phase 1 UI handoff (v1.6)

## Scope
This release focuses on interface and experience only. AI, Auth, cloud database and storage remain demo/not integrated.

## Included UI work
- Five primary destinations: Overview, Tools, Review, Documents and Personal. Tools contains product profiles, RFQ, document reader, quotation and trade email. Activity history is nested under Documents.
- Dashboard with demo-labelled activity/transaction/document/task/risk summaries, quick actions and recent activity. First-time browser sessions receive clearly labelled local demo records.
- EXPORTMATE product profile, RFQ review/confirmation handoff, document reader, quotation and email screens.
- DEALSHIELD sample comparison with source labels, match/mismatch/verify states and local verification history.
- Documents search/type/transaction filters, result preview, local activity management and demo transaction linking.
- Personal profile, company fields, language preference, light/dark theme and sample workspace-member role UI.
- System font stack uses Apple system fonts (`-apple-system`, `BlinkMacSystemFont`, `SF Pro Text/Display`) on Apple platforms and the operating system UI fallback elsewhere. No proprietary SF font files are bundled.
- Improved dark/light contrast, button spacing, mobile navigation and responsive layouts.

## Explicit limits
- All records, profiles, members and verification events are local browser demo data.
- RFQ review and DEALSHIELD sample comparison do not call AI or process source documents.
- Document preview previews saved result details/metadata, not a persistent original-file viewer.
- No real invitations, authorization, file storage, account sync or AI provider integration.
- Native iOS app is not included; the web app is a PWA.

## Validation
See `PHASE-1-QA-CHECKLIST.md`. Do not treat visual screenshots or static source checks as device QA. Run `npm ci` and `npm run build`, then manually inspect on iPhone Safari and desktop browsers before marking Phase 1 accepted.
