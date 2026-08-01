import { SuggestionsPanel } from "../SuggestionsPanel";

export default function Page() {
  return (
    <SuggestionsPanel
      mode="queue"
      title="Approval Queue"
      description="Select one or many → Approve & Apply selected. Colour type badges. New blog drafts stay unpublished until you publish them from Blog posts."
    />
  );
}
