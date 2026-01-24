import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import { GTMLaunch } from "@/types/gtm";

const LAUNCHES_PREFIX = "gtm-launches/";

// GET all launches (list)
export async function GET() {
  try {
    const { blobs } = await list({ prefix: LAUNCHES_PREFIX });

    const launches: GTMLaunch[] = [];
    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url);
        const launch = await response.json();
        launches.push(launch);
      } catch (e) {
        console.error("Error fetching launch:", blob.pathname, e);
      }
    }

    // Sort by most recently updated
    launches.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json(launches);
  } catch (error) {
    console.error("Error listing launches:", error);
    return NextResponse.json({ error: "Failed to list launches" }, { status: 500 });
  }
}

// POST create new launch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Ensure required fields
    if (!body.name || !body.tier) {
      return NextResponse.json({ error: "Missing required fields: name, tier" }, { status: 400 });
    }

    // Generate ID if not provided
    const launchId = body.id || `launch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Build the launch object
    const launch: GTMLaunch = {
      id: launchId,
      name: body.name,
      product: body.product || body.name,
      launchDate: body.launchDate || "",
      tier: body.tier,
      status: body.status || "draft",
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rawNotes: body.rawNotes || "",
      pmc: body.pmc,
      creativeBrief: body.creativeBrief,
      paidSocialStrategy: body.paidSocialStrategy,
      deliverables: body.deliverables,
    };

    // Save to blob storage
    const blob = await put(
      `${LAUNCHES_PREFIX}${launch.id}.json`,
      JSON.stringify(launch),
      { access: "public", contentType: "application/json" }
    );

    return NextResponse.json({ ...launch, url: blob.url });
  } catch (error) {
    console.error("Error creating launch:", error);
    return NextResponse.json({ error: "Failed to create launch" }, { status: 500 });
  }
}

// PUT update existing launch
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "Missing launch ID" }, { status: 400 });
    }

    // Update the launch
    const launch: GTMLaunch = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Save to blob storage (overwrites existing)
    const blob = await put(
      `${LAUNCHES_PREFIX}${launch.id}.json`,
      JSON.stringify(launch),
      { access: "public", contentType: "application/json", allowOverwrite: true }
    );

    return NextResponse.json({ ...launch, url: blob.url });
  } catch (error) {
    console.error("Error updating launch:", error);
    return NextResponse.json({ error: "Failed to update launch" }, { status: 500 });
  }
}

// DELETE a launch
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const launchId = searchParams.get("id");

    if (!launchId) {
      return NextResponse.json({ error: "Missing launch ID" }, { status: 400 });
    }

    await del(`${LAUNCHES_PREFIX}${launchId}.json`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting launch:", error);
    return NextResponse.json({ error: "Failed to delete launch" }, { status: 500 });
  }
}
