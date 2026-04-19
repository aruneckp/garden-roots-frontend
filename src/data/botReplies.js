const STATIC_REPLIES = [
  { match: /deliver|shipping|ship|singapore/i, reply: "We deliver island-wide across Singapore! Free delivery on orders over $150. 🚚" },
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

const VARIETY_INFO = [
  { pattern: /alphonso|hapus/i, name: 'Alphonso', desc: "Alphonso (Hapus) is the crown jewel of Indian mangoes 👑 — buttery, fiberless, saffron-hued flesh with an intoxicating aroma. Sourced from Ratnagiri, Maharashtra. Season: Apr–Jun." },
  { pattern: /mallika/i, name: 'Mallika', desc: "Mallika is a gorgeous hybrid variety from Andhra Pradesh — rich sweetness with citrusy undertones and silky, fiberless flesh. Season: May–Jul. 🟡" },
  { pattern: /banganapalli|benishan/i, name: 'Banganapalli', desc: "Banganapalli (Benishan) is a large, golden-yellow mango with firm, fiberless flesh and mild pleasant sweetness. A beloved classic from Andhra Pradesh. Season: Apr–Jun. 🍋" },
  { pattern: /chandura/i, name: 'Chandura', desc: "Chandura from Karnataka is wonderfully juicy and aromatic — balanced sweetness with a light tang and incredibly soft pulp. Season: May–Jun. 🟢" },
  { pattern: /imam|himayat/i, name: 'Imam Pasand', desc: "Imam Pasand (Himayat) is royalty among mangoes 🔴 — an elegant, delicate variety from Telangana with melting texture and rich, nuanced sweetness. Season: May–Jun." },
];

export const QUICK_REPLIES = ["Order Mangoes", "Varieties & Prices", "My Cart", "Checkout", "Delivery Info"];

export function getBotReply(text, products = []) {
  const getPrice = (name) => {
    const p = products.find(p => p.name.toLowerCase() === name.toLowerCase());
    return p?.price ?? null;
  };

  // Price / cost query — fully dynamic from DB prices
  if (/price|cost|how much|cheapest|expensive/i.test(text)) {
    if (products.length > 0) {
      const active = products.filter(p => p.is_active !== 0 && p.price);
      const lines = active.map(p => `${p.emoji || '🥭'} ${p.name} — ${p.price}`).join('\n');
      const nums = active.map(p => parseFloat(p.price.replace('$', ''))).filter(n => !isNaN(n));
      const range = nums.length ? `$${Math.min(...nums)} to $${Math.max(...nums)}` : '';
      return `Our varieties range from ${range} per box — all air-flown fresh from India! 🥭\n\n${lines}\n\nFree delivery on orders over $120!`;
    }
    return "Our varieties are priced competitively — please check the home page or reach us at info@gardenroots.com.sg for the latest prices! 🥭";
  }

  // Individual variety queries — append live price from DB
  for (const { pattern, name, desc } of VARIETY_INFO) {
    if (pattern.test(text)) {
      const price = getPrice(name);
      return price ? `${desc} ${price}/box.` : desc;
    }
  }

  // Static replies with no price data
  for (const { match, reply } of STATIC_REPLIES) {
    if (match.test(text)) return reply;
  }

  return "Great question! 🥭 For the most accurate answer, feel free to reach us at info@gardenroots.com.sg or call +65 8160 1289 (Mon–Sat, 9am–6pm SGT). We're happy to help!";
}
