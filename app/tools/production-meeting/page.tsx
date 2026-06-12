import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PrintButton } from "../print-button";

/*
 * Production Meeting — printable daily note sheet. One row per injection
 * molding machine (IMM), grouped the way the floor is laid out. Print and
 * write notes by hand during the huddle.
 */

// IMM list grouped for the production floor. Each inner array prints as a
// block with a little breathing room between blocks.
const IMM_GROUPS: string[][] = [
  ["10", "11", "12", "13"],
  ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"],
  ["C1", "C2", "C3", "C4", "C5", "C6"],
];

export default async function ProductionMeetingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto w-full max-w-[820px] px-6 py-8 print:py-0">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/tools" className="text-sm text-noble-black/70 hover:underline">
          ← Tools
        </Link>
        <PrintButton />
      </div>

      <header className="mb-6 flex items-end justify-between border-b-2 border-noble-black pb-3">
        <h1 className="font-serif text-3xl font-semibold text-noble-black">
          Production Meeting
        </h1>
        <div className="flex items-end gap-2">
          <span className="text-sm font-medium text-noble-black/70">Date</span>
          <span className="inline-block w-48 border-b border-noble-black/60">
            &nbsp;
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-5">
        {IMM_GROUPS.map((group, gi) => (
          <div key={gi} className="flex flex-col">
            {group.map((imm) => (
              <div
                key={imm}
                className="flex items-stretch border-b border-noble-black/30"
              >
                <div className="flex w-16 shrink-0 items-center py-2.5 font-mono text-base font-semibold text-noble-black">
                  {imm}
                </div>
                <div className="flex-1 py-2.5">&nbsp;</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
