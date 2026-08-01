import { SuggestionsPanel } from "../SuggestionsPanel";

export default function Page() {
  return (
    <SuggestionsPanel
      mode="open"
      title="Suggestions"
      description="Open recommendations only. After Apply succeeds, items leave this list and appear under Applied Changes."
    />
  );
}
