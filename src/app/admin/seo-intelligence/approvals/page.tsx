import { SuggestionsPanel } from "../SuggestionsPanel";

export default function Page() {
  return (
    <SuggestionsPanel
      mode="queue"
      title="Approval Queue"
      description="Review queue: colour type badges + one-click Approve & Apply. New blog drafts stay unpublished until you publish them from Blog posts."
    />
  );
}
