import { ComingSoon } from "@/components/coming-soon";

export default function AdminPage() {
  return (
    <ComingSoon
      title="Admin"
      description="Manage users, projects, program metadata, role hourly rates, and the monthly period close."
      bullets={[
        "Users + roles (Admin / Engineer / Viewer) and department labels.",
        "Project create (Project # format validated as XXX-XXX).",
        "Project assignments — which engineers see which projects pre-listed in My Week.",
        "Hourly rates per role for future budget rollups.",
        "Monthly period close — once closed, time entries in that window are immutable (Admin can reopen with an audit-logged action).",
      ]}
    />
  );
}
