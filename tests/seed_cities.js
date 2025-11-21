import "dotenv/config";
import pg from "pg";

const cities = [
  { id: 210, name: "New York City", priority: 100 },
  { id: 211, name: "Los Angeles", priority: 95 },
  { id: 212, name: "Chicago", priority: 90 },
  { id: 213, name: "Houston", priority: 85 },
  { id: 214, name: "Phoenix", priority: 80 },
  { id: 215, name: "Philadelphia", priority: 75 },
  { id: 216, name: "San Antonio", priority: 70 },
  { id: 217, name: "San Diego", priority: 65 },
  { id: 218, name: "Dallas", priority: 60 },
  { id: 219, name: "San Jose", priority: 55 },
  { id: 220, name: "Austin", priority: 52 },
  { id: 221, name: "Jacksonville", priority: 50 },
  { id: 222, name: "Fort Worth", priority: 48 },
  { id: 223, name: "Columbus", priority: 46 },
  { id: 224, name: "Indianapolis", priority: 44 },
  { id: 225, name: "Charlotte", priority: 42 },
  { id: 226, name: "San Francisco", priority: 40 },
  { id: 227, name: "Seattle", priority: 38 },
  { id: 228, name: "Denver", priority: 36 },
  { id: 229, name: "Washington", priority: 34 },
  { id: 230, name: "Boston", priority: 32 },
  { id: 231, name: "Nashville", priority: 30 },
  { id: 232, name: "Detroit", priority: 28 },
  { id: 233, name: "Oklahoma City", priority: 26 },
  { id: 234, name: "Portland", priority: 24 },
  { id: 235, name: "Las Vegas", priority: 22 },
  { id: 236, name: "Memphis", priority: 20 },
  { id: 237, name: "Louisville", priority: 19 },
  { id: 238, name: "Baltimore", priority: 18 },
  { id: 239, name: "Milwaukee", priority: 17 },
  { id: 240, name: "Albuquerque", priority: 16 },
  { id: 241, name: "Tucson", priority: 15 },
  { id: 242, name: "Fresno", priority: 14 },
  { id: 243, name: "Mesa", priority: 13 },
  { id: 244, name: "Sacramento", priority: 12 },
  { id: 245, name: "Kansas City", priority: 12 },
  { id: 246, name: "Colorado Springs", priority: 11 },
  { id: 247, name: "Miami", priority: 11 },
  { id: 248, name: "Raleigh", priority: 10 },
  { id: 249, name: "Omaha", priority: 10 },
  { id: 250, name: "Long Beach", priority: 9 },
  { id: 251, name: "Virginia Beach", priority: 9 },
  { id: 252, name: "Oakland", priority: 8 },
  { id: 253, name: "Minneapolis", priority: 8 },
  { id: 254, name: "New Orleans", priority: 7 },
  { id: 255, name: "Arlington", priority: 7 },
  { id: 256, name: "Tampa", priority: 6 },
  { id: 257, name: "Cleveland", priority: 6 },
  { id: 258, name: "Wichita", priority: 5 },
  { id: 259, name: "Bakersfield", priority: 5 },
];

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not defined");
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString });

const seedCities = async () => {
  const client = await pool.connect();
  const maxCityId = Math.max(...cities.map((city) => city.id));

  try {
    await client.query("begin");
    await client.query("truncate table public.cities restart identity cascade");

    for (const city of cities) {
      await client.query(
        `
          insert into public.cities (id, name, priority)
          values ($1, $2, $3)
          on conflict (id) do update
          set name = excluded.name, priority = excluded.priority;
        `,
        [city.id, city.name, city.priority],
      );
    }

    await client.query(
      "select setval('public.cities_id_seq', $1, true);",
      [maxCityId],
    );

    await client.query("commit");
    console.log(`Inserted ${cities.length} cities`);
  } catch (error) {
    await client.query("rollback");
    console.error("Failed to seed cities:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

seedCities();

