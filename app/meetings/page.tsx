import { ComingSoon } from "@/components/coming-soon";

export default function MeetingsPage() {
  return (
    <ComingSoon
      title="Meetings"
      description="Pick a project, click Generate Agenda, run your meeting, then paste the transcript. Claude will propose per-section edits behind an approval gate — nothing changes without your click."
      bullets={[
        "Generate agenda from current project state (open risks, gates near, hours burning vs estimate, last decisions, pending tasks).",
        "Paste meeting transcript (Teams, Otter, Fireflies, manual notes — source doesn't matter).",
        "Per-edit approval: accept the decisions update, reject the hours change, edit the risk before saving.",
        "Audit log records every accept/reject with timestamp.",
      ]}
    />
  );
}
