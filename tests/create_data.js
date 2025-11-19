import http from 'http';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5000';
const USERS_COUNT = 10;
const TRIPS_PER_USER = 20;

  let testsPassed = 0;
  let testsTotal = 0;

function logOk(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }
function logFail(msg) { console.log(`\x1b[31m✗\x1b[0m ${msg}`); }

  async function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
      path,
      method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };
      const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: body });
          }
        });
      });
      req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

async function getCities() {
  const res = await fetch(`${BASE_URL}/api/cities?limit=50`);
  const cities = await res.json();
  return cities.filter(c => c.priority >= 10);
}

async function getTripTypes() {
  const res = await fetch(`${BASE_URL}/api/trip-types`);
  return await res.json();
}

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomString(len = 8) {
  return Math.random().toString(36).slice(2, 2 + len);
}
function randomCoords(city) {
  // +-0.05 degrees from the city center
  return {
    lat: city.lat + (Math.random() - 0.5) * 0.1,
    lng: city.lng + (Math.random() - 0.5) * 0.1
  };
}
function randomDate() {
  if (Math.random() < 0.5) {
    // Случайная дата в ближайший месяц
    const now = Date.now();
    const future = now + Math.floor(Math.random() * 30 * 24 * 3600 * 1000);
    return new Date(future).toISOString();
  } else {
    // Нет даты
    return null;
  }
}

function randomDescription() {
  const phrases = [
    'This is a great opportunity to meet new people.',
    'The route goes through picturesque places.',
    'A lot of interesting and unusual things are waiting for you.',
    'Suitable for all ages and fitness levels.',
    'Don’t forget to bring a good mood!',
    'The program includes walks, communication, and new impressions.',
    'It will be fun and informative.',
    'We are waiting for everyone who wants to join!',
    'The weather promises to be excellent.',
    'Participation is free, but registration is required.'
  ];
  // Collect 3-5 random phrases
  const count = 3 + Math.floor(Math.random() * 3);
  return Array.from({length: count}, () => phrases[Math.floor(Math.random() * phrases.length)]).join(' ');
}

function randomTitle() {
  const words = [
    'Walk', 'in', 'the', 'park', 'Evening', 'Kyiv', 'Mysterious', 'Route', 'Friends', 'Journey',
    'Discoveries', 'Inspiration', 'Picnic', 'Meeting', 'Excursion', 'Trail', 'Adventure', 'Forest',
    'City', 'River', 'Beach', 'Family', 'Day', 'Weekend', 'Surprise', 'Tour', 'On foot', 'Bicycle',
    'Workout', 'Morning', 'Evening', 'Sun', 'Summer', 'Autumn', 'Spring', 'Winter', 'Park', 'Square', 'History',
    'Culture', 'Bridge', 'Peak', 'Valley', 'Glade', 'Road', 'Guide', 'Acquaintances', 'Sunrise', 'Sunset'
  ];
  const count = 3 + Math.floor(Math.random() * 4); // 3-6 words
  let arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(words[Math.floor(Math.random() * words.length)]);
  }
  // First letter uppercase, rest lowercase
  let title = arr.join(' ');
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function getRandomFilesFromDir(dir, count) {
  const files = fs.readdirSync(dir).filter(f => !f.startsWith('.'));
  if (files.length === 0) throw new Error(`No files in directory ${dir}`);
  const shuffled = files.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(f => path.join(dir, f));
}
function getRandomFileFromDir(dir) {
  return getRandomFilesFromDir(dir, 1)[0];
}

async function uploadTripPhotos(token, tripId, count = 3) {
  const photosDir = path.resolve(__dirname, '../server/uploads/photos');
  const photoPaths = getRandomFilesFromDir(photosDir, count);
  const form = new FormData();
  for (const p of photoPaths) {
    form.append('photos', fs.readFileSync(p), { filename: path.basename(p), contentType: 'image/jpeg' });
  }
  const res = await fetch(`${BASE_URL}/api/trips/${tripId}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  return res.status;
}

async function test(name, fn) {
    testsTotal++;
  try {
    await fn();
    logOk(name);
    testsPassed++;
  } catch (e) {
    logFail(`${name}: ${e.message}`);
  }
}

async function createUser(email, password, name) {
  return await makeRequest('POST', '/api/auth/register', { email, password, name });
}
async function loginUser(email, password) {
  const res = await makeRequest('POST', '/api/auth/login', { email, password });
  return res.data.accessToken;
}
async function getProfile(token) {
  return await makeRequest('GET', '/api/users/me', null, { Authorization: `Bearer ${token}` });
}
async function updateProfile(token, data) {
  return await makeRequest('PATCH', '/api/users/profile', data, { Authorization: `Bearer ${token}` });
}
async function uploadAvatar(token) {
  const avatarsDir = path.resolve(__dirname, '../server/uploads/avatars');
  const avatarPath = getRandomFileFromDir(avatarsDir);
  const buf = fs.readFileSync(avatarPath);
  const form = new FormData();
  form.append('avatar', buf, { filename: path.basename(avatarPath), contentType: 'image/jpeg' });
  const res = await fetch(`${BASE_URL}/api/users/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  return res.status;
}
async function uploadUserPhotos(token, count = 3) {
  const photosDir = path.resolve(__dirname, '../server/uploads/photos');
  const photoPaths = getRandomFilesFromDir(photosDir, count);
  const form = new FormData();
  for (const p of photoPaths) {
    form.append('photos', fs.readFileSync(p), { filename: path.basename(p), contentType: 'image/jpeg' });
  }
  const res = await fetch(`${BASE_URL}/api/users/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  return res.status;
}
async function createTrip(token, city, tripType, mainPhotoUrl) {
  const randomLat = () => 44 + Math.random() * 6; // 44-50
  const randomLng = () => 22 + Math.random() * 18; // 22-40
  const route = Array.from({ length: 5 }, () => ({ lat: randomLat(), lng: randomLng() }));
  const dateTime = randomDate();
  const data = {
    title: randomTitle(),
    description: randomDescription(),
    type: tripType.id || tripType.slug || tripType.type || tripType,
    city: city.name,
    location: route[0],
    route,
    maxParticipants: Math.floor(Math.random() * 5) + 2,
    mainPhotoUrl
  };
  if (dateTime) {
    data.date = dateTime.slice(0, 10); // 'YYYY-MM-DD'
    data.time = dateTime.slice(11, 16); // 'HH:MM'
  }
  console.log('Request body for trip creation:', data);
  return await makeRequest('POST', '/api/trips', data, { Authorization: `Bearer ${token}` });
}
async function uploadMainPhoto(token) {
  const photosDir = path.resolve(__dirname, '../server/uploads/photos');
  const photoPath = getRandomFileFromDir(photosDir);
  const buf = fs.readFileSync(photoPath);
  const form = new FormData();
  form.append('photo', buf, { filename: path.basename(photoPath), contentType: 'image/jpeg' });
  const res = await fetch(`${BASE_URL}/api/trips/upload-main-photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const json = await res.json();
  return json.photoUrl;
}

async function run() {
  console.log('🧪 Running full API coverage tests...');
  const cities = await getCities();
  const tripTypes = await getTripTypes();
  if (!cities.length) throw new Error('No cities with priority >= 10');
  if (!tripTypes.length) throw new Error('No trip types found');

  const users = [];

  for (let i = 0; i < USERS_COUNT; i++) {
    const email = `test${Date.now()}_${i}@ex.com`;
    const password = 'password123';
    const name = `User${i}_${randomString(4)}`;
    await test(`User registration ${i + 1}`, async () => {
      const res = await createUser(email, password, name);
      if (res.status !== 201) throw new Error('Registration failed');
    });
    let token = '';
    await test(`User login ${i + 1}`, async () => {
      token = await loginUser(email, password);
      if (!token) throw new Error('No token received');
    });
    await test(`Get user profile ${i + 1}`, async () => {
      const res = await getProfile(token);
      if (res.status !== 200) throw new Error('Profile not received');
    });
    await test(`Update user profile ${i + 1}`, async () => {
      const res = await updateProfile(token, { bio: randomString(10), age: 20 + i, city: randomFrom(cities).name });
      if (res.status !== 200) throw new Error('Profile not updated');
    });
    await test(`Upload user avatar ${i + 1}`, async () => {
      const status = await uploadAvatar(token);
      if (status !== 200) throw new Error('Avatar not uploaded');
    });
    await test(`Upload additional user photos ${i + 1}`, async () => {
      const status = await uploadUserPhotos(token, 3 + Math.floor(Math.random() * 2));
      if (status !== 200) throw new Error('User photos not uploaded');
    });
    users.push({ email, password, name, token });
  }

  // Check cities/trip-types endpoints separately
  await test('Get cities list', async () => {
    const res = await fetch(`${BASE_URL}/api/cities?limit=50`);
    if (res.status !== 200) throw new Error('Cities not received');
    const arr = await res.json();
    if (!Array.isArray(arr)) throw new Error('Response is not an array');
  });
  await test('Get trip types', async () => {
    const res = await fetch(`${BASE_URL}/api/trip-types`);
    if (res.status !== 200) throw new Error('Trip types not received');
    const arr = await res.json();
    if (!Array.isArray(arr)) throw new Error('Response is not an array');
  });

  // For each user create trips
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    for (let j = 0; j < TRIPS_PER_USER; j++) {
      let mainPhotoUrl = '';
      await test(`Upload main trip photo for user${i + 1} trip${j + 1}`, async () => {
        mainPhotoUrl = await uploadMainPhoto(user.token);
        if (!mainPhotoUrl) throw new Error('mainPhotoUrl not received');
      });
      let tripId = '';
      await test(`Create trip user${i + 1} trip${j + 1}`, async () => {
        const city = randomFrom(cities);
        const tripType = randomFrom(tripTypes);
        const res = await createTrip(user.token, city, tripType, mainPhotoUrl);
        if (res.status !== 201) {
          console.error('Server response on trip creation error:', res);
          throw new Error('Trip not created');
        }
        if (!res.data.id) throw new Error('No trip id');
        tripId = res.data.id;
      });
      await test(`Upload additional trip photos user${i + 1} trip${j + 1}`, async () => {
        const status = await uploadTripPhotos(user.token, tripId, 3 + Math.floor(Math.random() * 2));
        if (status !== 200) throw new Error('Trip photos not uploaded');
      });
      // Get trip by id
      await test(`Get trip by id user${i + 1} trip${j + 1}`, async () => {
        const res = await makeRequest('GET', `/api/trips/${tripId}`);
        if (res.status !== 200) throw new Error('Trip not received');
      });
      // Get trip participants
      await test(`Get trip participants user${i + 1} trip${j + 1}`, async () => {
        const res = await makeRequest('GET', `/api/trips/${tripId}/participants`);
        if (res.status !== 200) throw new Error('Participants not received');
      });
      // Get participation status
      await test(`Get participation status user${i + 1} trip${j + 1}`, async () => {
        const res = await makeRequest('GET', `/api/trips/${tripId}/status`, null, { Authorization: `Bearer ${user.token}` });
        if (res.status !== 200) throw new Error('Status not received');
      });
      // Add to favorites
      await test(`Add trip to favorites user${i + 1} trip${j + 1}`, async () => {
        const res = await makeRequest('POST', `/api/favorites/${tripId}`, null, { Authorization: `Bearer ${user.token}` });
        if (res.status !== 201) throw new Error('Not added to favorites');
      });
      // Check favorites status
      await test(`Check favorites status user${i + 1} trip${j + 1}`, async () => {
        const res = await makeRequest('GET', `/api/favorites/${tripId}/status`, null, { Authorization: `Bearer ${user.token}` });
        if (res.status !== 200) throw new Error('Favorites status not received');
      });
      // Remove from favorites
      await test(`Remove from favorites user${i + 1} trip${j + 1}`, async () => {
        const res = await makeRequest('DELETE', `/api/favorites/${tripId}`, null, { Authorization: `Bearer ${user.token}` });
        if (res.status !== 200) throw new Error('Not removed from favorites');
      });
    }
  }

  // Check trips list and filtering
  await test('Get trips list', async () => {
    const res = await makeRequest('GET', '/api/trips');
    if (res.status !== 200) throw new Error('Trips list not received');
    if (!Array.isArray(res.data)) throw new Error('Response is not an array');
  });
  await test('Filter trips by type', async () => {
    const type = randomFrom(tripTypes).slug || randomFrom(tripTypes).type;
    const res = await makeRequest('GET', `/api/trips?type=${type}`);
    if (res.status !== 200) throw new Error('Filtering does not work');
  });

  // Check chats and messages (minimal)
  for (const user of users) {
    await test(`Get chat list for ${user.email}`, async () => {
      const res = await makeRequest('GET', '/api/messages/conversations2', null, { Authorization: `Bearer ${user.token}` });
      if (res.status !== 200) throw new Error('Chats not received');
    });
    await test(`Get unread messages count for ${user.email}`, async () => {
      const res = await makeRequest('GET', '/api/messages/unread-count', null, { Authorization: `Bearer ${user.token}` });
      if (res.status !== 200) throw new Error('unread-count not received');
    });
  }

  // Check public profile
  for (const user of users) {
    await test(`Public profile for user ${user.email}`, async () => {
      const profile = await getProfile(user.token);
      const id = profile.data.id;
      const res = await makeRequest('GET', `/api/users/${id}`);
      if (res.status !== 200) throw new Error('Public profile not received');
    });
  }

  // Check delete/upload additional photos (on one user)
  const user = users[0];
  await test('Upload additional photos', async () => {
    const status = await uploadUserPhotos(user.token);
    if (status !== 200) throw new Error('Photo not uploaded');
  });
  // Delete photo (file name should be obtained from profile)
  await test('Delete additional photo', async () => {
    const profile = await getProfile(user.token);
    const photos = profile.data.additionalPhotos || [];
    if (!photos.length) throw new Error('No additional photos');
    const url = photos[0];
    const filename = url.split('/').pop();
    const res = await makeRequest('DELETE', `/api/users/photos/${filename}`, null, { Authorization: `Bearer ${user.token}` });
    if (res.status !== 200) throw new Error('Photo not deleted');
  });

  // That's all!
  console.log(`\n📊 Test results: ${testsPassed}/${testsTotal} passed`);
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed successfully!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed');
    process.exit(1);
  }
}

run().catch(e => {
  console.error('❌ Error while running tests:', e);
  process.exit(1);
});
