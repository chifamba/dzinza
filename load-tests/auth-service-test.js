import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Define custom trends for response times
const registrationResponseTrend = new Trend('auth_registration_response_time');
const loginResponseTrend = new Trend('auth_login_response_time');

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp-up to 10 virtual users over 30s
    { duration: '1m', target: 10 },  // Stay at 10 virtual users for 1m
    { duration: '10s', target: 0 },  // Ramp-down to 0 virtual users over 10s
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% failed requests
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    'auth_registration_response_time{scenario:default}': ['p(95)<600'], // 95th percentile for registration response time < 600ms
    'auth_login_response_time{scenario:default}': ['p(95)<500'],      // 95th percentile for login response time < 500ms
  },
  ext: {
    loadimpact: {
      projectID: 3699999, // Replace with your actual k6 Cloud Project ID if you use k6 Cloud
      // The name of the test run in k6 Cloud
      name: "Auth Service Load Test (CI)"
    }
  }
};

// Base URL for the auth service, configurable via environment variable
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002'; // Default for local testing

export default function () {
  // Generate unique user credentials for each iteration to avoid conflicts
  const uniqueId = `${__VU}-${__ITER}`; // VU: virtual user ID, ITER: iteration number
  const email = `testuser_${uniqueId}@example.com`;
  const password = `Password123!`;

  // 1. Test User Registration
  const registerPayload = JSON.stringify({
    username: `testuser_${uniqueId}`,
    email: email,
    password: password,
    firstName: 'Test',
    lastName: 'User',
  });
  const registerParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const registerRes = http.post(`${BASE_URL}/api/auth/register`, registerPayload, registerParams);

  check(registerRes, {
    'registration successful (status 201)': (r) => r.status === 201,
    'registration response time < 600ms': (r) => r.timings.duration < 600,
  });
  registrationResponseTrend.add(registerRes.timings.duration);

  sleep(1); // Think time

  // 2. Test User Login
  const loginPayload = JSON.stringify({
    email: email,
    password: password,
  });
  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, loginParams);

  check(loginRes, {
    'login successful (status 200)': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
    'login response contains access token': (r) => r.json('accessToken') !== undefined,
  });
  loginResponseTrend.add(loginRes.timings.duration);

  sleep(1); // Think time between iterations
}
