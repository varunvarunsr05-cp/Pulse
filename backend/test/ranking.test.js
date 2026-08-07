const test = require('node:test');
const assert = require('node:assert');
const { rankDonors, isEligible, distanceKm, COMPATIBILITY } = require('../src/services/donorRanking');

test('distanceKm returns 0 for identical coordinates', () => {
  assert.strictEqual(distanceKm(12.97, 77.6, 12.97, 77.6), 0);
});

test('distanceKm is symmetric', () => {
  const a = distanceKm(12.97, 77.6, 13.05, 77.7);
  const b = distanceKm(13.05, 77.7, 12.97, 77.6);
  assert.ok(Math.abs(a - b) < 0.0001);
});

test('O- is compatible with every blood type (universal donor)', () => {
  for (const recipientType of Object.keys(COMPATIBILITY)) {
    assert.ok(
      COMPATIBILITY[recipientType].includes('O-'),
      `O- should be compatible with ${recipientType}`
    );
  }
});

test('AB+ can receive from every blood type (universal recipient)', () => {
  assert.strictEqual(COMPATIBILITY['AB+'].length, 8);
});

test('O- can only receive from O-', () => {
  assert.deepStrictEqual(COMPATIBILITY['O-'], ['O-']);
});

test('isEligible rejects donor who donated within 56 days', () => {
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 10);
  const result = isEligible({
    is_available: true,
    last_donation_date: recentDate.toISOString().slice(0, 10),
    weight_kg: 70,
  });
  assert.strictEqual(result.eligible, false);
});

test('isEligible accepts donor with no donation history', () => {
  const result = isEligible({ is_available: true, weight_kg: 70 });
  assert.strictEqual(result.eligible, true);
});

test('rankDonors excludes blood-type-incompatible donors entirely', () => {
  const request = { blood_group_needed: 'AB-', latitude: 12.97, longitude: 77.6 };
  const donors = [
    { id: '1', full_name: 'Wrong Type', blood_group: 'O+', latitude: 12.97, longitude: 77.6, is_available: true },
  ];
  const ranked = rankDonors(request, donors, {});
  assert.strictEqual(ranked.length, 0);
});

test('rankDonors scores exact match higher than compatible-but-different type at same distance', () => {
  const request = { blood_group_needed: 'A+', latitude: 12.97, longitude: 77.6 };
  const donors = [
    { id: '1', full_name: 'Exact', blood_group: 'A+', latitude: 12.97, longitude: 77.6, is_available: true },
    { id: '2', full_name: 'Compatible O+', blood_group: 'O+', latitude: 12.97, longitude: 77.6, is_available: true },
  ];
  const ranked = rankDonors(request, donors, {});
  const exact = ranked.find((r) => r.donorId === '1');
  const compatible = ranked.find((r) => r.donorId === '2');
  assert.ok(exact.totalScore > compatible.totalScore);
});

test('rankDonors places ineligible donors after eligible ones regardless of blood match', () => {
  const request = { blood_group_needed: 'B+', latitude: 12.97, longitude: 77.6 };
  const donors = [
    { id: '1', full_name: 'Unavailable Exact', blood_group: 'B+', latitude: 12.97, longitude: 77.6, is_available: false },
    { id: '2', full_name: 'Available Compatible', blood_group: 'O-', latitude: 12.97, longitude: 77.6, is_available: true },
  ];
  const ranked = rankDonors(request, donors, {});
  assert.strictEqual(ranked[0].donorId, '2');
  assert.strictEqual(ranked[0].eligible, true);
  assert.strictEqual(ranked[1].eligible, false);
});
