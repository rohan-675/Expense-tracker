export const ALLOWED_CURRENCIES = [
  "USD",
  "INR",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "SGD",
  "AED",
  "SAR",
  "ZAR",
  "BRL",
  "MXN"
];

export const isAllowedCurrency = (currency) => {
  return ALLOWED_CURRENCIES.includes(String(currency || "").toUpperCase());
};

