import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { calculateQuotation } from '@/lib/quotation/calculate';

const costLineSchema = z.object({
  label:z.string().trim().min(1).max(160),
  category:z.string().trim().max(60).optional().nullable(),
  amount:z.coerce.number().min(0).finite(),
  basis:z.enum(['per_unit','per_shipment']),
  source_note:z.string().trim().max(500).optional().nullable(),
});
const createSchema = z.object({
  workspaceId:z.string().uuid(), transaction_id:z.string().uuid().optional().nullable(),
  buyer_name:z.string().trim().max(200).optional().nullable(), product:z.string().trim().min(1).max(200),
  quantity:z.coerce.number().positive().finite(), unit:z.string().trim().max(40).optional().nullable(),
  currency:z.string().trim().length(3), incoterm:z.string().trim().max(10).optional().nullable(),
  destination:z.string().trim().max(200).optional().nullable(), payment_terms:z.string().trim().max(2000).optional().nullable(),
  product_cost_per_unit:z.coerce.number().min(0).finite(), margin_percent:z.coerce.number().min(0).max(500).finite(),
  cost_lines:z.array(costLineSchema).max(80).default([]), costs_confirmed:z.literal(true),
});

export async function GET(request:Request) {
  const supabase = await createClient();
  const {data:{user},error:authError} = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({error:'Unauthenticated'},{status:401});
  const workspaceId = new URL(request.url).searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({quotations:[]});
  const {data,error} = await supabase.from('quotations').select('id,workspace_id,transaction_id,product_id,buyer_name,product,quantity,unit,unit_price,currency,freight,insurance,other_costs,margin,product_cost_per_unit,margin_percent,cost_total,quote_total,cost_breakdown,incoterm,destination,payment_terms,status,created_at,updated_at').eq('workspace_id',workspaceId).order('created_at',{ascending:false}).limit(200);
  if (error) return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({quotations:data || []});
}

export async function POST(request:Request) {
  const supabase = await createClient();
  const {data:{user},error:authError} = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({error:'Unauthenticated'},{status:401});
  const parsed = createSchema.safeParse(await request.json().catch(()=>null));
  if (!parsed.success) return NextResponse.json({error:'Báo giá cần đủ thông tin và xác nhận bảng chi phí trước khi lưu.',details:parsed.error.flatten()},{status:400});
  const {workspaceId,cost_lines,product_cost_per_unit,margin_percent,costs_confirmed,...fields} = parsed.data;
  const {data:member,error:memberError} = await supabase.from('workspace_members').select('role').eq('workspace_id',workspaceId).eq('user_id',user.id).maybeSingle();
  if (memberError || !member) return NextResponse.json({error:'Bạn không có quyền với workspace này.'},{status:403});
  const quantity = fields.quantity;
  let breakdown: ReturnType<typeof calculateQuotation>;
  try {
    breakdown = calculateQuotation({quantity,productCostPerUnit:product_cost_per_unit,marginPercent:margin_percent,costLines:cost_lines});
  } catch (error) {
    return NextResponse.json({error:error instanceof Error ? error.message : 'Dữ liệu tính báo giá không hợp lệ.'},{status:400});
  }
  const totalCost = breakdown.total_cost;
  const quoteTotal = breakdown.quote_total;
  const unitPrice = breakdown.unit_selling_price;
  const {data:matchingProduct,error:productLookupError} = await supabase.from('products').select('id').eq('workspace_id',workspaceId).ilike('name',fields.product).limit(1).maybeSingle();
  if (productLookupError) return NextResponse.json({error:productLookupError.message},{status:400});
    const {data:quotation,error:quotationError} = await supabase.from('quotations').insert({
    workspace_id:workspaceId,product_id:matchingProduct?.id || null, ...fields,
    unit_price:unitPrice, freight:null, insurance:null, other_costs:null, margin:margin_percent,
    product_cost_per_unit,margin_percent,cost_total:totalCost,quote_total:quoteTotal,cost_breakdown:breakdown,
    created_by:user.id,status:'draft',
  }).select('id,workspace_id,transaction_id,product_id,buyer_name,product,quantity,unit,unit_price,currency,incoterm,destination,payment_terms,product_cost_per_unit,margin_percent,cost_total,quote_total,cost_breakdown,status,created_at').single();
  if (quotationError || !quotation) return NextResponse.json({error:quotationError?.message || 'Không lưu được báo giá.'},{status:400});
  if (cost_lines.length) {
    const rows = cost_lines.map(line=>({workspace_id:workspaceId,quotation_id:quotation.id,label:line.label,category:line.category || 'other',amount:line.amount,basis:line.basis,currency:fields.currency,source_note:line.source_note || null,created_by:user.id}));
    const {error:costError} = await supabase.from('quotation_cost_items').insert(rows);
    if (costError) {
      await supabase.from('quotations').delete().eq('id',quotation.id).eq('workspace_id',workspaceId);
      return NextResponse.json({error:`Không lưu được các khoản chi phí, báo giá chưa được lưu: ${costError.message}`},{status:400});
    }
  }
  const archiveResult = { kind:'quotation', quotation, calculation:breakdown, costLines:cost_lines };
  const {error:auditError} = await supabase.from('audit_events').insert({
    workspace_id:workspaceId,user_id:user.id,entity_type:'quotation',entity_id:quotation.id,action:'created',
    details:{
      title:`Đã tạo báo giá: ${quotation.product}`,type:'quotation',
      detail:`${quantity} ${fields.unit || ''} · ${quoteTotal} ${fields.currency} · đã xác nhận bảng chi phí`,
      status:'Completed',result:archiveResult,result_version:1,related_object_id:quotation.id,document_ids:[],
    },
  });
  if (auditError) return NextResponse.json({
    error:`Báo giá đã lưu nhưng chưa lưu được kết quả vào lịch sử: ${auditError.message}`,quotation,resultSaved:false,
    archivePayload:{title:`Đã tạo báo giá: ${quotation.product}`,type:'quotation',detail:`${quantity} ${fields.unit || ''} · ${quoteTotal} ${fields.currency} · đã xác nhận bảng chi phí`,entityId:quotation.id,relatedObjectId:quotation.id,result:archiveResult},
  },{status:503});
  return NextResponse.json({quotation,calculation:breakdown,resultSaved:true},{status:201});
}
