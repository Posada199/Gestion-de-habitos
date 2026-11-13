/* Módulo de gestión de hábitos del dashboard: listado, búsqueda, filtros y formularios. */
const HabitsModule = (() => {
  const PAGE_SIZE = 9;
  const FREQUENCY_PERIOD = { daily: 'por día', weekly: 'por semana', monthly: 'por mes' };

  const els = {
    list: document.getElementById('habit-list'),
    summary: document.getElementById('results-summary'),
    emptyState: document.getElementById('empty-state'),
    noResults: document.getElementById('no-results'),
    listAlert: document.getElementById('list-alert'),
    filters: document.getElementById('filters'),
    clearFilters: document.getElementById('clear-filters'),
    pagination: document.getElementById('pagination'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    pageInfo: document.getElementById('page-info'),
    habitDialog: document.getElementById('habit-dialog'),
    habitForm: document.getElementById('habit-form'),
    habitFormAlert: document.getElementById('habit-form-alert'),
    habitDialogTitle: document.getElementById('habit-dialog-title'),
    habitSubmit: document.getElementById('habit-submit'),
    descriptionCount: document.getElementById('description-count'),
    goalPreview: document.getElementById('goal-preview'),
    detailDialog: document.getElementById('detail-dialog'),
    confirmDialog: document.getElementById('confirm-dialog'),
    confirmName: document.getElementById('confirm-name'),
    confirmDelete: document.getElementById('confirm-delete'),
    toasts: document.getElementById('toasts'),
  };

  const state = {
    labels: { categories: {}, frequencies: {}, statuses: {} },
    filters: { search: '', category: '', frequency: '', status: '', sort: 'newest' },
    page: 1,
    habits: new Map(),
    editingId: null,
    detailId: null,
    deletingId: null,
    requestId: 0,
  };

  /* ---------- Utilidades ---------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatDate(value) {
    return new Date(value).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function goalText(goal, frequency) {
    let unit = goal.unit || 'veces';
    if (goal.target === 1 && unit === 'veces') unit = 'vez';
    return `${goal.target} ${unit} ${FREQUENCY_PERIOD[frequency] || ''}`.trim();
  }

  function toast(message, type = 'success') {
    const node = el('div', `toast toast-${type}`, message);
    node.setAttribute('role', 'status');
    els.toasts.appendChild(node);
    setTimeout(() => node.remove(), 3500);
  }

  function handleError(error, fallbackEl) {
    if (error.status === 401) {
      logout('Tu sesión expiró. Inicia sesión de nuevo.', 'warning');
      return;
    }
    if (fallbackEl) {
      Form.showAlert(fallbackEl, error.message);
    } else {
      toast(error.message, 'error');
    }
  }

  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  function fillSelect(select, options) {
    options.forEach(({ value, label }) => select.appendChild(new Option(label, value)));
  }

  /* ---------- Estadísticas ---------- */
  async function loadStats() {
    try {
      const { data } = await HabitsAPI.stats();
      document.getElementById('stat-total').textContent = data.total;
      document.getElementById('stat-active').textContent = data.active;
      document.getElementById('stat-inactive').textContent = data.inactive;
      return data;
    } catch (error) {
      handleError(error);
      return null;
    }
  }

  /* ---------- Listado ---------- */
  function hasActiveFilters() {
    const { search, category, frequency, status } = state.filters;
    return Boolean(search || category || frequency || status);
  }

  function renderCard(habit) {
    const card = el('article', `habit-card${habit.status === 'inactive' ? ' habit-card--inactive' : ''}`);
    card.dataset.id = habit.id;
    card.dataset.category = habit.category;

    const badges = el('div', 'habit-card__badges');
    const category = el('span', 'badge', state.labels.categories[habit.category] || habit.category);
    category.dataset.category = habit.category;
    const status = el('span', `status-pill status-pill--${habit.status}`, state.labels.statuses[habit.status]);
    badges.append(category, status);

    const title = el('h3', 'habit-card__title', habit.name);
    const description = el('p', 'habit-card__description', habit.description || 'Sin descripción');
    if (!habit.description) description.classList.add('is-empty');

    const meta = el('dl', 'habit-card__meta');
    [
      ['Frecuencia', state.labels.frequencies[habit.frequency]],
      ['Meta', goalText(habit.goal, habit.frequency)],
      ['Creado', formatDate(habit.createdAt)],
    ].forEach(([term, value]) => {
      const row = el('div');
      row.append(el('dt', '', term), el('dd', '', value));
      meta.appendChild(row);
    });

    const footer = el('div', 'habit-card__footer');
    const toggle = el('label', 'switch');
    const checkbox = el('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('role', 'switch');
    checkbox.checked = habit.status === 'active';
    checkbox.dataset.action = 'toggle';
    checkbox.setAttribute('aria-label', `${checkbox.checked ? 'Desactivar' : 'Activar'} ${habit.name}`);
    toggle.append(checkbox, el('span', 'switch__track'), el('span', 'switch__label', checkbox.checked ? 'Activo' : 'Inactivo'));

    const actions = el('div', 'habit-card__actions');
    [
      ['view', 'Ver', 'btn-ghost'],
      ['edit', 'Editar', 'btn-ghost'],
      ['delete', 'Eliminar', 'btn-ghost btn-ghost--danger'],
    ].forEach(([action, label, variant]) => {
      const button = el('button', `btn btn-sm ${variant}`, label);
      button.type = 'button';
      button.dataset.action = action;
      button.setAttribute('aria-label', `${label} ${habit.name}`);
      actions.appendChild(button);
    });

    footer.append(toggle, actions);
    card.append(badges, title, description, meta, footer);
    return card;
  }

  function renderList({ habits, pagination }) {
    state.habits = new Map(habits.map((habit) => [habit.id, habit]));
    els.list.replaceChildren(...habits.map(renderCard));
    els.list.setAttribute('aria-busy', 'false');

    const empty = pagination.total === 0;
    els.emptyState.hidden = !(empty && !hasActiveFilters());
    els.noResults.hidden = !(empty && hasActiveFilters());
    els.clearFilters.hidden = !hasActiveFilters();

    els.summary.textContent = empty
      ? ''
      : `${pagination.total} ${pagination.total === 1 ? 'hábito' : 'hábitos'}${
          hasActiveFilters() ? (pagination.total === 1 ? ' encontrado' : ' encontrados') : ''
        }`;

    els.pagination.hidden = pagination.pages <= 1;
    els.pageInfo.textContent = `Página ${pagination.page} de ${pagination.pages}`;
    els.prevPage.disabled = pagination.page <= 1;
    els.nextPage.disabled = pagination.page >= pagination.pages;
  }

  async function loadHabits() {
    const requestId = ++state.requestId;
    els.list.setAttribute('aria-busy', 'true');
    Form.hideAlert(els.listAlert);
    try {
      const { data } = await HabitsAPI.list({ ...state.filters, page: state.page, limit: PAGE_SIZE });
      if (requestId !== state.requestId) return;
      if (data.habits.length === 0 && state.page > 1 && data.pagination.total > 0) {
        state.page = data.pagination.pages;
        loadHabits();
        return;
      }
      renderList(data);
    } catch (error) {
      if (requestId === state.requestId) handleError(error, els.listAlert);
    }
  }

  function refresh() {
    return Promise.all([loadHabits(), loadStats()]);
  }

  function applyFilters() {
    const formData = new FormData(els.filters);
    state.filters = {
      search: formData.get('search').trim(),
      category: formData.get('category'),
      frequency: formData.get('frequency'),
      status: formData.get('status'),
      sort: formData.get('sort'),
    };
    state.page = 1;
    loadHabits();
  }

  /* ---------- Formulario de creación / edición ---------- */
  function updateFormHints() {
    const form = els.habitForm;
    els.descriptionCount.textContent = form.elements.description.value.length;
    const target = Number(form.elements['goal.target'].value);
    const frequency = form.elements.frequency.value;
    els.goalPreview.textContent =
      Number.isInteger(target) && target > 0 && frequency
        ? `Meta: ${goalText({ target, unit: form.elements['goal.unit'].value.trim() }, frequency)}`
        : '';
  }

  function openForm(habit = null) {
    const form = els.habitForm;
    state.editingId = habit ? habit.id : null;
    form.reset();
    Form.clearErrors(form);
    Form.hideAlert(els.habitFormAlert);

    els.habitDialogTitle.textContent = habit ? 'Editar hábito' : 'Nuevo hábito';
    els.habitSubmit.textContent = habit ? 'Guardar cambios' : 'Crear hábito';
    delete els.habitSubmit.dataset.label;

    if (habit) {
      form.elements.name.value = habit.name;
      form.elements.description.value = habit.description || '';
      form.elements.category.value = habit.category;
      form.elements.frequency.value = habit.frequency;
      form.elements['goal.target'].value = habit.goal.target;
      form.elements['goal.unit'].value = habit.goal.unit || '';
      form.elements.status.value = habit.status;
    }

    updateFormHints();
    els.habitDialog.showModal();
    form.elements.name.focus();
  }

  function readForm() {
    const form = els.habitForm;
    return {
      name: form.elements.name.value.trim(),
      description: form.elements.description.value.trim(),
      category: form.elements.category.value,
      frequency: form.elements.frequency.value,
      goal: {
        target: form.elements['goal.target'].value === '' ? NaN : Number(form.elements['goal.target'].value),
        unit: form.elements['goal.unit'].value.trim() || 'veces',
      },
      status: form.elements.status.value,
    };
  }

  function validateForm(payload) {
    const errors = {};
    if (payload.name.length < 2 || payload.name.length > 80) {
      errors.name = 'El nombre debe tener entre 2 y 80 caracteres';
    }
    if (payload.description.length > 300) errors.description = 'La descripción no puede superar 300 caracteres';
    if (!payload.category) errors.category = 'Selecciona una categoría';
    if (!payload.frequency) errors.frequency = 'Selecciona una frecuencia';
    if (!Number.isInteger(payload.goal.target) || payload.goal.target < 1 || payload.goal.target > 1000) {
      errors['goal.target'] = 'La meta debe ser un número entero entre 1 y 1000';
    }
    if (payload.goal.unit.length > 30) errors['goal.unit'] = 'La unidad no puede superar 30 caracteres';
    return errors;
  }

  async function submitForm(event) {
    event.preventDefault();
    const form = els.habitForm;
    Form.clearErrors(form);
    Form.hideAlert(els.habitFormAlert);

    const payload = readForm();
    const errors = validateForm(payload);
    const fields = Object.keys(errors);
    if (fields.length) {
      fields.forEach((field) => Form.setFieldError(form, field, errors[field]));
      form.elements[fields[0]].focus();
      return;
    }

    const editing = Boolean(state.editingId);
    Form.setLoading(els.habitSubmit, true, 'Guardando...');
    try {
      const { message } = editing
        ? await HabitsAPI.update(state.editingId, payload)
        : await HabitsAPI.create(payload);
      els.habitDialog.close();
      toast(message);
      if (!editing) state.page = 1;
      await refresh();
    } catch (error) {
      if (error.status === 400 && error.details.length) {
        Form.applyServerErrors(form, error);
      } else if (error.status === 404) {
        els.habitDialog.close();
        toast('El hábito ya no existe', 'error');
        refresh();
      } else {
        handleError(error, els.habitFormAlert);
      }
    } finally {
      Form.setLoading(els.habitSubmit, false);
    }
  }

  /* ---------- Consultar ---------- */
  async function openDetail(id) {
    try {
      const { data } = await HabitsAPI.get(id);
      const { habit } = data;
      state.detailId = habit.id;
      state.habits.set(habit.id, habit);

      const category = document.getElementById('detail-category');
      category.textContent = state.labels.categories[habit.category];
      category.dataset.category = habit.category;
      const status = document.getElementById('detail-status');
      status.textContent = state.labels.statuses[habit.status];
      status.className = `status-pill status-pill--${habit.status}`;
      document.getElementById('detail-name').textContent = habit.name;
      const description = document.getElementById('detail-description');
      description.textContent = habit.description || 'Sin descripción';
      description.classList.toggle('is-empty', !habit.description);
      document.getElementById('detail-frequency').textContent = state.labels.frequencies[habit.frequency];
      document.getElementById('detail-goal').textContent = goalText(habit.goal, habit.frequency);
      document.getElementById('detail-created').textContent = formatDate(habit.createdAt);
      document.getElementById('detail-updated').textContent = formatDate(habit.updatedAt);
      els.detailDialog.showModal();
    } catch (error) {
      if (error.status === 404) {
        toast('El hábito ya no existe', 'error');
        refresh();
      } else {
        handleError(error);
      }
    }
  }

  /* ---------- Activar / desactivar ---------- */
  async function toggleStatus(id, checkbox) {
    const status = checkbox.checked ? 'active' : 'inactive';
    checkbox.disabled = true;
    try {
      const { message } = await HabitsAPI.setStatus(id, status);
      toast(message);
      await refresh();
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      checkbox.disabled = false;
      handleError(error);
    }
  }

  /* ---------- Eliminar ---------- */
  function openDelete(habit) {
    state.deletingId = habit.id;
    els.confirmName.textContent = habit.name;
    els.confirmDialog.showModal();
  }

  async function confirmDelete() {
    Form.setLoading(els.confirmDelete, true, 'Eliminando...');
    try {
      const { message } = await HabitsAPI.remove(state.deletingId);
      els.confirmDialog.close();
      toast(message);
      await refresh();
    } catch (error) {
      els.confirmDialog.close();
      handleError(error);
      if (error.status === 404) refresh();
    } finally {
      Form.setLoading(els.confirmDelete, false);
    }
  }

  /* ---------- Eventos ---------- */
  function bindEvents() {
    document.getElementById('new-habit-btn').addEventListener('click', () => openForm());
    document.getElementById('empty-new-btn').addEventListener('click', () => openForm());

    const debouncedFilter = debounce(applyFilters, 300);
    els.filters.addEventListener('input', (event) => {
      if (event.target.name === 'search') debouncedFilter();
    });
    els.filters.addEventListener('change', (event) => {
      if (event.target.tagName === 'SELECT') applyFilters();
    });
    els.filters.addEventListener('submit', (event) => {
      event.preventDefault();
      applyFilters();
    });
    els.clearFilters.addEventListener('click', () => {
      els.filters.reset();
      applyFilters();
    });

    els.prevPage.addEventListener('click', () => {
      state.page -= 1;
      loadHabits();
    });
    els.nextPage.addEventListener('click', () => {
      state.page += 1;
      loadHabits();
    });

    els.list.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const { id } = button.closest('.habit-card').dataset;
      const habit = state.habits.get(id);
      if (button.dataset.action === 'view') openDetail(id);
      if (button.dataset.action === 'edit') openForm(habit);
      if (button.dataset.action === 'delete') openDelete(habit);
    });
    els.list.addEventListener('change', (event) => {
      if (event.target.dataset.action !== 'toggle') return;
      toggleStatus(event.target.closest('.habit-card').dataset.id, event.target);
    });

    els.habitForm.addEventListener('submit', submitForm);
    els.habitForm.addEventListener('input', (event) => {
      if (event.target.name) Form.setFieldError(els.habitForm, event.target.name, '');
      updateFormHints();
    });
    document.getElementById('detail-edit').addEventListener('click', () => {
      const habit = state.habits.get(state.detailId);
      els.detailDialog.close();
      if (habit) openForm(habit);
    });
    els.confirmDelete.addEventListener('click', confirmDelete);

    document.querySelectorAll('dialog').forEach((dialog) => {
      dialog.addEventListener('click', (event) => {
        if (event.target.closest('[data-close]')) {
          dialog.close();
          return;
        }
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const outside =
          event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
        if (outside) dialog.close();
      });
    });
  }

  async function init() {
    const { data } = await HabitsAPI.options();
    state.labels.categories = Object.fromEntries(data.categories.map((o) => [o.value, o.label]));
    state.labels.frequencies = Object.fromEntries(data.frequencies.map((o) => [o.value, o.label]));
    state.labels.statuses = Object.fromEntries(data.statuses.map((o) => [o.value, o.label]));

    fillSelect(document.getElementById('filter-category'), data.categories);
    fillSelect(document.getElementById('filter-frequency'), data.frequencies);
    fillSelect(document.getElementById('filter-status'), data.statuses);
    fillSelect(document.getElementById('habit-category'), data.categories);
    fillSelect(document.getElementById('habit-frequency'), data.frequencies);

    bindEvents();
    await refresh();
  }

  return { init };
})();
