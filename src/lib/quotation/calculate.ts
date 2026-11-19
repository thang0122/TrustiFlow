export type QuotationCostLine = {
  label: string;
  amount: number;
  basis: "per_unit" | "per_shipment";
  category?: string | null;
  source_note?: string | null;
};

export type QuotationCalculationInput = {
  quantity: number;
  productCostPerUnit: number;
  marginPercent: number;
  costLines: QuotationCostLine[];
};

export function calculateQuotation(input: QuotationCalculationInput) {
  const { quantity, productCostPerUnit, marginPercent, costLines } = input;
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Số lượng phải lớn hơn 0.");
  if (!Number.isFinite(productCostPerUnit) || productCostPerUnit < 0) throw new Error("Chi phí sản phẩm/đơn vị không hợp lệ.");
  if (!Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent > 500) throw new Error("Tỷ lệ cộng biên phải từ 0 đến 500%.");
  if (!Array.isArray(costLines) || costLines.length > 80) throw new Error("Danh sách chi phí không hợp lệ.");
  for (const line of costLines) {
    if (!line.label.trim() || !Number.isFinite(line.amount) || line.amount < 0 || !["per_unit", "per_shipment"].includes(line.basis)) {
      throw new Error("Có khoản chi phí chưa hợp lệ.");
    }
  }
  const round = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000;
  const goodsCost = productCostPerUnit * quantity;
  const additionalCost = costLines.reduce((sum, line) => sum + line.amount * (line.basis === "per_unit" ? quantity : 1), 0);
  const totalCost = goodsCost + additionalCost;
  const markupAmount = totalCost * marginPercent / 100;
  const quoteTotal = totalCost + markupAmount;
  const unitPrice = quoteTotal / quantity;
  if (![goodsCost, additionalCost, totalCost, markupAmount, quoteTotal, unitPrice].every(Number.isFinite)) {
    throw new Error("Phép tính báo giá vượt giới hạn số hợp lệ.");
  }
  return {
    formula: "(product_cost_per_unit × quantity + Σ cost_lines) × (1 + margin_percent / 100)",
    product_cost_per_unit: productCostPerUnit, quantity,
    goods_cost: round(goodsCost), additional_cost: round(additionalCost),
    total_cost: round(totalCost), margin_percent: marginPercent, markup_amount: round(markupAmount),
    quote_total: round(quoteTotal), unit_selling_price: round(unitPrice),
    costs_confirmed: true, cost_lines: costLines,
  };
}
