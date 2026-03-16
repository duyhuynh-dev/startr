import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Startr",
  description: "Privacy policy for Startr",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#060611] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm font-medium mb-8 inline-block">
          ← Back to Startr
        </Link>
        <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-white/60 text-sm mb-6">
          Last updated: 2026. This page is a placeholder. Full privacy policy will be published before launch.
        </p>
        <p className="text-white/70 leading-relaxed">
          We respect your privacy. Startr will outline how we collect, use, and protect your data here.
        </p>
      </div>
    </div>
  );
}
