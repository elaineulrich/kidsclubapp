import Image from "next/image";
import PublicNav from "./PublicNav";
import PublicFooter from "./PublicFooter";
import RegisterForm from "./RegisterForm";
import ContactForm from "./ContactForm";

const galleryTiles = [
  { emoji: "🎨", label: "Crafts & Creativity" },
  { emoji: "📖", label: "Bible Stories" },
  { emoji: "🎶", label: "Worship & Songs" },
  { emoji: "🤝", label: "New Friendships" },
  { emoji: "🎉", label: "Games & Fun" },
  { emoji: "🚐", label: "Safe Transportation" },
];

export default function PublicHome() {
  return (
    <div id="home">
      <PublicNav />

      <section className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center text-center gap-6">
          <Image src="/logo.png" alt="Haven Kids Club" width={220} height={89} priority className="mb-2" />
          <h1 className="text-3xl sm:text-5xl font-bold max-w-3xl">
            Empowering Kids Through Fun Activities
          </h1>
          <p className="text-brand-100 text-lg max-w-xl">
            Join our vibrant community to inspire and engage children.
          </p>
          <a href="#register" className="btn-primary bg-gold-500 hover:bg-gold-600 text-brand-900 px-6 py-3 text-base">
            Register my Child
          </a>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16 grid gap-10 sm:grid-cols-2">
        <div className="card">
          <h2 className="text-xl font-semibold text-brand-800 mb-2">Our Vision</h2>
          <p className="text-slate-600">
            Our Vision is to see communities where every child experiences Christ at an early age.
          </p>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold text-brand-800 mb-2">Our Mission</h2>
          <p className="text-slate-600">
            Our Mission is to provide a safe place where kids hear Bible stories, learn about God,
            and build friendships.
          </p>
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center text-brand-800 mb-2">
            Explore our vibrant community
          </h2>
          <p className="text-center text-slate-500 mb-10">
            A peek into what your child will experience at Haven Kids Club.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {galleryTiles.map((tile) => (
              <div
                key={tile.label}
                className="card flex flex-col items-center justify-center text-center py-10 gap-2"
              >
                <span className="text-4xl">{tile.emoji}</span>
                <span className="text-sm font-medium text-slate-600">{tile.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gold-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold text-brand-800 mb-3">Support Haven Kids Club Today!</h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-6">
            Your generosity helps us provide essential programs and resources for children in our
            community.
          </p>
          <a href="mailto:havenkidsclub@gmail.com" className="btn-gradient px-6 py-3 text-base">
            Give Now
          </a>
        </div>
      </section>

      <section id="register" className="max-w-2xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-brand-800 mb-2">Join Our Kids Club!</h2>
        <p className="text-center text-slate-500 mb-8">
          Fill out the form below to register your child.
        </p>
        <RegisterForm />
      </section>

      <section id="contact" className="bg-white border-t border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center text-brand-800 mb-2">Contact Us</h2>
          <p className="text-center text-slate-500 mb-2">
            We&apos;d love to see more inspired individuals join us in serving with or attending our
            kids club!
          </p>
          <p className="text-center text-slate-500 mb-8">
            Hillsboro, TX, USA &bull; (254) 221-6793
          </p>
          <ContactForm />
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
