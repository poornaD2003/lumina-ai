import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../lib/prisma.js';

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

type ExtractedItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  confidence?: number;
};

type ExtractedInvoice = {
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceTotal?: number;
  confidence?: number;
  items: ExtractedItem[];
};

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || (!apiKey.startsWith('AIza') && !apiKey.startsWith('AQ'))) return null;
  return new GoogleGenAI({ apiKey });
};

const parseJson = <T>(text: string): T => {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as T;
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const findSupplier = (name: string | undefined, suppliers: Array<{ id: number; name: string }>) => {
  if (!name) return null;
  const normalizedName = normalize(name);
  return suppliers.find((supplier) => {
    const candidate = normalize(supplier.name);
    return candidate === normalizedName || candidate.includes(normalizedName) || normalizedName.includes(candidate);
  }) ?? null;
};

const findProduct = (name: string, products: Array<{ id: number; name: string; sku: string; brand: string; category: string }>) => {
  const normalizedName = normalize(name);
  const exact = products.find((product) => normalize(product.name) === normalizedName || normalize(product.sku) === normalizedName);
  if (exact) return { product: exact, confidence: 1 };

  const words = normalizedName.split(' ').filter((word) => word.length > 2);
  let best: { product: typeof products[number]; confidence: number } | null = null;
  for (const product of products) {
    const searchable = normalize(`${product.name} ${product.sku} ${product.brand} ${product.category}`);
    const matches = words.filter((word) => searchable.includes(word)).length;
    const confidence = words.length > 0 ? matches / words.length : 0;
    if (confidence >= 0.5 && (!best || confidence > best.confidence)) best = { product, confidence };
  }
  return best;
};

const validateExtractedItem = (item: ExtractedItem) => {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);
  const totalAmount = Number(item.totalAmount);
  return Number.isInteger(quantity) && quantity > 0 && Number.isFinite(unitPrice) && unitPrice >= 0 && Number.isFinite(totalAmount) && totalAmount >= 0;
};

export const uploadInvoice = async (req: Request, res: Response) => {
  try {
    const { fileName, fileType, data } = req.body as { fileName?: string; fileType?: string; data?: string };
    if (!fileName || !fileType || !data || !allowedMimeTypes.has(fileType)) {
      return res.status(400).json({ error: 'Upload a PDF, JPG, PNG, or WEBP invoice.' });
    }

    const base64 = data.replace(/^data:[^;]+;base64,/, '');
    const byteLength = Math.ceil((base64.length * 3) / 4);
    if (byteLength > MAX_FILE_BYTES) return res.status(413).json({ error: 'Invoice files must be 12 MB or smaller.' });

    const ai = getAI();
    if (!ai) return res.status(503).json({ error: 'Invoice extraction requires GEMINI_API_KEY.' });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: `Extract this supplier invoice into JSON. It may be typed, scanned, or handwritten. Do not invent values. Use 0 only when a visible numeric value is clearly zero. Return exactly this shape: {"supplierName": string|null, "invoiceNumber": string|null, "invoiceDate": "YYYY-MM-DD"|null, "invoiceTotal": number|null, "confidence": number, "items": [{"productName": string, "quantity": number, "unitPrice": number, "totalAmount": number, "confidence": number}]}. Use the invoice currency's numeric amount and preserve the printed quantity, unit price, and line total.` },
          { inlineData: { mimeType: fileType, data: base64 } },
        ],
      }],
      config: { responseMimeType: 'application/json' },
    });

    const extracted = parseJson<ExtractedInvoice>(response.text || '{}');
    const validItems = Array.isArray(extracted.items) ? extracted.items.filter(validateExtractedItem) : [];
    if (validItems.length === 0) return res.status(422).json({ error: 'No invoice line items could be read. Please upload a clearer image.' });

    const [suppliers, products] = await Promise.all([
      prisma.supplier.findMany({ select: { id: true, name: true } }),
      prisma.product.findMany({ select: { id: true, name: true, sku: true, brand: true, category: true } }),
    ]);
    const supplier = findSupplier(extracted.supplierName, suppliers);
    const invoice = await prisma.supplierInvoice.create({
      data: {
        fileName,
        fileType,
        supplierId: supplier?.id,
        invoiceNumber: extracted.invoiceNumber || null,
        invoiceDate: extracted.invoiceDate ? new Date(extracted.invoiceDate) : null,
        invoiceTotal: Number.isFinite(Number(extracted.invoiceTotal)) ? Number(extracted.invoiceTotal) : null,
        ocrConfidence: Number.isFinite(Number(extracted.confidence)) ? Number(extracted.confidence) : null,
        items: {
          create: validItems.map((item) => {
            const match = findProduct(item.productName, products);
            return {
              productId: match?.product.id,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
              confidence: Math.min(Number(item.confidence ?? 0), match?.confidence ?? 0),
            };
          }),
        },
      },
      include: { supplier: true, items: { include: { product: true } } },
    });
    return res.status(201).json(invoice);
  } catch (error) {
    console.error('Failed to extract supplier invoice:', error);
    return res.status(500).json({ error: 'Unable to read this invoice. Check the file and try again.' });
  }
};

export const getInvoice = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid invoice id' });
  const invoice = await prisma.supplierInvoice.findUnique({ where: { id }, include: { supplier: true, items: { include: { product: true } } } });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  return res.json(invoice);
};

export const getInvoiceOptions = async (_req: Request, res: Response) => {
  const [suppliers, products] = await Promise.all([
    prisma.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.product.findMany({ select: { id: true, name: true, sku: true }, orderBy: { name: 'asc' } }),
  ]);
  return res.json({ suppliers, products });
};

export const approveInvoice = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { supplierId, items } = req.body as { supplierId?: number; items?: Array<{ id: number; productId: number; quantity: number; unitPrice: number; totalAmount: number }> };
    if (!Number.isInteger(id) || !Number.isInteger(Number(supplierId)) || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Supplier and invoice items are required.' });

    const invoice = await prisma.supplierInvoice.findUnique({ where: { id }, include: { items: true } });
    const supplier = await prisma.supplier.findUnique({ where: { id: Number(supplierId) } });
    if (!invoice || !supplier) return res.status(404).json({ error: 'Invoice or supplier not found.' });
    if (invoice.status !== 'REVIEW') return res.status(409).json({ error: `Invoice is already ${invoice.status.toLowerCase()}.` });
    if (items.some((item) => !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity <= 0 || item.unitPrice < 0 || item.totalAmount < 0 || Math.abs(item.quantity * item.unitPrice - item.totalAmount) > 0.01)) return res.status(400).json({ error: 'Correct every product, quantity, and amount before approving.' });

    const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
    const poNumber = `INV-${id}-${Date.now()}`;
    const expectedDate = new Date(Date.now() + supplier.leadTimeDays * 86400000);
    const order = await prisma.$transaction(async (tx) => {
      await tx.supplierInvoice.update({ where: { id }, data: { supplierId: supplier.id, status: 'APPROVED', invoiceTotal: totalAmount } });
      for (const item of items) {
        await tx.supplierInvoiceItem.update({ where: { id: item.id }, data: { productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, totalAmount: item.totalAmount } });
      }
      return tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierName: supplier.name,
          expectedDate,
          totalAmount,
          items: { create: items.map((item) => ({ productId: item.productId, productName: invoice.items.find((line) => line.id === item.id)?.productName ?? 'Invoice item', quantity: item.quantity, unitCost: item.unitPrice })) },
        },
        include: { items: true },
      });
    });
    return res.json({ invoiceId: id, purchaseOrder: order });
  } catch (error) {
    console.error('Failed to approve supplier invoice:', error);
    return res.status(500).json({ error: 'Unable to approve invoice.' });
  }
};
