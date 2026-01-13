const ITEMS_PER_PAGE = 5;

const appState = {
    courses: [],
    tutors: [],
    selectedCourseId: null,
    selectedTutorId: null,
    coursesPage: 1,
};

function courseMatchesFilters(c) {
    const q = document.getElementById('courseSearchName').value.trim().toLowerCase();
    const level = document.getElementById('courseSearchLevel').value;
    const okName = !q || (c.name || '').toLowerCase().includes(q);
    const okLevel = !level || c.level === level;
    return okName && okLevel;
}

function tutorMatchesFilters(t) {
    const lang = document.getElementById('tutorFilterLanguage').value;
    const level = document.getElementById('tutorFilterLevel').value;
    const minExp = Number(document.getElementById('tutorFilterExp').value || 0);
    const okLang = !lang || (t.languages_offered || []).includes(lang);
    const okLevel = !level || t.language_level === level;
    const okExp = Number(t.work_experience || 0) >= minExp;
    return okLang && okLevel && okExp;
}

function getSelectedCourse() {
    return appState.courses.find(c => c.id === appState.selectedCourseId) || null;
}

function getSelectedTutor() {
    return appState.tutors.find(t => t.id === appState.selectedTutorId) || null;
}

function updateOrderButtonState() {
    const btn = document.getElementById('btnOpenOrder');
    btn.disabled = !appState.selectedCourseId && !appState.selectedTutorId;
}

function renderCourses() {
    const tbody = document.getElementById('coursesTbody');
    const filtered = appState.courses.filter(courseMatchesFilters);
    const start = (appState.coursesPage - 1) * ITEMS_PER_PAGE;
    const items = filtered.slice(start, start + ITEMS_PER_PAGE);

    tbody.innerHTML = '';
    items.forEach((c, idx) => {
        const tr = document.createElement('tr');
        
        if (c.id === appState.selectedCourseId) tr.classList.add('is-selected');

        tr.innerHTML = `
            <td>${start + idx + 1}</td>
            <td>
                <div class="fw-semibold">${c.name}</div>
                <div class="text-secondary small text-truncate" style="max-width: 520px;" title="${(c.description || '').replaceAll('"', '&quot;')}">
                    ${(c.description || '').slice(0, 90)}${(c.description || '').length > 90 ? '…' : ''}
                </div>
            </td>
            <td>${c.level || ''}</td>
            <td>${c.teacher || ''}</td>
            <td class="text-end">${c.course_fee_per_hour ?? ''}</td>
            <td class="text-end">
                <button class="btn btn-outline-primary btn-sm" data-action="select" data-id="${c.id}">Выбрать</button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    const pag = document.getElementById('coursesPagination');
    renderPagination(pag, filtered.length, ITEMS_PER_PAGE, appState.coursesPage, (p) => {
        appState.coursesPage = p;
        renderCourses();
    });

    document.querySelectorAll('button[data-action="select"]', tbody).forEach(btn => {
        btn.addEventListener('click', () => {
            appState.selectedCourseId = Number(btn.dataset.id);
            appState.selectedTutorId = null;
            appState.coursesPage = 1;
            renderCourses();
            renderTutors();
            updateOrderButtonState();
            showAlert('primary', 'Курс выбран. Можно оформить заявку!');
        });
    });
}

function fillTutorLanguageSelect() {
    const select = document.getElementById('tutorFilterLanguage');
    const langs = new Set();
    appState.tutors.forEach(t => (t.languages_offered || []).forEach(l => langs.add(l)));
    const cur = select.value;
    select.innerHTML = '<option value="">Любой</option>' + Array.from(langs).sort().map(l => (
        `<option value="${l}">${l}</option>`
    )).join('');
    select.value = cur;
}

function renderTutors() {
    const tbody = document.getElementById('tutorsTbody');
    const filtered = appState.tutors.filter(tutorMatchesFilters);
    tbody.innerHTML = '';
    filtered.forEach((t, idx) => {
        const tr = document.createElement('tr');
        
        if (t.id === appState.selectedTutorId) tr.classList.add('is-selected');

        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td class="fw-semibold">${t.name}</td>
            <td>${t.language_level || ''}</td>
            <td class="small">${(t.languages_spoken || []).join(', ')}</td>
            <td class="small">${(t.languages_offered || []).join(', ')}</td>
            <td>${t.work_experience ?? ''}</td>
            <td class="text-end">${t.price_per_hour ?? ''}</td>
            <td class="text-end">
                <button class="btn btn-outline-primary btn-sm" data-action="selectTutor" data-id="${t.id}">Выбрать</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('button[data-action="selectTutor"]', tbody).forEach(btn => {
        btn.addEventListener('click', () => {
            appState.selectedTutorId = Number(btn.dataset.id);
            appState.selectedCourseId = null;
            renderCourses();
            renderTutors();
            updateOrderButtonState();
            showAlert('primary', 'Репетитор выбран. Можно оформить заявку!');
        });
    });
}

function getCourseTotalHours(course) {
    const weeks = Number(course.total_length || 0);
    const hoursPerWeek = Number(course.week_length || 0);
    return weeks * hoursPerWeek;
}

function computeCourseEndDate(dateStart, totalWeeks) {
    const d = parseISODateOnly(dateStart);
    d.setDate(d.getDate() + Math.max(0, totalWeeks - 1) * 7);
    return toDateInputValue(d);
}

function isWeekend(dateStart) {
    const d = parseISODateOnly(dateStart);
    const day = d.getDay();
    return day === 0 || day === 6;
}

function calcCoursePrice(course, form) {
    const dateStart = form.dateStart;
    const timeStart = form.timeStart;
    const persons = Math.max(1, Math.min(20, Number(form.persons || 1)));
    const fee = Number(course.course_fee_per_hour || 0);
    const durationHours = getCourseTotalHours(course);
    const weekendMultiplier = isWeekend(dateStart) ? 1.5 : 1;
    const t = parseTimeHHMM(timeStart);
    const minutes = t.h * 60 + t.m;
    const morningSurcharge = (minutes >= 9 * 60 && minutes < 12 * 60) ? 400 : 0;
    const eveningSurcharge = (minutes >= 18 * 60 && minutes < 20 * 60) ? 1000 : 0;

    let total = ((fee * durationHours * weekendMultiplier) + morningSurcharge + eveningSurcharge) * persons;

    const now = new Date();
    const startD = parseISODateOnly(dateStart);
    const diffDays = Math.floor((startD - now) / (1000 * 60 * 60 * 24));
    const early = diffDays >= 30;
    const group = persons >= 5;
    const intensive = Number(course.week_length || 0) >= 5;

    if (intensive) total *= 1.2;
    if (form.excursions) total *= 1.25;
    if (form.interactive) total *= 1.5;

    if (form.supplementary) total += 2000 * persons;
    if (form.personalized) total += 1500 * Number(course.total_length || 0);
    if (form.assessment) total += 300;

    if (early) total *= 0.9;
    if (group) total *= 0.85;

    return {
        price: Math.round(total),
        flags: { early, group, intensive },
        durationHours,
    };
}

function calcTutorPrice(tutor, form) {
    const persons = Math.max(1, Math.min(20, Number(form.persons || 1)));
    const duration = Math.max(1, Math.min(40, Number(form.durationHours || 1)));
    const fee = Number(tutor.price_per_hour || 0);

    let total = fee * duration * persons;

    if (form.excursions) total *= 1.25;
    if (form.interactive) total *= 1.5;
    if (form.supplementary) total += 2000 * persons;
    if (form.assessment) total += 300;

    return { price: Math.round(total), flags: { early: false, group: persons >= 5, intensive: duration >= 5 }, durationHours: duration };
}

function openOrderModalCreate() {
    const course = getSelectedCourse();
    const tutor = getSelectedTutor();
    const modalEl = document.getElementById('orderModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    document.getElementById('orderId').value = '';
    document.getElementById('orderMode').value = 'create';
    document.getElementById('orderModalTitle').textContent = 'Оформление заявки';

    document.getElementById('orderCourseName').value = course ? course.name : '';
    document.getElementById('orderTeacherName').value = course ? course.teacher : '';
    document.getElementById('orderTutorName').value = tutor ? tutor.name : '';

    document.getElementById('orderDurationHours').value = tutor ? 1 : '';
    document.getElementById('orderDurationHours').disabled = !tutor;
    if (!tutor) document.getElementById('orderDurationHours').value = '';

    document.getElementById('orderEntityType').value = course ? 'course' : 'tutor';

    document.getElementById('optSupplementary').checked = false;
    document.getElementById('optPersonalized').checked = false;
    document.getElementById('optExcursions').checked = false;
    document.getElementById('optAssessment').checked = false;
    document.getElementById('optInteractive').checked = false;

    document.getElementById('optEarly').checked = false;
    document.getElementById('optGroup').checked = false;
    document.getElementById('optIntensive').checked = false;

    const dateSel = document.getElementById('orderDateStart');
    const timeSel = document.getElementById('orderTimeStart');
    dateSel.innerHTML = '';
    timeSel.innerHTML = '';
    timeSel.disabled = true;

    if (course) {
        const dates = new Set();
        (course.start_dates || []).forEach(iso => dates.add(iso.slice(0, 10)));
        const list = Array.from(dates).sort();
       
        if (list.length === 0) {
            dateSel.innerHTML = '<option value="">Нет дат</option>';
        } 
        
        else {
            dateSel.innerHTML = list.map(d => `<option value="${d}">${d}</option>`).join('');
        }

        const endDate = list.length ? computeCourseEndDate(list[0], Number(course.total_length || 0)) : '';
        document.getElementById('orderDurationInfo').value = course.total_length ? `${course.total_length} недель, окончание: ${endDate}` : '';
    } 
    
    else if (tutor) {
        const today = new Date();
        const todayStr = toDateInputValue(today);
        dateSel.innerHTML = `<option value="${todayStr}">${todayStr}</option>`;
        document.getElementById('orderDurationInfo').value = 'Занятие с репетитором';
    }

    const updateTimeOptions = () => {
        timeSel.innerHTML = '';
        timeSel.disabled = false;

        if (course) {
            const d = dateSel.value;
            const times = (course.start_dates || [])
                .filter(iso => iso.startsWith(d))
                .map(iso => iso.slice(11, 16))
                .sort();

            if (times.length === 0) {
                timeSel.innerHTML = '<option value="">Нет времени</option>';
                timeSel.disabled = true;
                return;
            }

            timeSel.innerHTML = times.map(t => {
                const end = addHoursToTime(t, Number(course.week_length || 0));
                return `<option value="${t}">${t} — ${end}</option>`;
            }).join('');
        } 
        
        else {
            timeSel.innerHTML = '<option value="12:00">12:00</option><option value="14:00">14:00</option><option value="18:00">18:00</option>';
        }
    };

    dateSel.onchange = () => {
        updateTimeOptions();
        updatePrice();
    };

    updateTimeOptions();

    const updatePrice = () => {
        const entityType = document.getElementById('orderEntityType').value;

        const form = {
            dateStart: document.getElementById('orderDateStart').value,
            timeStart: document.getElementById('orderTimeStart').value,
            persons: document.getElementById('orderPersons').value,
            durationHours: document.getElementById('orderDurationHours').value,
            supplementary: document.getElementById('optSupplementary').checked,
            personalized: document.getElementById('optPersonalized').checked,
            excursions: document.getElementById('optExcursions').checked,
            assessment: document.getElementById('optAssessment').checked,
            interactive: document.getElementById('optInteractive').checked,
        };

        let result;
        if (entityType === 'course') {
            result = calcCoursePrice(course, form);
            document.getElementById('optEarly').checked = result.flags.early;
            document.getElementById('optGroup').checked = result.flags.group;
            document.getElementById('optIntensive').checked = result.flags.intensive;
            document.getElementById('orderDurationHours').value = result.durationHours;
        } 
        
        else {
            result = calcTutorPrice(tutor, form);
            document.getElementById('optEarly').checked = false;
            document.getElementById('optGroup').checked = result.flags.group;
            document.getElementById('optIntensive').checked = result.flags.intensive;
        }

        document.getElementById('orderPrice').value = String(result.price);
    };

    const debouncedUpdate = debounce(updatePrice, 150);

    document.getElementById('orderPersons').oninput = debouncedUpdate;
    document.getElementById('orderTimeStart').onchange = updatePrice;
    document.getElementById('orderDurationHours').oninput = debouncedUpdate;

    ['#optSupplementary', '#optPersonalized', '#optExcursions', '#optAssessment', '#optInteractive'].forEach(id => {
        document.querySelector(id).onchange = updatePrice;
    });

    updatePrice();

    document.getElementById('btnOrderSubmit').onclick = async () => {
        try {
            const entityType = document.getElementById('orderEntityType').value;
            const dateStart = document.getElementById('orderDateStart').value;
            const timeStart = document.getElementById('orderTimeStart').value;
            const persons = Number(document.getElementById('orderPersons').value || 1);
            const price = Number(document.getElementById('orderPrice').value || 0);
            const durationHours = Number(document.getElementById('orderDurationHours').value || 1);
            const payload = {
                tutor_id: entityType === 'tutor' ? tutor.id : 0,
                course_id: entityType === 'course' ? course.id : 0,
                date_start: dateStart,
                time_start: timeStart,
                duration: durationHours,
                persons: persons,
                price: price,

                early_registration: document.getElementById('optEarly').checked,
                group_enrollment: document.getElementById('optGroup').checked,
                intensive_course: document.getElementById('optIntensive').checked,
                supplementary: document.getElementById('optSupplementary').checked,
                personalized: document.getElementById('optPersonalized').checked,
                excursions: document.getElementById('optExcursions').checked,
                assessment: document.getElementById('optAssessment').checked,
                interactive: document.getElementById('optInteractive').checked,
            };

            await schoolAPI.addOrder(payload);
            showAlert('success', 'Заявка успешно отправлена.');
            modal.hide();
        } catch (error) {
            showAlert('danger', `Ошибка: ${error.message}`);
        }
    };

    modal.show();
}

async function init() {
    try {
        document.getElementById('btnResetCourseFilters').addEventListener('click', () => {
            document.getElementById('courseSearchName').value = '';
            document.getElementById('courseSearchLevel').value = '';
            appState.coursesPage = 1;
            renderCourses();
        });

        document.getElementById('courseSearchName').addEventListener('input', debounce(() => {
            appState.coursesPage = 1;
            renderCourses();
        }, 150));

        document.getElementById('courseSearchLevel').addEventListener('change', () => {
            appState.coursesPage = 1;
            renderCourses();
        });

        document.getElementById('tutorFilterLanguage').addEventListener('change', renderTutors);
        document.getElementById('tutorFilterLevel').addEventListener('change', renderTutors);
        document.getElementById('tutorFilterExp').addEventListener('input', debounce(renderTutors, 150));
        document.getElementById('btnOpenOrder').addEventListener('click', () => openOrderModalCreate());

        appState.courses = await schoolAPI.getCourses();
        appState.tutors = await schoolAPI.getTutors();

        fillTutorLanguageSelect();
        renderCourses();
        renderTutors();
        updateOrderButtonState();
        showAlert('success', 'Данные загружены.');
    } 
    
    catch (error) {
        showAlert('danger', `Ошибка загрузки: ${error.message}`);
    }
}

init();