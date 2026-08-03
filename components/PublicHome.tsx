import Image from "next/image";
import Link from "next/link";
import PublicNav from "./PublicNav";
import PublicFooter from "./PublicFooter";
import RegisterForm from "./RegisterForm";
import ContactForm from "./ContactForm";

const galleryTiles = [
  { src: "/images/gallery-playing.jpg", label: "Playing Group Games" },
  { src: "/images/gallery-singing.jpg", label: "Singing Songs & Motions" },
  { src: "/images/gallery-bible.jpg", label: "Bible Story Classes" },
  { src: "/images/gallery-crafts.jpg", label: "Fun Crafts" },
  { src: "/images/gallery-snack.jpg", label: "Snack Time" },
];

export default function PublicHome() {
  return (
    <div id="home">
      <PublicNav />

      <section className="relative bg-brand-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-friends.jpg"
            alt="Two smiling kids at Haven Kids Club"
            fill
            priority
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-900/80 to-brand-900/95" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center text-center gap-6">
          <Image src="/logo.png" alt="Haven Kids Club" width={220} height={89} priority className="mb-2" />
          <h1 className="text-3xl sm:text-5xl font-bold max-w-3xl">
            Empowering Kids Through Fun Activities
          </h1>
          <p className="text-brand-100 text-lg max-w-xl">
            Join our vibrant community to inspire and engage children, ages 5-12, every Tuesday
            evening in Hillsboro.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="#register" className="btn-primary bg-gold-500 hover:bg-gold-600 text-brand-900 px-6 py-3 text-base">
              Register my Child
            </a>
            <Link href="/evenings" className="btn-secondary px-6 py-3 text-base">
              See a Typical Evening
            </Link>
          </div>
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
            A peek into what your child will experience every Tuesday evening at Haven Kids Club.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {galleryTiles.map((tile) => (
              <div key={tile.label} className="relative rounded-xl overflow-hidden shadow-sm border border-slate-200 aspect-square">
                <Image
                  src={tile.src}
                  alt={tile.label}
                  fill
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <span className="text-white text-sm font-medium">{tile.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16 grid gap-10 sm:grid-cols-2 items-center">
        <div>
          <h2 className="text-2xl font-bold text-brand-800 mb-4">Rides Available &mdash; Safely</h2>
          <p className="text-slate-600 mb-3">
            Getting to Kids Club shouldn&apos;t be the hard part. We offer transportation for
            families who need it &mdash; just let us know on the registration form.
          </p>
          <ul className="space-y-2 text-slate-600">
            <li className="flex gap-2">
              <span aria-hidden>🪪</span>
              <span>Every volunteer wears a name badge with our logo, so you always know who&apos;s caring for your child.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>🚐</span>
              <span>Our vans are marked with our logo on the side &mdash; a recognizable, trustworthy ride for your kids.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>👋</span>
              <span>Parents are always welcome to attend any Kids Club evening and see how your child is doing.</span>
            </li>
          </ul>
        </div>
        <div className="card bg-brand-50 border-brand-100">
          <h3 className="font-semibold text-brand-800 mb-2">Hosted By Two Local Churches</h3>
          <p className="text-slate-600 mb-2">
            Haven Kids Club is a joint ministry of:
          </p>
          <ul className="text-slate-700 font-medium space-y-1">
            <li>Osceola Christian Fellowship</li>
            <li>Hillsboro Christian Fellowship</li>
          </ul>
          <p className="text-slate-500 text-sm mt-3">
            Serving children ages 5-12 in the Hillsboro community.
          </p>
        </div>
      </section>

      <section className="bg-gold-50 border-y border-slate-200">
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
