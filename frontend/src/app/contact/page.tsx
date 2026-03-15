import Link from "next/link";

export const metadata = {
  title: "Contact | Startr",
  description: "Contact Startr",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#060611] text-white px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm font-medium mb-8 inline-block">
          ← Back to Startr
        </Link>
        <h1 className="text-2xl font-bold mb-4">Contact</h1>
        <p className="text-white/60 text-sm mb-6">
          Get in touch with the Startr team.
        </p>
        <p className="text-white/70 leading-relaxed mb-4">
          For partnerships, support, or press inquiries, reach out at{" "}
          <a href="mailto:hello@startr.app" className="text-amber-400 hover:underline">hello@startr.app</a>.
        </p>
      </div>
    </div>
  );
}
