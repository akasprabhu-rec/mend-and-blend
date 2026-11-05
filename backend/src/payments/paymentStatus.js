export function canMarkPaymentAuthorized(status) {
  return status === "created" || status === "authorized";
}

export function canIssueTicket(paymentStatus, verifiedCapture) {
  return paymentStatus === "captured" && verifiedCapture === true;
}
