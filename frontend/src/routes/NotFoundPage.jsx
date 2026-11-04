import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-4xl font-medium">Page not found</h1>
      <Link to="/" className="mt-5 text-olive-dark underline">Return to the homepage</Link>
    </main>
  );
}
