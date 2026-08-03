import type { Metadata } from "next";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Photo Credits | Haven Kids Club",
  description: "Attribution for photos used on the Haven Kids Club website.",
};

const credits = [
  {
    file: "hero-friends.jpg",
    title: "Twin Besties",
    creator: "donnierayjones",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source: "https://www.flickr.com/photos/11946169@N00/23840881045",
  },
  {
    file: "gallery-playing.jpg",
    title: "DUCK --duck ---GOOSE",
    creator: "jeri leandera",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source: "https://www.flickr.com/photos/89335700@N00/404789013",
  },
  {
    file: "gallery-singing.jpg",
    title: "ELC Church Children's Choir",
    creator: "hoyasmeg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source: "https://www.flickr.com/photos/62126383@N00/507873162",
  },
  {
    file: "gallery-bible.jpg",
    title: "Bongo in Class",
    creator: "hoyasmeg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source: "https://www.flickr.com/photos/62126383@N00/3074591253",
  },
  {
    file: "gallery-crafts.jpg",
    title: "Budding Artists Create Holiday Masterpieces",
    creator: "USAG-Humphreys",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    source: "https://www.flickr.com/photos/31687107@N07/3088373602",
  },
  {
    file: "gallery-snack.jpg",
    title: "Family Style Meal Service With Children in the CACFP",
    creator: "USDA Food and Nutrition Service",
    license: "Public Domain",
    licenseUrl: "https://en.wikipedia.org/wiki/Public_domain",
    source: "https://commons.wikimedia.org/wiki/File:Family_Style_Meal_Service_With_Children_in_the_CACFP_(20221214-USDA-FNS-UNK-023).jpg",
  },
];

export default function CreditsPage() {
  return (
    <div>
      <PublicNav />
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-brand-800 mb-2">Photo Credits</h1>
        <p className="text-slate-600 mb-8">
          Photos on this website are used under Creative Commons and public domain licenses.
          Thank you to these photographers and agencies.
        </p>
        <ul className="space-y-4">
          {credits.map((c) => (
            <li key={c.file} className="card">
              <p className="font-medium text-slate-800">&ldquo;{c.title}&rdquo;</p>
              <p className="text-sm text-slate-600">
                by {c.creator}, licensed under{" "}
                <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                  {c.license}
                </a>
              </p>
              <a href={c.source} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">
                Source
              </a>
            </li>
          ))}
        </ul>
      </section>
      <PublicFooter />
    </div>
  );
}
