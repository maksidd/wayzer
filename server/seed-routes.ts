
import { db } from "./db";
import { routes } from "@shared/schema";
import { RouteTypes, PurposeTypes } from "@shared/schema";

const cities = [
  { name: "Moscow", lat: "55.7558", lng: "37.6173" },
  { name: "Saint Petersburg", lat: "59.9343", lng: "30.3351" },
  { name: "Novosibirsk", lat: "55.0084", lng: "82.9357" },
  { name: "Yekaterinburg", lat: "56.8389", lng: "60.6057" },
  { name: "Kazan", lat: "55.7887", lng: "49.1221" },
  { name: "Nizhny Novgorod", lat: "56.2965", lng: "43.9361" },
  { name: "Sochi", lat: "43.6028", lng: "39.7342" },
  { name: "Kaliningrad", lat: "54.7065", lng: "20.5109" },
  { name: "Vladivostok", lat: "43.1332", lng: "131.9113" },
  { name: "Murmansk", lat: "68.9585", lng: "33.0827" }
];

const routeTypes = Object.values(RouteTypes);
const purposeTypes = Object.values(PurposeTypes);

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate() {
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 3);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedRoutes() {
  const sampleRoutes = Array.from({ length: 30 }, () => {
    const startCity = getRandomElement(cities);
    const endCity = getRandomElement(cities.filter(c => c !== startCity));
    
    return {
      userId: Math.floor(Math.random() * 5) + 1, // Assuming we have users with IDs 1-5
      title: `Trip from ${startCity.name} to ${endCity.name}`,
      description: `Exciting journey between ${startCity.name} and ${endCity.name}. Join for an amazing adventure!`,
      routeType: getRandomElement(routeTypes),
      startPoint: startCity.name,
      endPoint: endCity.name,
      startLat: startCity.lat,
      startLng: startCity.lng,
      endLat: endCity.lat,
      endLng: endCity.lng,
      date: getRandomDate(),
      maxParticipants: Math.floor(Math.random() * 4) + 2,
      purpose: getRandomElement(purposeTypes),
      imageUrl: `https://picsum.photos/seed/${Math.random()}/400/300`
    };
  });

  try {
    await db.insert(routes).values(sampleRoutes);
    console.log("Successfully seeded 30 routes");
  } catch (error) {
    console.error("Error seeding routes:", error);
  }
}

seedRoutes().finally(() => process.exit());
