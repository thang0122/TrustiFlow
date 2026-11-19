# TRADE DOCUMENT VALIDATION CHECKLIST

Before issuing or approving a document set, compare:

- Buyer and seller legal names, addresses and registration numbers against verified master data.
- Product description, SKU/model, material, grade/specification and HS code (HS only when independently confirmed).
- Quantity, unit, unit price, line extension, discounts, total and currency. Recalculate arithmetic deterministically.
- Invoice, PO, contract, RFQ, shipment and booking references.
- Dates: issue date, order date, requested delivery, shipment date, payment due date and validity period.
- Incoterm rule, version and exact named place/port. Do not rely on a three-letter code without the named place.
- Payment terms, beneficiary name, bank account, bank name, SWIFT/BIC and country when present.
- Packing details: number/type of packages, marks, net/gross weight, dimensions and volume.
- Document-specific permits/certificates based on the goods and destination.

## Rules for unresolved information

- Mark unknown fields as `Not provided` / `Needs confirmation`; never populate a guessed value.
- Keep source document and source excerpt for each extracted value.
- Distinguish mismatch, missing value, OCR uncertainty and harmless formatting difference.
- Assign human owner and verification status to each flagged point.
- Verify bank-account changes independently using contact information already on file.
