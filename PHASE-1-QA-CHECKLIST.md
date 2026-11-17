# TrustiFlow – Phase 1 QA checklist (v1.6)

## Interface scope
- [x] Five primary nav areas in source: Overview, Tools, Review, Documents, Personal.
- [x] Tools child screens: product profiles, RFQ, document reader, quotation, trade email.
- [x] Activity history nested under Documents.
- [x] Dashboard shows demo-labelled sample stats, recent activity, quick actions and reminders.
- [x] Product profile create/list/delete UI.
- [x] RFQ editable fields, missing-field validation, review preview, explicit confirmation and handoff to quotation.
- [x] Document reader upload UI and result/error/processing state components (AI processing remains mock).
- [x] Quotation arithmetic, draft save and validation UI.
- [x] Trade email purpose/language/tone/context UI and result/error state.
- [x] DEALSHIELD multi-file selection, comparison categories, sources, severity states, verification controls and local audit history demo.
- [x] Document list search/type/transaction filters, detail preview, delete and demo transaction linking.
- [x] Personal profile/company fields, language, theme, sample member/role management.
- [x] System typography, accessible contrast overrides, button/form spacing and responsive rules.

## Not verified in this environment
- [ ] `npm ci` and `npm run build` success.
- [ ] Desktop browser interaction testing.
- [ ] iPhone Safari physical-device testing at small viewport and safe-area conditions.
- [ ] Tablet layout testing.
- [ ] Keyboard-only and screen-reader testing.

## Deliberately out of Phase 1
- Real Gemini API, Supabase Auth, PostgreSQL, Supabase Storage, real member invitations/permissions and cross-device sync.
