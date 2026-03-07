export const VEHICLE_TYPES = [
  {
    id: 1,
    name: 'Auto Rickshaw',
    emoji: '🚗',
    capacity: '500 kg',
    maxVolume: '1.5 cbm',
    basePrice: 50,
    perKmPrice: 8,
    description: 'Perfect for small parcels and documents',
    availability: 'High',
    icon: '🚙',
  },
  {
    id: 2,
    name: 'Mini Truck',
    emoji: '🚛',
    capacity: '1500 kg',
    maxVolume: '8 cbm',
    basePrice: 150,
    perKmPrice: 12,
    description: 'Ideal for small business shipments',
    availability: 'High',
    icon: '🚛',
  },
  {
    id: 3,
    name: 'Full Truck',
    emoji: '🚚',
    capacity: '5000 kg',
    maxVolume: '25 cbm',
    basePrice: 300,
    perKmPrice: 20,
    description: 'Best for bulk orders and heavy cargo',
    availability: 'Medium',
    icon: '🚚',
  },
  {
    id: 4,
    name: 'Tempo',
    emoji: '🚒',
    capacity: '800 kg',
    maxVolume: '4 cbm',
    basePrice: 80,
    perKmPrice: 10,
    description: 'Good for medium-sized packages',
    availability: 'High',
    icon: '🚐',
  },
];

export const PRICING_MATRIX = {
  1: { baseFare: 50, perKm: 8 }, // Auto
  2: { baseFare: 150, perKm: 12 }, // Mini
  3: { baseFare: 300, perKm: 20 }, // Full Truck
  4: { baseFare: 80, perKm: 10 }, // Tempo
};

export const SURCHARGE = {
  night: 25, // 10 PM to 6 AM
  peak: 20, // 9-10 AM, 5-7 PM
  expressDelivery: 50, // Same day delivery
};
