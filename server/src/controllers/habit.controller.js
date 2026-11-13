const { matchedData } = require('express-validator');
const habitService = require('../services/habit.service');
const { CATEGORIES, FREQUENCIES, STATUSES, SORTS } = require('../constants/habits');

function toOptions(map) {
  return Object.entries(map).map(([value, label]) => ({ value, label }));
}

function options(req, res) {
  res.json({
    success: true,
    data: {
      categories: toOptions(CATEGORIES),
      frequencies: toOptions(FREQUENCIES),
      statuses: toOptions(STATUSES),
      sorts: Object.keys(SORTS),
    },
  });
}

async function list(req, res) {
  const query = matchedData(req, { locations: ['query'] });
  const { items, pagination } = await habitService.list(req.user.id, query);
  res.json({ success: true, data: { habits: items, pagination } });
}

async function stats(req, res) {
  const data = await habitService.stats(req.user.id);
  res.json({ success: true, data });
}

async function getOne(req, res) {
  const habit = await habitService.getById(req.user.id, req.params.id);
  res.json({ success: true, data: { habit } });
}

async function create(req, res) {
  const habit = await habitService.create(req.user.id, matchedData(req, { locations: ['body'] }));
  res.status(201).json({ success: true, message: 'Hábito creado correctamente', data: { habit } });
}

async function update(req, res) {
  const habit = await habitService.update(req.user.id, req.params.id, matchedData(req, { locations: ['body'] }));
  res.json({ success: true, message: 'Hábito actualizado correctamente', data: { habit } });
}

async function setStatus(req, res) {
  const habit = await habitService.setStatus(req.user.id, req.params.id, req.body.status);
  const message = habit.status === 'active' ? 'Hábito activado' : 'Hábito desactivado';
  res.json({ success: true, message, data: { habit } });
}

async function remove(req, res) {
  await habitService.remove(req.user.id, req.params.id);
  res.json({ success: true, message: 'Hábito eliminado correctamente' });
}

module.exports = { options, list, stats, getOne, create, update, setStatus, remove };
