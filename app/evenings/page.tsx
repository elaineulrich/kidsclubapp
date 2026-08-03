import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Kids Club Evenings | Haven Kids Club",
  description: "What a Tuesday evening at Haven Kids Club looks like: games, singing, Bible stories, crafts, and a snack.",
};

const flow = [
  {
    src: "/images/gallery-playing.jpg",
    title: "Group Games",
    text: "We kick off the evening with active, silly, laugh-out-loud group games that get everyone moving and making new friends fast.",
  },
  {
    src: "/images/gallery-singing.jpg",
    title: "Singing (With Motions!)",
    text: "Next up: songs! Lots of them come with hand motions, so even our newest kids can jump right in and sing along.",
  },
  {
    src: "/images/gallery-bible.jpg",
    title: "Bible Memory Verses & Bible Class",
    text: "We memorize a Bible verse together, then settle in for a Bible class full of engaging, descriptive stories that bring Scripture to life.",
  },
  {
    src: "/images/gallery-crafts.jpg",
    title: "Fun Crafts",
    text: "Kids get hands-on with a craft that ties back into the night's lesson — something to make, take home, and talk about.",
  },
  {
    src: "/images/gallery-snack.jpg",
    title: "Snack Time",
    text: "We wrap up every evening with a snack, a little downtime, and more good conversation before it's time to head home.",
  },
];

export default function EveningsPage() {
  return (
    <div>
      <PublicNav />

      <section className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">Tuesday Evenings Are the Best Night of the Week</h1>
          <p className="text-brand-100 text-lg max-w-2xl mx-auto">
            Haven Kids Club meets every Tuesday evening for kids ages 5-12 in the Hillsboro
            community &mdash; games, songs, Bible stories, crafts, and a snack, all packed into one
            fun-filled night.
          </p>
          <a href="/#register" className="btn-primary bg-gold-500 hover:bg-gold-600 text-brand-900 px-6 py-3 text-base inline-block mt-6">
            Enroll Your Kids Now
          </a>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-brand-800 mb-2">What A Typical Evening Looks Like</h2>
        <p className="text-center text-slate-500 mb-12 max-w-2xl mx-auto">
          Every Tuesday follows a fun, familiar rhythm your kids will look forward to all week.
        </p>
        <div className="space-y-10">
          {flow.map((step, i) => (
            <div
              key={step.title}
              className={`flex flex-col ${i % 2 === 1 ? "sm:flex-row-reverse" : "sm:flex-row"} gap-6 items-center`}
            >
              <div className="relative w-full sm:w-64 aspect-video rounded-xl overflow-hidden shadow-sm border border-slate-200 shrink-0">
                <Image src={step.src} alt={step.title} fill sizes="256px" className="object-cover" />
              </div>
              <div>
                <span className="text-brand-500 font-semibold text-sm">Step {i + 1}</span>
                <h3 className="text-xl font-semibold text-brand-800 mb-1">{step.title}</h3>
                <p className="text-slate-600">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-16 grid gap-10 sm:grid-cols-2 items-center">
          <div>
            <h2 className="text-2xl font-bold text-brand-800 mb-4">A Safe, Trustworthy Ride</h2>
            <p className="text-slate-600 mb-3">
              Don&apos;t let transportation stop you from joining us &mdash; we offer rides for kids
              who need them.
            </p>
            <ul className="space-y-2 text-slate-600">
              <li className="flex gap-2">
                <span aria-hidden>🪪</span>
                <span>Every volunteer wears a name badge with our logo so you always know who&apos;s caring for your child.</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden>🚐</span>
                <span>Our vans display our logo on the side &mdash; an easy-to-recognize, trustworthy ride.</span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden>👋</span>
                <span>Parents are always welcome to attend any Kids Club evening and see firsthand how your child is doing.</span>
              </li>
            </ul>
          </div>
          <div className="card bg-brand-50 border-brand-100">
            <h3 className="font-semibold text-brand-800 mb-2">The Details</h3>
            <ul className="text-slate-600 space-y-1">
              <li><strong>When:</strong> Tuesday evenings</li>
              <li><strong>Who:</strong> Kids ages 5-12</li>
              <li><strong>Where:</strong> Hillsboro community</li>
              <li><strong>Hosted by:</strong> Osceola Christian Fellowship &amp; Hillsboro Christian Fellowship</li>
            </ul>
            <a href="/#register" className="btn-primary w-full mt-4">Register My Child</a>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-brand-800 mb-3">Want to know more about who we are?</h2>
        <p className="text-slate-600 mb-6">
          Learn about our leadership, our staff requirements, and the values that shape every
          Kids Club evening.
        </p>
        <Link href="/about" className="btn-secondary px-6 py-3 text-base inline-block">
          About Haven Kids Club
        </Link>
      </section>

      <PublicFooter />
    </div>
  );
}
