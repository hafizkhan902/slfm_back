import { DeliveryArea } from '../models/DeliveryArea.js';
import { geoApiService } from '../utils/geoApiService.js';

// ==========================================
// 1. BD-GeoAPI Proxy Endpoints (Cached)
// ==========================================

export const getGeoDivisions = async (req, res, next) => {
  try {
    const divisions = await geoApiService.getDivisions();
    res.json({
      success: true,
      count: divisions.length,
      data: divisions
    });
  } catch (err) {
    next(err);
  }
};

export const getGeoDistricts = async (req, res, next) => {
  try {
    const { division } = req.query;
    if (!division) {
      return res.status(400).json({ error: 'Query parameter "division" (Division ID) is required' });
    }
    const districts = await geoApiService.getDistricts(division);
    res.json({
      success: true,
      count: districts.length,
      data: districts
    });
  } catch (err) {
    next(err);
  }
};

export const getGeoUpazilas = async (req, res, next) => {
  try {
    const { district } = req.query;
    if (!district) {
      return res.status(400).json({ error: 'Query parameter "district" (District ID) is required' });
    }
    const upazilas = await geoApiService.getUpazilas(district);
    res.json({
      success: true,
      count: upazilas.length,
      data: upazilas
    });
  } catch (err) {
    next(err);
  }
};

export const searchGeo = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, count: 0, data: [] });
    }
    const results = await geoApiService.search(q);
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 2. Customer / Checkout Endpoints (DB Sourced)
// ==========================================

/**
 * Get all active delivery areas configured in DB
 */
export const getActiveDeliveryAreas = async (req, res, next) => {
  try {
    const areas = await DeliveryArea.find({ isActive: true })
      .sort({ divisionName: 1, districtName: 1, upazilaName: 1 });

    res.json({
      success: true,
      count: areas.length,
      areas
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get active delivery areas structured in a hierarchy for cascading checkout dropdowns
 */
export const getActiveHierarchy = async (req, res, next) => {
  try {
    const areas = await DeliveryArea.find({ isActive: true })
      .sort({ divisionName: 1, districtName: 1, upazilaName: 1 });

    // Group by division -> district -> upazilas
    const divisionMap = new Map();

    for (const area of areas) {
      if (!divisionMap.has(area.divisionId)) {
        divisionMap.set(area.divisionId, {
          id: area.divisionId,
          name: area.divisionName,
          nameBn: area.divisionNameBn || '',
          districts: new Map()
        });
      }

      const divEntry = divisionMap.get(area.divisionId);
      if (!divEntry.districts.has(area.districtId)) {
        divEntry.districts.set(area.districtId, {
          id: area.districtId,
          name: area.districtName,
          nameBn: area.districtNameBn || '',
          divisionId: area.divisionId,
          upazilas: []
        });
      }

      const distEntry = divEntry.districts.get(area.districtId);
      distEntry.upazilas.push({
        id: area.upazilaId,
        areaId: area._id,
        name: area.upazilaName,
        nameBn: area.upazilaNameBn || '',
        districtId: area.districtId,
        deliveryFee: area.deliveryFee,
        estimatedDays: area.estimatedDays || '2-4 business days'
      });
    }

    const divisions = Array.from(divisionMap.values()).map(div => ({
      id: div.id,
      name: div.name,
      nameBn: div.nameBn,
      districts: Array.from(div.districts.values())
    }));

    res.json({
      success: true,
      totalActiveAreas: areas.length,
      divisions
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Validate a specific upazila for checkout
 */
export const validateUpazila = async (req, res, next) => {
  try {
    const upazilaId = Number(req.params.upazilaId);
    if (!upazilaId || isNaN(upazilaId)) {
      return res.status(400).json({ error: 'Valid Upazila ID is required' });
    }

    const area = await DeliveryArea.findOne({ upazilaId, isActive: true });
    if (!area) {
      return res.status(404).json({
        valid: false,
        error: 'Delivery is currently unavailable in the selected upazila'
      });
    }

    res.json({
      valid: true,
      area: {
        id: area._id,
        upazilaId: area.upazilaId,
        upazilaName: area.upazilaName,
        districtId: area.districtId,
        districtName: area.districtName,
        divisionId: area.divisionId,
        divisionName: area.divisionName,
        deliveryFee: area.deliveryFee,
        estimatedDays: area.estimatedDays
      }
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 3. Admin Delivery Areas Management Endpoints
// ==========================================

/**
 * Get all configured delivery areas (with filters, search, and metrics)
 */
export const getAllDeliveryAreas = async (req, res, next) => {
  try {
    const { search, divisionId, districtId, isActive } = req.query;

    const query = {};

    if (isActive !== undefined && isActive !== 'all' && isActive !== '') {
      query.isActive = isActive === 'true' || isActive === true;
    }

    if (divisionId && divisionId !== 'all') {
      query.divisionId = Number(divisionId);
    }

    if (districtId && districtId !== 'all') {
      query.districtId = Number(districtId);
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { divisionName: { $regex: term, $options: 'i' } },
        { districtName: { $regex: term, $options: 'i' } },
        { upazilaName: { $regex: term, $options: 'i' } },
        { divisionNameBn: { $regex: term, $options: 'i' } },
        { districtNameBn: { $regex: term, $options: 'i' } },
        { upazilaNameBn: { $regex: term, $options: 'i' } }
      ];
    }

    const areas = await DeliveryArea.find(query).sort({
      divisionName: 1,
      districtName: 1,
      upazilaName: 1
    });

    const totalCount = await DeliveryArea.countDocuments();
    const activeCount = await DeliveryArea.countDocuments({ isActive: true });
    const inactiveCount = totalCount - activeCount;

    const avgFeeAgg = await DeliveryArea.aggregate([
      { $group: { _id: null, avgFee: { $avg: '$deliveryFee' } } }
    ]);
    const avgFee = avgFeeAgg.length > 0 ? Math.round(avgFeeAgg[0].avgFee) : 0;

    res.json({
      success: true,
      count: areas.length,
      metrics: {
        totalCount,
        activeCount,
        inactiveCount,
        avgFee
      },
      areas
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add or bulk-add delivery areas with duplicate prevention
 */
export const createDeliveryAreas = async (req, res, next) => {
  try {
    const payload = req.body;
    const areasInput = Array.isArray(payload.areas)
      ? payload.areas
      : (Array.isArray(payload) ? payload : [payload]);

    if (!areasInput || areasInput.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one delivery area to configure' });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const savedAreas = [];

    for (const item of areasInput) {
      const upazilaId = Number(item.upazilaId);
      const districtId = Number(item.districtId);
      const divisionId = Number(item.divisionId);

      if (!upazilaId || !districtId || !divisionId) {
        continue;
      }

      const fee = Number(item.deliveryFee !== undefined ? item.deliveryFee : (payload.commonDeliveryFee || 120));
      const active = item.isActive !== undefined ? Boolean(item.isActive) : true;
      const estimatedDays = item.estimatedDays ? String(item.estimatedDays).trim() : '2-4 business days';

      // Check for existing configuration by upazilaId (primary geographic unique identifier)
      const existing = await DeliveryArea.findOne({ upazilaId });

      if (existing) {
        existing.deliveryFee = fee;
        existing.isActive = active;
        existing.estimatedDays = estimatedDays;
        if (item.divisionName) existing.divisionName = item.divisionName;
        if (item.divisionNameBn) existing.divisionNameBn = item.divisionNameBn;
        if (item.districtName) existing.districtName = item.districtName;
        if (item.districtNameBn) existing.districtNameBn = item.districtNameBn;
        if (item.upazilaName) existing.upazilaName = item.upazilaName;
        if (item.upazilaNameBn) existing.upazilaNameBn = item.upazilaNameBn;

        await existing.save();
        savedAreas.push(existing);
        updatedCount++;
      } else {
        const newArea = await DeliveryArea.create({
          divisionId,
          divisionName: String(item.divisionName || '').trim(),
          divisionNameBn: String(item.divisionNameBn || '').trim(),
          districtId,
          districtName: String(item.districtName || '').trim(),
          districtNameBn: String(item.districtNameBn || '').trim(),
          upazilaId,
          upazilaName: String(item.upazilaName || '').trim(),
          upazilaNameBn: String(item.upazilaNameBn || '').trim(),
          deliveryFee: fee,
          estimatedDays,
          isActive: active
        });
        savedAreas.push(newArea);
        createdCount++;
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully configured ${savedAreas.length} delivery area(s) (${createdCount} added, ${updatedCount} updated)`,
      createdCount,
      updatedCount,
      areas: savedAreas
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update a specific delivery area
 */
export const updateDeliveryArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryFee, isActive, estimatedDays, upazilaName, upazilaNameBn } = req.body;

    const area = await DeliveryArea.findOne({
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { upazilaId: !isNaN(Number(id)) ? Number(id) : null }
      ].filter(Boolean)
    });

    if (!area) {
      return res.status(404).json({ error: `Delivery area "${id}" not found` });
    }

    if (deliveryFee !== undefined) area.deliveryFee = Number(deliveryFee);
    if (isActive !== undefined) area.isActive = Boolean(isActive);
    if (estimatedDays !== undefined) area.estimatedDays = String(estimatedDays).trim();
    if (upazilaName !== undefined) area.upazilaName = String(upazilaName).trim();
    if (upazilaNameBn !== undefined) area.upazilaNameBn = String(upazilaNameBn).trim();

    await area.save();

    res.json({
      success: true,
      message: `Delivery area "${area.upazilaName}" updated successfully`,
      area
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle active status for a specific area
 */
export const toggleDeliveryAreaStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const area = await DeliveryArea.findOne({
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { upazilaId: !isNaN(Number(id)) ? Number(id) : null }
      ].filter(Boolean)
    });

    if (!area) {
      return res.status(404).json({ error: `Delivery area "${id}" not found` });
    }

    area.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !area.isActive;
    await area.save();

    res.json({
      success: true,
      message: `Delivery area "${area.upazilaName}" is now ${area.isActive ? 'Active' : 'Inactive'}`,
      area
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk update delivery fees for selected areas
 */
export const bulkUpdateFee = async (req, res, next) => {
  try {
    const { ids, deliveryFee } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || deliveryFee === undefined) {
      return res.status(400).json({ error: 'Array of "ids" and "deliveryFee" number are required' });
    }

    const fee = Number(deliveryFee);
    if (isNaN(fee) || fee < 0) {
      return res.status(400).json({ error: 'Valid non-negative deliveryFee is required' });
    }

    const result = await DeliveryArea.updateMany(
      {
        $or: [
          { _id: { $in: ids.filter(id => String(id).match(/^[0-9a-fA-F]{24}$/)) } },
          { upazilaId: { $in: ids.map(id => Number(id)).filter(n => !isNaN(n)) } }
        ]
      },
      { $set: { deliveryFee: fee } }
    );

    res.json({
      success: true,
      message: `Updated delivery fee to ৳${fee} for ${result.modifiedCount} area(s)`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk update active status for selected areas
 */
export const bulkUpdateStatus = async (req, res, next) => {
  try {
    const { ids, isActive } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || isActive === undefined) {
      return res.status(400).json({ error: 'Array of "ids" and "isActive" boolean are required' });
    }

    const active = Boolean(isActive);

    const result = await DeliveryArea.updateMany(
      {
        $or: [
          { _id: { $in: ids.filter(id => String(id).match(/^[0-9a-fA-F]{24}$/)) } },
          { upazilaId: { $in: ids.map(id => Number(id)).filter(n => !isNaN(n)) } }
        ]
      },
      { $set: { isActive: active } }
    );

    res.json({
      success: true,
      message: `${active ? 'Activated' : 'Deactivated'} ${result.modifiedCount} delivery area(s)`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a specific delivery area
 */
export const deleteDeliveryArea = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await DeliveryArea.findOneAndDelete({
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { upazilaId: !isNaN(Number(id)) ? Number(id) : null }
      ].filter(Boolean)
    });

    if (!deleted) {
      return res.status(404).json({ error: `Delivery area "${id}" not found` });
    }

    res.json({
      success: true,
      message: `Delivery area "${deleted.upazilaName}" deleted successfully`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk delete delivery areas
 */
export const bulkDeleteDeliveryAreas = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Array of "ids" is required for bulk deletion' });
    }

    const result = await DeliveryArea.deleteMany({
      $or: [
        { _id: { $in: ids.filter(id => String(id).match(/^[0-9a-fA-F]{24}$/)) } },
        { upazilaId: { $in: ids.map(id => Number(id)).filter(n => !isNaN(n)) } }
      ]
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} delivery area(s) from database`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    next(err);
  }
};
