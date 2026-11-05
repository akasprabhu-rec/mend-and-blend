// All website content lives here so components stay simple.

export const SITE = {
  name: "Mend and Blend",
  phoneDisplay: "98400 43145",
  phoneTel: "+919840043145",
  whatsappNumber: "919840043145",
  email: "mendandblendofficial@gmail.com",
  addressLines: [
    "01 Appu Street, 34",
    "Valluvar Kottam High Rd",
    "Nungambakkam, Chennai",
    "Tamil Nadu 600034",
  ],
  fullAddress:
    "01 Appu Street, 34, Valluvar Kottam High Rd, Nungambakkam, Chennai, Tamil Nadu 600034",
};
SITE.mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.fullAddress)}`;

export const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Workshops", href: "#workshops" },
  { label: "Founders", href: "#founders" },
  { label: "Contact", href: "#contact" },
];

export const FOUNDERS = [
  { name: "R Dhamyanthi", initials: "RD", tone: "bg-brand-blue text-white" },
  { name: "S Catherine Mercy", initials: "SC", tone: "bg-brand-blue text-white" },
];
export const FOUNDER_BIO_PLACEHOLDER = "Bio and photo to be added.";

export const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
