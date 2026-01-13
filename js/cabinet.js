const ITEMS_PER_PAGE = 5;

const cabinetState = {
    coursesById: new Map(),
    tutorsById: new Map(),
    orders: [],
    page: 1,
    deleteId: null,
};

function fmtOrderTitle(order) {
    if (order.course_id && cabinetState.coursesById.has(order.course_id)) {
        const c = cabinetState.coursesById.get(order.course_id);
        return `Курс: ${c.name}`;
    }
    
    if (order.tutor_id && cabinetState.tutorsById.has(order.tutor_id)) {
        const t = cabinetState.tutorsById.get(order.tutor_id);
        return `Репетитор: ${t.name}`;
    }
    return '—';
}

function fmtDateTime(order) {
    return `${order.date_start || ''} ${order.time_start || ''}`.trim();
}

function renderOrders() {
    const tbody = document.getElementById('ordersTbody');
    const start = (cabinetState.page - 1) * ITEMS_PER_PAGE;
    const items = cabinetState.orders.slice(start, start + ITEMS_PER_PAGE);

    tbody.innerHTML = '';
    items.forEach((o, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${start + idx + 1}</td>
            <td>${fmtOrderTitle(o)}</td>
            <td>${fmtDateTime(o)}</td>
            <td class="text-end">${o.price ?? ''}</td>
            <td class="text-end">
                <button class="btn btn-outline-secondary btn-sm" data-act="details" data-id="${o.id}">Подробнее</button>
                <button class="btn btn-outline-primary btn-sm" data-act="edit" data-id="${o.id}">Изменить</button>
                <button class="btn btn-outline-danger btn-sm" data-act="delete" data-id="${o.id}">Удалить</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination(
        document.getElementById('ordersPagination'),
        cabinetState.orders.length,
        ITEMS_PER_PAGE,
        cabinetState.page,
        (p) => {
            cabinetState.page = p;
            renderOrders();
        }
    );

    document.querySelectorAll('button[data-act="details"]', tbody).forEach(b =>
        b.addEventListener('click', () => openDetails(Number(b.dataset.id)))
    );
    document.querySelectorAll('button[data-act="delete"]', tbody).forEach(b =>
        b.addEventListener('click', () => openDelete(Number(b.dataset.id)))
    );
    document.querySelectorAll('button[data-act="edit"]', tbody).forEach(b =>
        b.addEventListener('click', () => openEdit(Number(b.dataset.id)))
    );
}

function openDetails(id) {
    const order = cabinetState.orders.find(o => o.id === id);
    if (!order) return;

    const lines = [];
    lines.push(`<div class="fw-semibold mb-2">Заявка #${order.id}</div>`);
    lines.push(`<div><span class="text-secondary">Тип:</span> ${order.course_id ? 'курс' : 'репетитор'}</div>`);
    lines.push(`<div><span class="text-secondary">Дата/время:</span> ${fmtDateTime(order)}</div>`);
    lines.push(`<div><span class="text-secondary">Студентов:</span> ${order.persons}</div>`);
    lines.push(`<div><span class="text-secondary">Стоимость:</span> ${order.price} ₽</div>`);

    if (order.course_id && cabinetState.coursesById.has(order.course_id)) {
        const c = cabinetState.coursesById.get(order.course_id);
        lines.push(`<hr class="my-2">`);
        lines.push(`<div class="fw-semibold">Курс</div>`);
        lines.push(`<div><span class="text-secondary">Название:</span> ${c.name}</div>`);
        lines.push(`<div><span class="text-secondary">Описание:</span> ${c.description}</div>`);
        lines.push(`<div><span class="text-secondary">Преподаватель:</span> ${c.teacher}</div>`);
        lines.push(`<div class="text-secondary small mt-2">Скидки/надбавки (по флагам заявки):</div>`);
    }

    const flags = {
        early_registration: order.early_registration,
        group_enrollment: order.group_enrollment,
        intensive_course: order.intensive_course,
        supplementary: order.supplementary,
        personalized: order.personalized,
        excursions: order.excursions,
        assessment: order.assessment,
        interactive: order.interactive,
    };

    lines.push(`<ul class="mb-0">` +
        Object.entries(flags).map(([k, v]) => `<li><code>${k}</code>: ${v ? 'да' : 'нет'}</li>`).join('') +
        `</ul>`);

    document.getElementById('detailsBody').innerHTML = lines.join('');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('detailsModal')).show();
}

function openDelete(id) {
    cabinetState.deleteId = id;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteModal')).show();
}

async function doDelete() {
    if (!cabinetState.deleteId) return;
    try {
        await schoolAPI.deleteOrder(cabinetState.deleteId);
        cabinetState.orders = cabinetState.orders.filter(o => o.id !== cabinetState.deleteId);
        cabinetState.deleteId = null;
        showAlert('success', 'Заявка удалена.');
        bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteModal')).hide();
        renderOrders();
    } 
    
    catch (e) {
        showAlert('danger', `Ошибка удаления: ${e.message}`);
    }
}

function fillOrderModalForEdit(order) {
    const isCourse = Boolean(order.course_id);
    const course = isCourse ? cabinetState.coursesById.get(order.course_id) : null;
    const tutor = !isCourse ? cabinetState.tutorsById.get(order.tutor_id) : null;

    document.getElementById('orderId').value = String(order.id);
    document.getElementById('orderMode').value = 'edit';
    document.getElementById('orderEntityType').value = isCourse ? 'course' : 'tutor';
    document.getElementById('orderModalTitle').textContent = 'Редактирование заявки';
    document.getElementById('orderCourseName').value = course ? course.name : '';
    document.getElementById('orderTeacherName').value = course ? course.teacher : '';
    document.getElementById('orderTutorName').value = tutor ? tutor.name : '';
    document.getElementById('orderPersons').value = order.persons ?? 1;
    document.getElementById('orderPrice').value = order.price ?? 0;
    document.getElementById('optEarly').checked = Boolean(order.early_registration);
    document.getElementById('optGroup').checked = Boolean(order.group_enrollment);
    document.getElementById('optIntensive').checked = Boolean(order.intensive_course);
    document.getElementById('optSupplementary').checked = Boolean(order.supplementary);
    document.getElementById('optPersonalized').checked = Boolean(order.personalized);
    document.getElementById('optExcursions').checked = Boolean(order.excursions);
    document.getElementById('optAssessment').checked = Boolean(order.assessment);
    document.getElementById('optInteractive').checked = Boolean(order.interactive);

    const dateSel = document.getElementById('orderDateStart');
    const timeSel = document.getElementById('orderTimeStart');

    dateSel.innerHTML = '';
    timeSel.innerHTML = '';
    timeSel.disabled = false;

    if (isCourse && course) {
        const dates = new Set();
        (course.start_dates || []).forEach(iso => dates.add(iso.slice(0, 10)));
        const list = Array.from(dates).sort();

        dateSel.innerHTML = list.map(d => `<option value="${d}">${d}</option>`).join('');
        dateSel.value = order.date_start;

        const updateTimes = () => {
            const d = dateSel.value;
            const times = (course.start_dates || [])
                .filter(iso => iso.startsWith(d))
                .map(iso => iso.slice(11, 16))
                .sort();

            timeSel.innerHTML = times.map(t => {
                const end = addHoursToTime(t, Number(course.week_length || 0));
                return `<option value="${t}">${t} — ${end}</option>`;
            }).join('');

            timeSel.value = order.time_start;
        };

        updateTimes();
        dateSel.onchange = updateTimes;

        const endDate = computeCourseEndDate(order.date_start, Number(course.total_length || 0));
        document.getElementById('orderDurationInfo').value = `${course.total_length} недель, окончание: ${endDate}`;

        document.getElementById('orderDurationHours').value = order.duration ?? (Number(course.total_length || 0) * Number(course.week_length || 0));
        document.getElementById('orderDurationHours').disabled = true;
    } 
    
    else {
        const today = order.date_start || toDateInputValue(new Date());
        dateSel.innerHTML = `<option value="${today}">${today}</option>`;
        dateSel.value = today;

        timeSel.innerHTML = `
            <option value="09:00">09:00</option>
            <option value="12:00">12:00</option>
            <option value="14:00">14:00</option>
            <option value="18:00">18:00</option>
            <option value="19:00">19:00</option>
        `;
        timeSel.value = order.time_start || '12:00';

        document.getElementById('orderDurationInfo').value = 'Занятие с репетитором';
        document.getElementById('orderDurationHours').disabled = false;
        document.getElementById('orderDurationHours').value = order.duration ?? 1;
    }
}

function openEdit(id) {
    const order = cabinetState.orders.find(o => o.id === id);
    if (!order) return;

    fillOrderModalForEdit(order);

    document.getElementById('btnOrderSubmit').onclick = async () => {
        try {
            const orderId = Number(document.getElementById('orderId').value);
            const entityType = document.getElementById('orderEntityType').value;

            const payload = {
                date_start: document.getElementById('orderDateStart').value,
                time_start: document.getElementById('orderTimeStart').value,
                persons: Number(document.getElementById('orderPersons').value || 1),
                duration: Number(document.getElementById('orderDurationHours').value || 1),
                price: Number(document.getElementById('orderPrice').value || 0),
                early_registration: document.getElementById('optEarly').checked,
                group_enrollment: document.getElementById('optGroup').checked,
                intensive_course: document.getElementById('optIntensive').checked,
                supplementary: document.getElementById('optSupplementary').checked,
                personalized: document.getElementById('optPersonalized').checked,
                excursions: document.getElementById('optExcursions').checked,
                assessment: document.getElementById('optAssessment').checked,
                interactive: document.getElementById('optInteractive').checked,
            };

            if (entityType === 'course') {
                payload.course_id = order.course_id;
                payload.tutor_id = 0;
            } 
            
            else {
                payload.tutor_id = order.tutor_id;
                payload.course_id = 0;
            }

            const updated = await schoolAPI.updateOrder(orderId, payload);
            const idx = cabinetState.orders.findIndex(o => o.id === orderId);
            
            if (idx !== -1) cabinetState.orders[idx] = updated;

            showAlert('success', 'Заявка обновлена.');
            bootstrap.Modal.getOrCreateInstance(document.getElementById('orderModal')).hide();
            renderOrders();
        } 
        
        catch (e) {
            showAlert('danger', `Ошибка обновления: ${e.message}`);
        }
    };

    bootstrap.Modal.getOrCreateInstance(document.getElementById('orderModal')).show();
}

async function initCabinet() {
    try {
        document.getElementById('btnDeleteYes').addEventListener('click', doDelete);

        const [courses, tutors] = await Promise.all([
            schoolAPI.getCourses(),
            schoolAPI.getTutors()
        ]);
        
        courses.forEach(c => cabinetState.coursesById.set(c.id, c));
        tutors.forEach(t => cabinetState.tutorsById.set(t.id, t));
        cabinetState.orders = await schoolAPI.getOrders();
        
        renderOrders();
        showAlert('success', 'Заявки загружены.');
    } 
    
    catch (e) {
        showAlert('danger', `Ошибка: ${e.message}`);
    }
}

initCabinet();