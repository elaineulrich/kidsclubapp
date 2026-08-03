import Link from "next/link";

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-900 text-brand-100">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-4">
        <div>
          <h3 className="text-white font-semibold mb-2">Haven Kids Club</h3>
          <p className="text-sm text-brand-200">
            A safe place where kids ages 5-12 hear Bible stories, learn about God, and build
            friendships &mdash; Tuesday evenings in the Hillsboro community.
          </p>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-2">Explore</h3>
          <ul className="space-y-1 text-sm text-brand-200">
            <li><Link href="/evenings" className="hover:text-white">Kids Club Evenings</Link></li>
            <li><Link href="/about" className="hover:text-white">About &amp; Staff Requirements</Link></li>
            <li><Link href="/#register" className="hover:text-white">Register</Link></li>
            <li><Link href="/#contact" className="hover:text-white">Contact Us</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-2">Contact</h3>
          <p className="text-sm text-brand-200">Hillsboro, TX, USA</p>
          <p className="text-sm text-brand-200">
            <a href="tel:12542216793" className="hover:text-white">(254) 221-6793</a>
          </p>
          <p className="text-sm text-brand-200">
            <a href="mailto:havenkidsclub@gmail.com" className="hover:text-white">havenkidsclub@gmail.com</a>
          </p>
          <p className="text-sm text-brand-200 mt-2">
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              Facebook
            </a>
          </p>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-2">A Ministry Of</h3>
          <p className="text-sm text-brand-200">Osceola Christian Fellowship</p>
          <p className="text-sm text-brand-200">Hillsboro Christian Fellowship</p>
        </div>
      </div>
      <div className="border-t border-brand-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between text-xs text-brand-300">
          <p>Copyright &copy; {year} Haven Kids Club - All Rights Reserved</p>
          <Link href="/credits" className="hover:text-white">Photo Credits</Link>
        </div>
      </div>
    </footer>
  );
}
