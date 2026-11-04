export function canMarkPaymentAuthorized(status) {
  return status === "created" || status === "authorized";
}
