import { SuggestionsPanel } from "../SuggestionsPanel";

export default function Page() {
  return (
    <SuggestionsPanel
      mode="queue"
      title="Approval Queue"
      description="Pending, edited, approved, auto-approved, and deferred suggestions. Apply only after review. New blog drafts stay unpublished until you publish them."
    />
  );
}
