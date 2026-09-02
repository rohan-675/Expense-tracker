export const currencies = [
  { code: "USD", name: "United States Dollar", locale: "en-US" },
  { code: "INR", name: "Indian Rupee", locale: "en-IN" },
  { code: "EUR", name: "Euro", locale: "de-DE" },
  { code: "GBP", name: "British Pound", locale: "en-GB" },
  { code: "JPY", name: "Japanese Yen", locale: "ja-JP" },
  { code: "AUD", name: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", name: "Canadian Dollar", locale: "en-CA" },
  { code: "SGD", name: "Singapore Dollar", locale: "en-SG" },
  { code: "AED", name: "UAE Dirham", locale: "ar-AE" },
  { code: "SAR", name: "Saudi Riyal", locale: "ar-SA" },
  { code: "ZAR", name: "South African Rand", locale: "en-ZA" },
  { code: "BRL", name: "Brazilian Real", locale: "pt-BR" },
  { code: "MXN", name: "Mexican Peso", locale: "es-MX" }
];

export const getCurrency = (currencyCode = "USD") => {
  return currencies.find((currency) => currency.code === currencyCode) || currencies[0];
};

