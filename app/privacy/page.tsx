import type { Metadata } from "next";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Privacy Policy | Haven Kids Club",
  description: "How Haven Kids Club collects, uses, and protects your family's information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div>
      <PublicNav />
      <section className="max-w-3xl mx-auto px-4 py-16 space-y-8 text-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-brand-800 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Effective August 2026</p>
        </div>

        <p>
          Haven Kids Club is a community program for children ages 5&ndash;12, hosted by Osceola
          Christian Fellowship and Hillsboro Christian Fellowship. This policy explains what
          information we collect when a family registers or participates, how we use it, and the
          choices you have.
        </p>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Information We Collect</h2>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Child&apos;s name, age, and allergy or medical information</li>
            <li>Parent/guardian name, email address, phone number, and home address</li>
            <li>Transportation and pickup needs</li>
            <li>Emergency contact information</li>
            <li>Check-in and check-out records, and van/route assignments, on event days</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">How We Use It</h2>
          <p>We use this information only to run Haven Kids Club, including to:</p>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Process registrations and plan classes and activities</li>
            <li>Arrange and run transportation/pickup routes for children who need a ride</li>
            <li>Check children in and out safely at each event</li>
            <li>Reach a parent/guardian quickly if there&apos;s a medical or safety concern</li>
            <li>Send event reminders and program updates by email or, if you opt in, by text message</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Text Messaging (SMS)</h2>
          <p>
            If you opt in on our registration form, we may text the phone number you provide with
            pickup route notifications, event reminders, and program updates. Message frequency
            varies. Message and data rates may apply. You can opt out at any time by replying{" "}
            <strong>STOP</strong>, or get help by replying <strong>HELP</strong>. SMS opt-in
            information is never shared with third parties or used for marketing unrelated to
            Haven Kids Club.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Sharing Information</h2>
          <p>
            We don&apos;t sell or rent your information. We share it only as needed to run the
            program &mdash; for example, a volunteer driver sees the pickup address and phone
            number for children on their route, and front-desk volunteers see the information
            needed to check a child in or out safely.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Children&apos;s Privacy</h2>
          <p>
            Information about a child is provided by their parent or guardian for the sole purpose
            of registering that child for Haven Kids Club and keeping them safe during events.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Your Choices</h2>
          <p>
            You can ask us to update or remove your family&apos;s information, or opt out of text
            messages at any time, by replying STOP to any text or contacting us below.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Contact Us</h2>
          <p>
            Questions about this policy or your information? Reach us at{" "}
            <a href="mailto:havenkidsclub@gmail.com" className="text-brand-600 hover:underline">
              havenkidsclub@gmail.com
            </a>{" "}
            or{" "}
            <a href="tel:12542216793" className="text-brand-600 hover:underline">
              (254) 221-6793
            </a>
            .
          </p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
