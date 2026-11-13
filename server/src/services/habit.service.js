const mongoose = require('mongoose');
const Habit = require('../models/Habit');
const ApiError = require('../utils/ApiError');
const { CATEGORIES, STATUSES, SORTS } = require('../constants/habits');

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildFilter(userId, { search, category, frequency, status }) {
  const filter = { user: userId };
  if (category) filter.category = category;
  if (frequency) filter.frequency = frequency;
  if (status) filter.status = status;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: pattern }, { description: pattern }];
  }
  return filter;
}

async function list(userId, query) {
  const page = query.page || 1;
  const limit = query.limit || 12;
  const filter = buildFilter(userId, query);

  const [items, total] = await Promise.all([
    Habit.find(filter)
      .sort(SORTS[query.sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit),
    Habit.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function stats(userId) {
  const [result] = await Habit.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byCategory: [{ $group: { _id: '$category', count: { $sum: 1 } } }],
      },
    },
  ]);

  const byStatus = Object.fromEntries(Object.keys(STATUSES).map((key) => [key, 0]));
  result.byStatus.forEach(({ _id, count }) => {
    byStatus[_id] = count;
  });

  const byCategory = Object.fromEntries(Object.keys(CATEGORIES).map((key) => [key, 0]));
  result.byCategory.forEach(({ _id, count }) => {
    byCategory[_id] = count;
  });

  return {
    total: byStatus.active + byStatus.inactive,
    active: byStatus.active,
    inactive: byStatus.inactive,
    byCategory,
  };
}

async function getById(userId, id) {
  const habit = await Habit.findOne({ _id: id, user: userId });
  if (!habit) throw ApiError.notFound('Hábito no encontrado');
  return habit;
}

function create(userId, data) {
  return Habit.create({ ...data, user: userId });
}

async function update(userId, id, data) {
  const habit = await getById(userId, id);
  habit.set(data);
  return habit.save();
}

async function setStatus(userId, id, status) {
  const habit = await getById(userId, id);
  habit.status = status;
  return habit.save();
}

async function remove(userId, id) {
  const habit = await getById(userId, id);
  await habit.deleteOne();
  return habit;
}

module.exports = { list, stats, getById, create, update, setStatus, remove };
