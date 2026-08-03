import type { Metadata } from "next";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "About Us | Haven Kids Club",
  description: "Haven Kids Club leadership, staff requirements, and safety policies.",
};

const committee = [
  { name: "Daniel Strite", role: "Chairman", desc: "Provides oversight and leadership." },
  { name: "Eileen Longenecker", role: "Secretary", desc: "Maintains records and notes." },
  { name: "Rhonda Miller", role: "Committee Member", desc: "Supports the mission and assists in decision-making." },
  { name: "Nate Warner", role: "Committee Member", desc: "Supports the mission and assists in decision-making." },
  { name: "Jacob Peters", role: "Committee Member", desc: "Supports the mission and assists in decision-making." },
];

export default function AboutPage() {
  return (
    <div>
      <PublicNav />

      <section className="bg-gradient-to-br from-brand-700 to-brand-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">About Haven Kids Club</h1>
          <p className="text-brand-100 text-lg max-w-2xl mx-auto">
            A ministry for kids ages 5-12, focused on the Hillsboro community.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16 grid gap-8 sm:grid-cols-2">
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
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-brand-800 mb-3">Our Leadership</h2>
          <p className="text-slate-600 mb-8">
            Haven Kids Club operates as an Osceola Christian Fellowship (OCF) ministry, under the
            leadership of a five-member committee dedicated to upholding an Anabaptist worldview
            and ensuring all activities reflect Christ-centered values.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {committee.map((m) => (
              <div key={m.name} className="card">
                <p className="font-semibold text-brand-800">{m.name}</p>
                <p className="text-brand-600 text-sm font-medium mb-1">{m.role}</p>
                <p className="text-slate-600 text-sm">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-brand-800 mb-3">Staff Requirements</h2>
        <div className="card mb-6">
          <ul className="list-disc list-inside space-y-2 text-slate-600">
            <li>Must be a born-again Christian.</li>
            <li>Must be 15 years of age or older.</li>
            <li>Must be a member of Osceola Christian Fellowship (OCF) or Hillsboro Christian Fellowship (HCF).</li>
            <li>All new staff must attend orientation before teaching or assisting with a class.</li>
          </ul>
        </div>

        <h2 className="text-2xl font-bold text-brand-800 mb-3">Classroom Policy</h2>
        <div className="card mb-6">
          <p className="text-slate-600">
            A minimum of two staff members is recommended to be present in every classroom or
            teaching environment.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-brand-800 mb-3">Transportation Requirements</h2>
        <div className="card">
          <p className="text-slate-600">
            When transportation is provided, two or more adults 18 years or older are recommended
            to ride together in the same vehicle to ensure safety and accountability.
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
