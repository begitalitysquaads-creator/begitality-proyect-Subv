"use client";

import { useState } from "react";
import { ProjectTimeline } from "./ProjectTimeline";
import { MilestoneManager } from "./MilestoneManager";

export function ProjectChronology({ projectId }: { projectId: string }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <ProjectTimeline projectId={projectId} key={`timeline-${refreshKey}`} />
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
        <MilestoneManager projectId={projectId} onUpdate={handleUpdate} />
      </div>
    </div>
  );
}
