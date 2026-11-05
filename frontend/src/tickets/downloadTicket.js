const colors = {
  ivory: [248, 247, 245],
  blue: [64, 95, 128],
  muted: [64, 95, 128],
  valid: [55, 105, 76],
  invalid: [145, 75, 75],
};

function formatSessionDate(date) {
  if (!date) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T00:00:00+05:30`));
}

function safeFilename(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function downloadTicket(ticket, fallbackName) {
  if (typeof ticket.qrToken !== "string" || !ticket.qrToken) {
    throw new Error("The QR code for this ticket is not available yet.");
  }

  const [{ jsPDF }, { default: QRCode }] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
  ]);
  const qrDataUrl = await QRCode.toDataURL(ticket.qrToken, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 360,
    color: { dark: "#405F80", light: "#FFFFFF" },
  });
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });
  const pageWidth = 148;
  const pageHeight = 210;
  const valid = ticket.isValid === true && ticket.status === "valid";
  const customerName = ticket.customerName || fallbackName || "Guest";
  const workshopName = ticket.workshopName || "Workshop";
  const time = [ticket.start, ticket.end].filter(Boolean).join(" - ") || "Time to be confirmed";
  const venue = ticket.venue || "Venue details to be confirmed";

  pdf.setFillColor(...colors.ivory);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(8, 8, 132, 194, 5, 5, "F");
  pdf.setFillColor(...colors.blue);
  pdf.roundedRect(8, 8, 132, 43, 5, 5, "F");
  pdf.rect(8, 43, 132, 8, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("times", "bold");
  pdf.setFontSize(20);
  pdf.text("Mend and Blend", 16, 25);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(226, 218, 210);
  pdf.text("WORKSHOP ADMISSION", 16, 35);
  pdf.text("A space for self-discovery and connection", 16, 42);

  pdf.setFillColor(...(valid ? colors.valid : colors.invalid));
  pdf.roundedRect(100, 17, 31, 9, 4, 4, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text(valid ? "VALID" : "NOT VALID", 115.5, 22.8, { align: "center" });

  pdf.setTextColor(...colors.muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("TICKET HOLDER", 16, 65);
  pdf.setTextColor(...colors.blue);
  pdf.setFont("times", "bold");
  pdf.setFontSize(18);
  pdf.text(pdf.splitTextToSize(customerName, 116), 16, 74);

  pdf.setTextColor(...colors.muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("WORKSHOP", 16, 91);
  pdf.setTextColor(...colors.blue);
  pdf.setFont("times", "bold");
  pdf.setFontSize(15);
  pdf.text(pdf.splitTextToSize(workshopName, 116), 16, 99);

  pdf.setDrawColor(...colors.blue);
  pdf.setLineWidth(0.35);
  pdf.line(16, 106, 132, 106);
  pdf.setTextColor(...colors.muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("DATE AND TIME", 16, 115);
  pdf.setTextColor(...colors.blue);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(formatSessionDate(ticket.sessionDate), 16, 123);
  pdf.text(time, 16, 130);

  pdf.setTextColor(...colors.muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("VENUE", 16, 140);
  pdf.setTextColor(...colors.blue);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(pdf.splitTextToSize(venue, 116), 16, 147);

  pdf.setDrawColor(...colors.ivory);
  pdf.roundedRect(53, 161, 42, 42, 3, 3, "S");
  pdf.addImage(qrDataUrl, "PNG", 55, 163, 38, 38);
  pdf.setTextColor(...colors.muted);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.text("Present this QR code at the workshop", pageWidth / 2, 198, {
    align: "center",
  });

  pdf.save(`${safeFilename(workshopName) || "workshop"}-ticket.pdf`);
}
