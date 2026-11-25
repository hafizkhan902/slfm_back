const LEGACY_ROWS = [
  ['dimensions', 'Dimensions'],
  ['material', 'Board Type'],
  ['finish', 'Finish'],
  ['warranty', 'Warranty']
];

function cleanRow(row) {
  return {
    label: String(row?.label || '').trim(),
    value: String(row?.value || '').trim()
  };
}

/**
 * The product-page specs card is stored as a title plus label/value rows.
 * Older products only have dimensions, material, finish, and warranty.
 * Those four fields are rebuilt from the rows on save so both shapes stay in sync.
 */
export function normalizeSpecs(input) {
  const src = input && typeof input === 'object' ? input : {};
  const title = String(src.title || '').trim() || 'Specifications';

  let items = Array.isArray(src.items) ? src.items.map(cleanRow).filter((row) => row.label && row.value) : [];

  if (items.length === 0) {
    items = LEGACY_ROWS
      .map(([key, label]) => ({ label, value: String(src[key] || '').trim() }))
      .filter((row) => row.value);
  }

  const valueFor = (...labels) => {
    const wanted = labels.map((label) => label.toLowerCase());
    const match = items.find((row) => wanted.includes(row.label.toLowerCase()));
    return match ? match.value : '';
  };

  return {
    title,
    items,
    dimensions: valueFor('Dimensions') || String(src.dimensions || '').trim(),
    material: valueFor('Board Type', 'Material') || String(src.material || '').trim(),
    finish: valueFor('Finish') || String(src.finish || '').trim(),
    warranty: valueFor('Warranty') || String(src.warranty || '').trim()
  };
}
