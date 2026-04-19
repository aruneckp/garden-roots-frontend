export const BOT_REPLIES = [
  { match: /deliver|shipping|ship|singapore/i, reply: "We deliver island-wide across Singapore! Free delivery on orders over $150. 🚚" },
  { match: /alphonso|hapus/i, reply: "Alphonso (Hapus) is the crown jewel of Indian mangoes 👑 — buttery, fiberless, saffron-hued flesh with an intoxicating aroma. Sourced from Ratnagiri, Maharashtra. $89/box. Season: Apr–Jun." },
  { match: /mallika/i, reply: "Mallika is a gorgeous hybrid variety from Andhra Pradesh — rich sweetness with citrusy undertones and silky, fiberless flesh. $72/box. Season: May–Jul. 🟡" },
  { match: /banganapalli|benishan/i, reply: "Banganapalli (Benishan) is a large, golden-yellow mango with firm, fiberless flesh and mild pleasant sweetness. A beloved classic from Andhra Pradesh. $70/box. Season: Apr–Jun. 🍋" },
  { match: /chandura/i, reply: "Chandura from Karnataka is wonderfully juicy and aromatic — balanced sweetness with a light tang and incredibly soft pulp. $68/box. Season: May–Jun. 🟢" },
  { match: /imam|himayat/i, reply: "Imam Pasand (Himayat) is royalty among mangoes 🔴 — an elegant, delicate variety from Telangana with melting texture and rich, nuanced sweetness. $50/box. Season: May–Jun." },
  { match: /price|cost|how much|cheapest|expensive/i, reply: "Our varieties range from $32 to $50 per box — all air-flown fresh from India! 🥭\n\n🥭 Alphonso — $32\n🍋 Banganapalli — $33\n🟡 Mallika — $38\n🔴 Imam Pasand — $50\n\nFree delivery on orders over $120!" },
  { match: /season|when|available|availability/i, reply: "Indian mango season runs Apr–Aug depending on variety:\n\n• Alphonso & Banganapalli: Apr–Jun\n• Mallika, Chandura & Imam Pasand: May–Jun\n• Mallika extends to Jul 🌟\n\nWe're now open for Season 2026!" },
  { match: /pickup|collect|collection|location|store/i, reply: "We have 6 pickup points across Singapore — Jurong East, Tampines, Orchard, Ang Mo Kio, Bishan, and Woodlands! Click 'Pickup Locations' in the menu to find your nearest one. 📍" },
  { match: /organic|natural|pesticide|chemical/i, reply: "All our mangoes are naturally grown using traditional orchard practices in India. We work directly with farmers we've known for decades and prioritise quality and purity. 🌱" },
  { match: /contact|phone|call|email|reach/i, reply: "You can reach us at:\n📞 +65 8160 1289\n💬 WhatsApp: wa.me/6581601289\n✉️ info@gardenroots.com.sg\n🕐 Mon–Sat, 9am–6pm SGT\n\nOr click 'Contact Us' in the menu!" },
  { match: /product|aamras|pickle|amchur|dried|powder/i, reply: "Beyond fresh mangoes, we also offer a curated range of mango products — aamras, mango pickles, amchur (mango powder), and dried mango. Ask us for availability! 🛍️" },
  { match: /order|buy|purchase|cart|add/i, reply: "To order, simply browse our varieties on the home page and click '+ Add' to add a box to your cart. Select your region at the top and we'll confirm delivery availability! 🛒" },
  { match: /fresh|ripe|quality/i, reply: "Every mango is hand-selected and air-flown at peak ripeness directly from trusted Indian orchards. We've been doing this since 2019 — quality is everything to us. ✅" },
  { match: /story|about|founded|started|history/i, reply: "Garden Roots was born from a childhood love of mangoes! 🥭 We grew up around orchards in India, knowing every variety intimately. When we moved to Singapore in 2019, we couldn't find authentic Indian mangoes — so we brought them ourselves. Click 'About Us' to read our full story!" },
  { match: /whatsapp|wa|chat|message/i, reply: "You can reach us instantly on WhatsApp at +65 8160 1289 — we typically respond within a few minutes during business hours (Mon–Sat, 9am–6pm SGT). 💬" },
  { match: /hi|hello|hey|hii|howdy/i, reply: "Hello! 👋 Welcome to Garden Roots! I'm here to help you with anything — mango varieties, pricing, delivery, orders, or anything else. What can I help you with today?" },
  { match: /thank|thanks|thx/i, reply: "You're so welcome! 🥭 If you have any more questions, I'm right here. Enjoy your mangoes!" },
];

export const QUICK_REPLIES = ["Order Mangoes", "Varieties & Prices", "My Cart", "Checkout", "Delivery Info"];

export function getBotReply(text) {
  for (const { match, reply } of BOT_REPLIES) {
    if (match.test(text)) return reply;
  }
  return "Great question! 🥭 For the most accurate answer, feel free to reach us at info@gardenroots.com.sg or call +65 8160 1289 (Mon–Sat, 9am–6pm SGT). We're happy to help!";
}
