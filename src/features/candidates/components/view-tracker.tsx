"use client";

import { useEffect } from "react";
import { recordCandidateViewAction } from "@/features/candidates/actions";

export function CandidateViewTracker({ candidateId }: { candidateId: string }) {
  useEffect(() => {
    void recordCandidateViewAction(candidateId);
  }, [candidateId]);
  return null;
}
