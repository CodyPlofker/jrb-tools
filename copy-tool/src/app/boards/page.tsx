"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BriefBoard } from "@/types/brief";

export default function BoardsPage() {
  const [boards, setBoards] = useState<BriefBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      const response = await fetch(`/api/boards?t=${Date.now()}`, { cache: "no-store" });
      const data = await response.json();
      setBoards(data);
    } catch (error) {
      console.error("Error loading boards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBoard = async (id: string) => {
    if (!confirm("Are you sure you want to delete this board?")) return;

    try {
      await fetch(`/api/boards/${id}`, { method: "DELETE" });
      // Reload from server instead of just optimistic update
      await loadBoards();
    } catch (error) {
      console.error("Error deleting board:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-semibold text-[var(--foreground)]">Brief Boards</h1>
          </div>
          <Link
            href="/brief-generator"
            className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Create New Briefs
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {boards.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--card)] rounded-xl flex items-center justify-center border border-[var(--card-border)]">
              <svg className="w-8 h-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">No boards yet</h2>
            <p className="text-[var(--muted)] mb-6">
              Generate briefs and save them to a board to share with designers
            </p>
            <Link
              href="/brief-generator"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Briefs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => {
              const assignedCount = board.briefs.filter((b) => b.assignedTo).length;
              const unassignedCount = board.briefs.length - assignedCount;

              return (
                <div
                  key={board.id}
                  className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden hover:border-[var(--muted-dim)] transition-colors"
                >
                  <Link href={`/boards/${board.id}`} className="block p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-[var(--foreground)]">{board.name}</h3>
                      <span className="text-xs text-[var(--muted)] bg-[var(--input-bg)] px-2 py-0.5 rounded">
                        {board.briefs.length} briefs
                      </span>
                    </div>

                    <p className="text-sm text-[var(--muted)] mb-3">
                      {board.persona.name}
                    </p>

                    {/* Designer badges */}
                    {board.designers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {board.designers.slice(0, 3).map((designer) => (
                          <span
                            key={designer}
                            className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded"
                          >
                            {designer}
                          </span>
                        ))}
                        {board.designers.length > 3 && (
                          <span className="text-xs text-[var(--muted-dim)]">
                            +{board.designers.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                      {assignedCount > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                          {assignedCount} assigned
                        </span>
                      )}
                      {unassignedCount > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                          {unassignedCount} unassigned
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="border-t border-[var(--card-border)] px-4 py-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--muted-dim)]">
                      {new Date(board.updatedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        deleteBoard(board.id);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
