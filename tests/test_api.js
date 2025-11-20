import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';

// Comprehensive test runner for all API endpoints
async function runTests() {
  console.log('🧪 Running comprehensive API tests...\n');

  // Ждем запуска сервера
  await new Promise(resolve => setTimeout(resolve, 2000));

  const baseUrl = 'http://localhost:5000';
  let testsPassed = 0;
  let testsTotal = 0;

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
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: response });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
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

  async function test(name, testFn) {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  // ========== AUTHENTICATION ==========
  console.log('\r\n\r\n\r\n🔐 AUTHENTICATION');
  
  console.log('\r\n🔵 User registration');
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@example.com`;
  console.log(`  ✓ User 1 email: ${testEmail}`);
  let authToken = '';
  let user1Id = '';
  
  await test('User registration', async () => {
    testsTotal++;
    const response = await makeRequest('POST', '/api/auth/register', {
      name: 'Test User',
      email: testEmail,
      password: 'password123'
    });

    console.log(response.data);

    if (response.status !== 201) {
      throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
  });
  
  console.log('\r\n🔵 User login');
  await test('User login', async () => {
    testsTotal++;
    const response = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: 'password123'
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.data.accessToken) {
      throw new Error('No access token received');
    }

    authToken = response.data.accessToken;
  });

  // ========== USER PROFILE ==========
  console.log('\r\n\r\n\r\n👤 USER PROFILE');
  
  console.log('\r\n🔵 Getting user profile');
  await test('Get user profile', async () => {
    testsTotal++;
    const response = await makeRequest('GET', '/api/users/me', null, {
      'Authorization': `Bearer ${authToken}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.data.name || !response.data.email) {
      throw new Error('Missing user data');
    }
    user1Id = response.data.id;
  });

  console.log('\r\n🔵 Updating user profile');
  await test('Update user profile', async () => {
    testsTotal++;
    const response = await makeRequest('PATCH', '/api/users/profile', {
      bio: 'Updated bio for testing',
      age: 25,
      city: 'Test City'
    }, {
      'Authorization': `Bearer ${authToken}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (response.data.bio !== 'Updated bio for testing') {
      throw new Error('Profile update failed');
    }
  });

  console.log('\r\n🔵 Uploading user avatar');
  await test('Upload user avatar', async () => {
    testsTotal++;

    const randomUserResponse = await fetch('https://randomuser.me/api/?gender=male&nat=us');
    console.log(`[avatar] randomuser.me status: ${randomUserResponse.status}`);
    if (!randomUserResponse.ok) {
      const errorText = await randomUserResponse.text().catch(() => '<no body>');
      throw new Error(`Failed to fetch random user data: ${randomUserResponse.status} ${errorText}`);
    }

    const randomUserData = await randomUserResponse.json();
    const avatarUrl = randomUserData.results[0].picture.large;
    console.log(`[avatar] fetched avatar URL: ${avatarUrl}`);

    const imageResponse = await fetch(avatarUrl);
    console.log(`[avatar] avatar download status: ${imageResponse.status}`);
    if (!imageResponse.ok) {
      const errorText = await imageResponse.text().catch(() => '<no body>');
      throw new Error(`Failed to fetch avatar image (${avatarUrl}): ${imageResponse.status} ${errorText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    console.log(`[avatar] avatar image size: ${imageBuffer.byteLength} bytes`);
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('avatar', imageBlob, 'avatar.jpg');

    const uploadResponse = await fetch('http://localhost:5000/api/users/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    console.log(`[avatar] upload response status: ${uploadResponse.status}`);
    const uploadResponseText = await uploadResponse.text();
    console.log(`[avatar] upload response body (first 500 chars): ${uploadResponseText.slice(0, 500)}`);

    if (uploadResponse.status !== 200) {
      throw new Error(`Expected 200, got ${uploadResponse.status}: ${uploadResponseText}`);
    }

    let uploadData;
    try {
      uploadData = uploadResponseText ? JSON.parse(uploadResponseText) : {};
    } catch (parseError) {
      throw new Error(`Avatar upload response is not valid JSON: ${parseError.message}. Body: ${uploadResponseText}`);
    }
    if (!uploadData.avatarUrl || !uploadData.avatarThumbnailUrl) {
      throw new Error('Avatar upload response missing URLs');
    }

    console.log(`  ✓ Avatar uploaded: ${uploadData.avatarUrl}`);
  });

  console.log('\r\n🔵 Uploading additional photos');
  let uploadedPhotoUrl = '';
  await test('Upload additional photos', async () => {
    testsTotal++;

    const randomId = Math.floor(Math.random() * 1000) + 1;
    const imageResponse = await fetch(`https://picsum.photos/800/600?random=${randomId}`);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch photo');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('photos', imageBlob, 'photo1.jpg');

    const uploadResponse = await fetch('http://localhost:5000/api/users/photos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    if (uploadResponse.status !== 200) {
      const errorData = await uploadResponse.text();
      throw new Error(`Expected 200, got ${uploadResponse.status}: ${errorData}`);
    }

    const uploadData = await uploadResponse.json();
    if (!uploadData.photoUrls || uploadData.photoUrls.length === 0) {
      throw new Error('Photo upload response missing URLs');
    }

    uploadedPhotoUrl = uploadData.photoUrls[0];
    console.log(`  ✓ Photo uploaded: ${uploadedPhotoUrl}`);
  });

  console.log('\r\n🔵 Getting public user profile');
  await test('Get public user profile', async () => {
    testsTotal++;
    if (!user1Id) {
      throw new Error('No user ID available');
    }

    const response = await makeRequest('GET', `/api/users/${user1Id}`);

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.data.id || response.data.id !== user1Id) {
      throw new Error('Wrong user ID returned');
    }
  });

  console.log('\r\n🔵 Deleting additional photo');
  await test('Delete additional photo', async () => {
    testsTotal++;
    if (!uploadedPhotoUrl) {
      throw new Error('No photo URL available');
    }

    // Extract filename from URL (assuming format like /photos/filename.jpg)
    const urlParts = uploadedPhotoUrl.split('/');
    const filename = urlParts[urlParts.length - 1];

    const response = await makeRequest('DELETE', `/api/users/photos/${filename}`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
  });

  // ========== TRIP TYPES ==========
  console.log('\r\n\r\n\r\n📊 TRIP TYPES');
  
  console.log('\r\n🔵 Getting trip types');
  await test('Get trip types', async () => {
    testsTotal++;
    const response = await makeRequest('GET', '/api/trip-types');

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!Array.isArray(response.data) || response.data.length === 0) {
      throw new Error('No trip types received');
    }
  });

  // ========== TRIPS ==========
  console.log('\r\n\r\n\r\n🧭 TRIPS');
  
  console.log('\r\n🔵 Uploading main trip photo');
  let mainPhotoUrl = '';
  await test('Upload main trip photo', async () => {
    testsTotal++;

    const randomId = Math.floor(Math.random() * 1000) + 1;
    const imageResponse = await fetch(`https://picsum.photos/800/600?random=${randomId}`);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch nature photo');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('photo', imageBlob, 'nature-photo.jpg');

    const uploadResponse = await fetch('http://localhost:5000/api/trips/upload-main-photo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    if (uploadResponse.status !== 200) {
      const errorData = await uploadResponse.text();
      throw new Error(`Expected 200, got ${uploadResponse.status}: ${errorData}`);
    }

    const uploadData = await uploadResponse.json();
    if (!uploadData.photoUrl) {
      throw new Error('Photo upload response missing URL');
    }

    mainPhotoUrl = uploadData.photoUrl;
    console.log(`  ✓ Photo uploaded: ${mainPhotoUrl}`);
  });

  console.log('\r\n🔵 Creating a trip');
  let tripId = '';
  await test('Create trip', async () => {
    testsTotal++;

    const routePoints = [
      { lat: 50.4501, lng: 30.5234 },
      { lat: 50.4485, lng: 30.5190 },
      { lat: 50.4547, lng: 30.5238 }
    ];

    const response = await makeRequest('POST', '/api/trips', {
      title: 'Test Trip with Route',
      description: 'Test trip with multiple waypoints around Kyiv',
      type: 'walk',
      city: 'Kyiv',
      location: { lat: 50.4501, lng: 30.5234 },
      route: routePoints,
      dateTime: '2025-06-25T10:00:00Z',
      maxParticipants: 5,
      mainPhotoUrl: mainPhotoUrl
    }, {
      'Authorization': `Bearer ${authToken}`
    });

    console.log(response.data);

    if (response.status !== 201) {
      throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.id) {
      throw new Error('No trip ID received');
    }

    tripId = response.data.id;
    console.log(`  ✓ Trip created with ID: ${tripId}`);
  });

  console.log('\r\n🔵 Getting trip list');
  await test('Get trip list', async () => {
    testsTotal++;
    const response = await makeRequest('GET', '/api/trips');

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of trips');
    }

    if (response.data.length < 1) {
      throw new Error(`Expected at least 1 trip, got ${response.data.length}`);
    }

    const ourTrip = response.data.find(trip => trip.id === tripId);
    if (!ourTrip) {
      throw new Error(`Our trip ${tripId} not found in the list`);
    }
  });

  console.log('\r\n🔵 Filtering trips by type');
  await test('Filter trips by type', async () => {
    testsTotal++;
    const response = await makeRequest('GET', '/api/trips?type=walk');

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of trips');
    }
  });

  console.log('\r\n🔵 Getting trip by ID');
  await test('Get trip by ID', async () => {
    testsTotal++;
    if (!tripId) {
      throw new Error('No trip ID available');
    }

    const response = await makeRequest('GET', `/api/trips/${tripId}`);

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (response.data.id !== tripId) {
      throw new Error(`Wrong trip ID returned. Expected: ${tripId}, got: ${response.data.id}`);
    }
  });

  console.log('\r\n🔵 Uploading additional photos for trip');
  await test('Upload additional photos for trip', async () => {
    testsTotal++;

    const randomId = Math.floor(Math.random() * 1000) + 1;
    const imageResponse = await fetch(`https://picsum.photos/800/600?random=${randomId}`);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch photo');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('photos', imageBlob, 'trip-photo.jpg');

    const uploadResponse = await fetch('http://localhost:5000/api/trips/upload-additional-photos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    if (uploadResponse.status !== 200) {
      const errorData = await uploadResponse.text();
      throw new Error(`Expected 200, got ${uploadResponse.status}: ${errorData}`);
    }

    const uploadData = await uploadResponse.json();
    if (!uploadData.photoUrls || uploadData.photoUrls.length === 0) {
      throw new Error('Photo upload response missing URLs');
    }

    console.log(`  ✓ Photos uploaded: ${uploadData.photoUrls.length}`);
  });

  console.log('\r\n🔵 Uploading photos to specific trip');
  await test('Upload photos to specific trip', async () => {
    testsTotal++;
    if (!tripId) {
      throw new Error('No trip ID available');
    }

    const randomId = Math.floor(Math.random() * 1000) + 1;
    const imageResponse = await fetch(`https://picsum.photos/800/600?random=${randomId}`);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch photo');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('photos', imageBlob, 'trip-photo.jpg');

    const uploadResponse = await fetch(`http://localhost:5000/api/trips/${tripId}/photos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    if (uploadResponse.status !== 200) {
      const errorData = await uploadResponse.text();
      throw new Error(`Expected 200, got ${uploadResponse.status}: ${errorData}`);
    }

    const uploadData = await uploadResponse.json();
    if (!uploadData.photoUrls || uploadData.photoUrls.length === 0) {
      throw new Error('Photo upload response missing URLs');
    }

    console.log(`  ✓ Photos added to trip: ${uploadData.photoUrls.length}`);
  });

  console.log('\r\n🔵 Checking trip participation status');
  await test('Check trip participation status', async () => {
    testsTotal++;
    if (!tripId) {
      throw new Error('No trip ID available');
    }

    const response = await makeRequest('GET', `/api/trips/${tripId}/status`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.status) {
      throw new Error('No status received');
    }

    if (response.data.status !== 'approved') {
      throw new Error(`Expected status 'approved' for creator, got '${response.data.status}'`);
    }
  });

  console.log('\r\n🔵 Getting trip participants');
  await test('Get trip participants', async () => {
    testsTotal++;
    if (!tripId) {
      throw new Error('No trip ID available');
    }

    const response = await makeRequest('GET', `/api/trips/${tripId}/participants`);

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of participants');
    }
  });

  // ========== SECOND USER ==========
  console.log('\r\n\r\n\r\n👥 SECOND USER');
  
  console.log('\r\n🔵 Registering second user');
  const testEmail2 = `test2${timestamp}@example.com`;
  let authToken2 = '';
  let user2Id = '';
  
  await test('Register second user', async () => {
    testsTotal++;
    const response = await makeRequest('POST', '/api/auth/register', {
      name: 'Test User 2',
      email: testEmail2,
      password: 'password123'
    });
    if (response.status !== 201) {
      throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
    console.log(`  ✓ User 2 email: ${testEmail2}`);
  });

  console.log('\r\n🔵 Login for second user');
  await test('Login second user', async () => {
    testsTotal++;
    const response = await makeRequest('POST', '/api/auth/login', {
      email: testEmail2,
      password: 'password123'
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.accessToken) throw new Error('No access token received');
    authToken2 = response.data.accessToken;
    
    // Get user2 ID
    const profileResponse = await makeRequest('GET', '/api/users/me', null, {
      'Authorization': `Bearer ${authToken2}`
    });
    if (profileResponse.status === 200) {
      user2Id = profileResponse.data.id;
    }
    console.log(response.data);
  });

  // ========== TRIP PARTICIPATION ==========
  console.log('\r\n\r\n\r\n🎫 TRIP PARTICIPATION');
  
  console.log('\r\n🔵 Joining trip (user2)');
  await test('Join trip', async () => {
    testsTotal++;
    if (!tripId) {
      throw new Error('No trip ID available');
    }

    const response = await makeRequest('POST', `/api/trips2/${tripId}/join`, null, {
      'Authorization': `Bearer ${authToken2}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.status) {
      throw new Error('No status received');
    }
  });

  console.log('\r\n🔵 Checking trip status for user2');
  await test('Check trip status for user2', async () => {
    testsTotal++;
    if (!tripId) {
      throw new Error('No trip ID available');
    }

    const response = await makeRequest('GET', `/api/trips/${tripId}/status`, null, {
      'Authorization': `Bearer ${authToken2}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.status) {
      throw new Error('No status received');
    }
  });

  console.log('\r\n🔵 Getting trip status for specific user (creator checking user2)');
  await test('Get trip status for specific user', async () => {
    testsTotal++;
    if (!tripId || !user2Id) {
      throw new Error('No trip ID or user2 ID available');
    }

    const response = await makeRequest('GET', `/api/trips/${tripId}/status/${user2Id}`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.status) {
      throw new Error('No status received');
    }
  });

  console.log('\r\n🔵 Accepting trip request');
  await test('Accept trip request', async () => {
    testsTotal++;
    if (!tripId || !user2Id) {
      throw new Error('No trip ID or user2 ID available');
    }

    const response = await makeRequest('POST', `/api/trips/${tripId}/accept/${user2Id}`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
  });

  // ========== FAVORITES ==========
  console.log('\r\n\r\n\r\n⭐ FAVORITES');
  
  console.log('\r\n🔵 Adding trip to favorites');
  await test('Add trip to favorites', async () => {
    testsTotal++;
    if (!tripId) {
      throw new Error('No trip ID available');
    }

    const response = await makeRequest('POST', `/api/favorites/${tripId}`, null, {
      'Authorization': `Bearer ${authToken2}`
    });

    console.log(response.data);

    if (response.status !== 201) {
      throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
  });

  console.log('\r\n🔵 Checking favorite status');
  await test('Check favorite status', async () => {
    testsTotal++;
    if (!tripId) {
      throw new Error('No trip ID available');
    }

    const response = await makeRequest('GET', `/api/favorites/${tripId}/status`, null, {
      'Authorization': `Bearer ${authToken2}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (response.data.isFavorite !== true) {
      throw new Error('Trip should be in favorites');
    }
  });

  console.log('\r\n🔵 Getting favorites list');
  await test('Get favorites list', async () => {
    testsTotal++;
    const response = await makeRequest('GET', '/api/favorites', null, {
      'Authorization': `Bearer ${authToken2}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of favorites');
    }
  });

  console.log('\r\n🔵 Removing trip from favorites');
  await test('Remove trip from favorites', async () => {
    testsTotal++;
    if (!tripId) {
      throw new Error('No trip ID available');
    }

    const response = await makeRequest('DELETE', `/api/favorites/${tripId}`, null, {
      'Authorization': `Bearer ${authToken2}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
  });

  // ========== MY TRIPS ==========
  console.log('\r\n\r\n\r\n🗺️ MY TRIPS');
  
  console.log('\r\n🔵 Getting my trips');
  await test('Get my trips', async () => {
    testsTotal++;
    const response = await makeRequest('GET', '/api/my-trips', null, {
      'Authorization': `Bearer ${authToken2}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of trips');
    }
  });

  // ========== MESSAGES ==========
  console.log('\r\n\r\n\r\n💬 MESSAGES');
  
  console.log('\r\n🔵 Sending message');
  let chatId = '';
  await test('Send message', async () => {
    testsTotal++;
    if (!user1Id) {
      throw new Error('No user1 ID available');
    }

    const response = await makeRequest('POST', '/api/messages2', {
      receiverId: user1Id,
      text: 'Привет! Хочу присоединиться :)',
      tripId: tripId,
      type: 'request'
    }, {
      'Authorization': `Bearer ${authToken2}`
    });

    console.log(response.data);

    if (response.status !== 201) {
      throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!response.data.id) {
      throw new Error('No message ID received');
    }

    chatId = response.data.chatId;
  });

  console.log('\r\n🔵 Getting conversations list');
  await test('Get conversations list', async () => {
    testsTotal++;
    const response = await makeRequest('GET', '/api/messages/conversations2', null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    const d = response.data;
    if (!d || typeof d !== 'object') throw new Error('Expected object');

    console.log(JSON.stringify(response.data, null, 2));
  });

  console.log('\r\n🔵 Getting chat messages');
  await test('Get chat messages', async () => {
    testsTotal++;
    if (!chatId) {
      throw new Error('No chat ID available');
    }

    const response = await makeRequest('GET', `/api/messages2/${chatId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of messages');
    }
  });

  console.log('\r\n🔵 Marking messages as read');
  await test('Mark messages as read', async () => {
    testsTotal++;
    if (!chatId) {
      throw new Error('No chat ID available');
    }

    const response = await makeRequest('POST', `/api/messages/mark-unread?chatId=${chatId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status !== 204 && response.status !== 200) {
      throw new Error(`Expected 204 or 200, got ${response.status}`);
    }
  });

  // ========== LEAVE TRIP ==========
  console.log('\r\n\r\n\r\n🚪 LEAVE TRIP');
  
  console.log('\r\n🔵 Leaving trip');
  await test('Leave trip', async () => {
    testsTotal++;
    if (!tripId) {
      throw new Error('No trip ID available');
    }

    const response = await makeRequest('DELETE', `/api/trips/${tripId}/leave`, null, {
      'Authorization': `Bearer ${authToken2}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
  });

  // ========== REJECT REQUEST ==========
  console.log('\r\n\r\n\r\n❌ REJECT REQUEST');
  
  // Create another trip and join request for testing reject
  console.log('\r\n🔵 Creating trip for reject test');
  let tripIdForReject = '';
  await test('Create trip for reject test', async () => {
    testsTotal++;
    const response = await makeRequest('POST', '/api/trips', {
      title: 'Trip for Reject Test',
      description: 'Test trip for reject functionality',
      type: 'walk',
      city: 'Kyiv',
      location: { lat: 50.4501, lng: 30.5234 },
      route: [{ lat: 50.4501, lng: 30.5234 }],
      dateTime: '2025-06-27T10:00:00Z',
      maxParticipants: 5,
      mainPhotoUrl: mainPhotoUrl
    }, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status !== 201 || !response.data.id) {
      throw new Error('Failed to create trip for reject test');
    }

    tripIdForReject = response.data.id;
  });

  console.log('\r\n🔵 Joining trip for reject test');
  await test('Join trip for reject test', async () => {
    testsTotal++;
    if (!tripIdForReject) {
      throw new Error('No trip ID available');
    }

    const response = await makeRequest('POST', `/api/trips2/${tripIdForReject}/join`, null, {
      'Authorization': `Bearer ${authToken2}`
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
  });

  console.log('\r\n🔵 Rejecting trip request');
  await test('Reject trip request', async () => {
    testsTotal++;
    if (!tripIdForReject || !user2Id) {
      throw new Error('No trip ID or user2 ID available');
    }

    const response = await makeRequest('POST', `/api/trips/${tripIdForReject}/reject/${user2Id}`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
  });

  // ========== CITIES ==========
  console.log('\r\n\r\n\r\n🏙️ CITIES');
  
  console.log('\r\n🔵 Getting cities');
  await test('Get cities', async () => {
    testsTotal++;
    const response = await makeRequest('GET', '/api/cities');

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of cities');
    }
  });

  console.log('\r\n🔵 Searching cities');
  await test('Search cities', async () => {
    testsTotal++;
    const response = await makeRequest('GET', '/api/cities?q=kyiv');

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (!Array.isArray(response.data)) {
      throw new Error('Expected array of cities');
    }
  });

  // ========== SUMMARY ==========
  console.log('\r\n\r\n\r\n📊 SUMMARY');
  console.log('🔵 User 1: ' + testEmail);
  console.log('🔵 User 2: ' + testEmail2);
  console.log('🔵 Trip ID: ' + tripId);

  console.log(`\n📊 Test results: ${testsPassed}/${testsTotal} passed`);
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed successfully!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Error while running tests:', error);
  process.exit(1);
});

