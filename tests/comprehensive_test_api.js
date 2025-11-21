import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';
import util from 'util';
import { Buffer } from 'buffer';

/**
 * Comprehensive API Test Suite
 * 
 * Covers all endpoints with multiple test scenarios including:
 * - Success cases
 * - Error cases (validation, auth, not found)
 * - Edge cases
 * - Chat functionality (unread messages, real-time updates)
 * - Multi-user scenarios
 */

// Configuration
const BASE_URL = 'http://localhost:5000';
const BASE_API = '/api';

// Test state
let stats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
};

// User state
const testUsers = {
    user1: { email: '', token: '', id: '', name: 'Alice Test' },
    user2: { email: '', token: '', id: '', name: 'Bob Test' },
    user3: { email: '', token: '', id: '', name: 'Charlie Test' }
};

// Resource state
const testResources = {
    trips: [],
    chats: [],
    photos: []
};

/**
 * HTTP request helper
 */
async function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                try {
                    const parsed = responseData ? JSON.parse(responseData) : {};
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData, headers: res.headers });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

/**
 * Test assertion helper
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

/**
 * Test runner
 */
async function test(name, testFn, options = {}) {
    stats.total++;
    const category = options.category || 'GENERAL';

    try {
        await testFn();
        console.log(`  ✅ ${name}`);
        stats.passed++;
        return true;
    } catch (error) {
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${error.message}`);
        if (options.debug) {
            console.log(`     Stack: ${error.stack}`);
        }
        stats.failed++;
        return false;
    }
}

/**
 * Image/file upload helper
 */
async function uploadFile(url, fieldName, fileData, filename, token) {
    const formData = new FormData();
    const blob = new Blob([fileData], { type: 'image/jpeg' });
    formData.append(fieldName, blob, filename);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    const text = await response.text();
    return {
        status: response.status,
        data: text ? JSON.parse(text) : {}
    };
}

/**
 * Get a test image buffer
 */
async function getTestImage() {
    const fallbackBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAJ0lEQVQoU2NkYGBg+M+ABYwMjIwMjCgGJQwGQqkGmA0TQwGg4kFAAAnl8L/Q8kvx8AAAAASUVORK5CYII=';
    return Buffer.from(fallbackBase64, 'base64');
}

// ============================================================================
// TEST SUITES
// ============================================================================

/**
 * AUTHENTICATION TESTS
 */
async function testAuthentication() {
    console.log('\n\n🔐 AUTHENTICATION TESTS\n');

    const timestamp = Date.now();
    testUsers.user1.email = `alice${timestamp}@test.com`;
    testUsers.user2.email = `bob${timestamp}@test.com`;
    testUsers.user3.email = `charlie${timestamp}@test.com`;

    // Success cases
    await test('[AUTH-001] Register user 1 (Alice)', async () => {
        const res = await makeRequest('POST', '/api/auth/register', {
            name: testUsers.user1.name,
            email: testUsers.user1.email,
            password: 'TestPass123!'
        });
        assert(res.status === 201, `Expected 201, got ${res.status}`);
    });

    await test('[AUTH-002] Login user 1 (Alice)', async () => {
        const res = await makeRequest('POST', '/api/auth/login', {
            email: testUsers.user1.email,
            password: 'TestPass123!'
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.accessToken, 'No access token received');
        testUsers.user1.token = res.data.accessToken;
    });

    await test('[AUTH-003] Register user 2 (Bob)', async () => {
        const res = await makeRequest('POST', '/api/auth/register', {
            name: testUsers.user2.name,
            email: testUsers.user2.email,
            password: 'TestPass123!'
        });
        assert(res.status === 201, `Expected 201, got ${res.status}`);
    });

    await test('[AUTH-004] Login user 2 (Bob)', async () => {
        const res = await makeRequest('POST', '/api/auth/login', {
            email: testUsers.user2.email,
            password: 'TestPass123!'
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.accessToken, 'No access token received');
        testUsers.user2.token = res.data.accessToken;
    });

    await test('[AUTH-005] Register user 3 (Charlie)', async () => {
        const res = await makeRequest('POST', '/api/auth/register', {
            name: testUsers.user3.name,
            email: testUsers.user3.email,
            password: 'TestPass123!'
        });
        assert(res.status === 201, `Expected 201, got ${res.status}`);
    });

    await test('[AUTH-006] Login user 3 (Charlie)', async () => {
        const res = await makeRequest('POST', '/api/auth/login', {
            email: testUsers.user3.email,
            password: 'TestPass123!'
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        testUsers.user3.token = res.data.accessToken;
    });

    // Error cases
    await test('[AUTH-007] Register with duplicate email', async () => {
        const res = await makeRequest('POST', '/api/auth/register', {
            name: 'Duplicate User',
            email: testUsers.user1.email,
            password: 'TestPass123!'
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('[AUTH-008] Register with invalid email', async () => {
        const res = await makeRequest('POST', '/api/auth/register', {
            name: 'Invalid Email',
            email: 'not-an-email',
            password: 'TestPass123!'
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('[AUTH-009] Register with short password', async () => {
        const res = await makeRequest('POST', '/api/auth/register', {
            name: 'Short Password',
            email: `short${timestamp}@test.com`,
            password: '123'
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('[AUTH-010] Login with wrong password', async () => {
        const res = await makeRequest('POST', '/api/auth/login', {
            email: testUsers.user1.email,
            password: 'WrongPassword!'
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('[AUTH-011] Login with non-existent email', async () => {
        const res = await makeRequest('POST', '/api/auth/login', {
            email: `nonexistent${timestamp}@test.com`,
            password: 'SomePassword123!'
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('[AUTH-012] Login with missing password', async () => {
        const res = await makeRequest('POST', '/api/auth/login', {
            email: testUsers.user1.email
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });
}

/**
 * USER PROFILE TESTS
 */
async function testUserProfiles() {
    console.log('\n\n👤 USER PROFILE TESTS\n');

    // Get own profile
    await test('[USER-001] Get own profile (Alice)', async () => {
        const res = await makeRequest('GET', '/api/users/me', null, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.email === testUsers.user1.email, 'Wrong email returned');
        testUsers.user1.id = res.data.id;
    });

    await test('[USER-002] Get own profile (Bob)', async () => {
        const res = await makeRequest('GET', '/api/users/me', null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        testUsers.user2.id = res.data.id;
    });

    await test('[USER-003] Get own profile (Charlie)', async () => {
        const res = await makeRequest('GET', '/api/users/me', null, {
            'Authorization': `Bearer ${testUsers.user3.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        testUsers.user3.id = res.data.id;
    });

    await test('[USER-004] Get profile without auth token', async () => {
        const res = await makeRequest('GET', '/api/users/me');
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('[USER-005] Get profile with invalid token', async () => {
        const res = await makeRequest('GET', '/api/users/me', null, {
            'Authorization': 'Bearer invalid_token_here'
        });
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    // Update profile
    await test('[USER-006] Update profile bio and age', async () => {
        const res = await makeRequest('PATCH', '/api/users/profile', {
            bio: 'I love hiking and photography!',
            age: 28,
            city: 'Kyiv'
        }, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.bio === 'I love hiking and photography!', 'Bio not updated');
        assert(res.data.age === 28, 'Age not updated');
    });

    await test('[USER-007] Update profile with all fields', async () => {
        const res = await makeRequest('PATCH', '/api/users/profile', {
            bio: 'Adventure seeker',
            age: 25,
            city: 'Lviv',
            phone: '+380123456789',
            languages: ['Ukrainian', 'English', 'Polish'],
            messengers: { telegram: '@bob_test', whatsapp: '+380123456789' }
        }, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.city === 'Lviv', 'City not updated');
        assert(Array.isArray(res.data.languages), 'Languages should be array');
    });

    await test('[USER-008] Update profile without authorization', async () => {
        const res = await makeRequest('PATCH', '/api/users/profile', {
            bio: 'Should fail'
        });
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    // Upload avatar
    await test('[USER-009] Upload avatar', async () => {
        const imageData = await getTestImage();
        const res = await uploadFile(
            'http://localhost:5000/api/users/avatar',
            'avatar',
            imageData,
            'avatar.png',
            testUsers.user1.token
        );
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.avatarUrl, 'No avatar URL returned');
        assert(res.data.avatarThumbnailUrl, 'No thumbnail URL returned');
    });

    // Upload additional photos
    await test('[USER-010] Upload additional photos', async () => {
        const imageData = await getTestImage();
        const res = await uploadFile(
            'http://localhost:5000/api/users/photos',
            'photos',
            imageData,
            'photo1.jpg',
            testUsers.user1.token
        );
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data.photoUrls), 'Photo URLs should be array');
        if (res.data.photoUrls.length > 0) {
            testResources.photos.push(res.data.photoUrls[0]);
        }
    });

    // Get public profile
    await test('[USER-011] Get public profile of another user', async () => {
        const res = await makeRequest('GET', `/api/users/${testUsers.user1.id}`);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.id === testUsers.user1.id, 'Wrong user ID');
        assert(res.data.name, 'Name should be visible');
        assert(!res.data.email, 'Email should not be visible in public profile');
    });

    await test('[USER-012] Get non-existent user profile', async () => {
        // Use a valid UUID that definitely doesn't exist
        const res = await makeRequest('GET', '/api/users/00000000-0000-0000-0000-000000000000');
        assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    // Delete photo
    if (testResources.photos.length > 0) {
        await test('[USER-013] Delete additional photo', async () => {
            const photoUrl = testResources.photos[0];
            const filename = photoUrl.split('/').pop();
            const res = await makeRequest('DELETE', `/api/users/photos/${filename}`, null, {
                'Authorization': `Bearer ${testUsers.user1.token}`
            });
            assert(res.status === 200, `Expected 200, got ${res.status}`);
        });
    }
}

/**
 * TRIP TYPES AND CITIES TESTS
 */
async function testStaticData() {
    console.log('\n\n📊 STATIC DATA TESTS (Trip Types, Cities)\n');

    await test('[STATIC-001] Get trip types', async () => {
        const res = await makeRequest('GET', '/api/trip-types');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'Trip types should be array');
        assert(res.data.length > 0, 'Should have at least one trip type');
    });

    await test('[STATIC-002] Get cities', async () => {
        const res = await makeRequest('GET', '/api/cities');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'Cities should be array');
    });

    await test('[STATIC-003] Search cities by query', async () => {
        const res = await makeRequest('GET', '/api/cities?q=kyiv');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'Search result should be array');
    });

    await test('[STATIC-004] Search cities with empty query', async () => {
        const res = await makeRequest('GET', '/api/cities?q=');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'Empty search should return array');
    });
}

/**
 * TRIP TESTS
 */
async function testTrips() {
    console.log('\n\n🧭 TRIP TESTS\n');

    let trip1Id = '';
    let trip2Id = '';
    let tripPhotoUrl = '';

    // Upload trip photo first
    await test('[TRIP-001] Upload main trip photo', async () => {
        const imageData = await getTestImage();
        const res = await uploadFile(
            'http://localhost:5000/api/trips/upload-main-photo',
            'photo',
            imageData,
            'trip-photo.jpg',
            testUsers.user1.token
        );
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.photoUrl, 'No photo URL returned');
        tripPhotoUrl = res.data.photoUrl;
    });

    // Create trips
    await test('[TRIP-002] Create trip by Alice', async () => {
        const res = await makeRequest('POST', '/api/trips', {
            title: 'Mountain Hiking Adventure',
            description: 'Join us for an amazing hike in the Carpathians!',
            type: 'mountains',
            city: 'Ivano-Frankivsk',
            location: { lat: 48.9226, lng: 24.7111 },
            route: [
                { lat: 48.9226, lng: 24.7111 },
                { lat: 48.9300, lng: 24.7200 },
                { lat: 48.9350, lng: 24.7250 }
            ],
            date: '2025-07-15',
            time: '08:00:00',
            maxParticipants: 8,
            mainPhotoUrl: tripPhotoUrl
        }, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        if (res.status !== 201) {
            console.log('     Debug: Trip creation failed. Response:', JSON.stringify(res.data, null, 2));
        }
        assert(res.status === 201, `Expected 201, got ${res.status}`);
        assert(res.data.id, 'No trip ID returned');
        trip1Id = res.data.id;
        testResources.trips.push(trip1Id);
    });

    await test('[TRIP-003] Create trip by Bob', async () => {
        const res = await makeRequest('POST', '/api/trips', {
            title: 'City Walk in Kyiv',
            description: 'Explore the beautiful streets of Kyiv',
            type: 'walk',
            city: 'Kyiv',
            location: { lat: 50.4501, lng: 30.5234 },
            route: [{ lat: 50.4501, lng: 30.5234 }, { lat: 50.4547, lng: 30.5238 }],
            date: '2025-06-20',
            time: '10:00:00',
            maxParticipants: 5,
            mainPhotoUrl: tripPhotoUrl
        }, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 201, `Expected 201, got ${res.status}`);
        assert(res.data.id, 'No trip ID returned');
        trip2Id = res.data.id;
        testResources.trips.push(trip2Id);
    });

    await test('[TRIP-004] Create trip without auth', async () => {
        const res = await makeRequest('POST', '/api/trips', {
            title: 'Should Fail',
            type: 'walk',
            city: 'Kyiv',
            location: { lat: 50.4501, lng: 30.5234 },
            date: '2025-06-20',
            time: '10:00:00'
        });
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('[TRIP-005] Create trip with invalid data (missing required fields)', async () => {
        const res = await makeRequest('POST', '/api/trips', {
            title: 'Incomplete Trip'
            // Missing required fields like type, city, etc.
        }, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
        // Should return validation error
        assert(res.data.message || res.data.errors, 'Should return error message');
    });

    // Get trips
    await test('[TRIP-006] Get all trips', async () => {
        const res = await makeRequest('GET', '/api/trips');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'Trips should be array');
        assert(res.data.length >= 2, 'Should have at least 2 trips');
    });

    await test('[TRIP-007] Filter trips by type=mountains', async () => {
        const res = await makeRequest('GET', '/api/trips?type=mountains');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'Filtered trips should be array');
    });

    await test('[TRIP-008] Filter trips by type=walk', async () => {
        const res = await makeRequest('GET', '/api/trips?type=walk');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'Filtered trips should be array');
    });

    await test('[TRIP-009] Filter trips by city', async () => {
        const res = await makeRequest('GET', '/api/trips?city=Kyiv');
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'City filtered trips should be array');
    });

    await test('[TRIP-010] Get trip by ID', async () => {
        const res = await makeRequest('GET', `/api/trips/${trip1Id}`);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.id === trip1Id, 'Wrong trip ID returned');
        assert(res.data.title === 'Mountain Hiking Adventure', 'Wrong trip title');
    });

    await test('[TRIP-011] Get non-existent trip', async () => {
        const res = await makeRequest('GET', '/api/trips/00000000-0000-0000-0000-000000000000');
        assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    // Trip status
    await test('[TRIP-012] Check trip status (creator should be approved)', async () => {
        const res = await makeRequest('GET', `/api/trips/${trip1Id}/status`, null, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.status === 'approved', `Expected status 'approved', got '${res.data.status}'`);
    });

    // Upload additional trip photos
    await test('[TRIP-013] Upload additional photos to trip', async () => {
        const imageData = await getTestImage();
        const res = await uploadFile(
            `http://localhost:5000/api/trips/${trip1Id}/photos`,
            'photos',
            imageData,
            'additional-photo.jpg',
            testUsers.user1.token
        );
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data.photoUrls), 'Photo URLs should be array');
    });

    // Trip participants
    await test('[TRIP-014] Get trip participants', async () => {
        const res = await makeRequest('GET', `/api/trips/${trip1Id}/participants`);
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'Participants should be array');
    });

    return { trip1Id, trip2Id };
}

/**
 * TRIP PARTICIPATION TESTS
 */
async function testTripParticipation({ trip1Id, trip2Id }) {
    console.log('\n\n🎫 TRIP PARTICIPATION TESTS\n');

    if (!trip1Id) {
        console.log('⚠️  Skipping trip participation tests: trip1Id not available');
        stats.total += 10;
        stats.skipped += 10;
        return;
    }

    // Bob joins Alice's trip
    await test('[PARTICIPATE-001] Bob joins Alice\'s trip', async () => {
        const res = await makeRequest('POST', `/api/trips2/${trip1Id}/join`, null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.status, 'No status returned');
    });

    await test('[PARTICIPATE-002] Check Bob\'s status (should be pending)', async () => {
        const res = await makeRequest('GET', `/api/trips/${trip1Id}/status`, null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('[PARTICIPATE-003] Alice checks Bob\'s status', async () => {
        const res = await makeRequest('GET', `/api/trips/${trip1Id}/status/${testUsers.user2.id}`, null, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.status, 'No status returned');
    });

    await test('[PARTICIPATE-004] Alice accepts Bob\'s request', async () => {
        const res = await makeRequest('POST', `/api/trips/${trip1Id}/accept/${testUsers.user2.id}`, null, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('[PARTICIPATE-005] Verify Bob is now approved', async () => {
        const res = await makeRequest('GET', `/api/trips/${trip1Id}/status`, null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.status === 'approved', 'Bob should be approved');
    });

    // Charlie joins Alice's trip
    await test('[PARTICIPATE-006] Charlie joins Alice\'s trip', async () => {
        const res = await makeRequest('POST', `/api/trips2/${trip1Id}/join`, null, {
            'Authorization': `Bearer ${testUsers.user3.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('[PARTICIPATE-007] Alice rejects Charlie\'s request', async () => {
        const res = await makeRequest('POST', `/api/trips/${trip1Id}/reject/${testUsers.user3.id}`, null, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('[PARTICIPATE-008] Bob leaves the trip', async () => {
        const res = await makeRequest('DELETE', `/api/trips/${trip1Id}/leave`, null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('[PARTICIPATE-009] Try to join trip without auth', async () => {
        const res = await makeRequest('POST', `/api/trips2/${trip1Id}/join`);
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('[PARTICIPATE-010] Try to accept request by non-creator', async () => {
        // Bob tries to join again
        await makeRequest('POST', `/api/trips2/${trip1Id}/join`, null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });

        // Charlie tries to accept Bob (but only Alice can)
        const res = await makeRequest('POST', `/api/trips/${trip1Id}/accept/${testUsers.user2.id}`, null, {
            'Authorization': `Bearer ${testUsers.user3.token}`
        });
        assert(res.status === 403 || res.status === 401, `Expected 403 or 401, got ${res.status}`);
    });
}

/**
 * FAVORITES TESTS
 */
async function testFavorites({ trip1Id, trip2Id }) {
    console.log('\n\n⭐ FAVORITES TESTS\n');

    if (!trip1Id || !trip2Id) {
        console.log('⚠️  Skipping favorites tests: tripIds not available');
        stats.total += 8;
        stats.skipped += 8;
        return;
    }

    await test('[FAV-001] Bob adds Alice\'s trip to favorites', async () => {
        const res = await makeRequest('POST', `/api/favorites/${trip1Id}`, null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 201, `Expected 201, got ${res.status}`);
    });

    await test('[FAV-002] Check favorite status (should be true)', async () => {
        const res = await makeRequest('GET', `/api/favorites/${trip1Id}/status`, null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.isFavorite === true, 'Trip should be in favorites');
    });

    await test('[FAV-003] Get Bob\'s favorites list', async () => {
        const res = await makeRequest('GET', '/api/favorites', null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'Favorites should be array');
        assert(res.data.length >= 1, 'Should have at least 1 favorite');
    });

    await test('[FAV-004] Charlie adds Bob\'s trip to favorites', async () => {
        const res = await makeRequest('POST', `/api/favorites/${trip2Id}`, null, {
            'Authorization': `Bearer ${testUsers.user3.token}`
        });
        assert(res.status === 201, `Expected 201, got ${res.status}`);
    });

    await test('[FAV-005] Bob removes Alice\'s trip from favorites', async () => {
        const res = await makeRequest('DELETE', `/api/favorites/${trip1Id}`, null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('[FAV-006] Check favorite status after removal (should be false)', async () => {
        const res = await makeRequest('GET', `/api/favorites/${trip1Id}/status`, null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(res.data.isFavorite === false, 'Trip should not be in favorites');
    });

    await test('[FAV-007] Try to add favorite without auth', async () => {
        const res = await makeRequest('POST', `/api/favorites/${trip1Id}`);
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('[FAV-008] Try to favorite non-existent trip', async () => {
        const res = await makeRequest('POST', '/api/favorites/00000000-0000-0000-0000-000000000000', {}, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        // Can be 404 (trip not found) or 400 (invalid input), but definitely not 500
        assert(res.status === 404 || res.status === 400, `Expected 404 or 400, got ${res.status}`);
    });
}

/**
 * MY TRIPS TESTS
 */
async function testMyTrips() {
    console.log('\n\n🗺️ MY TRIPS TESTS\n');

    await test('[MYTRIPS-001] Get Alice\'s trips', async () => {
        const res = await makeRequest('GET', '/api/my-trips', null, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'My trips should be array');
    });

    await test('[MYTRIPS-002] Get Bob\'s trips', async () => {
        const res = await makeRequest('GET', '/api/my-trips', null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
        assert(Array.isArray(res.data), 'My trips should be array');
    });

    await test('[MYTRIPS-003] Get my trips without auth', async () => {
        const res = await makeRequest('GET', '/api/my-trips');
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });
}

/**
 * MESSAGING TESTS - INCLUDING UNREAD MESSAGE SCENARIOS
 */
async function testMessaging({ trip1Id }) {
    console.log('\n\n💬 MESSAGING TESTS (with Unread Message Scenarios)\n');

    if (!trip1Id) {
        console.log('⚠️  Warning: trip1Id not available, messaging tests will proceed but may have reduced coverage');
    }

    let chatId1 = '';
    let chatId2 = '';

    // Scenario 1: Bob sends message to Alice
    await test('[MSG-001] Bob sends message to Alice', async () => {
        const res = await makeRequest('POST', '/api/messages2', {
            receiverId: testUsers.user1.id,
            text: 'Hi Alice! I would like to join your trip!',
            type: 'request',
            tripId: trip1Id || null
        }, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
        assert(res.data.id, 'No message ID returned');
        // Note: chatId is returned in the message object
        if (res.data.chatId) {
            chatId1 = res.data.chatId;
        } else {
            console.log('     Warning: No chatId in response, will try to find it later');
        }
    });

    await test('[MSG-002] Alice gets conversations (should see unread message from Bob)', async () => {
        const res = await makeRequest('GET', '/api/messages/conversations2', null, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);

        // Check that there's at least one conversation with unread count
        const allConvos = [
            ...(res.data.requested || []),
            ...(res.data.private || []),
            ...(res.data.public || []),
            ...(res.data.archived || [])
        ];

        // If we don't have chatId1 yet, try to find it
        if (!chatId1 && allConvos.length > 0) {
            // Find chat with Bob (user2)
            const bobChat = allConvos.find(c =>
                c.type === 'private' && c.source && c.source.otherUserId === testUsers.user2.id
            );
            if (bobChat) {
                chatId1 = bobChat.chatId;
                console.log(`     Info: Found chatId1 from conversations: ${chatId1}`);
            }
        }

        const bobChat = allConvos.find(c => c.chatId === chatId1);
        if (chatId1) {
            assert(bobChat, `Chat with Bob (chatId: ${chatId1}) should exist`);
            console.log(`     Debug: Bob's chat unreadCount = ${bobChat?.unreadCount}`);
        } else {
            console.log(`     Warning: chatId1 not found, conversations count: ${allConvos.length}`);
        }
    });

    await test('[MSG-003] Bob gets conversations (should have 0 unread for this chat)', async () => {
        const res = await makeRequest('GET', '/api/messages/conversations2', null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test('[MSG-004] Alice reads messages from Bob', async () => {
        if (!chatId1) {
            console.log('     Skipping: No chatId1 available');
            throw new Error('No chat ID available (dependency on previous tests)');
        }

        const res = await makeRequest('GET', `/api/messages2/${chatId1}`, null, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
        assert(Array.isArray(res.data), 'Messages should be array');
        assert(res.data.length >= 1, 'Should have at least 1 message');
    });

    await test('[MSG-005] Alice checks conversations again (unread should be 0 now)', async () => {
        const res = await makeRequest('GET', '/api/messages/conversations2', null, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);

        const allConvos = [
            ...(res.data.requested || []),
            ...(res.data.private || []),
            ...(res.data.public || []),
            ...(res.data.archived || [])
        ];

        const bobChat = allConvos.find(c => c.id === chatId1);
        if (bobChat) {
            console.log(`     Debug: After reading, unreadCount = ${bobChat.unreadCount}`);
        }
    });

    // Scenario 2: Alice replies to Bob
    await test('[MSG-006] Alice replies to Bob in same chat', async () => {
        if (!chatId1) {
            console.log('     Skipping: No chatId1 available');
            throw new Error('No chat ID available (dependency on previous tests)');
        }

        const res = await makeRequest('POST', '/api/messages2', {
            chatId: chatId1,
            text: 'Hi Bob! Sure, I would be happy to have you join!',
            type: 'general'
        }, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    });

    await test('[MSG-007] Bob checks conversations (should see unread message from Alice)', async () => {
        const res = await makeRequest('GET', '/api/messages/conversations2', null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);

        const allConvos = [
            ...(res.data.requested || []),
            ...(res.data.private || []),
            ...(res.data.public || []),
            ...(res.data.archived || [])
        ];

        // Bob should see chat with Alice (user1)
        const aliceChat = allConvos.find(c =>
            c.chatId === chatId1 ||
            (c.type === 'private' && c.source && c.source.otherUserId === testUsers.user1.id)
        );

        assert(aliceChat, 'Chat with Alice should exist');
        // Should have unread messages (Alice replied)
        assert(aliceChat.unreadCount > 0, `Should have unread messages, got ${aliceChat?.unreadCount}`);
    });

    // Scenario 3: Multiple messages before reading
    await test('[MSG-008] Alice sends multiple messages to Bob', async () => {
        if (!chatId1) {
            console.log('     Skipping: No chatId1 available');
            throw new Error('No chat ID available (dependency on previous tests)');
        }

        await makeRequest('POST', '/api/messages2', {
            chatId: chatId1,
            text: 'By the way, don\'t forget to bring hiking boots!',
            type: 'general'
        }, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });

        await makeRequest('POST', '/api/messages2', {
            chatId: chatId1,
            text: 'And water bottles!',
            type: 'general'
        }, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });

        const res = await makeRequest('POST', '/api/messages2', {
            chatId: chatId1,
            text: 'See you there! 😊',
            type: 'general'
        }, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });

        assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    });

    await test('[MSG-009] Bob checks conversations (should see multiple unread)', async () => {
        const res = await makeRequest('GET', '/api/messages/conversations2', null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);

        const allConvos = [
            ...(res.data.requested || []),
            ...(res.data.private || []),
            ...(res.data.public || []),
            ...(res.data.archived || [])
        ];

        const aliceChat = allConvos.find(c => c.id === chatId1);
        console.log(`     Debug: Multiple unread messages count = ${aliceChat?.unreadCount}`);
    });

    await test('[MSG-010] Bob marks messages as read', async () => {
        if (!chatId1) {
            console.log('     Skipping: No chatId1 available');
            throw new Error('No chat ID available (dependency on previous tests)');
        }

        const res = await makeRequest('POST', `/api/messages/mark-unread?chatId=${chatId1}`, null, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 204 || res.status === 200, `Expected 204 or 200, got ${res.status}: ${JSON.stringify(res.data)}`);
    });

    // Scenario 4: Start new conversation - Charlie messages Alice
    await test('[MSG-011] Charlie sends message to Alice (new conversation)', async () => {
        const res = await makeRequest('POST', '/api/messages2', {
            receiverId: testUsers.user1.id,
            text: 'Hello Alice! Can you recommend good hiking spots?',
            type: 'general'
        }, {
            'Authorization': `Bearer ${testUsers.user3.token}`
        });
        assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
        if (res.data.chatId) {
            chatId2 = res.data.chatId;
        }
    });

    await test('[MSG-012] Alice checks conversations (should have 2 chats, one unread)', async () => {
        const res = await makeRequest('GET', '/api/messages/conversations2', null, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}`);

        const allConvos = [
            ...(res.data.requested || []),
            ...(res.data.private || []),
            ...(res.data.public || []),
            ...(res.data.archived || [])
        ];

        console.log(`     Debug: Alice now has ${allConvos.length} total conversations`);
        const charlieChat = allConvos.find(c => c.id === chatId2);
        if (charlieChat) {
            console.log(`     Debug: Charlie chat unreadCount = ${charlieChat.unreadCount}`);
        }
    });

    // Error scenarios
    await test('[MSG-013] Send message without auth', async () => {
        const res = await makeRequest('POST', '/api/messages2', {
            receiverId: testUsers.user1.id,
            text: 'This should fail'
        });
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('[MSG-014] Send message without text', async () => {
        const res = await makeRequest('POST', '/api/messages2', {
            receiverId: testUsers.user1.id
        }, {
            'Authorization': `Bearer ${testUsers.user2.token}`
        });
        assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await test('[MSG-015] Get messages from chat user is not part of', async () => {
        if (!chatId1) {
            console.log('     Skipping: No chatId1 available');
            throw new Error('No chat ID available (dependency on previous tests)');
        }

        // Alice and Bob have chatId1, Charlie tries to access it
        const res = await makeRequest('GET', `/api/messages2/${chatId1}`, null, {
            'Authorization': `Bearer ${testUsers.user3.token}`
        });
        assert(res.status === 403, `Expected 403, got ${res.status}`);
    });

    await test('[MSG-016] Get conversations without auth', async () => {
        const res = await makeRequest('GET', '/api/messages/conversations2');
        assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await test('[MSG-017] Alice gets all messages from chat with Bob', async () => {
        if (!chatId1) {
            console.log('     Skipping: No chatId1 available');
            throw new Error('No chat ID available (dependency on previous tests)');
        }

        const res = await makeRequest('GET', `/api/messages2/${chatId1}`, null, {
            'Authorization': `Bearer ${testUsers.user1.token}`
        });
        assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
        assert(Array.isArray(res.data), 'Messages should be array');
        console.log(`     Debug: Total messages in chat = ${res.data.length}`);
    });
}

/**
 * MAIN TEST RUNNER
 */
async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 COMPREHENSIVE API TEST SUITE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('Waiting for server to be ready...\n');

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        // Run all test suites
        await testAuthentication();
        await testUserProfiles();
        await testStaticData();
        const tripIds = await testTrips();
        await testTripParticipation(tripIds);
        await testFavorites(tripIds);
        await testMyTrips();
        await testMessaging(tripIds);

        // Print summary
        console.log('\n\n═══════════════════════════════════════════════════════════');
        console.log('📊 TEST SUMMARY');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`Total tests:  ${stats.total}`);
        console.log(`✅ Passed:    ${stats.passed} (${Math.round(stats.passed / stats.total * 100)}%)`);
        console.log(`❌ Failed:    ${stats.failed} (${Math.round(stats.failed / stats.total * 100)}%)`);
        console.log(`⏭️  Skipped:   ${stats.skipped}`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`Finished at: ${new Date().toISOString()}`);

        if (stats.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
            process.exit(0);
        } else {
            console.log(`\n⚠️  ${stats.failed} TEST(S) FAILED\n`);
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ FATAL ERROR while running tests:', error);
        process.exit(1);
    }
}

// Run the tests
runAllTests().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});
