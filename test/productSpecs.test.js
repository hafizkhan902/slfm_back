import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSpecs } from '../utils/productSpecs.js';

describe('Product specs card', () => {
  it('keeps admin-authored title and rows', () => {
    const specs = normalizeSpecs({
      title: 'Solid Teak Details',
      items: [
        { label: 'Size', value: '6ft x 3ft' },
        { label: 'Timber', value: 'Chittagong teak' },
        { label: '  ', value: 'ignored' },
        { label: 'Finish', value: '   ' }
      ]
    });

    assert.equal(specs.title, 'Solid Teak Details');
    assert.deepEqual(specs.items, [
      { label: 'Size', value: '6ft x 3ft' },
      { label: 'Timber', value: 'Chittagong teak' }
    ]);
    assert.equal(specs.dimensions, '');
    assert.equal(specs.material, '');
  });

  it('builds rows from older products that only stored four spec fields', () => {
    const specs = normalizeSpecs({
      dimensions: '5ft x 6ft',
      material: 'Melamine board',
      finish: 'Walnut',
      warranty: '2 Years'
    });

    assert.equal(specs.title, 'Specifications');
    assert.deepEqual(specs.items, [
      { label: 'Dimensions', value: '5ft x 6ft' },
      { label: 'Board Type', value: 'Melamine board' },
      { label: 'Finish', value: 'Walnut' },
      { label: 'Warranty', value: '2 Years' }
    ]);
    assert.equal(specs.material, 'Melamine board');
    assert.equal(specs.warranty, '2 Years');
  });

  it('returns an empty card when nothing was saved', () => {
    const specs = normalizeSpecs(null);
    assert.equal(specs.title, 'Specifications');
    assert.deepEqual(specs.items, []);
    assert.equal(specs.dimensions, '');
  });

  it('correctly captures and aligns Material and Dimensions inputs from admin panel', () => {
    const specs = normalizeSpecs({
      title: 'Specifications',
      dimensions: '4ft x 2.5ft x 2.5ft',
      material: 'Solid Chittagong Teak',
      finish: 'Natural Matte',
      warranty: 'Lifetime',
      items: [
        { label: 'Dimensions', value: '4ft x 2.5ft x 2.5ft' },
        { label: 'Material', value: 'Solid Chittagong Teak' },
        { label: 'Finish', value: 'Natural Matte' },
        { label: 'Warranty', value: 'Lifetime' }
      ]
    });

    assert.equal(specs.title, 'Specifications');
    assert.equal(specs.dimensions, '4ft x 2.5ft x 2.5ft');
    assert.equal(specs.material, 'Solid Chittagong Teak');
    assert.equal(specs.finish, 'Natural Matte');
    assert.equal(specs.warranty, 'Lifetime');
    assert.deepEqual(specs.items, [
      { label: 'Dimensions', value: '4ft x 2.5ft x 2.5ft' },
      { label: 'Material', value: 'Solid Chittagong Teak' },
      { label: 'Finish', value: 'Natural Matte' },
      { label: 'Warranty', value: 'Lifetime' }
    ]);
  });
});
