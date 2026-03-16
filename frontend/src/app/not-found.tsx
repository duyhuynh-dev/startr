import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#060611] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-semibold text-white/90 mb-2">404</h1>
        <p className="text-lg text-white/60 mb-2">Page not found</p>
        <p className="text-sm text-white/40 mb-8">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex px-5 py-2.5 rounded-xl bg-amber-500 text-[#060611] text-sm font-semibold hover:bg-amber-400 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
