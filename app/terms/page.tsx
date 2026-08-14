import type { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Terms of Service | Haven Kids Club",
  description: "Terms of service and SMS text messaging terms for Haven Kids Club.",
};

export default function TermsPage() {
  return (
    <div>
      <PublicNav />
      <section className="max-w-3xl mx-auto px-4 py-16 space-y-8 text-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-brand-800 mb-2">Terms of Service</h1>
          <p className="text-sm text-slate-500">Effective August 2026</p>
        </div>

        <p>
          These terms cover registering for and participating in Haven Kids Club, a community
          program for children ages 5&ndash;12 hosted by Osceola Christian Fellowship and
          Hillsboro Christian Fellowship in Hillsboro. By registering a child or volunteering with
          us, you agree to these terms.
        </p>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Registration &amp; Participation</h2>
          <p>
            Registration information should be accurate and kept up to date, especially allergy,
            medical, and emergency contact details. See our{" "}
            <Link href="/about" className="text-brand-600 hover:underline">
              About &amp; Staff Requirements
            </Link>{" "}
            page for our classroom and transportation policies.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Text Messaging (SMS) Terms</h2>
          <p>
            If you check the SMS opt-in box on our registration form (or otherwise give us
            written consent), you agree to receive recurring text messages from Haven Kids Club
            about:
          </p>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Pickup and drop-off route notifications</li>
            <li>Event reminders</li>
            <li>Program updates</li>
          </ul>
          <ul className="list-disc list-inside space-y-1.5">
            <li>Message frequency varies based on program activity.</li>
            <li>Message and data rates may apply.</li>
            <li>
              Reply <strong>STOP</strong> at any time to opt out, or <strong>HELP</strong> for
              help. You can also opt out by contacting us at{" "}
              <a href="mailto:havenkidsclub@gmail.com" className="text-brand-600 hover:underline">
                havenkidsclub@gmail.com
              </a>{" "}
              or{" "}
              <a href="tel:12542216793" className="text-brand-600 hover:underline">
                (254) 221-6793
              </a>
              .
            </li>
            <li>Carriers are not liable for delayed or undelivered messages.</li>
            <li>Consent to receive text messages is not required to participate in Haven Kids Club.</li>
          </ul>
          <p>
            Volunteer drivers who provide a phone number likewise agree to receive route-related
            text messages as part of volunteering, on the same terms above.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Changes to These Terms</h2>
          <p>
            We may update these terms from time to time; the &ldquo;Effective&rdquo; date above
            reflects the latest version.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Contact Us</h2>
          <p>
            Questions about these terms? Reach us at{" "}
            <a href="mailto:havenkidsclub@gmail.com" className="text-brand-600 hover:underline">
              havenkidsclub@gmail.com
            </a>{" "}
            or{" "}
            <a href="tel:12542216793" className="text-brand-600 hover:underline">
              (254) 221-6793
            </a>
            . See also our{" "}
            <Link href="/privacy" className="text-brand-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
