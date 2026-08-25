import { CONTACT_PHONE_HREF, CONTACT_PHONE_LABEL } from "@/lib/constants";
import { parseMetaDescriptionWithContact } from "@/lib/seo-meta-description";

type Props = {
  description: string;
  className?: string;
  phoneClassName?: string;
};

/**
 * Renders SEO summary text with only the contact number highlighted (clickable).
 */
export function SeoDescriptionWithPhone({
  description,
  className,
  phoneClassName = "font-bold text-orange-600 hover:text-orange-700",
}: Props) {
  const { text } = parseMetaDescriptionWithContact(description);

  return (
    <span className={className}>
      {text}
      {text ? " " : null}
      Call{" "}
      <a href={CONTACT_PHONE_HREF} className={phoneClassName}>
        {CONTACT_PHONE_LABEL}
      </a>
    </span>
  );
}
