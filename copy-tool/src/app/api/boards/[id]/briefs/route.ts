import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import { BriefBoard, SavedBrief } from "@/types/brief";

const BOARDS_PREFIX = "boards/";

// POST add briefs to existing board
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { briefs } = await request.json();

    if (!briefs || !Array.isArray(briefs)) {
      return NextResponse.json({ error: "Missing briefs array" }, { status: 400 });
    }

    // Fetch existing board
    const { blobs } = await list({ prefix: `${BOARDS_PREFIX}${id}.json` });

    if (blobs.length === 0) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const response = await fetch(blobs[0].url);
    const existingBoard: BriefBoard = await response.json();

    // Add boardId to new briefs and append to existing
    const newBriefs: SavedBrief[] = briefs.map((brief: SavedBrief) => ({
      ...brief,
      boardId: id,
      savedAt: brief.savedAt || new Date().toISOString(),
    }));

    const updatedBoard: BriefBoard = {
      ...existingBoard,
      briefs: [...existingBoard.briefs, ...newBriefs],
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

    // Save updated board
    const blob = await put(
      `${BOARDS_PREFIX}${id}.json`,
      JSON.stringify(updatedBoard),
      { access: "public", contentType: "application/json", allowOverwrite: true }
    );

    return NextResponse.json({
      ...updatedBoard,
      url: blob.url,
      addedCount: newBriefs.length
    });
  } catch (error) {
    console.error("Error adding briefs to board:", error);
    return NextResponse.json({ error: "Failed to add briefs to board" }, { status: 500 });
  }
}
