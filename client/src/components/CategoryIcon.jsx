import React from "react";
import {
  Banknote,
  BriefcaseBusiness,
  Car,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Plane,
  Receipt,
  ShoppingBag,
  Smartphone,
  Utensils
} from "lucide-react";

const categoryIcons = [
  { keywords: ["food", "grocery", "restaurant", "coffee"], icon: Utensils },
  { keywords: ["rent", "home", "house"], icon: Home },
  { keywords: ["salary", "income", "bonus"], icon: Banknote },
  { keywords: ["bank", "interest"], icon: Landmark },
  { keywords: ["travel", "flight", "hotel"], icon: Plane },
  { keywords: ["fuel", "car", "transport", "taxi", "uber"], icon: Car },
  { keywords: ["shopping", "clothes"], icon: ShoppingBag },
  { keywords: ["health", "doctor", "medicine"], icon: HeartPulse },
  { keywords: ["education", "course", "book"], icon: GraduationCap },
  { keywords: ["movie", "entertainment", "netflix"], icon: Clapperboard },
  { keywords: ["phone", "internet", "subscription"], icon: Smartphone },
  { keywords: ["work", "business", "freelance"], icon: BriefcaseBusiness }
];

const getIcon = (category = "") => {
  const normalized = category.toLowerCase();
  const match = categoryIcons.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));
  return match?.icon || Receipt;
};

const CategoryIcon = ({ category, type }) => {
  const Icon = getIcon(category);

  return (
    <span className={`category-icon ${type || ""}`} aria-hidden="true">
      <Icon size={18} />
    </span>
  );
};

export default CategoryIcon;

