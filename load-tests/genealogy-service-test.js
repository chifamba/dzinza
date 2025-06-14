import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend }
from 'k6/metrics';

// Define custom trends for response times
const getTreeResponseTrend = new Trend('genealogy_get_tree_response_time');
const getPeopleInTreeResponseTrend = new Trend('genealogy_get_people_in_tree_response_time');
const getPersonResponseTrend = new Trend('genealogy_get_person_response_time');

export const options = {
  stages: [
    { duration: '30s', target: 15 }, // Ramp-up to 15 VUs over 30s
    { duration: '1m', target: 15 },  // Stay at 15 VUs for 1m
    { duration: '10s', target: 0 },  // Ramp-down to 0 VUs
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'], // < 2% failed requests
    http_req_duration: ['p(95)<800'], // 95% of requests should be below 800ms for general genealogy browsing
    'genealogy_get_tree_response_time{scenario:default}': ['p(95)<700ms'],
    'genealogy_get_people_in_tree_response_time{scenario:default}': ['p(95)<1000ms'], // Potentially larger payload
    'genealogy_get_person_response_time{scenario:default}': ['p(95)<500ms'],
  },
  ext: {
    loadimpact: {
      projectID: 3699999, // Replace with your actual k6 Cloud Project ID
      name: "Genealogy Service Load Test (CI)"
    }
  }
};

// Base URL for the genealogy service, configurable via environment variable
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3004'; // Default for local testing
const TREE_ID = __ENV.TREE_ID || 'test-tree-id'; // Default test tree ID
const PERSON_ID = __ENV.PERSON_ID || 'test-person-id'; // Default test person ID
const AUTH_TOKEN = __ENV.AUTH_TOKEN || null; // Optional auth token if needed for endpoints

const params = {
  headers: {
    'Content-Type': 'application/json',
  },
};

if (AUTH_TOKEN) {
  params.headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
}

export default function () {
  // 1. Test fetching a specific family tree
  const treeRes = http.get(`${BASE_URL}/api/trees/${TREE_ID}`, params);
  check(treeRes, {
    'fetch tree successful (status 200)': (r) => r.status === 200,
    'fetch tree response time < 700ms': (r) => r.timings.duration < 700,
  });
  getTreeResponseTrend.add(treeRes.timings.duration);

  sleep(1);

  // 2. Test fetching people in that tree
  const peopleInTreeRes = http.get(`${BASE_URL}/api/trees/${TREE_ID}/people`, params);
  check(peopleInTreeRes, {
    'fetch people in tree successful (status 200)': (r) => r.status === 200,
    'fetch people in tree response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  getPeopleInTreeResponseTrend.add(peopleInTreeRes.timings.duration);

  sleep(1);

  // 3. Test fetching a specific person's details (using a known person ID)
  if (PERSON_ID && PERSON_ID !== 'test-person-id') { // Only run if a valid person ID is likely provided
    const personRes = http.get(`${BASE_URL}/api/people/${PERSON_ID}`, params);
    check(personRes, {
      'fetch person successful (status 200)': (r) => r.status === 200,
      'fetch person response time < 500ms': (r) => r.timings.duration < 500,
    });
    getPersonResponseTrend.add(personRes.timings.duration);
  } else {
    // console.log('Skipping fetch person details test as PERSON_ID is default or not set.');
  }

  sleep(1);
}
