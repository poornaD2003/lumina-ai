import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const productFields = {
  id: true, name: true, sku: true, brand: true, category: true, processor: true,
  ram: true, storage: true, displaySize: true, unitPrice: true, costPrice: true,
  stockQuantity: true, reorderLevel: true, warrantyMonths: true,
} as const;

function productInput(body: Record<string, unknown>) {
  const requiredText = ['name', 'sku', 'brand', 'category'];
  if (requiredText.some((field) => typeof body[field] !== 'string' || !String(body[field]).trim())) {
    return { error: 'Name, SKU, brand, and category are required' };
  }
  const numericFields = ['unitPrice', 'costPrice', 'stockQuantity', 'reorderLevel', 'warrantyMonths'];
  const values = Object.fromEntries(numericFields.map((field) => [field, Number(body[field])]));
  if (numericFields.some((field) => !Number.isFinite(values[field]))) {
    return { error: 'Price and inventory values must be valid numbers' };
  }
  return {
    data: {
      name: String(body.name).trim(), sku: String(body.sku).trim(), brand: String(body.brand).trim(), category: String(body.category).trim(),
      processor: typeof body.processor === 'string' && body.processor.trim() ? body.processor.trim() : null,
      ram: typeof body.ram === 'string' && body.ram.trim() ? body.ram.trim() : null,
      storage: typeof body.storage === 'string' && body.storage.trim() ? body.storage.trim() : null,
      displaySize: typeof body.displaySize === 'string' && body.displaySize.trim() ? body.displaySize.trim() : null,
      unitPrice: values.unitPrice, costPrice: values.costPrice, stockQuantity: Math.round(values.stockQuantity),
      reorderLevel: Math.round(values.reorderLevel), warrantyMonths: Math.round(values.warrantyMonths),
    },
  };
}

export async function listProducts(_req: Request, res: Response) {
  res.json(await prisma.product.findMany({ select: productFields, orderBy: { name: 'asc' } }));
}

export async function createProduct(req: Request, res: Response) {
  const input = productInput(req.body as Record<string, unknown>);
  if ('error' in input) return res.status(400).json({ error: input.error });
  try {
    return res.status(201).json(await prisma.product.create({ data: input.data, select: productFields }));
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return res.status(409).json({ error: 'A product with this SKU already exists' });
    throw error;
  }
}

export async function updateProduct(req: Request, res: Response) {
  const input = productInput(req.body as Record<string, unknown>);
  if ('error' in input) return res.status(400).json({ error: input.error });
  try {
    return res.json(await prisma.product.update({ where: { id: Number(req.params.id) }, data: input.data, select: productFields }));
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return res.status(409).json({ error: 'A product with this SKU already exists' });
    throw error;
  }
}