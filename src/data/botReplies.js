export const QUICK_ACTIONS = [
  { label: '🚛 Book Lorry', trigger: 'book a lorry' },
  { label: '💰 Pricing', trigger: 'pricing info' },
  { label: '📋 My Bookings', trigger: 'my bookings' },
  { label: '🗺️ Track', trigger: 'track my delivery' },
  { label: '🏙️ Cities', trigger: 'which cities are covered' },
  { label: '🆘 Help', trigger: 'contact support' },
];

export const BOT_REPLIES = [
  {
    match: /book|order|need.*lorry|need.*truck|need.*transport/i,
    reply: "I can help you book a lorry! 🚛 Tell me:\n1. Your pickup location\n2. Your dropoff location\n3. What type of vehicle you need (Auto, Mini Truck, or Full Truck)\n\nI'll show you available options and pricing!",
  },
  {
    match: /price|cost|how much|fare|charges|pricing/i,
    reply: "Our pricing depends on distance and vehicle type:\n\n🚗 Auto: ₹5 base + ₹0.50/km (up to 500kg)\n🚛 Mini: ₹12 base + ₹0.80/km (up to 1500kg)\n🚚 Truck: ₹25 base + ₹1.20/km (up to 5000kg)\n\nUse 'Get Fare' to see exact cost for your route!",
  },
  {
    match: /track|where.*driver|where.*truck|location|live.*tracking/i,
    reply: "I can show you live tracking! 🗺️ Go to 'My Bookings' and click 'Track' on an active booking. You'll see the driver's live location on a map with real-time ETA.",
  },
  {
    match: /payment|pay|card|upi|razorpay|wallet|netbanking/i,
    reply: "We accept multiple payment methods:\n💳 Credit/Debit Cards\n📱 UPI\n🏦 Net Banking\n💰 Digital Wallets\n\nPayment is secured via Razorpay. You'll enter details during checkout.",
  },
  {
    match: /pickup|dropoff|location|address|where|city|delhi|mumbai|bangalore|pune|hyderabad|bangalore/i,
    reply: "We operate across all major Indian cities! Use the location search to select your pickup and dropoff points. For busy areas, we have multiple pickup zones.",
  },
  {
    match: /driver|captain|contact.*driver|reach.*driver|driver.*details/i,
    reply: "Once a driver accepts your booking, you'll see their profile with:\n✓ Name & photo\n✓ Rating & reviews\n✓ Phone number\n✓ Vehicle details\n\nYou can call, message, or track them in real-time!",
  },
  {
    match: /how|how.*work|process|steps|guide|tutorial/i,
    reply: "Booking is simple:\n1️⃣ Enter pickup & dropoff locations\n2️⃣ Select vehicle type\n3️⃣ Get fare estimate\n4️⃣ Make payment\n5️⃣ Driver accepts & arrives\n6️⃣ Track live until delivery\n7️⃣ Rate the driver\n\nDone! ✓",
  },
  {
    match: /cancel|reschedule|change.*booking|modify|delete|refund/i,
    reply: "You can cancel bookings before the driver arrives. Cancellation policy:\n✓ Free cancellation within 5 mins\n✓ 50% refund 5-30 mins after booking\n✓ No refund after driver starts moving\n\nGo to 'My Bookings' → select booking → cancel.",
  },
  {
    match: /heavy|weight|size|dimension|cubic|capacity|fit|load|cargo/i,
    reply: "Our vehicle capacities:\n🚗 Auto: 500kg max\n🚛 Mini Truck: 1500kg max\n🚚 Full Truck: 5000kg max\n\nTell me your weight/size during booking, we'll suggest the right vehicle!",
  },
  {
    match: /safety|secure|protection|insurance|damage/i,
    reply: "Your shipment is protected! 🛡️\n✓ Trained & verified drivers\n✓ Vehicle tracking 24/7\n✓ Insurance coverage up to ₹50,000\n✓ Real-time alerts\n✓ Customer support always available\n\nYour cargo is in safe hands!",
  },
  {
    match: /rating|review|feedback|experience|complaint|issue|problem/i,
    reply: "We'd love your feedback! 📝 After each delivery, you can:\n⭐ Rate the driver (1-5 stars)\n💬 Write a detailed review\n📞 Report any issues\n\nYour feedback helps us improve service quality!",
  },
  {
    match: /contact|support|help|customer service|call|email|reach us/i,
    reply: "We're here to help! 24/7 Support:\n📞 Phone: +91-XXXX-YYYY-ZZZ\n💬 WhatsApp: +91-XXXX-YYYY-ZZZ\n📧 Email: support@lorryhubl.com\n🕐 Chat support: Available in-app\n\nWe respond within 5 minutes!",
  },
  {
    match: /urgent|emergency|asap|now|immediately|rush/i,
    reply: "Need urgent pickup? 🚨 We have rush booking options available! Our system prioritizes nearby drivers for faster pickup. Expect arrival in 15-30 minutes depending on your location.",
  },
  {
    match: /driver.*signup|become.*driver|join.*us|driving.*job|work.*us/i,
    reply: "Want to earn with us? 💼 Become a LorryHub driver and earn ₹50,000-100,000+ monthly!\n\nRequirements:\n✓ Valid Driving License (2+ years)\n✓ Own vehicle\n✓ 18+ years age\n✓ Clean record\n\nApply now via 'Driver Signup'!",
  },
  {
    match: /subscription|subscription|membership|plan|package|monthly|yearly/i,
    reply: "LorryHub is completely pay-per-trip! No subscription needed. You pay only for bookings you make. Frequent users get loyalty rewards and discounts! 💰",
  },
  {
    match: /hi|hello|hey|hii|howdy|good morning|good afternoon|good evening|greetings/i,
    reply: "Hello! 👋 Welcome to LorryHub! I'm your booking assistant. How can I help you today?\n\nYou can:\n🚛 Book a lorry\n📍 Track deliveries\n💰 Check pricing\n🆘 Get help",
  },
  {
    match: /thank|thanks|thx|appreciate|grateful|great|awesome|perfect|wonderful/i,
    reply: "You're welcome! 😊 Happy to help! If you need anything else, just ask. Safe travels! 🚛",
  },
  {
    match: /bye|goodbye|exit|quit|close|end|thanks/i,
    reply: "Take care! 👋 Feel free to reach out anytime. Happy shipping! 🚛💨",
  },
  {
    match: /.\w*/,
    reply: "Great question! 🤔 For detailed assistance, feel free to:\n📞 Call us: +91-XXXX-YYYY-ZZZ\n💬 WhatsApp: +91-XXXX-YYYY-ZZZ\n📧 Email: support@lorryhubl.com\n\nOur team is here to help!",
  },
];

export const QUICK_REPLIES = [
  'Book a Lorry',
  'View My Bookings',
  'Track Delivery',
  'Pricing Info',
  'Get Help',
];

export function getBotReply(text, context = {}) {
  const { user, bookings = [] } = context;
  const activeBookings = bookings.filter((b) =>
    ['pending', 'confirmed', 'in-transit'].includes(b.status)
  );

  // Greeting
  if (/^(hi|hello|hey|hii|good\s*(morning|afternoon|evening)|greetings)/i.test(text)) {
    const name = user?.name?.split(' ')[0] || 'there';
    return {
      text: `Hello ${name}! 👋 I'm LorryBot, your booking assistant.\n\nHow can I help you today?`,
      actions: [
        { label: '🚛 Book a Lorry', page: 'booking' },
        { label: '💰 Pricing', trigger: 'pricing info' },
        { label: '📋 My Bookings', page: 'myBookings' },
        { label: '🆘 Help', trigger: 'contact support' },
      ],
    };
  }

  // My bookings
  if (/my booking|my order|my shipment|view booking/i.test(text)) {
    if (!user) {
      return {
        text: 'Please login first to view your bookings.',
        actions: [{ label: '🔑 Login', page: 'login' }],
      };
    }
    if (bookings.length === 0) {
      return {
        text: `You have no bookings yet, ${user.name.split(' ')[0]}! Ready to ship something?`,
        actions: [{ label: '🚛 Book Now', page: 'booking' }],
      };
    }
    const activeList =
      activeBookings.length > 0
        ? '\n\nActive:\n' +
          activeBookings.map((b) => `• ${b.id}: ${b.from} → ${b.to} — ₹${b.fare}`).join('\n')
        : '';
    return {
      text: `You have ${bookings.length} booking(s) total.${activeList}`,
      actions: [
        { label: '📋 View All Bookings', page: 'myBookings' },
        ...(activeBookings.length > 0 ? [{ label: '🗺️ Track Active', page: 'myBookings' }] : []),
        { label: '+ New Booking', page: 'booking' },
      ],
    };
  }

  // Book
  if (/book|order|need.*lorry|need.*truck|transport|send.*package|ship/i.test(text)) {
    return {
      text: "Let's get your shipment moving! 🚛\n\n1️⃣ Enter pickup & dropoff city\n2️⃣ Select vehicle type\n3️⃣ Choose date & time\n4️⃣ Pay & confirm\n\nAverage booking time: 2 minutes!",
      actions: [
        { label: '🚛 Book Now', page: 'booking' },
        { label: '💰 See Pricing', trigger: 'pricing info' },
      ],
    };
  }

  // Pricing
  if (/price|cost|how much|fare|charges|pricing|rate/i.test(text)) {
    return {
      text: 'Transparent per-trip pricing:\n\n🚗 Auto Rickshaw — ₹50 + ₹8/km (up to 500kg)\n🚐 Tempo — ₹80 + ₹10/km (up to 800kg)\n🚛 Mini Truck — ₹150 + ₹12/km (up to 1500kg)\n🚚 Full Truck — ₹300 + ₹20/km (up to 5000kg)\n\nAll prices include driver & fuel. No hidden fees!',
      actions: [{ label: '🚛 Get Exact Quote', page: 'booking' }],
    };
  }

  // Track
  if (/track|where.*driver|where.*truck|live.*track/i.test(text)) {
    if (activeBookings.length > 0) {
      return {
        text: `You have ${activeBookings.length} active booking(s):\n\n${activeBookings.map((b) => `• ${b.id}: ${b.from} → ${b.to} (${b.status})`).join('\n')}\n\nClick "Track" on any active booking for live location.`,
        actions: [{ label: '📋 My Bookings', page: 'myBookings' }],
      };
    }
    return {
      text: 'To track a delivery:\n1. Go to My Bookings\n2. Click "Track" on an active booking\n3. See live driver location on map\n\nTracking activates once a driver is assigned.',
      actions: [
        { label: '📋 My Bookings', page: 'myBookings' },
        { label: '🚛 Book Now', page: 'booking' },
      ],
    };
  }

  // Payment
  if (/pay|payment|card|upi|wallet|netbank|razorpay/i.test(text)) {
    return {
      text: 'Accepted payment methods:\n\n💳 Debit/Credit Cards (Visa, Mastercard, Rupay)\n📱 UPI (Google Pay, PhonePe, BHIM)\n🏦 Net Banking (all major Indian banks)\n💰 E-Wallets (Paytm, FreeCharge)\n\n100% secured payments.',
      actions: [],
    };
  }

  // Cancel / refund
  if (/cancel|refund|reschedule|modify/i.test(text)) {
    return {
      text: 'Cancellation policy:\n\n✅ Free within 5 mins of booking\n⚠️  50% refund: 5–30 mins after booking\n❌ No refund: after driver starts\n\nTo cancel → My Bookings → select booking → Cancel.',
      actions: [{ label: '📋 My Bookings', page: 'myBookings' }],
    };
  }

  // Vehicle capacity
  if (/vehicle|capacity|size|weight|heavy|cargo/i.test(text)) {
    return {
      text: 'Choose the right vehicle:\n\n🚗 Auto — up to 500 kg, 1.5 cbm\n🚐 Tempo — up to 800 kg, 4 cbm\n🚛 Mini Truck — up to 1500 kg, 8 cbm\n🚚 Full Truck — up to 5000 kg, 25 cbm',
      actions: [{ label: '🚛 Book & Select Vehicle', page: 'booking' }],
    };
  }

  // Cities
  if (/city|cities|cover|serve|area|delhi|mumbai|bangalore|chennai|hyderabad/i.test(text)) {
    return {
      text: 'We cover 20+ major Indian cities:\n\n🔵 North: Delhi, Gurgaon, Noida, Jaipur, Lucknow\n🟠 West: Mumbai, Pune, Ahmedabad, Surat\n🟢 South: Bangalore, Chennai, Hyderabad, Kochi\n🟡 East: Kolkata, Patna, Bhubaneswar\n\nMore cities coming soon!',
      actions: [{ label: '🚛 Book Between Cities', page: 'booking' }],
    };
  }

  // Safety
  if (/safe|secure|insur|protect|damage/i.test(text)) {
    return {
      text: 'Your shipment is protected! 🛡️\n\n✓ Verified & background-checked drivers\n✓ Real-time GPS tracking 24/7\n✓ Insurance coverage up to ₹50,000\n✓ Instant status alerts\n✓ 24/7 customer support',
      actions: [{ label: '🚛 Book Now', page: 'booking' }],
    };
  }

  // Help / support
  if (/help|support|contact|call|email|problem|issue/i.test(text)) {
    return {
      text: "We're here 24/7! 💬\n\n📞 Phone: +91-9000-100-200\n📧 Email: support@lorryhub.com\n💬 WhatsApp: +91-9000-100-200\n\nAverage response: under 5 minutes.",
      actions: [{ label: '🚛 Book a Lorry', page: 'booking' }],
    };
  }

  // Thanks
  if (/thank|thanks|great|awesome|perfect|wonderful/i.test(text)) {
    return {
      text: "You're welcome! 😊 Anything else I can help with?",
      actions: [
        { label: '🚛 Book a Lorry', page: 'booking' },
        { label: '📋 My Bookings', page: 'myBookings' },
      ],
    };
  }

  // Bye
  if (/bye|goodbye|exit|done/i.test(text)) {
    return { text: 'Take care! 👋 Happy shipping! 🚛💨', actions: [] };
  }

  // Default
  return {
    text: "I can help with:\n🚛 Booking a lorry\n💰 Pricing & routes\n📋 Your bookings\n🗺️ Live tracking\n🆘 Support\n\nWhat would you like to do?",
    actions: [
      { label: '🚛 Book a Lorry', page: 'booking' },
      { label: '💰 Pricing', trigger: 'pricing info' },
      { label: '🆘 Support', trigger: 'contact support' },
    ],
  };
}
