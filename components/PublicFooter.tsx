export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-brand-900 text-brand-100">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <h3 className="text-white font-semibold mb-2">Haven Kids Club</h3>
          <p className="text-sm text-brand-200">
            A safe place where kids hear Bible stories, learn about God, and build friendships.
          </p>
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
        </div>
        <div>
          <h3 className="text-white font-semibold mb-2">Follow Us</h3>
          <a
            href="https://www.facebook.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-200 hover:text-white"
          >
            Facebook
          </a>
        </div>
      </div>
      <div className="border-t border-brand-800">
        <p className="max-w-6xl mx-auto px-4 py-4 text-xs text-brand-300">
          Copyright &copy; {year} Haven Kids Club - All Rights Reserved
        </p>
      </div>
    </footer>
  );
}
