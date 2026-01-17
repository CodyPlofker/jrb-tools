import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const productsPath = path.join(process.cwd(), "training-data/products/products.json");
    const productsContent = fs.readFileSync(productsPath, "utf-8");
    const products = JSON.parse(productsContent);
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error loading products:", error);
    return NextResponse.json([], { status: 500 });
  }
}
