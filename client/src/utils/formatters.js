import { getCurrency } from "./currencies.js";

export const formatCurrency = (value, currencyCode = "USD") => {
  const currency = getCurrency(currencyCode);

  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code
  }).format(value || 0);
};

export const formatDate = (value) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
};
