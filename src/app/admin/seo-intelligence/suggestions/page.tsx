import { SuggestionsPanel } from "../SuggestionsPanel";

export default function Page() {
  return (
    <SuggestionsPanel
      mode="open"
      title="Suggestions"
      description="Each card shows Our rank in colour (#1–3 green … not ranking grey). Select one or many → Approve & Apply selected. Applied items move to Applied Changes."
    />
  );
}
