import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';

// Simple test runner for API checking
async function runTests() {
  console.log('🧪 Running API tests...\n');

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


  console.log('\r\n\r\n\r\n🔵 User registration');
  const timestamp = Date.now();
  const testEmail = `test${timestamp}@example.com`;
  console.log(`  ✓ User 1 email: ${testEmail}`);
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
  
  
  console.log('\r\n\r\n\r\n🔵 User login test');
  let authToken = '';
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
   

  console.log('\r\n\r\n\r\n🔵 Updating user profile');
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
  

  console.log('\r\n\r\n\r\n🔵 Uploading user avatar from randomuser.me');
  await test('Upload user avatar from randomuser.me', async () => {
    testsTotal++;

    // Get a random avatar image from randomuser.me
    const randomUserResponse = await fetch('https://randomuser.me/api/?gender=male&nat=us');
    if (!randomUserResponse.ok) {
      throw new Error('Failed to fetch random user data');
    }

    const randomUserData = await randomUserResponse.json();
    const avatarUrl = randomUserData.results[0].picture.large;

    // Download the image
    const imageResponse = await fetch(avatarUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch avatar image');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    // Create FormData to send file
    const formData = new FormData();
    formData.append('avatar', imageBlob, 'avatar.jpg');

    // Send file to the server
    const uploadResponse = await fetch('http://localhost:5000/api/users/avatar', {
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
    if (!uploadData.avatarUrl || !uploadData.avatarThumbnailUrl) {
      throw new Error('Avatar upload response missing URLs');
    }

    console.log(`  ✓ Avatar uploaded: ${uploadData.avatarUrl}`);
    console.log(`  ✓ Thumbnail created: ${uploadData.avatarThumbnailUrl}`);
  });


  console.log('\r\n\r\n\r\n🔵 Getting user profile');
  let user1Id = '';
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
  

  console.log('\r\n\r\n\r\n🔵 Getting trip types');
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
  

  console.log('\r\n\r\n\r\n🔵 Uploading main trip photo');
  let mainPhotoUrl = '';
  await test('Upload main trip photo', async () => {
    testsTotal++;

    // Get a random nature photo from Picsum Photos
    const randomId = Math.floor(Math.random() * 1000) + 1;
    const imageResponse = await fetch(`https://picsum.photos/800/600?random=${randomId}`);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch nature photo');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });

    // Create FormData to send file
    const formData = new FormData();
    formData.append('photo', imageBlob, 'nature-photo.jpg');

    // Send file to the server
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
    console.log(`  ✓ Nature photo uploaded: ${mainPhotoUrl}`);
  });
  

  console.log('\r\n\r\n\r\n🔵 Creating a trip');
  let tripId = '';
  await test('Create trip', async () => {
    testsTotal++;

    // Create a route with several points around Kyiv
    const routePoints = [
      { lat: 50.4501, lng: 30.5234 }, // Kyiv center
      { lat: 50.4485, lng: 30.5190 }, // Maidan Nezalezhnosti
      { lat: 50.4547, lng: 30.5238 }, // Golden Gate
      { lat: 50.4592, lng: 30.5164 }, // Andriivska Church
      { lat: 50.4636, lng: 30.5130 }  // Podil
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
    console.log(`  ✓ Trip created with ${routePoints.length} points`);
  });


  console.log('\r\n\r\n\r\n🔵 Creating a second trip');
  await test('Create second trip', async () => {
    let tripId2 = '';
    testsTotal++;
    const routePoints2 = [
      { lat: 50.467, lng: 30.52 },
      { lat: 50.468, lng: 30.521 },
      { lat: 50.469, lng: 30.522 }
    ];

    const response = await makeRequest('POST', '/api/trips', {
      title: 'Test Trip 2',
      description: 'Second test trip',
      type: 'walk',
      city: 'Kyiv',
      location: routePoints2[0],
      route: routePoints2,
      dateTime: '2025-06-26T10:00:00Z',
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
      throw new Error('No trip ID received for second trip');
    }

    tripId2 = response.data.id;
    console.log('  ✓ Second trip created');
  });

  console.log('\r\n\r\n\r\n🔵 Creating a third trip');
  await test('Create third trip', async () => {
    let tripId3 = '';
    testsTotal++;
    const routePoints2 = [
      { lat: 50.467, lng: 30.52 },
      { lat: 50.468, lng: 30.521 },
      { lat: 50.469, lng: 30.522 }
    ];

    const response = await makeRequest('POST', '/api/trips', {
      title: 'Test Trip 3',
      description: 'Third test trip',
      type: 'walk',
      city: 'Kyiv',
      location: routePoints2[0],
      route: routePoints2,
      dateTime: '2025-06-26T10:00:00Z',
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
      throw new Error('No trip ID received for second trip');
    }

    tripId3 = response.data.id;
    console.log('  ✓ Third trip created');
  });


  console.log('\r\n\r\n\r\n🔵 Getting trip list 9');
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

    // Check that our trip is in the list
    const ourTrip = response.data.find(trip => trip.id === tripId);
    if (!ourTrip) {
      throw new Error(`Our trip ${tripId} not found in the list`);
    }
  });
  
  
  console.log('\r\n\r\n\r\n🔵 Getting trip by ID');
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
 
  
  console.log('\r\n\r\n\r\n🔵 Joining trip (creator is already a participant)')
  await test('Check automatic creator participation', async () => {
    testsTotal++;
    if (!tripId) {
      throw new Error('No trip ID available');
    }

    // Trip creator automatically becomes a participant
    // Verify that we are already a participant
    const response = await makeRequest('GET', `/api/trips/${tripId}/status`, null, {
      'Authorization': `Bearer ${authToken}`
    });

    console.log(response.data);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    if (response.data.status !== 'approved') {
      throw new Error(`Expected status 'approved' for creator, got '${response.data.status}'`);
    }
  });

  
  console.log('\r\n\r\n\r\n🔵 Checking trip participation status');
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
  });

  
  console.log('\r\n\r\n\r\n🔵 Getting trip participants');
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


  console.log('\r\n\r\n\r\n🔵 Filtering trips by type');
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
  

  console.log('\r\n\r\n\r\n🔵 Registering second user (user2)');
  const testEmail2 = `test2${timestamp}@example.com`;
  let authToken2 = '';
  await test('Register second user (user2)', async () => {
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
  

  console.log('\r\n\r\n\r\n🔵 Login for second user');
  await test('Login second user', async () => {
    testsTotal++;
    const response = await makeRequest('POST', '/api/auth/login', {
      email: testEmail2,
      password: 'password123'
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.accessToken) throw new Error('No access token received');
    authToken2 = response.data.accessToken;
    console.log(response.data);
  });


  // console.log('\r\n\r\n\r\n🔵 Отправка запроса на присоединение user2 к первому маршруту user1');
  // await test('Отправка запроса на присоединение user2 к первому маршруту user1', async () => {
  //   testsTotal++;
  //   if (!user1Id) {
  //     throw new Error('No user1 ID available');
  //   }

  //   const resp = await makeRequest('POST', `/api/trips2/${tripId}/join`, null, {
  //     'Authorization': `Bearer ${authToken2}`
  //   });
  //   if (resp.status !== 200) {
  //     throw new Error(`Expected 200, got ${resp.status}: ${JSON.stringify(resp.data)}`);
  //   }
  //   console.log(resp.data);

  //   const response = await makeRequest('POST', '/api/messages2', {
  //     receiverId: user1Id,
  //     text: 'Привет! Хочу присоединиться :)',
  //     // text: 'Привет!',
  //     tripId: tripId
  //   }, {
  //     'Authorization': `Bearer ${authToken2}`
  //   });

  //   if (response.status !== 201) {
  //     throw new Error(`Expected 201, got ${response.status}: ${JSON.stringify(response.data)}`);
  //   }
  //   console.log(response.data);
  // });


  // console.log('\r\n\r\n\r\n🔵 Проверки статуса участия в поездке');
  // await test('Проверка статуса участия в поездке', async () => {
  //   testsTotal++;
  //   if (!tripId) {
  //     throw new Error('No trip ID available');
  //   }

  //   const response = await makeRequest('GET', `/api/trips/${tripId}/status`, null, {
  //     'Authorization': `Bearer ${authToken2}`
  //   });

  //   console.log(response.data);

  //   if (response.status !== 200) {
  //     throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  //   }

  //   if (!response.data.status) {
  //     throw new Error('No status received');
  //   }

  //   if (response.data.status !== 'pending') {
  //     throw new Error('Status is not pending');
  //   }

  // });


  console.log('\r\n\r\n\r\n🔵 Getting conversations list');
  await test('Get conversations list', async () => {
    testsTotal++;
    const response = await makeRequest('GET', '/api/messages/conversations2', null, {
      'Authorization': `Bearer ${authToken}`
    });

    if (response.status !== 200) throw new Error(`Expected 200, got ${resp.status}`);
    const d = response.data;
    if (!d || typeof d !== 'object') throw new Error('Expected object');

    console.log(JSON.stringify(response.data, null, 2));
  });

  console.log(' \r\n\r\n\r\ ');
  console.log('🔵 User 1: ' + testEmail);
  console.log('🔵 User 2: ' + testEmail2);
  

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
