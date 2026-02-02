import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import { BriefBoard } from "@/types/brief";

const BOARDS_PREFIX = "boards/";

// GET single board by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { blobs } = await list({ prefix: `${BOARDS_PREFIX}${id}` });

    if (blobs.length === 0) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Always pick the newest one
    const latestBlob = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];

    const response = await fetch(`${latestBlob.url}?t=${Date.now()}`, { cache: "no-store" });
    const board = await response.json();

    return NextResponse.json(board);
  } catch (error) {
    console.error("Error fetching board:", error);
    return NextResponse.json({ error: "Failed to fetch board" }, { status: 500 });
  }
}

// PUT update board
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates: Partial<BriefBoard> = await request.json();

    // Fetch existing board
    const { blobs } = await list({ prefix: `${BOARDS_PREFIX}${id}` });

    if (blobs.length === 0) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Always pick the newest one to update from
    const latestBlob = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];

    const response = await fetch(`${latestBlob.url}?t=${Date.now()}`, { cache: "no-store" });
    const existingBoard: BriefBoard = await response.json();

    // Merge updates
    const updatedBoard: BriefBoard = {
      ...existingBoard,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };

    // Update unique designers list
    const designerSet = new Set<string>();
    updatedBoard.briefs.forEach((brief) => {
      if (brief.assignedTo) {
        designerSet.add(brief.assignedTo);
      }
    });
    updatedBoard.designers = Array.from(designerSet);

    // Save updated board with a random suffix to ensure a new URL
    // This is the most reliable way to bust edge cache
    const blob = await put(
      `${BOARDS_PREFIX}${id}.json`,
      JSON.stringify(updatedBoard),
      { access: "public", contentType: "application/json", addRandomSuffix: true }
    );

    // After uploading the new version, delete the old version(s) to clean up
    // We do this after successful upload
    for (const oldBlob of blobs) {
      await del(oldBlob.url);
    }

    return NextResponse.json({ ...updatedBoard, url: blob.url });
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }
}

// DELETE board
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { blobs } = await list({ prefix: `${BOARDS_PREFIX}${id}` });

    if (blobs.length === 0) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Delete all versions
    for (const blob of blobs) {
      await del(blob.url);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
  }
}
