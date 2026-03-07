export const MAJOR_CITIES = [
  // North
  { id: 1, name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025, zone: 'NORTH' },
  { id: 2, name: 'Gurgaon', state: 'Haryana', lat: 28.4595, lng: 77.0266, zone: 'NORTH' },
  { id: 3, name: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.3910, zone: 'NORTH' },
  { id: 4, name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, zone: 'NORTH' },
  { id: 5, name: 'Chandigarh', state: 'Chandigarh', lat: 30.7333, lng: 76.7794, zone: 'NORTH' },
  { id: 6, name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, zone: 'NORTH' },

  // West
  { id: 7, name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, zone: 'WEST' },
  { id: 8, name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, zone: 'WEST' },
  { id: 9, name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, zone: 'WEST' },
  { id: 10, name: 'Surat', state: 'Gujarat', lat: 21.1458, lng: 72.8355, zone: 'WEST' },
  { id: 11, name: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022, zone: 'WEST' },

  // South
  { id: 12, name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946, zone: 'SOUTH' },
  { id: 13, name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, zone: 'SOUTH' },
  { id: 14, name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, zone: 'SOUTH' },
  { id: 15, name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0026, lng: 76.6755, zone: 'SOUTH' },
  { id: 16, name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, zone: 'SOUTH' },
  { id: 17, name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6869, lng: 83.2185, zone: 'SOUTH' },

  // East
  { id: 18, name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, zone: 'EAST' },
  { id: 19, name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245, zone: 'EAST' },
  { id: 20, name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, zone: 'EAST' },
];

export const POPULAR_ROUTES = [
  { id: 1, from: 'Delhi', to: 'Jaipur', distance: 268, duration: '4 hours' },
  { id: 2, from: 'Mumbai', to: 'Pune', distance: 149, duration: '2.5 hours' },
  { id: 3, from: 'Bangalore', to: 'Hyderabad', distance: 568, duration: '8 hours' },
  { id: 4, from: 'Delhi', to: 'Gurgaon', distance: 30, duration: '45 mins' },
  { id: 5, from: 'Mumbai', to: 'Ahmedabad', distance: 540, duration: '7.5 hours' },
  { id: 6, from: 'Bangalore', to: 'Chennai', distance: 348, duration: '5 hours' },
];

// Get random major cities for homepage showcase
export const getRandomCities = (count = 4) => {
  const shuffled = [...MAJOR_CITIES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
