import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-4xl font-bold text-ocean-900">404</h1>
      <p className="mt-2 text-ocean-700">
        This page drifted out with the tide. Head back to book scuba or tours in
        Goa.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-ocean-gradient px-6 py-3 text-sm font-semibold text-white"
      >
        Back home
      </Link>
    </div>
  );
}
